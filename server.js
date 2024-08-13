// server.js (or app.js)
import express from 'express';
import connectDB from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';
import soupPlanRoute from './routes/soupPlan.js';
import authRoutes from './routes/authRoutes.js'; // Import auth routes
import commentRoutes from './routes/commentRoutes.js'; // Import comment routes
import cors from 'cors';
import { WebSocketServer } from 'ws';

const app = express();

// Connect to database
connectDB();

// Use CORS middleware
const corsOptions = {
    origin: [
      'https://pantanir.kallabakari.is',
      'https://www.pantanir.kallabakari.is',
      'https://kallabakari.is',
      'https://www.kallabakari.is',
      'http://localhost:3001',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    credentials: true,
    optionsSuccessStatus: 204 // For legacy browser support
  };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Handle preflight requests
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
