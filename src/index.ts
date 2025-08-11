import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { testConnection, syncDatabase } from './config/database';
import './models';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
// CORS setup – include common local ports plus optional FRONTEND_ORIGINS env (comma separated)
const defaultOrigins = [
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:3001', 'http://127.0.0.1:3001',
  'http://localhost:3002', 'http://127.0.0.1:3002',
  'http://localhost', 'http://127.0.0.1'
];
const extraOrigins = process.env.FRONTEND_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
const allowedOrigins = [...new Set([...defaultOrigins, ...extraOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl / server-to-server
    return allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(morgan('combined', {
  skip: (req, res) => {
    // Skip logging for health checks but log everything else temporarily
    if (req.url === '/health') return true;
    return false;
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    await syncDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📖 API documentation available at: http://localhost:${PORT}/api/health`);
      console.log(`🔑 Don't forget to include X-API-Key header in your requests`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app, startServer };