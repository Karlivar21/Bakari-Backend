import express from 'express';
import connectDB from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';
import soupPlanRoute from './routes/soupPlan.js';
import cors from 'cors';
import { WebSocketServer } from 'ws';  // Correct import for WebSocketServer

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
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Debugging log to verify routes
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});

// Define routes
app.use('/api/orders', orderRoutes);
app.use('/api/soupPlan', soupPlanRoute);

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
