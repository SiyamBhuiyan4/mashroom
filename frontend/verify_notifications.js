import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

function parseJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch (e) {
    return null;
  }
}

async function runTests() {
  console.log('🚀 STARTING E2E NOTIFICATIONS AND UNREAD MESSAGE COUNTER VERIFICATION 🚀\n');

  try {
    const ts = Date.now();
    const buyerPhone = `buyer_${ts}`;
    const sellerPhone = `seller_${ts}`;

    // 1. Authenticate Admin
    console.log('🔑 [1] Authenticating Admin...');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/admin/verify-password`, {
      password: 'admin101'
    });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    console.log(`✅ Admin authenticated.`);

    // 2. Register Seller (Farmer)
    console.log('\n🌾 [2] Registering Farmer...');
    const regSellerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: `Seller ${ts}`,
      phone: sellerPhone,
      password: 'sellerpassword123',
      role: 'farmer',
      farmName: 'Mushroom farm',
      district: 'Dhaka',
      capacity: '100'
    });
    console.log(`✅ Farmer registered. Status: ${regSellerRes.status}`);

    // Approve the newly registered farmer
    const pendingFarmersRes = await axios.get(`${BASE_URL}/admin/pending-farmers`, adminHeaders);
    const testSeller = pendingFarmersRes.data.find(f => f.phone === sellerPhone);
    const sellerId = testSeller?._id;
    if (!sellerId) throw new Error('Farmer not found in pending list');
    
    await axios.post(`${BASE_URL}/admin/approve-farmer/${sellerId}`, {}, adminHeaders);
    console.log(`✅ Farmer approved by Admin.`);

    // 3. Register Buyer
    console.log('\n🛒 [3] Registering Buyer...');
    const regBuyerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: `Buyer ${ts}`,
      phone: buyerPhone,
      password: 'buyerpassword123',
      role: 'buyer'
    });
    const buyerId = regBuyerRes.data.user?._id || regBuyerRes.data._id || parseJwt(regBuyerRes.data.token).id;
    console.log(`✅ Buyer registered. Status: ${regBuyerRes.status}, ID: ${buyerId}`);

    // 4. Authenticate Buyer & Seller (Farmer)
    console.log('\n🔑 [4] Logging in Buyer & Farmer...');
    
    const buyerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      phone: buyerPhone,
      password: 'buyerpassword123'
    });
    const buyerToken = buyerLoginRes.data.token;
    const buyerHeaders = { headers: { Authorization: `Bearer ${buyerToken}` } };

    const farmerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      phone: sellerPhone,
      password: 'sellerpassword123'
    });
    const farmerToken = farmerLoginRes.data.token;
    const farmerHeaders = { headers: { Authorization: `Bearer ${farmerToken}` } };
    console.log('✅ Login successful for both.');

    // 5. Retrieve initial notifications
    console.log('\n🔔 [5] Checking initial notification lists...');
    const adminNotifsRes = await axios.get(`${BASE_URL}/notifications`, adminHeaders);
    console.log(`- Admin notifications count: ${adminNotifsRes.data.length}`);
    const buyerNotifsRes = await axios.get(`${BASE_URL}/notifications`, buyerHeaders);
    console.log(`- Buyer notifications count: ${buyerNotifsRes.data.length}`);
    const farmerNotifsRes = await axios.get(`${BASE_URL}/notifications`, farmerHeaders);
    console.log(`- Farmer notifications count: ${farmerNotifsRes.data.length}`);

    // 6. Test Notification CRUD Actions
    if (buyerNotifsRes.data.length > 0) {
      const targetNotif = buyerNotifsRes.data[0];
      console.log(`\n🔔 [6] Testing notification actions on ID: ${targetNotif._id} ("${targetNotif.title}")`);
      
      // Mark single read
      await axios.put(`${BASE_URL}/notifications/${targetNotif._id}/read`, {}, buyerHeaders);
      console.log('✅ Single notification marked read.');

      // Check updated status
      const updatedNotifs = await axios.get(`${BASE_URL}/notifications`, buyerHeaders);
      const updatedNotif = updatedNotifs.data.find(n => n._id === targetNotif._id);
      console.log(`- Read state is now: ${updatedNotif?.read}`);

      // Clear single notification
      await axios.delete(`${BASE_URL}/notifications/${targetNotif._id}`, buyerHeaders);
      console.log('✅ Single notification cleared.');
      
      const afterClearNotifs = await axios.get(`${BASE_URL}/notifications`, buyerHeaders);
      console.log(`- Buyer notifications remaining: ${afterClearNotifs.data.length}`);
    }

    // 7. Test Mark All Read and Clear All
    console.log('\n🔔 [7] Testing Mark All Read and Clear All...');
    await axios.post(`${BASE_URL}/notifications/mark-all-read`, {}, buyerHeaders);
    console.log('✅ All Buyer notifications marked as read.');
    await axios.post(`${BASE_URL}/notifications/clear-all`, {}, buyerHeaders);
    console.log('✅ All Buyer notifications cleared.');
    
    const finalBuyerNotifs = await axios.get(`${BASE_URL}/notifications`, buyerHeaders);
    console.log(`- Final Buyer notifications count: ${finalBuyerNotifs.data.length} (Expected: 0)`);

    // 8. Test Unread Message Counters E2E
    console.log('\n💬 [8] Testing Unread Message Counters...');
    
    // Get initial counts
    const initAdminUnread = await axios.get(`${BASE_URL}/messages/unread-count`, adminHeaders);
    console.log(`- Initial Admin unread messages: ${initAdminUnread.data.unreadCount}`);
    const initBuyerUnread = await axios.get(`${BASE_URL}/messages/unread-count`, buyerHeaders);
    console.log(`- Initial Buyer unread messages: ${initBuyerUnread.data.unreadCount}`);

    // Buyer sends support/direct message to Admin
    console.log('\n✉️ Buyer sending message to Admin...');
    await axios.post(`${BASE_URL}/messages/unified/send`, { message: 'Hello admin, I need help with dynamic analytics!' }, buyerHeaders);
    console.log('✅ Message sent from Buyer to Admin.');

    // Get Admin unread count again
    const postAdminUnread = await axios.get(`${BASE_URL}/messages/unread-count`, adminHeaders);
    console.log(`- Post Admin unread messages: ${postAdminUnread.data.unreadCount}`);
    if (postAdminUnread.data.unreadCount > initAdminUnread.data.unreadCount) {
      console.log('🎉 SUCCESS: Admin unread message counter dynamically increased!');
    } else {
      throw new Error('Admin unread message count did not increase.');
    }

    // Admin opens Buyer chat thread (marks seen)
    console.log('\n👁️ Admin opening Buyer chat thread details...');
    await axios.get(`${BASE_URL}/messages/unified/admin/threads/${buyerId}`, adminHeaders);
    console.log('✅ Admin loaded Buyer thread details (should mark messages as seen).');

    // Recheck Admin unread count
    const postAdminSeenUnread = await axios.get(`${BASE_URL}/messages/unread-count`, adminHeaders);
    console.log(`- Post Admin Seen unread messages: ${postAdminSeenUnread.data.unreadCount}`);
    if (postAdminSeenUnread.data.unreadCount < postAdminUnread.data.unreadCount) {
      console.log('🎉 SUCCESS: Admin unread message count returned to lower level!');
    } else {
      throw new Error('Admin unread count did not decrease back after viewing.');
    }

    // Admin replies to Buyer thread
    console.log('\n✉️ Admin replying to Buyer thread...');
    await axios.post(`${BASE_URL}/messages/unified/admin/threads/${buyerId}/reply`, { message: 'Hello buyer! I have successfully synchronized your analytics.' }, adminHeaders);
    console.log('✅ Reply sent from Admin to Buyer.');

    // Recheck Buyer unread count
    const postBuyerUnread = await axios.get(`${BASE_URL}/messages/unread-count`, buyerHeaders);
    console.log(`- Post Buyer unread messages: ${postBuyerUnread.data.unreadCount}`);
    if (postBuyerUnread.data.unreadCount > initBuyerUnread.data.unreadCount) {
      console.log('🎉 SUCCESS: Buyer unread message counter dynamically increased!');
    } else {
      throw new Error('Buyer unread message count did not increase.');
    }

    // Buyer opens support/direct messages (marks seen)
    console.log('\n👁️ Buyer opening direct Support Thread details...');
    await axios.get(`${BASE_URL}/messages/unified/thread`, buyerHeaders);
    console.log('✅ Buyer loaded thread details (should mark messages as seen).');

    // Recheck Buyer unread count
    const postBuyerSeenUnread = await axios.get(`${BASE_URL}/messages/unread-count`, buyerHeaders);
    console.log(`- Post Buyer Seen unread messages: ${postBuyerSeenUnread.data.unreadCount}`);
    if (postBuyerSeenUnread.data.unreadCount < postBuyerUnread.data.unreadCount) {
      console.log('🎉 SUCCESS: Buyer unread message count returned to lower level!');
    } else {
      throw new Error('Buyer unread count did not decrease back after viewing.');
    }

    console.log('\n🎉 ALL E2E NOTIFICATION AND MESSAGE UNREAD BADGE INTEGRATION TESTS PASSED SUCCESSFULLY! 100% EXIT 0 🎉');
    process.exit(0);

  } catch (error) {
    console.error('❌ E2E VERIFICATION ERROR:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();
