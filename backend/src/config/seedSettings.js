const seed = async () => {
  try {
    console.log('📡 Fetching active cloud database...');
    const getRes = await fetch('https://extendsclass.com/api/json-storage/bin/bbafaaa');
    if (!getRes.ok) {
      console.error('❌ Could not fetch database.');
      return;
    }
    
    const dbData = await getRes.json();
    
    // Ensure adminsettings collection exists and has the default configuration record
    if (!dbData.adminsettings) {
      dbData.adminsettings = [];
    }
    
    const existingConfig = dbData.adminsettings.find(s => s.key === 'config');
    
    if (!existingConfig) {
      console.log('📝 Seeding default "adminsettings" config into the cloud database...');
      dbData.adminsettings.push({
        _id: 'config_' + Date.now().toString(),
        key: 'config',
        adminPassword: 'admin101',
        otpEmail: 'siyambhuiyan444@gmail.com',
        otpEnabled: true,
        noticeEnabled: false,
        noticeText: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      const putRes = await fetch('https://extendsclass.com/api/json-storage/bin/bbafaaa', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbData)
      });
      
      if (putRes.ok) {
        console.log('✅ Default settings successfully seeded and saved in the cloud database!');
      } else {
        console.error('❌ Failed to update cloud database with seeded settings.');
      }
    } else {
      console.log('✅ Admin configuration already exists in the cloud database. No seeding needed!');
    }
  } catch (err) {
    console.error('❌ Error during seeding settings:', err.message);
  }
};

seed();
