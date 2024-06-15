
// controllers/orderController.js
const Order = require('../models/Order');

const createOrder = async (req, res) => {
    const { name, phone, email, date, cakes, breads, minidonuts, user_message } = req.body;

    try {
        const newOrder = new Order({
            name,
            phone,
            email,
            date,
            cakes,
            breads,
            minidonuts,
            user_message,
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
