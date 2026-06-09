import express from "express";
import multer from "multer";
import fs from "fs";
import Order from "../models/Order.js";
import { calculateTotalISK } from "../utils/pricing.js";
import mongoose from "mongoose";

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


router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let order = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }

    if (!order) {
      order = await Order.findOne({ id }); // <-- your UUID field
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(order);
  } catch (err) {
    console.error("GET /api/orders/:id failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
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
    const { id, name, phone, email, date, products, user_message, payed, paymentStatus } = req.body;

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
      ...(paymentStatus && { paymentStatus }),
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

// PUT /api/orders/:id — update order by public UUID
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, date, user_message, payed, products, paymentStatus } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (date !== undefined) update.date = new Date(date);
    if (user_message !== undefined) update.user_message = user_message;
    if (payed !== undefined) update.payed = typeof payed === 'boolean' ? payed : payed === 'true';
    if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;

    if (products !== undefined) {
      const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
      update.products = parsedProducts;
      try {
        update.totalAmount = calculateTotalISK(parsedProducts);
      } catch (e) {
        console.warn("Could not recalculate total on update:", e.message);
      }
    }

    const updated = await Order.findOneAndUpdate(
      { id },
      { $set: update },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Error updating order", error: String(error?.message || error) });
  }
});

export default router;
