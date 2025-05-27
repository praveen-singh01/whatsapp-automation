const axios = require('axios');
require('dotenv').config();

async function checkWhatsAppTemplates() {
  console.log('📋 Checking WhatsApp Business Templates...');
  
  const token = process.env.WHATSAPP_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  
  console.log('📋 Configuration:');
  console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`   Business Account ID: ${businessAccountId}`);
  console.log('');
  
  if (!token || !businessAccountId) {
    console.log('❌ Missing required configuration');
    return;
  }
  
  try {
    console.log('🔍 Fetching templates...');
    
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${businessAccountId}/message_templates`,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { 
          limit: 100,
          fields: 'name,status,language,category,components,created_time'
        },
        timeout: 15000
      }
    );
    
    const templates = response.data.data || [];
    
    console.log(`✅ Found ${templates.length} total templates`);
    console.log('');
    
    // Group templates by status
    const templatesByStatus = templates.reduce((acc, template) => {
      const status = template.status || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(template);
      return acc;
    }, {});
    
    // Display summary
    console.log('📊 Templates by Status:');
    Object.keys(templatesByStatus).forEach(status => {
      const count = templatesByStatus[status].length;
      const emoji = status === 'APPROVED' ? '✅' : status === 'PENDING' ? '⏳' : status === 'REJECTED' ? '❌' : '❓';
      console.log(`   ${emoji} ${status}: ${count} templates`);
    });
    console.log('');
    
    // Show approved templates in detail
    const approvedTemplates = templatesByStatus['APPROVED'] || [];
    if (approvedTemplates.length > 0) {
      console.log('✅ APPROVED Templates:');
      approvedTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name}`);
        console.log(`      Language: ${template.language}`);
        console.log(`      Category: ${template.category}`);
        
        if (template.components && template.components.length > 0) {
          console.log(`      Components:`);
          template.components.forEach(comp => {
            console.log(`        - ${comp.type}: ${comp.text || comp.format || 'N/A'}`);
          });
        }
        console.log('');
      });
    } else {
      console.log('❌ No approved templates found!');
      console.log('');
      console.log('💡 You need at least one approved template to send messages.');
      console.log('   Common templates to create:');
      console.log('   - hello_world (simple greeting)');
      console.log('   - poster_template (for image messages)');
      console.log('');
    }
    
    // Show pending templates
    const pendingTemplates = templatesByStatus['PENDING'] || [];
    if (pendingTemplates.length > 0) {
      console.log('⏳ PENDING Templates (waiting for approval):');
      pendingTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.language})`);
      });
      console.log('');
    }
    
    // Show rejected templates
    const rejectedTemplates = templatesByStatus['REJECTED'] || [];
    if (rejectedTemplates.length > 0) {
      console.log('❌ REJECTED Templates:');
      rejectedTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.language})`);
      });
      console.log('');
    }
    
    // Check for specific templates your code uses
    console.log('🔍 Checking templates used by your application:');
    const requiredTemplates = ['hello_world', 'poster_template'];
    
    requiredTemplates.forEach(templateName => {
      const found = templates.find(t => t.name === templateName && t.status === 'APPROVED');
      if (found) {
        console.log(`   ✅ ${templateName}: APPROVED`);
      } else {
        const pending = templates.find(t => t.name === templateName && t.status === 'PENDING');
        const rejected = templates.find(t => t.name === templateName && t.status === 'REJECTED');
        
        if (pending) {
          console.log(`   ⏳ ${templateName}: PENDING APPROVAL`);
        } else if (rejected) {
          console.log(`   ❌ ${templateName}: REJECTED`);
        } else {
          console.log(`   ❓ ${templateName}: NOT FOUND`);
        }
      }
    });
    
  } catch (error) {
    console.log('❌ Failed to fetch templates');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('');
      console.log('🔑 Token is invalid or expired. You need to:');
      console.log('   1. Get a new access token from Meta Business Manager');
      console.log('   2. Update WHATSAPP_TOKEN in your .env file');
      console.log('   3. Restart your application');
    }
    
    if (error.response?.data) {
      console.log('');
      console.log('📡 Full error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the check
checkWhatsAppTemplates().catch(console.error);
