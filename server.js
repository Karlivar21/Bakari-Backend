// server.js (or app.js)
import express from 'express';
import connectDB from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';
import soupPlanRoute from './routes/soupPlan.js';
import authRoutes from './routes/authRoutes.js'; // Import auth routes
import commentRoutes from './routes/commentRoutes.js'; // Import comment routes
import cors from 'cors';
import emailRoutes from './routes/emailRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Order from "./models/Order.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Connect to database
// Connect to database
connectDB();

// ✅ Auto-expire pending orders every 5 minutes
setInterval(async () => {
  try {
    const result = await Order.updateMany(
      {
        paymentStatus: "pending",
        createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }, // 30 min
      },
      {
        $set: {
          paymentStatus: "expired",
          payed: false,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("Expired orders:", result.modifiedCount);
    }
  } catch (err) {
    console.error("Expire job failed:", err);
  }
}, 5 * 60 * 1000); // every 5 minutes


// Use CORS middleware
const corsOptions = {
    origin: [
      'https://pantanir.kallabakari.is',
      'https://www.pantanir.kallabakari.is',
      'https://kallabakari.is',
      'https://www.kallabakari.is',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    credentials: true,
    optionsSuccessStatus: 204 // For legacy browser support
  };

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf; // needed for webhook signature verification
  }
}));

app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Handle preflight requests
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// Debugging log to verify routes
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Define routes
app.use('/api/orders', orderRoutes);
app.use('/api/soupPlan', soupPlanRoute);
app.use('/api/auth', authRoutes); // Use auth routes
app.use('/api/comments', commentRoutes); // Use comment routes
app.use('/api/send-order-email', emailRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/download/:orderId', downloadRoutes);
app.use('/api/payment', paymentRoutes);

// Start the server
const server = app.listen(process.env.PORT || 5010, () => {
  console.log(`Server is running on port ${server.address().port}`);
});

// WebSocket Server setup
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    // Handle the message
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.send('Welcome to the WebSocket server!');
});
