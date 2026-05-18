import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Admin sets strictly fixed daily price
  date: { type: Date, default: Date.now } // To keep track of daily pricing changes if needed
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
