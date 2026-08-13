import jwt from 'jsonwebtoken';

export default function companyAuth(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'company' && decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.company = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
