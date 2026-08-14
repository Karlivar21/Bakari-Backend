import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Company from '../models/Company.js';
import CompanyOrder from '../models/CompanyOrder.js';
import Order from '../models/Order.js';
import { calculateTotalISK } from '../utils/pricing.js';
import companyAuth from '../middleware/companyAuth.js';
import adminAuth from '../middleware/auth.js';
import adminUsers from '../data/users.js';

const router = express.Router();

// ── Company auth ──────────────────────────────────────────────

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Try admin users first
    const adminUser = adminUsers.find(u => u.username === username);
    if (adminUser) {
      const match = await bcrypt.compare(password, adminUser.password);
      if (!match) return res.status(401).json({ error: 'Rangt notendanafn eða lykilorð' });
      const token = jwt.sign(
        { name: 'Stjórnandi', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ token, name: 'Stjórnandi', role: 'admin' });
    }

    // Try company accounts
    const company = await Company.findOne({ username });
    if (!company || !(await company.comparePassword(password)))
      return res.status(401).json({ error: 'Rangt notendanafn eða lykilorð' });

    const token = jwt.sign(
      { companyId: company._id, name: company.name, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, name: company.name, role: 'company', companyId: company._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Company orders ────────────────────────────────────────────

router.get('/orders', companyAuth, async (req, res) => {
  try {
    const query = req.company.role === 'admin' ? {} : { companyId: req.company.companyId };
    const orders = await CompanyOrder.find(query).populate('companyId', 'name').sort({ date: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders', companyAuth, async (req, res) => {
  const { date, deliveryType, pickupTime, products, note } = req.body;
  try {
    const PRICED_TYPES = ['cake', 'bread', 'minidonut'];
    let totalAmount = 0;
    for (const p of products) {
      if (PRICED_TYPES.includes(p.type)) {
        try { totalAmount += calculateTotalISK([p]); } catch { /* unknown item — invoiced manually */ }
      }
    }
    const order = new CompanyOrder({
      companyId: req.company.companyId,
      date: new Date(date),
      deliveryType: deliveryType || 'pickup',
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

// Admin dashboard: view all company orders (uses regular admin token)
router.get('/admin/orders', adminAuth, async (req, res) => {
  try {
    const orders = await CompanyOrder.find().populate('companyId', 'name').sort({ date: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin dashboard: update company order status
router.patch('/admin/orders/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const order = await CompanyOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Company portal admin: all orders combined (regular + company, uses company portal admin token)
router.get('/admin/all-orders', companyAuth, async (req, res) => {
  if (req.company.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const [regular, company] = await Promise.all([
      Order.find().sort({ date: 1 }),
      CompanyOrder.find().populate('companyId', 'name').sort({ date: 1 }),
    ]);
    res.json({ regular, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
