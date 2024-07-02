import express from 'express';
import connectDB from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';

const app = express();

// Connect to database
connectDB();

app.use(express.json());

// Define routes
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
