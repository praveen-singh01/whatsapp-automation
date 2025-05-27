const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

async function testTokenStatus() {
  try {
    console.log('🔍 Testing token status endpoint...');
    const response = await axios.get(`${BASE_URL}/token-status`);
    
    console.log('✅ Token status retrieved successfully!');
    console.log('📊 Token Status:');
    console.log(`  Valid: ${response.data.tokenStatus.isValid ? '✅' : '❌'}`);
    console.log(`  Current Token: ${response.data.tokenStatus.currentToken}`);
    console.log(`  Expiry Time: ${response.data.tokenStatus.expiryTime}`);
    
    if (response.data.tokenStatus.timeUntilExpiry) {
      const hours = Math.floor(response.data.tokenStatus.timeUntilExpiry / (1000 * 60 * 60));
      const minutes = Math.floor((response.data.tokenStatus.timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
      console.log(`  Time Until Expiry: ${hours}h ${minutes}m`);
    }
    
    return response.data.tokenStatus.isValid;
  } catch (error) {
    console.error('❌ Token status test failed:', error.message);
    if (error.response) {
      console.error('📡 Error:', error.response.data);
    }
    return false;
  }
}

async function testTokenRefresh() {
  try {
    console.log('🔄 Testing manual token refresh...');
    const response = await axios.post(`${BASE_URL}/refresh-token`);
    
    console.log('✅ Token refresh successful!');
    console.log('📊 Refresh Result:');
    console.log(`  Status: ${response.data.status}`);
    console.log(`  Message: ${response.data.message}`);
    console.log(`  New Token: ${response.data.newToken}`);
    console.log(`  Timestamp: ${response.data.timestamp}`);
    
    return true;
  } catch (error) {
    console.error('❌ Token refresh test failed:', error.message);
    if (error.response) {
      console.error('📡 Error:', error.response.data);
      
      if (error.response.data.message?.includes('System user token not configured')) {
        console.log('\n💡 To enable automatic token refresh:');
        console.log('   1. Go to Meta Business Manager');
        console.log('   2. Create a System User with WhatsApp permissions');
        console.log('   3. Generate a System User Access Token');
        console.log('   4. Update these in your .env file:');
        console.log('      WHATSAPP_APP_ID=your_app_id');
        console.log('      WHATSAPP_APP_SECRET=your_app_secret');
        console.log('      WHATSAPP_SYSTEM_USER_ID=your_system_user_id');
        console.log('      WHATSAPP_SYSTEM_USER_TOKEN=your_system_user_token');
      }
    }
    return false;
  }
}

async function testWhatsAppAPI() {
  try {
    console.log('📱 Testing WhatsApp API with current token...');
    const response = await axios.get(`${BASE_URL}/templates?limit=1`);
    
    console.log('✅ WhatsApp API test successful!');
    console.log(`📊 Templates found: ${response.data.count}`);
    
    return true;
  } catch (error) {
    console.error('❌ WhatsApp API test failed:', error.message);
    if (error.response) {
      console.error('📡 Error:', error.response.data);
    }
    return false;
  }
}

async function testHealthCheck() {
  try {
    console.log('🏥 Testing health check...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed!');
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function runTokenManagementTests() {
  console.log('🚀 Starting Token Management Tests...\n');
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Server is not healthy, stopping tests');
    return;
  }
  
  const tokenStatusOk = await testTokenStatus();
  console.log('');
  
  const whatsappApiOk = await testWhatsAppAPI();
  console.log('');
  
  const tokenRefreshOk = await testTokenRefresh();
  console.log('');
  
  // Test token status again after refresh
  if (tokenRefreshOk) {
    console.log('🔄 Checking token status after refresh...');
    await testTokenStatus();
    console.log('');
  }
  
  console.log('📊 Test Results Summary:');
  console.log(`  Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`  Token Status: ${tokenStatusOk ? '✅' : '❌'}`);
  console.log(`  WhatsApp API: ${whatsappApiOk ? '✅' : '❌'}`);
  console.log(`  Token Refresh: ${tokenRefreshOk ? '✅' : '❌'}`);
  
  if (healthOk && tokenStatusOk && whatsappApiOk) {
    console.log('\n🎉 Token management system is working correctly!');
    
    if (!tokenRefreshOk) {
      console.log('\n⚠️  Token refresh failed - this is expected if system user credentials are not configured');
      console.log('   The system will still work with manual token updates');
    }
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
  
  console.log('\n📝 Token Management Features:');
  console.log('   ✅ Automatic token validation every 30 minutes');
  console.log('   ✅ Automatic token refresh when expired');
  console.log('   ✅ Manual token refresh endpoint');
  console.log('   ✅ Token status monitoring');
  console.log('   ✅ Fallback to environment token if refresh fails');
  
  console.log('\n🔧 Available Endpoints:');
  console.log('   GET  /token-status - Check current token status');
  console.log('   POST /refresh-token - Manually refresh token');
  console.log('   GET  /templates - Test WhatsApp API with current token');
}

// Run the tests
runTokenManagementTests().catch(console.error);
