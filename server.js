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
    origin: [
        'https://kallabakari.is',
        'https://www.kallabakari.is',
        'https://www.pantanir.kallabakari.is'
      ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Define routes
app.use('/api/orders', orderRoutes);
app.use('/api/soupPlan', soupPlanRoute);

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
