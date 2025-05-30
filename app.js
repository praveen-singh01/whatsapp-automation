const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const WhatsAppTokenManager = require('./whatsapp-token-manager');
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('📊 MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  user_image: { type: String, required: true },
  user_name: { type: String, required: true },
  user_phone: { type: String, required: true },
  user_role: {
    type: String,
    required: true,
    enum: ['karyakarta', 'admin', 'user', 'manager']
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Operation tracking schema for bulk messaging
const operationSchema = new mongoose.Schema({
  operationId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  targetRoles: [{ type: String, enum: ['karyakarta', 'admin', 'user', 'manager'] }],
  messageContent: { type: String },
  templateName: { type: String },
  includeUserImage: { type: Boolean, default: false },
  summary: {
    totalTargeted: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 }
  },
  results: [{
    userId: String,
    userName: String,
    userPhone: String,
    userRole: String,
    status: { type: String, enum: ['success', 'failed', 'pending', 'delivered', 'read'] },
    messageId: String,
    error: String,
    errorCode: String,
    deliveredAt: Date,
    readAt: Date,
    attemptedAt: Date,
    personalizedImageUrl: String
  }],
  startedAt: { type: Date, default: Date.now },
  completedAt: Date
}, { timestamps: true });

const Operation = mongoose.model('Operation', operationSchema);

// AWS S3 Configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Initialize WhatsApp Token Manager
const tokenManager = new WhatsAppTokenManager();

// Helper function to get current valid WhatsApp token
async function getCurrentWhatsAppToken() {
  try {
    return await tokenManager.getCurrentToken();
  } catch (error) {
    console.error('❌ Error getting WhatsApp token:', error.message);
    return process.env.WHATSAPP_TOKEN; // Fallback to env token
  }
}

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept common image formats
    const allowedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only image files are allowed. Supported formats: PNG, JPEG, JPG, WebP, GIF. Received: ${file.mimetype}`), false);
    }
  }
});

// Serve image publicly with cache control
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));

// Helper function to generate unique filename
function generateUniqueFilename() {
  return `composite_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.png`;
}

// Helper function to validate image URLs
function isValidImageUrl(url) {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
  } catch {
    return false;
  }
}

// Helper function to upload file to S3
async function uploadToS3(buffer, key, contentType = 'image/png') {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
    // Removed ACL: 'public-read' as the bucket doesn't support ACLs
  };

  try {
    const result = await s3.upload(params).promise();

    // Use custom domain if configured, otherwise use default S3 URL
    if (process.env.AWS_S3_CUSTOM_DOMAIN) {
      const customUrl = `${process.env.AWS_S3_CUSTOM_DOMAIN}/${key}`;
      console.log(`🔗 Using custom domain URL: ${customUrl}`);
      return customUrl;
    } else {
      return result.Location;
    }
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    throw error;
  }
}

// Helper function to calculate user image position based on preset or custom coordinates
function calculateUserImagePosition(posterMetadata, userImageSize, positionConfig) {
  const { width: posterWidth, height: posterHeight } = posterMetadata;
  const { width: userWidth, height: userHeight } = userImageSize;

  // Default position
  let top = 100;
  let left = 20;

  if (positionConfig.preset) {
    // Predefined position presets
    const margin = positionConfig.margin || 20;

    switch (positionConfig.preset) {
      case 'top-left':
        top = margin;
        left = margin;
        break;
      case 'top-center':
        top = margin;
        left = (posterWidth - userWidth) / 2;
        break;
      case 'top-right':
        top = margin;
        left = posterWidth - userWidth - margin;
        break;
      case 'center-left':
        top = (posterHeight - userHeight) / 2;
        left = margin;
        break;
      case 'center':
        top = (posterHeight - userHeight) / 2;
        left = (posterWidth - userWidth) / 2;
        break;
      case 'center-right':
        top = (posterHeight - userHeight) / 2;
        left = posterWidth - userWidth - margin;
        break;
      case 'bottom-left':
        top = posterHeight - userHeight - margin;
        left = margin;
        break;
      case 'bottom-center':
        top = posterHeight - userHeight - margin;
        left = (posterWidth - userWidth) / 2;
        break;
      case 'bottom-right':
        top = posterHeight - userHeight - margin;
        left = posterWidth - userWidth - margin;
        break;
      default:
        // Default to left side, slightly down
        top = 100;
        left = 20;
    }
  } else if (positionConfig.custom) {
    // Custom positioning with percentage or pixel values
    const custom = positionConfig.custom;

    if (custom.top !== undefined) {
      top = custom.top.toString().includes('%')
        ? (parseFloat(custom.top) / 100) * posterHeight
        : custom.top;
    }

    if (custom.left !== undefined) {
      left = custom.left.toString().includes('%')
        ? (parseFloat(custom.left) / 100) * posterWidth
        : custom.left;
    }
  } else if (positionConfig.top !== undefined || positionConfig.left !== undefined) {
    // Legacy support for direct top/left values
    top = positionConfig.top || top;
    left = positionConfig.left || left;
  }

  // Ensure the user image stays within poster boundaries
  top = Math.max(0, Math.min(top, posterHeight - userHeight));
  left = Math.max(0, Math.min(left, posterWidth - userWidth));

  return { top: Math.round(top), left: Math.round(left) };
}

// Helper function to calculate text position based on preset or custom coordinates
function calculateTextPosition(imageMetadata, textConfig) {
  const { width: imageWidth, height: imageHeight } = imageMetadata;

  // Default position
  let x = imageWidth / 2;
  let y = imageHeight - 50;
  let textAnchor = 'middle';

  if (textConfig.preset) {
    // Predefined text position presets
    const margin = textConfig.margin || 20;
    const fontSize = textConfig.fontSize || 40;

    switch (textConfig.preset) {
      case 'top-left':
        x = margin;
        y = fontSize + margin;
        textAnchor = 'start';
        break;
      case 'top-center':
        x = imageWidth / 2;
        y = fontSize + margin;
        textAnchor = 'middle';
        break;
      case 'top-right':
        x = imageWidth - margin;
        y = fontSize + margin;
        textAnchor = 'end';
        break;
      case 'center-left':
        x = margin;
        y = imageHeight / 2;
        textAnchor = 'start';
        break;
      case 'center':
        x = imageWidth / 2;
        y = imageHeight / 2;
        textAnchor = 'middle';
        break;
      case 'center-right':
        x = imageWidth - margin;
        y = imageHeight / 2;
        textAnchor = 'end';
        break;
      case 'bottom-left':
        x = margin;
        y = imageHeight - margin;
        textAnchor = 'start';
        break;
      case 'bottom-center':
        x = imageWidth / 2;
        y = imageHeight - margin;
        textAnchor = 'middle';
        break;
      case 'bottom-right':
        x = imageWidth - margin;
        y = imageHeight - margin;
        textAnchor = 'end';
        break;
      default:
        // Default to bottom center
        x = imageWidth / 2;
        y = imageHeight - margin;
        textAnchor = 'middle';
    }
  } else if (textConfig.custom) {
    // Custom positioning with percentage or pixel values
    const custom = textConfig.custom;

    if (custom.x !== undefined) {
      x = custom.x.toString().includes('%')
        ? (parseFloat(custom.x) / 100) * imageWidth
        : custom.x;
    }

    if (custom.y !== undefined) {
      y = custom.y.toString().includes('%')
        ? (parseFloat(custom.y) / 100) * imageHeight
        : custom.y;
    }

    // Set text anchor based on position
    if (custom.align) {
      textAnchor = custom.align; // 'start', 'middle', 'end'
    }
  } else if (textConfig.x !== undefined || textConfig.y !== undefined) {
    // Legacy support for direct x/y values
    x = textConfig.x || x;
    y = textConfig.y || y;
    if (textConfig.align) {
      textAnchor = textConfig.align;
    }
  }

  // Ensure text stays within image boundaries
  const fontSize = textConfig.fontSize || 40;
  x = Math.max(0, Math.min(x, imageWidth));
  y = Math.max(fontSize, Math.min(y, imageHeight));

  return { x: Math.round(x), y: Math.round(y), textAnchor };
}

// Enhanced helper function to add text overlay to image with flexible positioning
async function addTextOverlay(imageBuffer, text, options = {}) {
  const {
    fontSize = 40,
    fontColor = 'white',
    fontFamily = 'Arial, sans-serif',
    fontWeight = 'bold',
    textShadow = '2px 2px 4px rgba(0,0,0,0.8)',
    backgroundColor = null,
    backgroundOpacity = 0.7,
    padding = 10,
    borderRadius = 5,
    position = { preset: 'bottom-center', margin: 20 } // New flexible positioning
  } = options;

  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Calculate text position using new positioning system
    const textPosition = calculateTextPosition(metadata, { ...position, fontSize });
    console.log(`📍 Text position: x=${textPosition.x}, y=${textPosition.y}, anchor=${textPosition.textAnchor}`);

    // Create background rectangle if specified
    let backgroundRect = '';
    if (backgroundColor) {
      const textWidth = text.length * (fontSize * 0.6); // Approximate text width
      const rectWidth = textWidth + (padding * 2);
      const rectHeight = fontSize + (padding * 2);

      let rectX = textPosition.x;
      if (textPosition.textAnchor === 'middle') {
        rectX = textPosition.x - (rectWidth / 2);
      } else if (textPosition.textAnchor === 'end') {
        rectX = textPosition.x - rectWidth;
      }

      const rectY = textPosition.y - fontSize - padding;

      backgroundRect = `
        <rect x="${rectX}" y="${rectY}"
              width="${rectWidth}" height="${rectHeight}"
              fill="${backgroundColor}"
              fill-opacity="${backgroundOpacity}"
              rx="${borderRadius}" ry="${borderRadius}" />
      `;
    }

    // Create SVG text overlay with flexible positioning
    const textSvg = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <defs>
          <filter id="textShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.8)"/>
          </filter>
        </defs>
        ${backgroundRect}
        <text x="${textPosition.x}" y="${textPosition.y}"
              fill="${fontColor}"
              font-size="${fontSize}px"
              font-family="${fontFamily}"
              font-weight="${fontWeight}"
              text-anchor="${textPosition.textAnchor}"
              filter="url(#textShadow)"
              style="text-shadow: ${textShadow};">${text}</text>
      </svg>
    `;

    const result = await image
      .composite([{
        input: Buffer.from(textSvg),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error('❌ Text overlay error:', error);
    throw error;
  }
}

app.post('/send-message', async (req, res) => {
  try {
    const {
      poster_url,
      user_image_url,
      phone_number,
      name,
      user_image_size = { width: 300, height: 300 },
      position = { top: 100, left: 20 }, // Legacy support - can be object with preset/custom or direct coordinates
      user_image_opacity = 1,
      text_config = {
        enabled: true,
        fontSize: 40,
        fontColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        backgroundColor: null,
        position: { preset: 'bottom-center', margin: 20 }
      }
    } = req.body;

    // Validation
    if (!poster_url || !user_image_url || !phone_number || !name) {
      return res.status(400).json({
        error: 'Missing required fields: poster_url, user_image_url, phone_number, name'
      });
    }

    if (!isValidImageUrl(poster_url) || !isValidImageUrl(user_image_url)) {
      return res.status(400).json({
        error: 'Invalid image URLs provided'
      });
    }

    console.log("📥 Processing image overlay request...");
    console.log(`📋 Poster: ${poster_url}`);
    console.log(`👤 User Image: ${user_image_url}`);
    console.log(`📱 Phone: ${phone_number}`);

    // Download both images with timeout
    const downloadTimeout = 30000; // 30 seconds
    const [posterRes, userRes] = await Promise.all([
      axios.get(poster_url, {
        responseType: 'arraybuffer',
        timeout: downloadTimeout,
        headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
      }),
      axios.get(user_image_url, {
        responseType: 'arraybuffer',
        timeout: downloadTimeout,
        headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
      })
    ]);

    console.log("✅ Images downloaded successfully");

    // Get poster dimensions first
    const posterBuffer = Buffer.from(posterRes.data);
    const posterMetadata = await sharp(posterBuffer).metadata();

    console.log(`📐 Poster dimensions: ${posterMetadata.width}x${posterMetadata.height}`);

    // Process user image with better resizing logic
    const userImageBuffer = await sharp(userRes.data)
      .resize(user_image_size.width, user_image_size.height, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();

    console.log(`🔄 User image resized to: ${user_image_size.width}x${user_image_size.height}`);

    // Calculate user image position using new positioning system
    const calculatedPosition = calculateUserImagePosition(posterMetadata, user_image_size, position);
    console.log(`📍 User image position: top=${calculatedPosition.top}, left=${calculatedPosition.left}`);

    // Create composite image with calculated positioning
    const compositeImage = await sharp(posterBuffer)
      .composite([{
        input: userImageBuffer,
        top: calculatedPosition.top,
        left: calculatedPosition.left,
        blend: 'over'
      }])
      .png({ quality: 90 })
      .toBuffer();

    // Add text overlay with user's name using configurable settings
    let finalImage = compositeImage;
    if (text_config.enabled && name) {
      console.log(`📝 Adding text overlay: "${name}" with config:`, text_config);
      finalImage = await addTextOverlay(compositeImage, name, {
        fontSize: text_config.fontSize,
        fontColor: text_config.fontColor,
        fontFamily: text_config.fontFamily,
        fontWeight: text_config.fontWeight,
        backgroundColor: text_config.backgroundColor,
        backgroundOpacity: text_config.backgroundOpacity,
        padding: text_config.padding,
        borderRadius: text_config.borderRadius,
        position: text_config.position
      });
    }

    // Generate unique filename to avoid conflicts
    const filename = generateUniqueFilename();
    const outputPath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(outputPath, finalImage);

    const mediaUrl = `${process.env.DOMAIN_URL}/public/${filename}`;
    console.log("🖼️ Final image URL:", mediaUrl);

    // Shorter wait time since we're using unique filenames
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send WhatsApp Template Message
    console.log("📤 Sending WhatsApp message...");

    // Get current valid token
    const currentToken = await getCurrentWhatsAppToken();

    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: phone_number,
      type: "template",
      template: {
        name: "poster_template",
        language: { code: "en" },
        components: [
          {
            type: "header",
            parameters: [{ type: "image", image: { link: mediaUrl } }]
          },
          {
            type: "body",
            parameters: [{ type: "text", text: name }]
          }
        ]
      }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      whatsappPayload,
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json"
        },
        timeout: 15000 // 15 seconds timeout for WhatsApp API
      }
    );

    const messageId = response.data.messages[0]?.id || "unknown";
    console.log(`✅ WhatsApp message sent successfully! Message ID: ${messageId}`);

    // Clean up old files (optional - keep last 10 files)
    try {
      const publicDir = path.join(__dirname, 'public');
      const files = fs.readdirSync(publicDir)
        .filter(file => file.startsWith('composite_'))
        .map(file => ({
          name: file,
          path: path.join(publicDir, file),
          time: fs.statSync(path.join(publicDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 10) {
        files.slice(10).forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Cleaned up old file: ${file.name}`);
        });
      }
    } catch (cleanupError) {
      console.warn("⚠️ Cleanup warning:", cleanupError.message);
    }

    return res.json({
      status: "sent",
      messageId: messageId,
      imageUrl: mediaUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error processing request:", error.message);

    // More detailed error logging
    if (error.response) {
      console.error("📡 API Response Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      return res.status(error.response.status).json({
        error: "WhatsApp API Error",
        details: error.response.data,
        status: error.response.status
      });
    } else if (error.code === 'ECONNABORTED') {
      console.error("⏰ Request timeout");
      return res.status(408).json({
        error: "Request timeout - please try again"
      });
    } else {
      console.error("🔧 Processing Error:", error.stack);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }
});

// Health check endpoint for Railway deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Business API Server is running!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      send_message: '/send-message',
      send_bulk_message: '/api/send-bulk-message',
      get_templates: '/api/templates',
      get_roles: '/api/roles',
      get_position_options: '/api/position-options',
      get_text_options: '/api/text-options',
      preview_image: '/api/preview-image',
      token_management: '/api/token'
    }
  });
});

// Get available positioning options endpoint
app.get('/api/position-options', (req, res) => {
  try {
    console.log("📍 Fetching available positioning options...");

    const positionOptions = {
      userImagePresets: [
        { value: 'top-left', label: 'Top Left', description: 'Position user image at top-left corner' },
        { value: 'top-center', label: 'Top Center', description: 'Position user image at top-center' },
        { value: 'top-right', label: 'Top Right', description: 'Position user image at top-right corner' },
        { value: 'center-left', label: 'Center Left', description: 'Position user image at center-left (default)' },
        { value: 'center', label: 'Center', description: 'Position user image at center' },
        { value: 'center-right', label: 'Center Right', description: 'Position user image at center-right' },
        { value: 'bottom-left', label: 'Bottom Left', description: 'Position user image at bottom-left corner' },
        { value: 'bottom-center', label: 'Bottom Center', description: 'Position user image at bottom-center' },
        { value: 'bottom-right', label: 'Bottom Right', description: 'Position user image at bottom-right corner' }
      ],
      textPresets: [
        { value: 'top-left', label: 'Top Left', description: 'Position text at top-left corner' },
        { value: 'top-center', label: 'Top Center', description: 'Position text at top-center' },
        { value: 'top-right', label: 'Top Right', description: 'Position text at top-right corner' },
        { value: 'center-left', label: 'Center Left', description: 'Position text at center-left' },
        { value: 'center', label: 'Center', description: 'Position text at center' },
        { value: 'center-right', label: 'Center Right', description: 'Position text at center-right' },
        { value: 'bottom-left', label: 'Bottom Left', description: 'Position text at bottom-left corner' },
        { value: 'bottom-center', label: 'Bottom Center', description: 'Position text at bottom-center (default)' },
        { value: 'bottom-right', label: 'Bottom Right', description: 'Position text at bottom-right corner' }
      ],
      customOptions: {
        description: 'Use custom positioning with pixel values or percentages',
        examples: [
          { x: 50, y: 100, description: 'Pixel values: 50px from left, 100px from top' },
          { x: '10%', y: '20%', description: 'Percentage values: 10% from left, 20% from top' },
          { x: '50%', y: 200, description: 'Mixed values: 50% from left, 200px from top' }
        ]
      },
      textStyling: {
        colors: [
          { value: 'white', label: 'White', hex: '#FFFFFF' },
          { value: 'black', label: 'Black', hex: '#000000' },
          { value: 'red', label: 'Red', hex: '#FF0000' },
          { value: 'blue', label: 'Blue', hex: '#0000FF' },
          { value: 'green', label: 'Green', hex: '#008000' },
          { value: 'yellow', label: 'Yellow', hex: '#FFFF00' },
          { value: 'orange', label: 'Orange', hex: '#FFA500' },
          { value: 'purple', label: 'Purple', hex: '#800080' },
          { value: 'gold', label: 'Gold', hex: '#FFD700' },
          { value: 'silver', label: 'Silver', hex: '#C0C0C0' }
        ],
        fontSizes: [
          { value: 20, label: 'Small (20px)' },
          { value: 30, label: 'Medium (30px)' },
          { value: 40, label: 'Large (40px) - Default' },
          { value: 50, label: 'Extra Large (50px)' },
          { value: 60, label: 'Huge (60px)' }
        ],
        fontFamilies: [
          { value: 'Arial, sans-serif', label: 'Arial' },
          { value: 'Helvetica, sans-serif', label: 'Helvetica' },
          { value: 'Times New Roman, serif', label: 'Times New Roman' },
          { value: 'Georgia, serif', label: 'Georgia' },
          { value: 'Verdana, sans-serif', label: 'Verdana' },
          { value: 'Impact, sans-serif', label: 'Impact' }
        ],
        fontWeights: [
          { value: 'normal', label: 'Normal' },
          { value: 'bold', label: 'Bold (Default)' },
          { value: '100', label: 'Thin' },
          { value: '300', label: 'Light' },
          { value: '500', label: 'Medium' },
          { value: '700', label: 'Bold' },
          { value: '900', label: 'Black' }
        ],
        backgroundColors: [
          { value: null, label: 'No Background' },
          { value: 'rgba(0,0,0,0.7)', label: 'Semi-transparent Black' },
          { value: 'rgba(255,255,255,0.7)', label: 'Semi-transparent White' },
          { value: 'rgba(255,0,0,0.7)', label: 'Semi-transparent Red' },
          { value: 'rgba(0,0,255,0.7)', label: 'Semi-transparent Blue' },
          { value: 'rgba(0,128,0,0.7)', label: 'Semi-transparent Green' }
        ]
      },
      defaultMargin: 20,
      usage: {
        userImagePosition: {
          description: 'Position user images on poster',
          preset: { preset: 'center-left', margin: 20 },
          custom: { custom: { top: 100, left: 50 } },
          legacy: { top: 100, left: 50 }
        },
        textPosition: {
          description: 'Position text overlays on image',
          preset: { preset: 'bottom-center', margin: 20 },
          custom: { custom: { x: '50%', y: '90%', align: 'middle' } }
        },
        textConfig: {
          description: 'Complete text configuration example',
          example: {
            enabled: true,
            fontSize: 40,
            fontColor: 'white',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backgroundOpacity: 0.7,
            padding: 10,
            borderRadius: 5,
            position: { preset: 'bottom-center', margin: 20 }
          }
        }
      }
    };

    res.json({
      success: true,
      data: positionOptions,
      message: "Position options retrieved successfully"
    });

  } catch (error) {
    console.error("❌ Error fetching position options:", error.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to retrieve position options"
    });
  }
});

// Get text styling options endpoint
app.get('/api/text-options', (req, res) => {
  try {
    console.log("🎨 Fetching text styling options...");

    const textOptions = {
      positions: [
        { value: 'top-left', label: 'Top Left', description: 'Position text at top-left corner' },
        { value: 'top-center', label: 'Top Center', description: 'Position text at top-center' },
        { value: 'top-right', label: 'Top Right', description: 'Position text at top-right corner' },
        { value: 'center-left', label: 'Center Left', description: 'Position text at center-left' },
        { value: 'center', label: 'Center', description: 'Position text at center' },
        { value: 'center-right', label: 'Center Right', description: 'Position text at center-right' },
        { value: 'bottom-left', label: 'Bottom Left', description: 'Position text at bottom-left corner' },
        { value: 'bottom-center', label: 'Bottom Center', description: 'Position text at bottom-center (default)' },
        { value: 'bottom-right', label: 'Bottom Right', description: 'Position text at bottom-right corner' }
      ],
      colors: [
        { value: 'white', label: 'White', hex: '#FFFFFF', preview: true },
        { value: 'black', label: 'Black', hex: '#000000', preview: true },
        { value: 'red', label: 'Red', hex: '#FF0000', preview: true },
        { value: 'blue', label: 'Blue', hex: '#0000FF', preview: true },
        { value: 'green', label: 'Green', hex: '#008000', preview: true },
        { value: 'yellow', label: 'Yellow', hex: '#FFFF00', preview: true },
        { value: 'orange', label: 'Orange', hex: '#FFA500', preview: true },
        { value: 'purple', label: 'Purple', hex: '#800080', preview: true },
        { value: 'gold', label: 'Gold', hex: '#FFD700', preview: true },
        { value: 'silver', label: 'Silver', hex: '#C0C0C0', preview: true },
        { value: '#FF6B6B', label: 'Light Red', hex: '#FF6B6B', preview: true },
        { value: '#4ECDC4', label: 'Teal', hex: '#4ECDC4', preview: true },
        { value: '#45B7D1', label: 'Sky Blue', hex: '#45B7D1', preview: true },
        { value: '#96CEB4', label: 'Mint Green', hex: '#96CEB4', preview: true },
        { value: '#FFEAA7', label: 'Light Yellow', hex: '#FFEAA7', preview: true },
        { value: '#DDA0DD', label: 'Plum', hex: '#DDA0DD', preview: true }
      ],
      fontSizes: [
        { value: 16, label: 'Extra Small (16px)' },
        { value: 20, label: 'Small (20px)' },
        { value: 24, label: 'Small-Medium (24px)' },
        { value: 30, label: 'Medium (30px)' },
        { value: 36, label: 'Medium-Large (36px)' },
        { value: 40, label: 'Large (40px) - Default' },
        { value: 48, label: 'Extra Large (48px)' },
        { value: 56, label: 'Huge (56px)' },
        { value: 64, label: 'Extra Huge (64px)' },
        { value: 72, label: 'Massive (72px)' }
      ],
      fontFamilies: [
        { value: 'Arial, sans-serif', label: 'Arial', category: 'Sans-serif' },
        { value: 'Helvetica, sans-serif', label: 'Helvetica', category: 'Sans-serif' },
        { value: 'Verdana, sans-serif', label: 'Verdana', category: 'Sans-serif' },
        { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS', category: 'Sans-serif' },
        { value: 'Impact, sans-serif', label: 'Impact', category: 'Sans-serif' },
        { value: 'Times New Roman, serif', label: 'Times New Roman', category: 'Serif' },
        { value: 'Georgia, serif', label: 'Georgia', category: 'Serif' },
        { value: 'Garamond, serif', label: 'Garamond', category: 'Serif' },
        { value: 'Courier New, monospace', label: 'Courier New', category: 'Monospace' },
        { value: 'Monaco, monospace', label: 'Monaco', category: 'Monospace' }
      ],
      fontWeights: [
        { value: '100', label: 'Thin (100)' },
        { value: '200', label: 'Extra Light (200)' },
        { value: '300', label: 'Light (300)' },
        { value: 'normal', label: 'Normal (400)' },
        { value: '500', label: 'Medium (500)' },
        { value: '600', label: 'Semi Bold (600)' },
        { value: 'bold', label: 'Bold (700) - Default' },
        { value: '800', label: 'Extra Bold (800)' },
        { value: '900', label: 'Black (900)' }
      ],
      backgroundColors: [
        { value: null, label: 'No Background', description: 'Transparent background' },
        { value: 'rgba(0,0,0,0.3)', label: 'Light Black', hex: '#000000', opacity: 0.3 },
        { value: 'rgba(0,0,0,0.5)', label: 'Medium Black', hex: '#000000', opacity: 0.5 },
        { value: 'rgba(0,0,0,0.7)', label: 'Dark Black', hex: '#000000', opacity: 0.7 },
        { value: 'rgba(255,255,255,0.3)', label: 'Light White', hex: '#FFFFFF', opacity: 0.3 },
        { value: 'rgba(255,255,255,0.5)', label: 'Medium White', hex: '#FFFFFF', opacity: 0.5 },
        { value: 'rgba(255,255,255,0.7)', label: 'Dark White', hex: '#FFFFFF', opacity: 0.7 },
        { value: 'rgba(255,0,0,0.5)', label: 'Semi-transparent Red', hex: '#FF0000', opacity: 0.5 },
        { value: 'rgba(0,0,255,0.5)', label: 'Semi-transparent Blue', hex: '#0000FF', opacity: 0.5 },
        { value: 'rgba(0,128,0,0.5)', label: 'Semi-transparent Green', hex: '#008000', opacity: 0.5 }
      ],
      defaultConfig: {
        enabled: true,
        fontSize: 40,
        fontColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        backgroundColor: null,
        backgroundOpacity: 0.7,
        padding: 10,
        borderRadius: 5,
        position: { preset: 'bottom-center', margin: 20 }
      },
      usage: {
        description: 'Text configuration for username overlays',
        example: {
          enabled: true,
          fontSize: 40,
          fontColor: 'white',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          backgroundColor: 'rgba(0,0,0,0.7)',
          position: { preset: 'bottom-center', margin: 20 }
        },
        customPositioning: {
          description: 'Use custom coordinates for text positioning',
          example: {
            position: { custom: { x: '50%', y: '90%', align: 'middle' } }
          }
        }
      }
    };

    res.json({
      success: true,
      data: textOptions,
      message: "Text styling options retrieved successfully"
    });

  } catch (error) {
    console.error("❌ Error fetching text options:", error.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to retrieve text styling options"
    });
  }
});

// Get available user roles endpoint
app.get('/api/roles', async (req, res) => {
  try {
    console.log("📊 Fetching available user roles...");

    // Aggregate user roles with counts
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: "$user_role",
          userCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get total user count
    const totalUsers = await User.countDocuments();

    // Format roles with proper labels
    const roleLabels = {
      'karyakarta': 'Karyakarta',
      'admin': 'Admin',
      'user': 'User',
      'manager': 'Manager'
    };

    const roles = roleStats.map(role => ({
      value: role._id,
      label: roleLabels[role._id] || role._id,
      userCount: role.userCount
    }));

    console.log(`✅ Found ${roles.length} roles with ${totalUsers} total users`);

    res.json({
      success: true,
      data: {
        roles: roles,
        totalUsers: totalUsers
      },
      message: "Roles retrieved successfully"
    });

  } catch (error) {
    console.error("❌ Error fetching roles:", error.message);
    res.status(500).json({
      success: false,
      error: "Database connection error",
      message: "Unable to connect to MongoDB database",
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced preview endpoint with text and image positioning
app.post('/api/preview-image', upload.single('poster_image'), async (req, res) => {
  try {
    const {
      user_name = 'Sample User',
      user_image_url = 'https://images.polimart.in/users/default-avatar.png',
      user_image_position = JSON.stringify({ preset: 'center-left', margin: 20 }),
      text_config = JSON.stringify({
        enabled: true,
        fontSize: 40,
        fontColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        backgroundColor: null,
        position: { preset: 'bottom-center', margin: 20 }
      })
    } = req.body;

    const posterFile = req.file;

    console.log("🖼️ Generating preview image with enhanced positioning...");

    // Validation
    if (!posterFile) {
      return res.status(400).json({
        success: false,
        error: 'Missing poster_image file',
        message: 'Please upload a poster image'
      });
    }

    // Parse configurations
    let imagePositionConfig, textConfiguration;

    try {
      imagePositionConfig = typeof user_image_position === 'string'
        ? JSON.parse(user_image_position)
        : user_image_position;
    } catch (e) {
      console.warn('⚠️ Invalid image position config, using default');
      imagePositionConfig = { preset: 'center-left', margin: 20 };
    }

    try {
      textConfiguration = typeof text_config === 'string'
        ? JSON.parse(text_config)
        : text_config;
    } catch (e) {
      console.warn('⚠️ Invalid text config, using default');
      textConfiguration = {
        enabled: true,
        fontSize: 40,
        fontColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        position: { preset: 'bottom-center', margin: 20 }
      };
    }

    console.log('📍 Image position config:', imagePositionConfig);
    console.log('📝 Text config:', textConfiguration);

    // Download user image
    const userImageResponse = await axios.get(user_image_url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
    });

    // Process poster image
    const posterBuffer = posterFile.buffer;
    const posterMetadata = await sharp(posterBuffer).metadata();
    console.log(`📐 Poster dimensions: ${posterMetadata.width}x${posterMetadata.height}`);

    // Resize user image
    const userImageBuffer = await sharp(userImageResponse.data)
      .resize(250, 250, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();

    // Calculate user image position using new positioning system
    const calculatedPosition = calculateUserImagePosition(
      posterMetadata,
      { width: 250, height: 250 },
      imagePositionConfig
    );
    console.log(`📍 Calculated user image position: top=${calculatedPosition.top}, left=${calculatedPosition.left}`);

    // Create composite image with calculated positioning
    let compositeImage = await sharp(posterBuffer)
      .composite([{
        input: userImageBuffer,
        top: calculatedPosition.top,
        left: calculatedPosition.left,
        blend: 'over'
      }])
      .png()
      .toBuffer();

    // Add text overlay with configurable settings
    if (textConfiguration.enabled && user_name) {
      console.log(`📝 Adding text overlay: "${user_name}" with config:`, textConfiguration);
      compositeImage = await addTextOverlay(compositeImage, user_name, {
        fontSize: textConfiguration.fontSize,
        fontColor: textConfiguration.fontColor,
        fontFamily: textConfiguration.fontFamily,
        fontWeight: textConfiguration.fontWeight,
        backgroundColor: textConfiguration.backgroundColor,
        backgroundOpacity: textConfiguration.backgroundOpacity,
        padding: textConfiguration.padding,
        borderRadius: textConfiguration.borderRadius,
        position: textConfiguration.position
      });
    }

    // Generate unique filename for preview
    const filename = `preview_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const outputPath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(outputPath, compositeImage);

    const previewUrl = `${process.env.DOMAIN_URL}/public/${filename}`;
    console.log("🖼️ Preview image URL:", previewUrl);

    // Clean up preview files older than 1 hour
    try {
      const publicDir = path.join(__dirname, 'public');
      const files = fs.readdirSync(publicDir)
        .filter(file => file.startsWith('preview_'))
        .map(file => ({
          name: file,
          path: path.join(publicDir, file),
          time: fs.statSync(path.join(publicDir, file)).mtime.getTime()
        }))
        .filter(file => Date.now() - file.time > 3600000); // 1 hour

      files.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Cleaned up old preview: ${file.name}`);
      });
    } catch (cleanupError) {
      console.warn("⚠️ Preview cleanup warning:", cleanupError.message);
    }

    res.json({
      success: true,
      data: {
        previewUrl: previewUrl,
        configuration: {
          userName: user_name,
          userImageUrl: user_image_url,
          imagePosition: imagePositionConfig,
          textConfig: textConfiguration
        },
        metadata: {
          posterDimensions: {
            width: posterMetadata.width,
            height: posterMetadata.height
          },
          userImagePosition: calculatedPosition,
          textEnabled: textConfiguration.enabled
        }
      },
      message: "Preview image generated successfully"
    });

  } catch (error) {
    console.error("❌ Preview generation error:", error.message);

    if (error.response) {
      return res.status(500).json({
        success: false,
        error: "Image processing error",
        message: "Failed to download or process user image",
        details: error.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message
      });
    }
  }
});

// Token management endpoints
app.get('/token-status', async (req, res) => {
  try {
    const status = await tokenManager.getTokenStatus();
    res.json({
      status: 'success',
      tokenStatus: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get token status',
      message: error.message
    });
  }
});

app.post('/refresh-token', async (req, res) => {
  try {
    console.log('🔄 Manual token refresh requested...');
    const newToken = await tokenManager.forceRefresh();
    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      newToken: `${newToken.substring(0, 20)}...`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual token refresh failed:', error.message);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

// Get WhatsApp Business templates - Enhanced for API specification
app.get('/api/templates', async (req, res) => {
  try {
    console.log("📋 Fetching WhatsApp Business templates...");

    // Check if WHATSAPP_BUSINESS_ACCOUNT_ID is configured
    if (!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return res.status(500).json({
        success: false,
        error: 'WhatsApp Business Account ID not configured',
        message: 'Please add WHATSAPP_BUSINESS_ACCOUNT_ID to your environment variables',
        timestamp: new Date().toISOString()
      });
    }

    // Check if WHATSAPP_TOKEN is configured
    if (!process.env.WHATSAPP_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'WhatsApp token not configured',
        message: 'Please add WHATSAPP_TOKEN to your environment variables',
        timestamp: new Date().toISOString()
      });
    }

    // Optional query parameters for filtering
    const { limit = 100, status, fields = 'name,status,language,category,components' } = req.query;

    // Construct the API URL
    const apiUrl = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

    console.log(`🔗 API URL: ${apiUrl}`);

    // Get current valid token
    const currentToken = await getCurrentWhatsAppToken();

    // Build query parameters
    const params = {
      limit: limit,
      fields: fields
    };

    // Add status filter if provided
    if (status && ['APPROVED', 'PENDING', 'REJECTED'].includes(status.toUpperCase())) {
      params.status = status.toUpperCase();
    }

    // Make the API call to WhatsApp Business API
    const response = await axios.get(apiUrl, {
      params: params,
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json"
      },
      timeout: 15000 // 15 seconds timeout
    });

    const templates = response.data.data || [];
    const paging = response.data.paging || {};

    console.log(`✅ Successfully fetched ${templates.length} templates`);

    // Format the response according to API specification
    const formattedResponse = {
      success: true,
      data: {
        templates: templates.map(template => ({
          id: template.id,
          name: template.name,
          status: template.status,
          language: template.language,
          category: template.category,
          components: template.components || [],
          createdAt: template.created_time || new Date().toISOString()
        })),
        pagination: {
          total: templates.length,
          limit: parseInt(limit),
          hasNext: !!paging.next
        }
      },
      message: "Templates retrieved successfully"
    };

    return res.json(formattedResponse);

  } catch (error) {
    console.error("❌ Error fetching templates:", error.message);

    // Handle different types of errors
    if (error.response) {
      console.error("📡 WhatsApp API Response Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      return res.status(error.response.status).json({
        success: false,
        error: "WhatsApp API Error",
        details: error.response.data,
        message: "Failed to fetch templates from WhatsApp Business API",
        timestamp: new Date().toISOString()
      });
    } else {
      console.error("🔧 Processing Error:", error.stack);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Keep original templates endpoint for backward compatibility
app.get('/templates', async (req, res) => {
  try {
    console.log("📋 Fetching WhatsApp Business templates (legacy endpoint)...");

    // Check if WHATSAPP_BUSINESS_ACCOUNT_ID is configured
    if (!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      return res.status(500).json({
        error: 'WhatsApp Business Account ID not configured',
        message: 'Please add WHATSAPP_BUSINESS_ACCOUNT_ID to your environment variables'
      });
    }

    // Check if WHATSAPP_TOKEN is configured
    if (!process.env.WHATSAPP_TOKEN) {
      return res.status(500).json({
        error: 'WhatsApp token not configured',
        message: 'Please add WHATSAPP_TOKEN to your environment variables'
      });
    }

    // Optional query parameters for filtering
    const { limit = 100, fields = 'name,status,language,category,components' } = req.query;

    // Construct the API URL
    const apiUrl = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

    console.log(`🔗 API URL: ${apiUrl}`);

    // Get current valid token
    const currentToken = await getCurrentWhatsAppToken();

    // Make the API call to WhatsApp Business API
    const response = await axios.get(apiUrl, {
      params: {
        limit: limit,
        fields: fields
      },
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json"
      },
      timeout: 15000 // 15 seconds timeout
    });

    const templates = response.data.data || [];
    const paging = response.data.paging || {};

    console.log(`✅ Successfully fetched ${templates.length} templates`);

    // Format the response (legacy format)
    const formattedResponse = {
      status: 'success',
      count: templates.length,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        status: template.status,
        language: template.language,
        category: template.category,
        components: template.components || [],
        created_time: template.created_time,
        updated_time: template.updated_time
      })),
      paging: paging,
      timestamp: new Date().toISOString()
    };

    return res.json(formattedResponse);

  } catch (error) {
    console.error("❌ Error fetching templates:", error.message);

    // Handle different types of errors
    if (error.response) {
      console.error("📡 WhatsApp API Response Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      return res.status(error.response.status).json({
        error: "WhatsApp API Error",
        details: error.response.data,
        status: error.response.status,
        message: error.response.data?.error?.message || 'Failed to fetch templates'
      });
    } else if (error.code === 'ECONNABORTED') {
      console.error("⏰ Request timeout");
      return res.status(408).json({
        error: "Request timeout - please try again"
      });
    } else {
      console.error("🔧 Processing Error:", error.stack);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }
});

// Enhanced bulk messaging endpoint for API specification
app.post('/api/send-bulk-message', upload.single('poster_image'), async (req, res) => {
  const startTime = Date.now();
  let operation = null;

  try {
    const {
      target_roles,
      message_content,
      template_name = 'poster_template',
      include_user_image = false,
      user_image_position = '{"preset": "center-left", "margin": 20}', // New positioning parameter
      text_config = JSON.stringify({
        enabled: true,
        fontSize: 40,
        fontColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        backgroundColor: null,
        position: { preset: 'bottom-center', margin: 20 }
      })
    } = req.body;

    const posterFile = req.file;

    console.log("📢 Starting enhanced bulk message operation...");
    console.log(`🎯 Target roles: ${target_roles}`);
    console.log(`📝 Message content: ${message_content}`);

    // Validation
    if (!target_roles || !Array.isArray(JSON.parse(target_roles)) || JSON.parse(target_roles).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        details: {
          target_roles: "At least one role must be specified"
        },
        message: "Invalid request parameters",
        timestamp: new Date().toISOString()
      });
    }

    if (!message_content || message_content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        details: {
          message_content: "Message content is required and cannot be empty"
        },
        message: "Invalid request parameters",
        timestamp: new Date().toISOString()
      });
    }

    if (message_content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        details: {
          message_content: "Message content cannot exceed 1000 characters"
        },
        message: "Invalid request parameters",
        timestamp: new Date().toISOString()
      });
    }

    const targetRoles = JSON.parse(target_roles);
    const validRoles = ['karyakarta', 'admin', 'user', 'manager'];
    const invalidRoles = targetRoles.filter(role => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        details: {
          target_roles: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
        },
        message: "Invalid request parameters",
        timestamp: new Date().toISOString()
      });
    }

    // Create operation tracking record
    const operationId = `bulk_op_${Date.now()}_${uuidv4().substring(0, 8)}`;
    operation = new Operation({
      operationId,
      status: 'processing',
      targetRoles,
      messageContent: message_content,
      templateName: template_name,
      includeUserImage: include_user_image
    });
    await operation.save();

    console.log(`📋 Created operation: ${operationId}`);

    // Query MongoDB for users with target roles
    console.log(`🔍 Querying users with roles: ${targetRoles.join(', ')}`);
    const users = await User.find({ user_role: { $in: targetRoles } });
    console.log(`👥 Found ${users.length} users with target roles`);

    if (users.length === 0) {
      operation.status = 'completed';
      operation.completedAt = new Date();
      await operation.save();

      return res.status(404).json({
        success: false,
        error: 'NO_USERS_FOUND',
        message: `No users found with roles: ${targetRoles.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Update operation with user count
    operation.summary.totalTargeted = users.length;
    operation.summary.pendingCount = users.length;
    await operation.save();

    let posterS3Url = null;
    const results = [];
    const s3Uploads = [];

    // Upload poster image to S3 if provided
    if (posterFile && include_user_image) {
      console.log("📤 Uploading poster image to S3...");
      const posterKey = `posters/poster_${Date.now()}_${uuidv4()}.png`;
      posterS3Url = await uploadToS3(posterFile.buffer, posterKey);
      console.log(`✅ Poster uploaded to S3: ${posterS3Url}`);
    }

    // Process each user
    for (const user of users) {
      const userResult = {
        userId: user.user_id,
        userName: user.user_name,
        userPhone: user.user_phone,
        userRole: user.user_role,
        status: 'pending',
        attemptedAt: new Date()
      };

      try {
        let messagePayload;
        let personalizedImageUrl = null;

        if (posterFile && include_user_image) {
          // Create personalized image with user overlay
          console.log(`🎨 Creating personalized image for ${user.user_name}...`);

          // Download user image
          const userImageResponse = await axios.get(user.user_image, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
          });

          // Process poster image
          const posterBuffer = posterFile.buffer;
          const posterMetadata = await sharp(posterBuffer).metadata();

          // Resize user image
          const userImageBuffer = await sharp(userImageResponse.data)
            .resize(250, 250, {
              fit: 'cover',
              position: 'center'
            })
            .png()
            .toBuffer();

          // Parse positioning configuration
          let positionConfig;
          try {
            positionConfig = typeof user_image_position === 'string'
              ? JSON.parse(user_image_position)
              : user_image_position;
          } catch (e) {
            console.warn('⚠️ Invalid position config, using default');
            positionConfig = { preset: 'center-left', margin: 20 };
          }

          // Calculate user image position using new positioning system
          const calculatedPosition = calculateUserImagePosition(
            posterMetadata,
            { width: 250, height: 250 },
            positionConfig
          );
          console.log(`📍 User image position for ${user.user_name}: top=${calculatedPosition.top}, left=${calculatedPosition.left}`);

          // Create composite image with calculated positioning
          let compositeImage = await sharp(posterBuffer)
            .composite([{
              input: userImageBuffer,
              top: calculatedPosition.top,
              left: calculatedPosition.left,
              blend: 'over'
            }])
            .png()
            .toBuffer();

          // Parse text configuration
          let textConfiguration;
          try {
            textConfiguration = typeof text_config === 'string'
              ? JSON.parse(text_config)
              : text_config;
          } catch (e) {
            console.warn('⚠️ Invalid text config, using default');
            textConfiguration = {
              enabled: true,
              fontSize: 40,
              fontColor: 'white',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              position: { preset: 'bottom-center', margin: 20 }
            };
          }

          // Add user name as text overlay with configurable settings
          if (textConfiguration.enabled) {
            console.log(`📝 Adding text overlay for ${user.user_name} with config:`, textConfiguration);
            compositeImage = await addTextOverlay(compositeImage, user.user_name, {
              fontSize: textConfiguration.fontSize,
              fontColor: textConfiguration.fontColor,
              fontFamily: textConfiguration.fontFamily,
              fontWeight: textConfiguration.fontWeight,
              backgroundColor: textConfiguration.backgroundColor,
              backgroundOpacity: textConfiguration.backgroundOpacity,
              padding: textConfiguration.padding,
              borderRadius: textConfiguration.borderRadius,
              position: textConfiguration.position
            });
          }

          // Upload personalized image to S3
          const personalizedKey = `personalized/user_${user.user_id}_${Date.now()}.png`;
          personalizedImageUrl = await uploadToS3(compositeImage, personalizedKey);
          s3Uploads.push(personalizedImageUrl);
          userResult.personalizedImageUrl = personalizedImageUrl;

          // Template message with image
          messagePayload = {
            messaging_product: "whatsapp",
            to: user.user_phone,
            type: "template",
            template: {
              name: template_name,
              language: { code: "en" },
              components: [
                {
                  type: "header",
                  parameters: [{ type: "image", image: { link: personalizedImageUrl } }]
                },
                {
                  type: "body",
                  parameters: [{ type: "text", text: user.user_name }]
                }
              ]
            }
          };
        } else {
          // Text-only message
          messagePayload = {
            messaging_product: "whatsapp",
            to: user.user_phone,
            type: "text",
            text: {
              body: message_content.replace('{{name}}', user.user_name)
            }
          };
        }

        // Send WhatsApp message
        console.log(`📱 Sending WhatsApp message to ${user.user_name}...`);
        const currentToken = await getCurrentWhatsAppToken();

        const whatsappResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
          messagePayload,
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json"
            },
            timeout: 15000
          }
        );

        userResult.status = 'success';
        userResult.messageId = whatsappResponse.data.messages[0].id;
        userResult.deliveredAt = new Date();
        operation.summary.successCount++;

        console.log(`✅ Message sent successfully to ${user.user_name}: ${userResult.messageId}`);

      } catch (error) {
        console.error(`❌ Failed to send message to ${user.user_name}:`, error.message);

        userResult.status = 'failed';
        userResult.error = error.message;

        if (error.response?.data?.error?.code) {
          userResult.errorCode = error.response.data.error.code;
        } else if (error.code) {
          userResult.errorCode = error.code;
        } else {
          userResult.errorCode = 'UNKNOWN_ERROR';
        }

        operation.summary.failureCount++;
      }

      operation.summary.pendingCount--;
      results.push(userResult);
    }

    // Update operation with final results
    const processingTime = Date.now() - startTime;
    operation.status = 'completed';
    operation.completedAt = new Date();
    operation.summary.processingTimeMs = processingTime;
    operation.results = results;
    await operation.save();

    console.log(`🎉 Bulk messaging completed in ${processingTime}ms`);
    console.log(`📊 Results: ${operation.summary.successCount} success, ${operation.summary.failureCount} failed`);

    // Return comprehensive response
    res.json({
      success: true,
      data: {
        summary: operation.summary,
        results: results,
        targetedRoles: targetRoles,
        operationId: operationId
      },
      message: `Bulk messaging completed with ${operation.summary.successCount} successful deliveries out of ${operation.summary.totalTargeted} attempts`
    });

  } catch (error) {
    console.error("❌ Bulk messaging error:", error.message);

    // Update operation status if it exists
    if (operation) {
      operation.status = 'failed';
      operation.completedAt = new Date();
      operation.summary.processingTimeMs = Date.now() - startTime;
      await operation.save().catch(saveError =>
        console.error("Failed to save operation error state:", saveError.message)
      );
    }

    if (error.response) {
      console.error("📡 API Response Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      return res.status(error.response.status).json({
        success: false,
        error: "WhatsApp API Error",
        details: {
          whatsappError: error.response.data?.error?.message || "Unknown WhatsApp API error",
          retryAfter: error.response.headers?.['retry-after'] || null
        },
        message: "WhatsApp API error occurred during bulk messaging",
        timestamp: new Date().toISOString()
      });
    } else {
      console.error("🔧 Processing Error:", error.stack);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Message delivery status endpoint
app.get('/api/message-status/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;

    console.log(`📊 Fetching status for operation: ${operationId}`);

    // Find the operation in the database
    const operation = await Operation.findOne({ operationId });

    if (!operation) {
      return res.status(404).json({
        success: false,
        error: 'OPERATION_NOT_FOUND',
        message: `Operation with ID ${operationId} not found`,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Found operation: ${operation.status}`);

    // Return comprehensive status information
    res.json({
      success: true,
      data: {
        operationId: operation.operationId,
        status: operation.status,
        summary: operation.summary,
        startedAt: operation.startedAt,
        completedAt: operation.completedAt,
        results: operation.results.map(result => ({
          userId: result.userId,
          userName: result.userName,
          userPhone: result.userPhone,
          userRole: result.userRole,
          status: result.status,
          messageId: result.messageId,
          error: result.error,
          errorCode: result.errorCode,
          deliveredAt: result.deliveredAt,
          readAt: result.readAt,
          attemptedAt: result.attemptedAt,
          personalizedImageUrl: result.personalizedImageUrl
        }))
      },
      message: "Operation status retrieved successfully"
    });

  } catch (error) {
    console.error("❌ Error fetching operation status:", error.message);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: "Failed to retrieve operation status",
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy bulk messaging endpoint (keep for backward compatibility)
app.post('/send-bulk-messages', upload.single('poster_image'), async (req, res) => {
  try {
    const {
      target_role,
      user_image_position = '{"preset": "center-left", "margin": 20}' // New positioning parameter
    } = req.body;
    const posterFile = req.file;

    console.log("📢 Starting bulk message operation...");
    console.log(`🎯 Target role: ${target_role}`);

    // Validation
    if (!posterFile) {
      return res.status(400).json({
        error: 'Missing poster_image file',
        message: 'Please upload a PNG poster image'
      });
    }

    if (!target_role) {
      return res.status(400).json({
        error: 'Missing target_role',
        message: 'Please specify target_role (karyakarta, admin, user, manager)'
      });
    }

    if (!['karyakarta', 'admin', 'user', 'manager'].includes(target_role)) {
      return res.status(400).json({
        error: 'Invalid target_role',
        message: 'target_role must be one of: karyakarta, admin, user, manager'
      });
    }

    // Step 1: Upload poster image to S3
    console.log("📤 Uploading poster image to S3...");
    const posterKey = `posters/poster_${Date.now()}_${uuidv4()}.png`;
    const posterS3Url = await uploadToS3(posterFile.buffer, posterKey);
    console.log(`✅ Poster uploaded to S3: ${posterS3Url}`);

    // Step 2: Query MongoDB for users with target role
    console.log(`🔍 Querying users with role: ${target_role}`);
    const users = await User.find({ user_role: target_role });
    console.log(`👥 Found ${users.length} users with role ${target_role}`);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'No users found',
        message: `No users found with role: ${target_role}`,
        total_users_found: 0
      });
    }

    // Initialize tracking variables
    let messagesSuccessful = 0;
    let messagesFailed = 0;
    const s3Uploads = [posterS3Url];
    const whatsappMessageIds = [];
    const errors = [];

    // Step 3: Process each user
    console.log("🔄 Processing users...");

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n👤 Processing user ${i + 1}/${users.length}: ${user.user_name} (${user.user_phone})`);

      try {
        // Download user image
        console.log(`📥 Downloading user image: ${user.user_image}`);
        const userImageResponse = await axios.get(user.user_image, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
        });

        // Process poster image
        const posterBuffer = posterFile.buffer;
        const posterMetadata = await sharp(posterBuffer).metadata();

        // Resize user image
        const userImageBuffer = await sharp(userImageResponse.data)
          .resize(250, 250, {
            fit: 'cover',
            position: 'center'
          })
          .png()
          .toBuffer();

        // Parse positioning configuration
        let positionConfig;
        try {
          positionConfig = typeof user_image_position === 'string'
            ? JSON.parse(user_image_position)
            : user_image_position;
        } catch (e) {
          console.warn('⚠️ Invalid position config, using default');
          positionConfig = { preset: 'center-left', margin: 20 };
        }

        // Calculate user image position using new positioning system
        const calculatedPosition = calculateUserImagePosition(
          posterMetadata,
          { width: 250, height: 250 },
          positionConfig
        );
        console.log(`📍 User image position for ${user.user_name}: top=${calculatedPosition.top}, left=${calculatedPosition.left}`);

        // Create composite image with calculated positioning
        let compositeImage = await sharp(posterBuffer)
          .composite([{
            input: userImageBuffer,
            top: calculatedPosition.top,
            left: calculatedPosition.left,
            blend: 'over'
          }])
          .png()
          .toBuffer();

        // Add user name as text overlay (centered)
        compositeImage = await addTextOverlay(compositeImage, user.user_name, {
          fontSize: 36,
          fontColor: 'white',
          position: 'bottom',
          margin: 30,
          align: 'center' // Center the text horizontally
        });

        // Upload personalized image to S3
        const personalizedKey = `personalized/user_${user.user_id}_${Date.now()}.png`;
        const personalizedS3Url = await uploadToS3(compositeImage, personalizedKey);
        s3Uploads.push(personalizedS3Url);

        console.log(`✅ Personalized image uploaded: ${personalizedS3Url}`);

        // Send WhatsApp message
        console.log("📱 Sending WhatsApp message...");

        // Get current valid token
        const currentToken = await getCurrentWhatsAppToken();

        const whatsappPayload = {
          messaging_product: "whatsapp",
          to: user.user_phone,
          type: "template",
          template: {
            name: "poster_template",
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [{ type: "image", image: { link: personalizedS3Url } }]
              },
              {
                type: "body",
                parameters: [{ type: "text", text: user.user_name }]
              }
            ]
          }
        };

        const whatsappResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
          whatsappPayload,
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json"
            },
            timeout: 15000
          }
        );

        const messageId = whatsappResponse.data.messages[0]?.id || "unknown";
        whatsappMessageIds.push(messageId);
        messagesSuccessful++;

        console.log(`✅ Message sent successfully! ID: ${messageId}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (userError) {
        messagesFailed++;
        const errorMsg = `Failed for user ${user.user_name} (${user.user_phone}): ${userError.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log("\n📊 Bulk messaging operation completed!");
    console.log(`✅ Successful: ${messagesSuccessful}`);
    console.log(`❌ Failed: ${messagesFailed}`);

    // Return summary response
    return res.json({
      status: 'completed',
      total_users_found: users.length,
      messages_sent: messagesSuccessful,
      failed_messages: messagesFailed,
      s3_uploads: s3Uploads,
      whatsapp_message_ids: whatsappMessageIds,
      errors: errors,
      poster_s3_url: posterS3Url,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Bulk messaging error:", error.message);

    if (error.response) {
      console.error("📡 API Response Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });

      return res.status(error.response.status).json({
        error: "API Error",
        details: error.response.data,
        status: error.response.status
      });
    } else {
      console.error("🔧 Processing Error:", error.stack);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }
});

// Test endpoint to preview image overlay without sending WhatsApp message
app.post('/preview-image', async (req, res) => {
  try {
    const {
      poster_url,
      user_image_url,
      user_image_size = { width: 300, height: 300 },
      position = { top: 100, left: 20 } // Updated to match new positioning
    } = req.body;

    if (!poster_url || !user_image_url) {
      return res.status(400).json({
        error: 'Missing required fields: poster_url, user_image_url'
      });
    }

    if (!isValidImageUrl(poster_url) || !isValidImageUrl(user_image_url)) {
      return res.status(400).json({
        error: 'Invalid image URLs provided'
      });
    }

    console.log("🔍 Generating image preview...");

    // Download both images
    const [posterRes, userRes] = await Promise.all([
      axios.get(poster_url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
      }),
      axios.get(user_image_url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'WhatsApp-Business-Bot/1.0' }
      })
    ]);

    // Process images
    const posterBuffer = Buffer.from(posterRes.data);
    const posterMetadata = await sharp(posterBuffer).metadata();

    const userImageBuffer = await sharp(userRes.data)
      .resize(user_image_size.width, user_image_size.height, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();

    // Calculate user image position using new positioning system
    const calculatedPosition = calculateUserImagePosition(posterMetadata, user_image_size, position);
    console.log(`📍 Preview image position: top=${calculatedPosition.top}, left=${calculatedPosition.left}`);

    const finalImage = await sharp(posterBuffer)
      .composite([{
        input: userImageBuffer,
        top: calculatedPosition.top,
        left: calculatedPosition.left,
        blend: 'over'
      }])
      .png({ quality: 90 })
      .toBuffer();

    const filename = `preview_${generateUniqueFilename()}`;
    const outputPath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(outputPath, finalImage);

    const previewUrl = `${process.env.DOMAIN_URL}/public/${filename}`;

    console.log("✅ Preview generated:", previewUrl);

    res.json({
      status: 'success',
      previewUrl: previewUrl,
      posterDimensions: {
        width: posterMetadata.width,
        height: posterMetadata.height
      },
      userImageSize: user_image_size,
      position: position
    });

  } catch (error) {
    console.error("❌ Preview error:", error.message);
    res.status(500).json({
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

// Use Railway's PORT environment variable or default to 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📋 Available endpoints:");
  console.log("");
  console.log("🆕 Enhanced API Endpoints (for Android app):");
  console.log("  GET  /api/roles - Get available user roles with counts");
  console.log("  GET  /api/position-options - Get available user image positioning options");
  console.log("  POST /api/send-bulk-message - Enhanced bulk messaging with comprehensive tracking");
  console.log("  GET  /api/templates - Get WhatsApp Business templates (enhanced)");
  console.log("  GET  /api/message-status/:operationId - Get bulk messaging operation status");
  console.log("");
  console.log("📱 Legacy Endpoints (backward compatibility):");
  console.log("  POST /send-message - Send WhatsApp message with image overlay");
  console.log("  POST /send-bulk-messages - Send bulk WhatsApp messages with personalized images");
  console.log("  POST /preview-image - Generate image preview without sending");
  console.log("  GET  /templates - Get WhatsApp Business templates (legacy)");
  console.log("  GET  /token-status - Check WhatsApp token status");
  console.log("  POST /refresh-token - Manually refresh WhatsApp token");
  console.log("  GET  /health - Health check");
  console.log("  GET  /public/* - Static file serving");
  console.log("");
  console.log("🔄 WhatsApp Token Manager: Active");
  console.log("📊 MongoDB: Connected with Operation tracking");
  console.log("☁️  AWS S3: Configured for image storage");
  console.log("⏰ Auto-refresh: Every 30 minutes");
});
