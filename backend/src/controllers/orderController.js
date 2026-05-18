import { db } from '../config/fileDB.js';

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
      farmerId: null, farmerName: null,
      productId, productName: product.name,
      quantity, totalCost, deliveryAddress: deliveryAddress || '',
      deliveryCharge: 0,
      paymentStatus: 'Pending',
      status: 'Order Pending',
      preferredSellerId: req.body.preferredSellerId || null,
      preferenceMessage: req.body.preferenceMessage || ''
    });
    db.create('notifications', { type: 'new_order', title: 'New Order', message: `${buyer.name} ordered ${quantity}kg of ${product.name}`, targetRole: 'admin', read: false });
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
  const { orderId } = req.body;
  try {
    const order = db.findById('orders', orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const buyer = db.findById('users', order.buyerId);
    const farmers = db.find('users', { role: 'farmer', isApproved: true });
    const nodes = db.findAll('mapnodes');
    let nearestFarmer = null;
    let minDist = Infinity;

    // Check if buyer has a preferred seller location
    if (order.preferredSellerId) {
      const pref = db.findById('users', order.preferredSellerId);
      if (pref && pref.role === 'farmer' && pref.isApproved) {
        nearestFarmer = pref;
      }
    }

    // Fallback to Dijkstra logic if no preferred seller was assigned
    if (!nearestFarmer) {
      if (nodes.length > 0 && buyer?.locationNode) {
        const distances = dijkstra(nodes, buyer.locationNode);
        for (const f of farmers) {
          if (f.locationNode && distances[f.locationNode] < minDist) {
            minDist = distances[f.locationNode]; nearestFarmer = f;
          }
        }
      } else if (farmers.length > 0) {
        nearestFarmer = farmers[0]; minDist = 0;
      }
    }

    if (!nearestFarmer) return res.status(400).json({ message: 'No available farmer found.' });

    const updated = db.updateById('orders', orderId, {
      farmerId: nearestFarmer._id, farmerName: nearestFarmer.name,
      paymentStatus: 'Paid', status: 'Order Confirmed'
    });
    db.create('notifications', { type: 'order_assigned', title: 'Order Assigned', message: `You have been assigned a new order for ${order.productName}`, userId: nearestFarmer._id, read: false });
    res.json({ message: `Order confirmed. Nearest farmer: ${nearestFarmer.name}`, order: updated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateOrderStatus = (req, res) => {
  const { orderId, status } = req.body;
  const validStatuses = ['Order Pending', 'Order Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Rejected', 'Refunded'];
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const order = db.findById('orders', orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const updatePayload = { status };
    if (status === 'Delivered') {
      if (order.approvedEarnings === undefined || order.approvedEarnings === null) {
        updatePayload.approvedEarnings = 0;
        updatePayload.isEarningApproved = false;
      }
    }
    const updated = db.updateById('orders', orderId, updatePayload);
    db.create('notifications', { type: 'order_update', title: 'Order Updated', message: `Your order is now: ${status}`, userId: order.buyerId, read: false });
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
