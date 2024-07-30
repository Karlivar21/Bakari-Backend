import express from 'express';
import connectDB from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';
import soupPlanRoute from './routes/soupPlan.js';
import cors from 'cors';

const app = express();

// Connect to database
connectDB();

// Use CORS middleware
app.use(cors({
  origin: '*', // Allow only from this origin
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

app.use('/api', soupPlanRoute);
// Define routes
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
