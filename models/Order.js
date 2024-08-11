import mongoose from 'mongoose';

// Generic product schema
const productSchema = new mongoose.Schema({
    type: { type: String, required: true },  // e.g., "cake", "bread", "minidonut"
    details: { type: mongoose.Schema.Types.Mixed, required: true }, // Flexible structure to hold specific product details
}, { _id: false });

// Order schema
const orderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: Date, required: true },
    products: [productSchema], // Array of generic products
    user_message: { type: String },
    url: { type: String }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
