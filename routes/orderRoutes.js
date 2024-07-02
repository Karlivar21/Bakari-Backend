import express from 'express';

const router = express.Router();

// Define your routes here
router.get('/', (req, res) => {
    res.send('Order route');
});

// Example POST route for creating an order
router.post('/', (req, res) => {
    const order = req.body;
    // Add logic to handle the order creation
    res.status(201).json({ message: 'Order created', order });
});

export default router;  // Ensure default export
