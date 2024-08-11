
// controllers/orderController.js
const Order = require('../models/Order');

const createOrder = async (req, res) => {
    const { name, phone, email, date, products, user_message, url } = req.body;

    try {
        const newOrder = new Order({
            name,
            phone,
            email,
            date,
            products,
            user_message,
            url
        });

        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    createOrder,
};

