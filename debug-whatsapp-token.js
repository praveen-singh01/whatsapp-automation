const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function debugWhatsAppToken() {
  console.log('🔍 WhatsApp Token Debugging Tool\n');
  
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  
  console.log('📋 Configuration Check:');
  console.log(`  Token: ${token ? `${token.substring(0, 20)}...` : '❌ Not set'}`);
  console.log(`  Phone ID: ${phoneId || '❌ Not set'}`);
  console.log(`  Business Account ID: ${businessAccountId || '❌ Not set'}\n`);
  
  if (!token || !phoneId || !businessAccountId) {
    console.log('❌ Missing required configuration. Please check your .env file.');
    return;
  }
  
  // Test 1: Check token validity with templates endpoint
  console.log('🧪 Test 1: Token Validation (Templates Endpoint)');
  try {
    const templatesResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1 },
        timeout: 10000
      }
    );
    console.log('✅ Templates endpoint: SUCCESS');
    console.log(`   Found ${templatesResponse.data.data?.length || 0} templates\n`);
  } catch (error) {
    console.log('❌ Templates endpoint: FAILED');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}\n`);
  }
  
  // Test 2: Check phone number status
  console.log('🧪 Test 2: Phone Number Status');
  try {
    const phoneResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${phoneId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );
    console.log('✅ Phone number check: SUCCESS');
    console.log(`   Phone: ${phoneResponse.data.display_phone_number}`);
    console.log(`   Status: ${phoneResponse.data.verified_name}`);
    console.log(`   Quality Rating: ${phoneResponse.data.quality_rating || 'N/A'}\n`);
  } catch (error) {
    console.log('❌ Phone number check: FAILED');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    console.log(`   Status Code: ${error.response?.status}\n`);
  }
  
  // Test 3: Check business account permissions
  console.log('🧪 Test 3: Business Account Permissions');
  try {
    const accountResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${businessAccountId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { fields: 'id,name,timezone_offset_hours_utc' },
        timeout: 10000
      }
    );
    console.log('✅ Business account check: SUCCESS');
    console.log(`   Account: ${accountResponse.data.name}`);
    console.log(`   ID: ${accountResponse.data.id}\n`);
  } catch (error) {
    console.log('❌ Business account check: FAILED');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}\n`);
  }
  
  // Test 4: Test message sending capability (dry run)
  console.log('🧪 Test 4: Message Sending Capability Test');
  try {
    // Try to send a test message to a test number (this will likely fail but shows us the exact error)
    const testPayload = {
      messaging_product: "whatsapp",
      to: "1234567890", // Invalid test number
      type: "template",
      template: {
        name: "hello_world", // Default template
        language: { code: "en_US" }
      }
    };
    
    const messageResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      testPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );
    console.log('✅ Message endpoint: SUCCESS (unexpected!)');
  } catch (error) {
    console.log('📊 Message endpoint response:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error Code: ${error.response.data?.error?.code}`);
      console.log(`   Error Type: ${error.response.data?.error?.type}`);
      console.log(`   Message: ${error.response.data?.error?.message}`);
      console.log(`   Subcode: ${error.response.data?.error?.error_subcode || 'N/A'}`);
      
      // Analyze the error
      if (error.response.status === 401) {
        console.log('\n🔍 401 Error Analysis:');
        if (error.response.data?.error?.code === 190) {
          console.log('   ❌ Token is invalid or expired');
          console.log('   💡 Solution: Generate a new access token');
        } else if (error.response.data?.error?.code === 200) {
          console.log('   ❌ Insufficient permissions');
          console.log('   💡 Solution: Check app permissions and review process');
        } else {
          console.log('   ❌ Authentication issue');
          console.log('   💡 Solution: Verify token and app configuration');
        }
      } else if (error.response.status === 400) {
        console.log('\n🔍 400 Error Analysis:');
        console.log('   ✅ Token authentication worked!');
        console.log('   ❌ Request format or data issue');
        console.log('   💡 This is expected for our test - the endpoint is accessible');
      }
    } else {
      console.log(`   Network Error: ${error.message}`);
    }
  }
  
  console.log('\n📋 Summary & Recommendations:');
  console.log('1. If Templates endpoint works but Messages fails with 401:');
  console.log('   - Token has read permissions but not send permissions');
  console.log('   - App may need to go through Meta review process');
  console.log('   - Check if phone number is properly verified');
  
  console.log('\n2. If you get error code 190:');
  console.log('   - Token is expired (even if it worked for templates)');
  console.log('   - Generate a new token from Meta Developer Console');
  
  console.log('\n3. If you get error code 200:');
  console.log('   - App lacks required permissions');
  console.log('   - Submit app for Meta review to get production access');
  
  console.log('\n4. To fix immediately:');
  console.log('   - Go to https://developers.facebook.com/');
  console.log('   - Navigate to your WhatsApp Business app');
  console.log('   - Generate a new 24-hour access token');
  console.log('   - Update WHATSAPP_TOKEN in your .env file');
}

// Run the debug tool
debugWhatsAppToken().catch(console.error);
