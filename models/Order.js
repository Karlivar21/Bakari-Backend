import mongoose from 'mongoose';

// Generic product schema
const productSchema = new mongoose.Schema({
    type: { type: String, required: true },  // e.g., "cake", "bread", "minidonut"
    details: { type: mongoose.Schema.Types.Mixed, required: true }, // Flexible structure to hold specific product details
}, { _id: false });

// Order schema
const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: Date, required: true },
    products: [productSchema],
    user_message: { type: String },
    payed: { type: Boolean, default: false },
    image: { type: String },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "expired"],
      default: "pending",
    },

    checkoutSessionId: { type: String },
    paymentProvider: { type: String },
    paymentId: { type: String },

    paidAt: { type: Date },
    emailSentAt: { type: Date },
  },
  {
    timestamps: true, 
  }
);


const Order = mongoose.model('Order', orderSchema);
export default Order;
