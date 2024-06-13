const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    cake: { type: String, required: true },
    size: { type: String, required: true },
    filling: { type: String },
    bottom: { type: String },
    smjorkrem: { type: String },
    user_message: { type: String },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
