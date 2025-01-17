import express from 'express';
import authMiddleware from './middlewares/authMiddleware.js';
 import videoRoutes from './routes/videoRoutes.js';

// Initialize the app
const app = express();

// Middleware
app.use(express.json());
app.use(authMiddleware); // Apply authentication middleware

// Routes
app.use('/api/videos', videoRoutes); // Video-related routes

// Health Check Endpoint
app.get('/', (req, res) => {
    res.send('Welcome to the Video API!');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
