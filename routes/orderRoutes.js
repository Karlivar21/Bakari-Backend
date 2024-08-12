import express from 'express';
import multer from 'multer';
import Order from '../models/Order.js';

const router = express.Router();

// Set up multer for file storage (Disk Storage Example)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Adjust the path as needed
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 50 * 1024 * 1024 } // Limit file size to 50MB
});

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
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { id, name, phone, email, date, products, user_message, payed } = req.body;

        // Handle file if uploaded
        let imageUrl = null;
        if (req.file) {
            // Save the image to your storage and set imageUrl accordingly
            imageUrl = req.file.path; // For disk storage; adjust as necessary for cloud storage
        }

        // Parse products
        let parsedProducts = [];
        if (products) {
            parsedProducts = JSON.parse(products);
        }

        // Create new order
        const newOrder = new Order({
            id,
            name,
            phone,
            email,
            date: new Date(date),
            products: parsedProducts,
            user_message,
            payed,
            'details.image': imageUrl
        });

        await newOrder.save();
        res.status(201).json({ message: 'Order created', order: newOrder });
    } catch (error) {
        res.status(400).json({ message: 'Error creating order', error });
    }
});

export default router;
