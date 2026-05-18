import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Assigned later
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['Pending', 'Delivery Charge Requested', 'Paid'], default: 'Pending' },
  status: { 
    type: String, 
    enum: ['Pending', 'Order Received', 'Ready to Deliver', 'On Delivery', 'Received'], 
    default: 'Pending' 
  }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
