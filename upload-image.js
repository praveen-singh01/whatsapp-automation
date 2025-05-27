const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

async function uploadImage(localFilePath, s3Key) {
  try {
    console.log(`📤 Uploading ${localFilePath} to S3...`);
    
    // Read the file
    const fileContent = fs.readFileSync(localFilePath);
    
    // Upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'image/png'
    };

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();
    
    // Generate custom domain URL
    const customUrl = process.env.AWS_S3_CUSTOM_DOMAIN 
      ? `${process.env.AWS_S3_CUSTOM_DOMAIN}/${s3Key}`
      : result.Location;
    
    console.log(`✅ Upload successful!`);
    console.log(`📍 S3 URL: ${result.Location}`);
    console.log(`🔗 Custom URL: ${customUrl}`);
    
    return customUrl;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

// Usage
const localImagePath = './image.png'; // Adjust path as needed
const s3Key = `test-images/image-${Date.now()}.png`;

uploadImage(localImagePath, s3Key)
  .then(url => {
    console.log(`\n🎉 Image uploaded successfully!`);
    console.log(`Use this URL in your curl command: ${url}`);
  })
  .catch(error => {
    console.error('Failed to upload image:', error);
  });
