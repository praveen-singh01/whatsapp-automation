# WhatsApp Business Bulk Messaging System

A comprehensive Node.js backend system that integrates MongoDB, AWS S3, and WhatsApp Business API for bulk personalized messaging with image overlays.

## Features

- 🚀 **Bulk Messaging**: Send personalized WhatsApp messages to multiple users based on roles
- 📊 **MongoDB Integration**: User management with role-based targeting
- ☁️ **AWS S3 Storage**: Automatic upload and management of poster and personalized images
- ✨ **Image Processing**: Overlay user images on posters with text personalization
- 📱 **WhatsApp Business API**: Template-based messaging with image attachments
- 🎯 **Role-Based Targeting**: Target specific user roles (karyakarta, admin, user, manager)
- 🔍 **Preview Mode**: Test image overlays without sending messages
- 🛡️ **Comprehensive Error Handling**: Detailed error tracking and reporting
- 📈 **Bulk Operation Tracking**: Success/failure counts and message IDs
- ⚡ **Performance Optimized**: Efficient image processing with Sharp.js

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- AWS S3 bucket with appropriate permissions
- WhatsApp Business API access
- Valid WhatsApp Business phone number
- WhatsApp Business Account ID (WABA ID)
- Approved message template named "poster_template"

**Required Services Setup:**
1. **MongoDB**: Local installation or MongoDB Atlas cloud database
2. **AWS S3**: Create a bucket for storing images with public read access
3. **WhatsApp Business**: Get your WABA ID from [Meta Business Manager](https://business.facebook.com/)
   - Navigate to Business Settings > Accounts > WhatsApp Business Accounts
   - The WABA ID will be displayed in the URL or account details

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```
   # WhatsApp Business API
   WHATSAPP_TOKEN=your_whatsapp_access_token
   WHATSAPP_PHONE_ID=your_phone_number_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id
   DOMAIN_URL=your_public_domain_url

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/whatsapp_business

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=whatsapp-business-images
   ```

4. Set up MongoDB and create test data:
   ```bash
   # Make sure MongoDB is running, then create test users
   node create-test-data.js
   ```

5. Start the server:
   ```bash
   node app.js
   ```

## API Endpoints

### POST /send-bulk-messages
**Primary Endpoint**: Send personalized WhatsApp messages to multiple users based on role.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `poster_image`: PNG file upload (the base poster image)
  - `target_role`: String (karyakarta, admin, user, manager)

**Response:**
```json
{
  "status": "completed",
  "total_users_found": 5,
  "messages_sent": 4,
  "failed_messages": 1,
  "s3_uploads": [
    "https://s3.amazonaws.com/bucket/posters/poster_xxx.png",
    "https://s3.amazonaws.com/bucket/personalized/user_001_xxx.png"
  ],
  "whatsapp_message_ids": ["wamid.xxx1", "wamid.xxx2"],
  "errors": ["Failed for user John Doe: Network timeout"],
  "poster_s3_url": "https://s3.amazonaws.com/bucket/posters/poster_xxx.png",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### POST /send-message
Send single WhatsApp message with image overlay.

**Request Body:**
```json
{
  "poster_url": "https://example.com/poster.jpg",
  "user_image_url": "https://example.com/user.jpg",
  "phone_number": "+1234567890",
  "name": "John Doe",
  "user_image_size": { "width": 300, "height": 300 },
  "position": { "top": 50, "left": 50 }
}
```

**Response:**
```json
{
  "status": "sent",
  "messageId": "wamid.xxx",
  "imageUrl": "https://yourdomain.com/public/composite_xxx.png",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### POST /preview-image
Generate image overlay preview without sending WhatsApp message.

**Request Body:**
```json
{
  "poster_url": "https://example.com/poster.jpg",
  "user_image_url": "https://example.com/user.jpg",
  "user_image_size": { "width": 300, "height": 300 },
  "position": { "top": 50, "left": 50 }
}
```

### GET /templates
Get all WhatsApp Business message templates.

**Query Parameters:**
- `limit` (optional): Number of templates to return (default: 100)
- `fields` (optional): Comma-separated list of fields to include (default: name,status,language,category,components)

**Response:**
```json
{
  "status": "success",
  "count": 5,
  "templates": [
    {
      "id": "123456789",
      "name": "poster_template",
      "status": "APPROVED",
      "language": "en",
      "category": "MARKETING",
      "components": [...],
      "created_time": "2024-01-01T12:00:00.000Z",
      "updated_time": "2024-01-01T12:00:00.000Z"
    }
  ],
  "paging": {...},
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

## Configuration Options

### Image Processing
- `user_image_size`: Resize user image to specified dimensions
- `position`: Position of user image on poster (top, left coordinates)
- Automatic boundary checking to prevent overflow
- High-quality PNG output with 90% quality

### WhatsApp Template
The application expects a WhatsApp template named "poster_template" with:
- Header: Image parameter
- Body: Text parameter for user name

## Database Schema

### Users Collection
```javascript
{
  user_id: String,        // Unique identifier (e.g., "kary_001")
  user_image: String,     // URL to user's profile image
  user_name: String,      // User's display name
  user_phone: String,     // WhatsApp phone number
  user_role: String,      // "karyakarta", "admin", "user", "manager"
  createdAt: Date,        // Auto-generated
  updatedAt: Date         // Auto-generated
}
```

## Testing

### 1. Create Test Data
```bash
node create-test-data.js
```
This creates 20 test users (5 for each role) in MongoDB.

### 2. Test Bulk Messaging System
```bash
node test-bulk-messaging.js
```
Comprehensive test of the bulk messaging functionality.

### 3. Test Individual Endpoints
```bash
# Test single message sending
node test-send-message.js

# Test templates endpoint
node test-templates.js

# Test main API functionality
node test-api.js
```

**Prerequisites for Testing:**
- MongoDB running with test data
- AWS S3 credentials configured
- WhatsApp Business API template approved
- Test poster image (PNG format) available

## Error Handling

The application includes comprehensive error handling for:
- Invalid image URLs
- Network timeouts
- WhatsApp API errors
- Image processing failures
- File system operations

## File Management

- Generated images are stored in the `public/` directory
- Unique filenames prevent conflicts
- Automatic cleanup keeps only the 10 most recent files
- Images are publicly accessible via HTTP

## Security Considerations

- Input validation for all URLs and parameters
- Timeout protection for external requests
- File size limits for uploads
- Secure token handling for WhatsApp API

## Troubleshooting

### Common Issues

1. **WhatsApp API Errors**: Check token validity and template approval
2. **Image Download Failures**: Verify image URLs are publicly accessible
3. **File Permission Errors**: Ensure write permissions for `public/` directory
4. **Memory Issues**: Monitor server resources for large image processing

### Logs

The application provides detailed logging with emojis for easy identification:
- 📥 Request processing
- ✅ Successful operations
- ❌ Errors and failures
- 🔄 Image processing steps
- 📤 WhatsApp message sending

## License

MIT License
# whatsapp
# whatsapp
