import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { CLIENT_URL, NODE_ENV } from './config/env.js';
import healthRouter from './routes/health.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security headers
app.use(helmet());

// Request logging (skip in test)
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// CORS – only allow CLIENT_URL with credentials
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);

// ── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
