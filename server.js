const express = require('express');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const orderRoutes = require('./routes/orderRoutes');

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', orderRoutes);

// Load SSL Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
};

// Create HTTPS Server
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
// Now, when you run the server, it will listen on port 8080 and use HTTPS. You can test this by sending a POST request to https://yourdomain.com/api/orders with the required data. If the request is successful, the server will respond with a 201 status code and the order data. If there is an error, the server will respond with a 400 status code and an error message.