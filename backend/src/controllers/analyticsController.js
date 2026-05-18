import { db } from '../config/fileDB.js';

export const getBuyerAnalytics = (req, res) => {
  const { buyerId } = req.params;
  try {
    const orders = db.find('orders', { buyerId });
    const completedOrders = orders.filter(o => o.status === 'Delivered');
    
    // Total spend comes exclusively from manual transactions ledger
    const transactions = db.find('transactions', { userId: buyerId, type: 'spending' });
    const totalSpent = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOrders = orders.length;
    
    // Group by month for activity chart
    const monthlyActivity = {};
    orders.forEach(o => {
      const month = new Date(o.createdAt).toLocaleString('default', { month: 'short' });
      monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
    });

    const activityData = Object.entries(monthlyActivity).map(([name, orders]) => ({ name, orders }));

    res.json({
      totalOrders,
      totalSpent,
      completedOrders: completedOrders.length,
      activityData,
      recentOrders: orders.slice(-5).reverse()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFarmerAnalytics = (req, res) => {
  const { farmerId } = req.params;
  try {
    const orders = db.find('orders', { farmerId });
    const completedOrders = orders.filter(o => o.status === 'Delivered');
    
    // Total revenue comes exclusively from manual transactions ledger
    const transactions = db.find('transactions', { userId: farmerId, type: 'revenue' });
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalSold = completedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    
    // Group by month for sales chart using manual revenue entries
    const monthlySales = {};
    transactions.forEach(t => {
      const month = new Date(t.createdAt).toLocaleString('default', { month: 'short' });
      monthlySales[month] = (monthlySales[month] || 0) + (t.amount || 0);
    });

    const salesData = Object.entries(monthlySales).map(([name, revenue]) => ({ name, revenue }));

    res.json({
      totalSold,
      totalRevenue,
      deliverySuccessRate: orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0,
      salesData,
      totalOrders: orders.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
