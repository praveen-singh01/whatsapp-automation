const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

async function testTemplatesEndpoint() {
  try {
    console.log('📋 Testing WhatsApp templates endpoint...');
    
    const response = await axios.get(`${BASE_URL}/templates`, {
      params: {
        limit: 10, // Limit to 10 templates for testing
        fields: 'name,status,language,category,components'
      }
    });
    
    console.log('✅ Templates endpoint test successful!');
    console.log('📊 Response status:', response.status);
    console.log('📋 Templates count:', response.data.count);
    
    if (response.data.templates && response.data.templates.length > 0) {
      console.log('\n📝 Sample templates:');
      response.data.templates.slice(0, 3).forEach((template, index) => {
        console.log(`  ${index + 1}. ${template.name} (${template.status}) - ${template.language}`);
      });
    } else {
      console.log('📝 No templates found');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Templates endpoint test failed:');
    
    if (error.response) {
      console.error('📡 Status:', error.response.status);
      console.error('📡 Error:', error.response.data);
      
      if (error.response.status === 500 && error.response.data.message?.includes('WHATSAPP_BUSINESS_ACCOUNT_ID')) {
        console.log('\n💡 To fix this error:');
        console.log('   1. Get your WhatsApp Business Account ID from Meta Business Manager');
        console.log('   2. Update the WHATSAPP_BUSINESS_ACCOUNT_ID in your .env file');
        console.log('   3. Restart the server');
      }
    } else {
      console.error('📡 Error:', error.message);
    }
    
    return false;
  }
}

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

async function runTemplateTests() {
  console.log('🚀 Starting WhatsApp Templates API tests...\n');
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (!healthOk) {
    console.log('❌ Server is not healthy, stopping tests');
    return;
  }
  
  const templatesOk = await testTemplatesEndpoint();
  console.log('');
  
  console.log('📊 Test Results:');
  console.log(`  Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`  Templates Endpoint: ${templatesOk ? '✅' : '❌'}`);
  
  if (healthOk && templatesOk) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.');
  }
}

// Run the tests
runTemplateTests().catch(console.error);
