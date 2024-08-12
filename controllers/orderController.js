
// controllers/orderController.js
const Order = require('../models/Order');

const createOrder = async (req, res) => {
   
    try {
        const { id, name, phone, email, date, products, user_message, payed } = req.body;
        

         // If an image was uploaded, you can access it via req.file
        let imageUrl = null;
        if (req.file) {
             // Save the image to your storage (e.g., cloud, database, or file system) and set imageUrl
             imageUrl = req.file.path; // or wherever you've stored it
        }

        let parsedProducts = [];

        if (products) {
            parsedProducts = JSON.parse(products);
        }

        const newOrder = new Order({
            id,
            name,
            phone,
            email,
            date: new Date(date),
            products: parsedProducts,
            user_message,
            payed,
            // Assuming you might store the image URL in the order details
            'details.image': imageUrl
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

