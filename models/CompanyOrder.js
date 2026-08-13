import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  type: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const companyOrderSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  date: { type: Date, required: true },
  pickupTime: { type: String },
  products: [productSchema],
  note: { type: String },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
}, { timestamps: true });

export default mongoose.model('CompanyOrder', companyOrderSchema);
