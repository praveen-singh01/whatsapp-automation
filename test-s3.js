const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

async function testS3Access() {
  try {
    console.log('🔧 Testing S3 configuration...');
    console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID);
    console.log('Region:', process.env.AWS_REGION);
    console.log('Bucket:', process.env.AWS_S3_BUCKET);

    // Test 1: List buckets
    console.log('\n📋 Testing bucket listing...');
    const buckets = await s3.listBuckets().promise();
    console.log('✅ Available buckets:');
    buckets.Buckets.forEach(bucket => {
      console.log(`  - ${bucket.Name}`);
    });

    // Test 2: Check if our target bucket exists
    const targetBucket = process.env.AWS_S3_BUCKET;
    const bucketExists = buckets.Buckets.some(bucket => bucket.Name === targetBucket);

    if (bucketExists) {
      console.log(`\n✅ Target bucket "${targetBucket}" exists!`);

      // Test 3: Try to list objects in the bucket
      console.log('\n📁 Testing bucket access...');
      const objects = await s3.listObjectsV2({
        Bucket: targetBucket,
        MaxKeys: 5
      }).promise();

      console.log(`✅ Successfully accessed bucket. Found ${objects.KeyCount} objects.`);

      // Test 4: Try to upload a small test file
      console.log('\n📤 Testing file upload...');
      const testKey = `test/test-${Date.now()}.txt`;
      const uploadResult = await s3.upload({
        Bucket: targetBucket,
        Key: testKey,
        Body: 'This is a test file from WhatsApp Business Bot',
        ContentType: 'text/plain'
        // Removed ACL: 'public-read' as the bucket doesn't support ACLs
      }).promise();

      console.log(`✅ Test file uploaded successfully!`);

      // Use custom domain if configured
      const finalUrl = process.env.AWS_S3_CUSTOM_DOMAIN
        ? `${process.env.AWS_S3_CUSTOM_DOMAIN}/${testKey}`
        : uploadResult.Location;

      console.log(`📍 Default S3 URL: ${uploadResult.Location}`);
      console.log(`🔗 Custom Domain URL: ${finalUrl}`);

      // Test 5: Clean up test file
      console.log('\n🗑️ Cleaning up test file...');
      await s3.deleteObject({
        Bucket: targetBucket,
        Key: testKey
      }).promise();

      console.log('✅ Test file deleted successfully!');

    } else {
      console.log(`\n❌ Target bucket "${targetBucket}" not found!`);
      console.log('Available buckets:');
      buckets.Buckets.forEach(bucket => {
        console.log(`  - ${bucket.Name}`);
      });
    }

    console.log('\n🎉 S3 configuration test completed successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ S3 test failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      statusCode: error.statusCode,
      region: error.region
    });
    return false;
  }
}

// Run the test
testS3Access()
  .then(success => {
    if (success) {
      console.log('\n✅ S3 is properly configured and ready for use!');
    } else {
      console.log('\n❌ S3 configuration needs to be fixed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
