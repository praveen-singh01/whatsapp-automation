const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

// Test data - using your specific image URLs and phone number
const testData = {
  poster_url: 'https://images.netaapp.in/20-7-2024/AAPP.jpeg', // Your poster image
  user_image_url: 'https://images.netaapp.in/20-7-2024/AAPP.jpeg', // Your user image (same as poster for testing)
  phone_number: '97471063300', // Your WhatsApp number
  name: 'Test User',
  user_image_size: { width: 250, height: 250 },
  position: { top: 100, left: 50 } // Position on left side
};

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

async function testImagePreview() {
  try {
    console.log('🔍 Testing image preview (without sending WhatsApp message)...');

    const previewData = {
      poster_url: testData.poster_url,
      user_image_url: testData.user_image_url,
      user_image_size: testData.user_image_size,
      position: testData.position
    };

    const response = await axios.post(`${BASE_URL}/preview-image`, previewData);

    console.log('✅ Image preview test successful!');
    console.log('📊 Response status:', response.status);
    console.log('🖼️ Preview URL:', response.data.previewUrl);
    console.log('📐 Poster dimensions:', response.data.posterDimensions);
    console.log('👤 User image size:', response.data.userImageSize);
    console.log('📍 Position:', response.data.position);

    return true;
  } catch (error) {
    console.error('❌ Image preview test failed:');
    if (error.response) {
      console.error('📡 Status:', error.response.status);
      console.error('📡 Error:', error.response.data);
    } else {
      console.error('📡 Error:', error.message);
    }
    return false;
  }
}

async function testSendMessage() {
  try {
    console.log('📱 Testing WhatsApp message sending...');
    console.log('⚠️  WARNING: This will attempt to send an actual WhatsApp message!');
    console.log('⚠️  Make sure to update the phone number in testData before running this test');

    // For safety, we'll skip the actual sending unless explicitly enabled
    const ENABLE_ACTUAL_SENDING = true; // Set to true to actually send WhatsApp message

    if (!ENABLE_ACTUAL_SENDING) {
      console.log('⏭️  Skipping actual WhatsApp sending (set ENABLE_ACTUAL_SENDING = true to enable)');
      return true;
    }

    const response = await axios.post(`${BASE_URL}/send-message`, testData);

    console.log('✅ WhatsApp message sent successfully!');
    console.log('📊 Response status:', response.status);
    console.log('📱 Message ID:', response.data.messageId);
    console.log('🖼️ Image URL:', response.data.imageUrl);
    console.log('⏰ Timestamp:', response.data.timestamp);

    return true;
  } catch (error) {
    console.error('❌ WhatsApp message test failed:');
    if (error.response) {
      console.error('📡 Status:', error.response.status);
      console.error('📡 Error:', error.response.data);

      if (error.response.status === 400 && error.response.data.error?.includes('template')) {
        console.log('\n💡 Template Error Fix:');
        console.log('   1. Make sure you have a WhatsApp template named "poster_template"');
        console.log('   2. The template should be APPROVED in your WhatsApp Business Manager');
        console.log('   3. Template should have: Header (image) + Body (text parameter)');
      }
    } else {
      console.error('📡 Error:', error.message);
    }
    return false;
  }
}

async function runSendMessageTests() {
  console.log('🚀 Starting WhatsApp Send Message API tests...\n');

  console.log('📋 Test Configuration:');
  console.log(`  Poster URL: ${testData.poster_url}`);
  console.log(`  User Image URL: ${testData.user_image_url}`);
  console.log(`  Phone Number: ${testData.phone_number}`);
  console.log(`  User Name: ${testData.name}`);
  console.log(`  Image Size: ${testData.user_image_size.width}x${testData.user_image_size.height}`);
  console.log(`  Position: top=${testData.position.top}, left=${testData.position.left}`);
  console.log('');

  const healthOk = await testHealthCheck();
  console.log('');

  if (!healthOk) {
    console.log('❌ Server is not healthy, stopping tests');
    return;
  }

  const previewOk = await testImagePreview();
  console.log('');

  const sendOk = await testSendMessage();
  console.log('');

  console.log('📊 Test Results:');
  console.log(`  Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`  Image Preview: ${previewOk ? '✅' : '❌'}`);
  console.log(`  Send Message: ${sendOk ? '✅' : '❌'}`);

  if (healthOk && previewOk && sendOk) {
    console.log('\n🎉 All tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Update phone_number in testData with a real WhatsApp number');
    console.log('   2. Set ENABLE_ACTUAL_SENDING = true in testSendMessage function');
    console.log('   3. Make sure your WhatsApp template "poster_template" is approved');
    console.log('   4. Run the test again to send actual WhatsApp messages');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.');
  }
}

// Run the tests
runSendMessageTests().catch(console.error);
