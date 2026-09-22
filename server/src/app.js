import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Standard Middleware
app.use(cors());
app.use(express.json());
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

// Mount API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'Guardrails Abuse-Prevention Microservice',
    version: '2.0.0',
    status: 'ONLINE',
    docs: '/api/health'
  });
});

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
