// routes/downloadRoutes.js
import express from "express";
import path from "path";
import fs from "fs";
import Order from "../models/Order.js";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// project root (adjust if your structure differs)
const projectRoot = path.join(__dirname, "..");

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order?.image) {
      return res.status(404).json({ message: "Order or image not found" });
    }

    // If order.image is like "/uploads/file.png", normalize it to "uploads/file.png"
    const relativeImagePath = order.image.replace(/^\/+/, "");

    // Build an absolute path inside your project
    const imagePath = path.join(projectRoot, relativeImagePath);

    if (!fs.existsSync(imagePath)) {
      console.error("File not found on disk:", imagePath, "stored value:", order.image);
      return res.status(404).json({ message: "Image file not found on server" });
    }

    return res.download(imagePath);
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(400).json({ message: "Error fetching order", error: String(error) });
  }
});

export default router;
