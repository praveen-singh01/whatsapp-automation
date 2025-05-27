const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';

// Test positioning options
async function testPositioningOptions() {
  try {
    console.log('🎯 Testing User Image Positioning Options\n');

    // Test 1: Get available positioning options
    console.log('1️⃣ Testing GET /api/position-options...');
    const optionsResponse = await axios.get(`${BASE_URL}/api/position-options`);
    console.log('✅ Position options retrieved successfully');
    console.log('📍 Available presets:', optionsResponse.data.data.presets.map(p => p.value).join(', '));
    console.log('');

    // Test 2: Test different positioning presets with preview endpoint
    const testPositions = [
      { preset: 'top-left', margin: 20 },
      { preset: 'center', margin: 30 },
      { preset: 'bottom-right', margin: 15 },
      { custom: { top: '25%', left: '75%' } },
      { custom: { top: 150, left: 50 } },
      { top: 100, left: 20 } // Legacy format
    ];

    console.log('2️⃣ Testing different positioning options with preview...');
    
    for (let i = 0; i < testPositions.length; i++) {
      const position = testPositions[i];
      console.log(`\n📍 Testing position ${i + 1}:`, JSON.stringify(position));
      
      try {
        const previewResponse = await axios.post(`${BASE_URL}/preview-image`, {
          poster_url: 'https://images.netaapp.in/20-7-2024/AAPP.jpeg',
          user_image_url: 'https://images.netaapp.in/20-7-2024/AAPP.jpeg',
          user_image_size: { width: 200, height: 200 },
          position: position
        });
        
        console.log(`✅ Preview generated: ${previewResponse.data.imageUrl}`);
      } catch (error) {
        console.log(`❌ Preview failed: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n3️⃣ Testing bulk messaging with custom positioning...');
    
    // Test 3: Test bulk messaging with custom positioning (commented out to avoid sending actual messages)
    console.log('⚠️  Bulk messaging test is commented out to avoid sending actual WhatsApp messages');
    console.log('💡 To test bulk messaging with positioning, uncomment the code below and ensure you have:');
    console.log('   - A poster image file');
    console.log('   - Valid WhatsApp configuration');
    console.log('   - Users in the database');
    
    /*
    // Uncomment this section to test bulk messaging with positioning
    const FormData = require('form-data');
    const fs = require('fs');
    
    if (fs.existsSync('./image.png')) {
      const formData = new FormData();
      formData.append('target_roles', JSON.stringify(['karyakarta']));
      formData.append('message_content', 'Testing custom positioning!');
      formData.append('template_name', 'poster_template');
      formData.append('include_user_image', 'true');
      formData.append('user_image_position', JSON.stringify({ preset: 'top-right', margin: 30 }));
      formData.append('poster_image', fs.createReadStream('./image.png'));

      const bulkResponse = await axios.post(`${BASE_URL}/api/send-bulk-message`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 300000,
      });

      console.log('✅ Bulk messaging with custom positioning successful');
      console.log('📊 Summary:', bulkResponse.data.data.summary);
    }
    */

    console.log('\n🎉 Positioning tests completed!');
    console.log('\n📋 Summary of positioning options:');
    console.log('   • Preset positioning: Use predefined positions like "center-left", "top-right", etc.');
    console.log('   • Custom positioning: Use pixel values or percentages for precise control');
    console.log('   • Legacy support: Backward compatible with existing { top, left } format');
    console.log('\n💡 Frontend Implementation Tips:');
    console.log('   • Use GET /api/position-options to populate dropdown/selection UI');
    console.log('   • For preset positioning: { "preset": "center-left", "margin": 20 }');
    console.log('   • For custom positioning: { "custom": { "top": "25%", "left": 100 } }');
    console.log('   • Include user_image_position parameter in bulk messaging requests');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPositioningOptions();
