import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/order'; // Import the Order model

const router = express.Router();

// GET route for fetching orders
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
    }
});

// POST route for creating an order
router.post('/', async (req, res) => {
    const orderData = req.body;

    try {
        const newOrder = new Order(orderData);
        await newOrder.save();
        res.status(201).json({ message: 'Order created', order: newOrder });
    } catch (error) {
        res.status(400).json({ message: 'Error creating order', error });
    }
});

export default router;
