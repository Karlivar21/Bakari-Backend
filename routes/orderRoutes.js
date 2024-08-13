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

        // Construct the full image URL for each order
        const baseUrl = 'https://api.kallabakari.is/uploads/'; // Base URL for your images
        
        const ordersWithImageUrls = orders.map(order => {
            if (order.details && order.details.image) {
                // Append the base URL to the image path
                order.details.imageUrl = baseUrl + path.basename(order.details.image);
            }
            return order;
        });

        res.json(ordersWithImageUrls);
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
            'image': imageUrl
        });

        await newOrder.save();
        res.status(201).json({ message: 'Order created', order: newOrder });
    } catch (error) {
        res.status(400).json({ message: 'Error creating order', error });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedOrder = await Order.findOneAndDelete({ id });

        if (!deletedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Optionally, you can also remove the associated image file
        if (deletedOrder.details && deletedOrder.details.image) {
            const fs = require('fs');
            const imagePath = deletedOrder.details.image;
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error deleting image:', err);
                } else {
                    console.log('Image deleted:', imagePath);
                }
            });
        }

        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting order', error });
    }
});


export default router;
