const axios = require('axios');
require('dotenv').config();

async function testWhatsAppToken() {
  console.log('🔍 Testing WhatsApp Token with allowed recipient...');
  
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const testPhoneNumber = '97471063300'; // Your allowed recipient
  
  console.log('📋 Configuration:');
  console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`   Phone ID: ${phoneId}`);
  console.log(`   Business Account ID: ${businessAccountId}`);
  console.log(`   Test Phone: ${testPhoneNumber}`);
  console.log('');
  
  // Test 1: Validate token with templates endpoint
  console.log('🧪 Test 1: Token Validation (Templates)');
  try {
    const templatesResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { limit: 1 },
        timeout: 10000
      }
    );
    console.log('✅ Templates endpoint: SUCCESS');
    console.log(`   Found ${templatesResponse.data.data?.length || 0} templates`);
    
    // Show first template if available
    if (templatesResponse.data.data && templatesResponse.data.data.length > 0) {
      const template = templatesResponse.data.data[0];
      console.log(`   First template: ${template.name} (${template.status})`);
    }
  } catch (error) {
    console.log('❌ Templates endpoint: FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    if (error.response?.data) {
      console.log(`   Full error:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log('');
  
  // Test 2: Check phone number ID validity
  console.log('🧪 Test 2: Phone Number ID Validation');
  try {
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${phoneId}`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log('✅ Phone ID validation: SUCCESS');
    console.log(`   Phone Number: ${phoneResponse.data.display_phone_number}`);
    console.log(`   Status: ${phoneResponse.data.status}`);
  } catch (error) {
    console.log('❌ Phone ID validation: FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
  }
  console.log('');
  
  // Test 3: Try to send a simple text message (using hello_world template)
  console.log('🧪 Test 3: Simple Message Test');
  try {
    const messagePayload = {
      messaging_product: "whatsapp",
      to: testPhoneNumber,
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en_US" }
      }
    };
    
    console.log('📤 Sending test message...');
    console.log('   Payload:', JSON.stringify(messagePayload, null, 2));
    
    const messageResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      messagePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Message sent: SUCCESS');
    console.log(`   Message ID: ${messageResponse.data.messages[0]?.id}`);
    console.log(`   Status: ${messageResponse.data.messages[0]?.message_status}`);
    
  } catch (error) {
    console.log('❌ Message sending: FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    
    if (error.response?.data) {
      console.log('   Full error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    
    // Common error explanations
    if (error.response?.status === 400) {
      console.log('\n💡 Common 400 errors:');
      console.log('   - Invalid phone number format');
      console.log('   - Template not found or not approved');
      console.log('   - Phone number not in allowed list (for test accounts)');
    } else if (error.response?.status === 401) {
      console.log('\n💡 401 Unauthorized:');
      console.log('   - Invalid or expired token');
      console.log('   - Token doesn\'t have required permissions');
    } else if (error.response?.status === 403) {
      console.log('\n💡 403 Forbidden:');
      console.log('   - Phone number not verified');
      console.log('   - Business account restrictions');
    }
  }
  console.log('');
  
  // Test 4: Compare with n8n format
  console.log('🧪 Test 4: n8n-style Request Format');
  try {
    // This mimics how n8n might format the request
    const n8nStylePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: testPhoneNumber,
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
      }
    };
    
    console.log('📤 Sending n8n-style message...');
    console.log('   Payload:', JSON.stringify(n8nStylePayload, null, 2));
    
    const n8nResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      n8nStylePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );
    
    console.log('✅ n8n-style message: SUCCESS');
    console.log(`   Message ID: ${n8nResponse.data.messages[0]?.id}`);
    
  } catch (error) {
    console.log('❌ n8n-style message: FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
  }
  
  console.log('\n🏁 Token test completed!');
}

// Run the test
testWhatsAppToken().catch(console.error);
