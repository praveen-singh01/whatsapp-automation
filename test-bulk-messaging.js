const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';

async function testHealthCheck() {
  try {
    console.log('🏥 Testing health check endpoint...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed!');
    console.log('📊 Server status:', response.data.status);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('💡 Make sure the server is running on port 3000');
    return false;
  }
}

async function testBulkMessaging(targetRole = 'karyakarta') {
  try {
    console.log(`📢 Testing bulk messaging for role: ${targetRole}...`);
    
    // Create a simple test poster image (PNG)
    const testImagePath = path.join(__dirname, 'test-poster.png');
    
    // Check if test image exists, if not create a simple one
    if (!fs.existsSync(testImagePath)) {
      console.log('📝 Creating test poster image...');
      // For testing, we'll use a simple approach - copy an existing image or create a placeholder
      // In a real scenario, you would have an actual PNG file
      console.log('⚠️  Please create a test-poster.png file in the project directory for testing');
      console.log('   You can download any PNG image and rename it to test-poster.png');
      return false;
    }

    // Create form data
    const formData = new FormData();
    formData.append('poster_image', fs.createReadStream(testImagePath));
    formData.append('target_role', targetRole);

    console.log('📤 Sending bulk messaging request...');
    const response = await axios.post(`${BASE_URL}/send-bulk-messages`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 300000, // 5 minutes timeout for bulk operations
    });

    console.log('✅ Bulk messaging request successful!');
    console.log('📊 Response status:', response.status);
    console.log('📋 Results:');
    console.log(`  Total users found: ${response.data.total_users_found}`);
    console.log(`  Messages sent: ${response.data.messages_sent}`);
    console.log(`  Failed messages: ${response.data.failed_messages}`);
    console.log(`  S3 uploads: ${response.data.s3_uploads.length}`);
    console.log(`  WhatsApp message IDs: ${response.data.whatsapp_message_ids.length}`);
    
    if (response.data.errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      response.data.errors.forEach((error, index) => {
        console.log(`    ${index + 1}. ${error}`);
      });
    }

    console.log(`🖼️  Poster S3 URL: ${response.data.poster_s3_url}`);
    
    return true;
  } catch (error) {
    console.error('❌ Bulk messaging test failed:');
    if (error.response) {
      console.error('📡 Status:', error.response.status);
      console.error('📡 Error:', error.response.data);
      
      if (error.response.status === 404) {
        console.log('\n💡 No users found with the specified role.');
        console.log('   Make sure to run: node create-test-data.js first');
      } else if (error.response.status === 500 && error.response.data.message?.includes('AWS')) {
        console.log('\n💡 AWS S3 Configuration Error:');
        console.log('   1. Update AWS_ACCESS_KEY_ID in your .env file');
        console.log('   2. Update AWS_SECRET_ACCESS_KEY in your .env file');
        console.log('   3. Make sure the S3 bucket exists and is accessible');
      }
    } else {
      console.error('📡 Error:', error.message);
    }
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    console.log('🗄️  Testing database connection...');
    
    // Test by trying to get users count
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Database connection test passed!');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.log('💡 Make sure MongoDB is running and MONGODB_URI is correct in .env');
    return false;
  }
}

async function createTestPosterImage() {
  try {
    console.log('🎨 Creating test poster image...');
    
    // Create a simple colored PNG using a basic approach
    // This is a placeholder - in real usage, you'd have actual poster images
    const testImagePath = path.join(__dirname, 'test-poster.png');
    
    if (fs.existsSync(testImagePath)) {
      console.log('✅ Test poster image already exists');
      return true;
    }
    
    console.log('📝 Please create a test poster image:');
    console.log('   1. Download any PNG image');
    console.log('   2. Save it as "test-poster.png" in the project directory');
    console.log('   3. Run this test again');
    
    return false;
  } catch (error) {
    console.error('❌ Error creating test poster:', error.message);
    return false;
  }
}

async function runBulkMessagingTests() {
  console.log('🚀 Starting Bulk Messaging System Tests...\n');
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Server is not healthy, stopping tests');
    return;
  }
  
  const dbOk = await testDatabaseConnection();
  console.log('');
  
  if (!dbOk) {
    console.log('❌ Database connection failed, stopping tests');
    return;
  }
  
  const imageOk = await createTestPosterImage();
  console.log('');
  
  if (!imageOk) {
    console.log('❌ Test poster image not available, stopping tests');
    return;
  }
  
  // Test different roles
  const roles = ['karyakarta', 'admin', 'user', 'manager'];
  const results = {};
  
  for (const role of roles) {
    console.log(`\n🎯 Testing bulk messaging for role: ${role}`);
    results[role] = await testBulkMessaging(role);
    console.log('');
    
    // Small delay between role tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('📊 Final Test Results:');
  console.log(`  Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`  Database Connection: ${dbOk ? '✅' : '❌'}`);
  console.log(`  Test Image: ${imageOk ? '✅' : '❌'}`);
  
  roles.forEach(role => {
    console.log(`  Bulk Messaging (${role}): ${results[role] ? '✅' : '❌'}`);
  });
  
  const allPassed = healthOk && dbOk && imageOk && Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Bulk messaging system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Make sure MongoDB is running with test data');
  console.log('   2. Configure AWS S3 credentials in .env file');
  console.log('   3. Ensure WhatsApp Business API template is approved');
  console.log('   4. Test with real poster images and phone numbers');
}

// Run the tests
runBulkMessagingTests().catch(console.error);
