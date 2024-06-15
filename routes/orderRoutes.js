const express = require('express');
const { createOrder } = require('../controllers/orderController');
const router = express.Router();
const Order = require('../models/Order');

console.log('createOrder:', createOrder); 
router.post('/orders', createOrder);

router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
