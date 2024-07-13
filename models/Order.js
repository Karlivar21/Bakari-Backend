import mongoose from 'mongoose';

const cakeSchema = new mongoose.Schema({
    cake: String,
    size: String,
    filling: String,
    bottom: String,
    smjorkrem: String
}, { _id: false });

const breadSchema = new mongoose.Schema({
    bread: String,
    quantity: Number
}, { _id: false });

const minidonutSchema = new mongoose.Schema({
    quantity: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: Date, required: true },
    cakes: [cakeSchema],
    breads: [breadSchema],
    minidonuts: [minidonutSchema],
    user_message: { type: String },
    url: { type: String }
});

const Order = mongoose.model('Order', orderSchema);
export default Order; // Use export default for ES module
