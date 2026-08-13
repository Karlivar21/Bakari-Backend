import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Company from '../models/Company.js';
import CompanyOrder from '../models/CompanyOrder.js';
import { calculateTotalISK } from '../utils/pricing.js';
import companyAuth from '../middleware/companyAuth.js';
import adminAuth from '../middleware/auth.js';

const router = express.Router();

// ── Company auth ──────────────────────────────────────────────

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const company = await Company.findOne({ username });
    if (!company || !(await company.comparePassword(password)))
      return res.status(401).json({ error: 'Rangt notendanafn eða lykilorð' });

    const token = jwt.sign(
      { companyId: company._id, name: company.name, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, name: company.name, companyId: company._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Company orders ────────────────────────────────────────────

router.get('/orders', companyAuth, async (req, res) => {
  try {
    const orders = await CompanyOrder.find({ companyId: req.company.companyId }).sort({ date: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders', companyAuth, async (req, res) => {
  const { date, pickupTime, products, note } = req.body;
  try {
    const totalAmount = calculateTotalISK(products);
    const order = new CompanyOrder({
      companyId: req.company.companyId,
      date: new Date(date),
      pickupTime,
      products,
      note,
      totalAmount,
    });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/orders/:id', companyAuth, async (req, res) => {
  try {
    const order = await CompanyOrder.findOne({ _id: req.params.id, companyId: req.company.companyId });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/orders/:id', companyAuth, async (req, res) => {
  try {
    const order = await CompanyOrder.findOne({ _id: req.params.id, companyId: req.company.companyId });
    if (!order) return res.status(404).json({ error: 'Not found' });
    await order.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: manage companies ───────────────────────────────────

router.get('/admin/companies', adminAuth, async (req, res) => {
  try {
    const companies = await Company.find().select('-password').sort({ name: 1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/companies', adminAuth, async (req, res) => {
  const { name, username, password } = req.body;
  try {
    const company = new Company({ name, username, password });
    await company.save();
    res.status(201).json({ _id: company._id, name: company.name, username: company.username });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admin/companies/:id', adminAuth, async (req, res) => {
  try {
    await Company.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: view all company orders
router.get('/admin/orders', adminAuth, async (req, res) => {
  try {
    const orders = await CompanyOrder.find().populate('companyId', 'name').sort({ date: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
