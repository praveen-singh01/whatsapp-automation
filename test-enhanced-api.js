const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  testImagePath: './image.png',
  targetRoles: ['karyakarta'],
  messageContent: 'Hello {{name}}! This is a test message from the enhanced API.',
  templateName: 'poster_template',
  includeUserImage: true
};

async function testEnhancedAPI() {
  console.log('🧪 Testing Enhanced WhatsApp Business API...\n');

  try {
    // Test 1: Get available roles
    console.log('1️⃣ Testing GET /api/roles...');
    const rolesResponse = await axios.get(`${BASE_URL}/api/roles`);
    console.log('✅ Roles endpoint successful');
    console.log('📊 Available roles:', rolesResponse.data.data.roles.map(r => `${r.label} (${r.userCount} users)`).join(', '));
    console.log('👥 Total users:', rolesResponse.data.data.totalUsers);
    console.log('');

    // Test 2: Get templates
    console.log('2️⃣ Testing GET /api/templates...');
    const templatesResponse = await axios.get(`${BASE_URL}/api/templates?limit=5`);
    console.log('✅ Templates endpoint successful');
    console.log('📋 Templates found:', templatesResponse.data.data.templates.length);
    if (templatesResponse.data.data.templates.length > 0) {
      console.log('📝 First template:', templatesResponse.data.data.templates[0].name);
    }
    console.log('');

    // Test 3: Enhanced bulk messaging (if test image exists)
    if (fs.existsSync(TEST_CONFIG.testImagePath)) {
      console.log('3️⃣ Testing POST /api/send-bulk-message...');

      const formData = new FormData();
      formData.append('target_roles', JSON.stringify(TEST_CONFIG.targetRoles));
      formData.append('message_content', TEST_CONFIG.messageContent);
      formData.append('template_name', TEST_CONFIG.templateName);
      formData.append('include_user_image', TEST_CONFIG.includeUserImage.toString());
      formData.append('poster_image', fs.createReadStream(TEST_CONFIG.testImagePath));

      console.log('📤 Sending bulk message request...');
      const bulkResponse = await axios.post(`${BASE_URL}/api/send-bulk-message`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 300000, // 5 minutes timeout
      });

      console.log('✅ Bulk messaging successful');
      console.log('📊 Summary:', bulkResponse.data.data.summary);
      console.log('🆔 Operation ID:', bulkResponse.data.data.operationId);
      console.log('');

      // Test 4: Check operation status
      if (bulkResponse.data.data.operationId) {
        console.log('4️⃣ Testing GET /api/message-status/:operationId...');

        const statusResponse = await axios.get(`${BASE_URL}/api/message-status/${bulkResponse.data.data.operationId}`);
        console.log('✅ Status endpoint successful');
        console.log('📈 Operation status:', statusResponse.data.data.status);
        console.log('📊 Summary:', statusResponse.data.data.summary);
        console.log('');
      }
    } else {
      console.log('3️⃣ Skipping bulk messaging test - image.png not found');
      console.log(`   Please ensure image.png exists in the current directory`);
      console.log('');
    }

    // Test 5: Error handling - invalid roles
    console.log('5️⃣ Testing error handling with invalid roles...');
    try {
      const formData = new FormData();
      formData.append('target_roles', JSON.stringify(['invalid_role']));
      formData.append('message_content', 'Test message');

      await axios.post(`${BASE_URL}/api/send-bulk-message`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Error handling working correctly');
        console.log('❌ Expected error:', error.response.data.details.target_roles);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test 6: Error handling - missing message content
    console.log('6️⃣ Testing error handling with missing message content...');
    try {
      const formData = new FormData();
      formData.append('target_roles', JSON.stringify(['karyakarta']));

      await axios.post(`${BASE_URL}/api/send-bulk-message`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Error handling working correctly');
        console.log('❌ Expected error:', error.response.data.details.message_content);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');

    console.log('🎉 All API tests completed successfully!');
    console.log('');
    console.log('📱 Android Developer Notes:');
    console.log('   - All endpoints return consistent JSON format with success/error indicators');
    console.log('   - Use target_roles as JSON array string in form data');
    console.log('   - Operation IDs can be used to track message delivery status');
    console.log('   - Comprehensive error handling with specific error codes');
    console.log('   - File uploads supported for poster images');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('📡 Response status:', error.response.status);
      console.error('📄 Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the tests
if (require.main === module) {
  testEnhancedAPI();
}

module.exports = { testEnhancedAPI };
