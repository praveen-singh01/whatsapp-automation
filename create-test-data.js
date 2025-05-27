const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('📊 MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema (same as in app.js)
const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  user_image: { type: String, required: true },
  user_name: { type: String, required: true },
  user_phone: { type: String, required: true },
  user_role: {
    type: String,
    required: true,
    enum: ['karyakarta', 'admin', 'user', 'manager']
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Test data - 5 users for each role (20 total)
const testUsers = [
  // Karyakarta users
  {
    user_id: 'kary_001',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',

    user_name: 'Rajesh Kumar',
    user_phone: '97471063300',
    user_role: 'karyakarta'
  },
  {
    user_id: 'kary_002',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Priya Sharma',
    user_phone: '919170920772',
    user_role: 'karyakarta'
  },
  {
    user_id: 'kary_003',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Amit Singh',
    user_phone: '918789381593',
    user_role: 'karyakarta'
  },
  {
    user_id: 'kary_004',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Sunita Devi',
    user_phone: '919670067848',
    user_role: 'karyakarta'
  },
  {
    user_id: 'kary_005',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Vikash Yadav',
    user_phone: '97471063304',
    user_role: 'karyakarta'
  },

  // Admin users
  {
    user_id: 'admin_001',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Dr. Suresh Gupta',
    user_phone: '97471063305',
    user_role: 'admin'
  },
  {
    user_id: 'admin_002',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Meera Joshi',
    user_phone: '97471063306',
    user_role: 'admin'
  },
  {
    user_id: 'admin_003',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Ravi Patel',
    user_phone: '97471063307',
    user_role: 'admin'
  },
  {
    user_id: 'admin_004',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Kavita Mishra',
    user_phone: '97471063308',
    user_role: 'admin'
  },
  {
    user_id: 'admin_005',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Deepak Verma',
    user_phone: '97471063309',
    user_role: 'admin'
  },

  // Regular users
  {
    user_id: 'user_001',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Anita Kumari',
    user_phone: '97471063310',
    user_role: 'user'
  },
  {
    user_id: 'user_002',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Manoj Tiwari',
    user_phone: '97471063311',
    user_role: 'user'
  },
  {
    user_id: 'user_003',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Pooja Agarwal',
    user_phone: '97471063312',
    user_role: 'user'
  },
  {
    user_id: 'user_004',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Sanjay Dubey',
    user_phone: '97471063313',
    user_role: 'user'
  },
  {
    user_id: 'user_005',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Rekha Singh',
    user_phone: '97471063314',
    user_role: 'user'
  },

  // Manager users
  {
    user_id: 'mgr_001',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Ashok Pandey',
    user_phone: '97471063315',
    user_role: 'manager'
  },
  {
    user_id: 'mgr_002',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Shanti Devi',
    user_phone: '97471063316',
    user_role: 'manager'
  },
  {
    user_id: 'mgr_003',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Ramesh Chandra',
    user_phone: '97471063317',
    user_role: 'manager'
  },
  {
    user_id: 'mgr_004',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Geeta Sharma',
    user_phone: '97471063318',
    user_role: 'manager'
  },
  {
    user_id: 'mgr_005',
    user_image: 'https://www.citypng.com/public/uploads/preview/hd-man-user-illustration-icon-transparent-png-701751694974843ybexneueic.png',
    user_name: 'Sunil Kumar',
    user_phone: '97471063319',
    user_role: 'manager'
  }
];

async function createTestData() {
  try {
    console.log('🗑️ Clearing existing users...');
    await User.deleteMany({});

    console.log('👥 Creating test users...');
    const createdUsers = await User.insertMany(testUsers);

    console.log(`✅ Successfully created ${createdUsers.length} test users!`);

    // Display summary by role
    const roleCounts = await User.aggregate([
      { $group: { _id: '$user_role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Users by role:');
    roleCounts.forEach(role => {
      console.log(`  ${role._id}: ${role.count} users`);
    });

    console.log('\n📋 Sample users:');
    const sampleUsers = await User.find().limit(5);
    sampleUsers.forEach(user => {
      console.log(`  ${user.user_name} (${user.user_role}) - ${user.user_phone}`);
    });

    console.log('\n🎉 Test data creation completed!');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createTestData();
