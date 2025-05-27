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

async function checkKaryakartaUsers() {
  try {
    console.log('🔍 Checking for users with role "karyakarta"...\n');
    
    // Find all users with karyakarta role
    const karyakartaUsers = await User.find({ user_role: 'karyakarta' });
    
    console.log(`📊 Found ${karyakartaUsers.length} users with role "karyakarta":\n`);
    
    if (karyakartaUsers.length > 0) {
      karyakartaUsers.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.user_name}`);
        console.log(`   Phone: ${user.user_phone}`);
        console.log(`   User ID: ${user.user_id}`);
        console.log(`   Image: ${user.user_image}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });
      
      // Check if 97471063300 is among them
      const targetPhone = '97471063300';
      const userWithTargetPhone = karyakartaUsers.find(user => user.user_phone === targetPhone);
      
      if (userWithTargetPhone) {
        console.log(`✅ Found user with phone ${targetPhone}:`);
        console.log(`   Name: ${userWithTargetPhone.user_name}`);
        console.log(`   Role: ${userWithTargetPhone.user_role}`);
        console.log(`   User ID: ${userWithTargetPhone.user_id}`);
      } else {
        console.log(`❌ No user found with phone ${targetPhone} in karyakarta role`);
      }
    } else {
      console.log('❌ No users found with role "karyakarta"');
      console.log('\n💡 You may need to run: node create-test-data.js');
    }
    
    // Also show all roles summary
    console.log('\n📈 Summary of all users by role:');
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: "$user_role",
          userCount: { $sum: 1 },
          users: { $push: { name: "$user_name", phone: "$user_phone" } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    roleStats.forEach(role => {
      console.log(`\n${role._id}: ${role.userCount} users`);
      role.users.forEach(user => {
        console.log(`  - ${user.name} (${user.phone})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n📊 Database connection closed');
  }
}

// Run the check
checkKaryakartaUsers();
