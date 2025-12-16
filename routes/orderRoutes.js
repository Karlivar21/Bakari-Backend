import express from "express";
import multer from "multer";
import fs from "fs";
import Order from "../models/Order.js";
import { calculateTotalISK } from "../utils/pricing.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// GET
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();

    const baseUrl = "https://api.kallabakari.is/"; // ✅ no /uploads/ here
    const ordersWithImageUrls = orders.map((order) => {
      if (order.image) {
        order.image = baseUrl + order.image; // order.image is usually "uploads/..."
      }
      return order;
    });

    res.json(ordersWithImageUrls);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error });
  }
});

// POST
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { id, name, phone, email, date, products, user_message, payed } = req.body;

    const image = req.file ? req.file.path : null;

    const parsedProducts = products ? JSON.parse(products) : [];
    const totalAmount = calculateTotalISK(parsedProducts);

    const newOrder = new Order({
      id,
      name,
      phone,
      email,
      date: new Date(date),
      products: parsedProducts,
      user_message,
      payed,
      image,
      totalAmount,
    });

    await newOrder.save();
    res.status(201).json({ message: "Order created", order: newOrder });
  } catch (error) {
    res.status(400).json({ message: "Error creating order", error: String(error?.message || error) });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findOneAndDelete({ id });

    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });

    // ✅ delete the file if it exists
    if (deletedOrder.image) {
      fs.unlink(deletedOrder.image, (err) => {
        if (err) console.error("Error deleting image:", err);
      });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting order", error });
  }
});

export default router;
