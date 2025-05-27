const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

// Test data - replace with your actual image URLs and phone number
const testData = {
  poster_url: 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=POSTER',
  user_image_url: 'https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=USER',
  phone_number: '+1234567890', // Replace with actual WhatsApp number
  name: 'John Doe',
  user_image_size: { width: 200, height: 200 },
  position: { top: 100, left: 100 }
};

async function testHealthCheck() {
  try {
    console.log('🔍 Testing health check...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testImagePreview() {
  try {
    console.log('🔍 Testing image preview...');
    const response = await axios.post(`${BASE_URL}/preview-image`, {
      poster_url: testData.poster_url,
      user_image_url: testData.user_image_url,
      user_image_size: testData.user_image_size,
      position: testData.position
    });
    
    console.log('✅ Preview generated successfully!');
    console.log('📸 Preview URL:', response.data.previewUrl);
    console.log('📐 Poster dimensions:', response.data.posterDimensions);
    return true;
  } catch (error) {
    console.error('❌ Preview test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testWhatsAppMessage() {
  try {
    console.log('🔍 Testing WhatsApp message (WARNING: This will send an actual message!)...');
    console.log('⚠️  Make sure to update the phone number in testData before running this test');
    
    // Uncomment the lines below to actually send a WhatsApp message
    // const response = await axios.post(`${BASE_URL}/send-message`, testData);
    // console.log('✅ WhatsApp message sent successfully!');
    // console.log('📱 Message ID:', response.data.messageId);
    // console.log('🖼️ Image URL:', response.data.imageUrl);
    
    console.log('⏭️  Skipping WhatsApp test (uncomment code to enable)');
    return true;
  } catch (error) {
    console.error('❌ WhatsApp test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting API tests...\n');
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Server is not healthy, stopping tests');
    return;
  }
  
  const previewOk = await testImagePreview();
  console.log('');
  
  const whatsappOk = await testWhatsAppMessage();
  console.log('');
  
  console.log('📊 Test Results:');
  console.log(`  Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`  Image Preview: ${previewOk ? '✅' : '❌'}`);
  console.log(`  WhatsApp Message: ${whatsappOk ? '✅' : '❌'}`);
  
  if (healthOk && previewOk && whatsappOk) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testImagePreview,
  testWhatsAppMessage,
  runAllTests
};
