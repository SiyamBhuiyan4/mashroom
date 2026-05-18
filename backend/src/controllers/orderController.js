import { db } from '../config/fileDB.js';
import bcrypt from 'bcryptjs';

// Dijkstra's Algorithm
const dijkstra = (nodes, startId) => {
  const dist = {};
  const unvisited = new Set();
  nodes.forEach(n => { dist[n._id] = Infinity; unvisited.add(n._id); });
  dist[startId] = 0;
  while (unvisited.size > 0) {
    let curr = null;
    for (const id of unvisited) if (curr === null || dist[id] < dist[curr]) curr = id;
    if (dist[curr] === Infinity) break;
    unvisited.delete(curr);
    const node = nodes.find(n => n._id === curr);
    if (node?.edges) for (const e of node.edges) {
      if (unvisited.has(e.nodeId)) {
        const alt = dist[curr] + e.distance;
        if (alt < dist[e.nodeId]) dist[e.nodeId] = alt;
      }
    }
  }
  return dist;
};

export const placeOrder = (req, res) => {
  const { productId, quantity, buyerId, deliveryAddress } = req.body;
  try {
    const product = db.findById('products', productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const buyer = db.findById('users', buyerId);
    if (!buyer) return res.status(400).json({ message: 'Buyer not found' });
    const totalCost = product.price * quantity;
    const order = db.create('orders', {
      buyerId, buyerName: buyer.name, buyerPhone: buyer.phone,
      farmerId: null, farmerName: null, farmerPhone: null,
      productId, productName: product.name,
      quantity, totalCost, deliveryAddress: deliveryAddress || '',
      deliveryCharge: 0,
      paymentStatus: 'Pending',
      status: 'Order Pending',
      preferredSellerId: req.body.preferredSellerId || null,
      preferenceMessage: req.body.preferenceMessage || ''
    });

    db.create('notifications', { 
      type: 'new_order', 
      title: 'New Order', 
      message: `${buyer.name} ordered ${quantity}kg of ${product.name}`, 
      targetRole: 'admin', 
      read: false 
    });

    db.create('auditlogs', {
      type: 'order_creation',
      userId: buyerId,
      targetOrderId: order._id,
      details: `Buyer ${buyer.name} created order for ${quantity}kg of ${product.name} (Total: ৳${totalCost})`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(order);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const requestDeliveryCharge = (req, res) => {
  const { orderId, deliveryCharge } = req.body;
  try {
    const order = db.findById('orders', orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const updated = db.updateById('orders', orderId, { deliveryCharge: parseFloat(deliveryCharge), paymentStatus: 'Delivery Charge Requested' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const confirmOrderAndDispatch = (req, res) => {
  const { orderId, farmerId } = req.body;
  try {
    const order = db.findById('orders', orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    let farmer = null;
    let farmerName = null;
    let farmerPhone = null;

    if (farmerId) {
      farmer = db.findById('users', farmerId);
      if (!farmer || farmer.role !== 'farmer' || !farmer.isApproved) {
        return res.status(400).json({ message: 'Selected seller is invalid or not approved.' });
      }
      farmerName = farmer.name;
      farmerPhone = farmer.phone;
    }

    const updated = db.updateById('orders', orderId, {
      farmerId: farmer ? farmer._id : null,
      farmerName,
      farmerPhone,
      status: 'Order Confirmed',
      paymentStatus: 'Paid',
      confirmedAt: new Date().toISOString()
    });

    if (farmer) {
      db.create('notifications', { 
        type: 'order_assigned', 
        title: 'Order Assigned', 
        message: `You have been assigned a new order for ${order.productName}`, 
        userId: farmer._id, 
        read: false 
      });

      db.create('auditlogs', {
        type: 'seller_assignment',
        adminId: req.user.id,
        targetOrderId: orderId,
        targetUserId: farmer._id,
        details: `Admin confirmed Order #${orderId} and assigned Seller: ${farmerName} (${farmerPhone})`,
        timestamp: new Date().toISOString()
      });
    } else {
      db.create('auditlogs', {
        type: 'order_confirmation',
        adminId: req.user.id,
        targetOrderId: orderId,
        details: `Admin confirmed Order #${orderId} and chose to handle delivery directly (No Seller Assigned)`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ 
      message: farmer ? `Order confirmed and assigned to: ${farmerName}` : 'Order confirmed. Admin will handle delivery directly.', 
      order: updated 
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateOrderStatus = async (req, res) => {
  const { orderId, status, password } = req.body;
  const validStatuses = ['Order Pending', 'Order Confirmed', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Rejected', 'Refunded'];
  
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  try {
    const order = db.findById('orders', orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    let actorName = 'System';
    let isPasswordVerified = false;

    // Strict Tracking Permission System Validation
    if (req.user.role === 'farmer') {
      // 1. Must be the assigned seller
      if (order.farmerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied. You are not assigned to this order.' });
      }

      // 2. Cannot update completed/Delivered orders (Immediate Permission Lock)
      if (order.status === 'Delivered') {
        return res.status(403).json({ message: 'Access denied. Delivery is complete and seller permissions are now disabled.' });
      }

      // 3. Restricted to allowed tracking states
      const allowedSellerStates = ['Preparing', 'Packed', 'Out for Delivery', 'Delivered'];
      if (!allowedSellerStates.includes(status)) {
        return res.status(400).json({ message: `Access denied. Sellers cannot change status to ${status}.` });
      }

      // 4. Double-Safety Password Verification Check
      const seller = db.findById('users', req.user.id);
      if (!seller) return res.status(404).json({ message: 'Seller account not found.' });

      if (!password) {
        return res.status(400).json({ message: 'Password confirmation is required for status updates.' });
      }

      const isMatch = await bcrypt.compare(password, seller.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password. Verification failed.' });
      }

      actorName = `Seller: ${seller.name}`;
      isPasswordVerified = true;
    } else if (req.user.role === 'admin') {
      const admin = db.findById('users', req.user.id);
      actorName = `Admin: ${admin?.name || 'Administrator'}`;
    } else {
      return res.status(403).json({ message: 'Access denied. Unauthorized role.' });
    }

    // Perform the status update
    const updatePayload = { status };
    const updated = db.updateById('orders', orderId, updatePayload);

    // Create tracking update notification
    db.create('notifications', { 
      type: 'order_update', 
      title: 'Order Updated', 
      message: `Your order status is now: ${status}`, 
      userId: order.buyerId, 
      read: false 
    });

    // Create system audit log
    db.create('auditlogs', {
      type: 'tracking_update',
      userId: req.user.id,
      targetOrderId: orderId,
      details: `Status updated to [${status}] by ${actorName}${isPasswordVerified ? ' (password confirmed)' : ''}`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getOrders = (req, res) => {
  try { res.json(db.findAll('orders').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))); }
  catch (error) { res.status(500).json({ message: error.message }); }
};

export const getBuyerOrders = (req, res) => {
  const { buyerId } = req.params;
  try { res.json(db.find('orders', { buyerId }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))); }
  catch (error) { res.status(500).json({ message: error.message }); }
};

export const getFarmerOrders = (req, res) => {
  const { farmerId } = req.params;
  try { res.json(db.find('orders', { farmerId }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))); }
  catch (error) { res.status(500).json({ message: error.message }); }
};
