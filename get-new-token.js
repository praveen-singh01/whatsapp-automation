const axios = require('axios');
require('dotenv').config();

async function getNewWhatsAppToken() {
  console.log('🔄 Attempting to get new WhatsApp access token...');
  
  const appId = process.env.WHATSAPP_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const systemUserToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  
  console.log('📋 Configuration check:');
  console.log(`   App ID: ${appId !== 'your_app_id_here' ? appId : '❌ NOT CONFIGURED'}`);
  console.log(`   App Secret: ${appSecret !== 'your_app_secret_here' ? '✅ SET' : '❌ NOT CONFIGURED'}`);
  console.log(`   System User Token: ${systemUserToken !== 'your_system_user_token_here' ? '✅ SET' : '❌ NOT CONFIGURED'}`);
  console.log('');
  
  if (appId === 'your_app_id_here' || appSecret === 'your_app_secret_here' || systemUserToken === 'your_system_user_token_here') {
    console.log('❌ Token refresh configuration is not set up properly.');
    console.log('');
    console.log('📝 To set up automatic token refresh:');
    console.log('');
    console.log('1. Go to Meta Business Manager (business.facebook.com)');
    console.log('2. Navigate to your WhatsApp Business Account');
    console.log('3. Go to System Users and create/select a system user');
    console.log('4. Generate a system user access token with whatsapp_business_messaging permissions');
    console.log('5. Get your App ID and App Secret from your Facebook App settings');
    console.log('6. Update your .env file with these values:');
    console.log('   WHATSAPP_APP_ID=your_actual_app_id');
    console.log('   WHATSAPP_APP_SECRET=your_actual_app_secret');
    console.log('   WHATSAPP_SYSTEM_USER_TOKEN=your_actual_system_user_token');
    console.log('');
    console.log('🔗 Useful links:');
    console.log('   - Meta Business Manager: https://business.facebook.com');
    console.log('   - WhatsApp Business API Setup: https://developers.facebook.com/docs/whatsapp/business-management-api/get-started');
    console.log('');
    console.log('⚡ Quick fix: Get a new token manually from Meta Business Manager');
    console.log('   and update WHATSAPP_TOKEN in your .env file');
    return;
  }
  
  try {
    console.log('🔄 Requesting new access token...');
    
    // Method 1: Exchange system user token for access token
    const response = await axios.post(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      null,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: systemUserToken
        },
        timeout: 15000
      }
    );
    
    if (response.data.access_token) {
      const newToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      
      console.log('✅ New token obtained successfully!');
      console.log(`   Token: ${newToken.substring(0, 30)}...`);
      console.log(`   Expires in: ${expiresIn} seconds (${Math.round(expiresIn / 3600)} hours)`);
      console.log('');
      console.log('📝 Update your .env file:');
      console.log(`WHATSAPP_TOKEN=${newToken}`);
      console.log('');
      console.log('🧪 Testing new token...');
      
      // Test the new token
      const testResponse = await axios.get(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
        {
          headers: { Authorization: `Bearer ${newToken}` },
          params: { limit: 1 },
          timeout: 10000
        }
      );
      
      console.log('✅ New token is valid and working!');
      console.log(`   Templates found: ${testResponse.data.data?.length || 0}`);
      
    } else {
      console.log('❌ No access token in response');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Failed to get new token');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    
    if (error.response?.data) {
      console.log('   Full error:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.response?.status === 400) {
      console.log('');
      console.log('💡 Common 400 errors:');
      console.log('   - Invalid app credentials');
      console.log('   - System user token expired or invalid');
      console.log('   - Insufficient permissions on system user token');
    }
  }
}

// Alternative method to get token info
async function getTokenInfo() {
  console.log('\n🔍 Getting current token information...');
  
  const currentToken = process.env.WHATSAPP_TOKEN;
  
  if (!currentToken) {
    console.log('❌ No token found in environment');
    return;
  }
  
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        headers: { Authorization: `Bearer ${currentToken}` },
        params: { fields: 'id,name' },
        timeout: 10000
      }
    );
    
    console.log('✅ Current token info:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Name: ${response.data.name}`);
    
  } catch (error) {
    console.log('❌ Current token is invalid');
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Run both functions
async function main() {
  await getTokenInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  await getNewWhatsAppToken();
}

main().catch(console.error);
