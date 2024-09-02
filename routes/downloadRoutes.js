import express from 'express';
import path from 'path';
import Order from '../models/Order.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Fetch the order by ID
        const order = await Order.findById(orderId);

        if (!order || !order.imageUrl) {
            return res.status(404).json({ message: 'Order or image not found' });
        }

        const imagePath = path.resolve(order.imageUrl); // Convert to absolute path
        res.download(imagePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({ message: 'Error downloading file' });
            }
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(400).json({ message: 'Error fetching order', error });
    }
});

export default router;
