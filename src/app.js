import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

import { CLIENT_URL, NODE_ENV, UPLOAD_DIR } from './config/env.js';

// Route imports
import healthRouter    from './routes/health.js';
import authRouter      from './routes/auth.routes.js';
import userRouter      from './routes/user.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

import { publicApplicationRouter, adminApplicationRouter } from './routes/application.routes.js';
import { publicContentRouter,     adminContentRouter     } from './routes/content.routes.js';
import { publicGalleryRouter,     adminGalleryRouter     } from './routes/gallery.routes.js';
import { publicNewsRouter,        adminNewsRouter        } from './routes/news.routes.js';
import { publicDocumentRouter,    adminDocumentRouter    } from './routes/document.routes.js';
import { publicFeeRouter,         adminFeeRouter         } from './routes/fee.routes.js';
import { publicFaqRouter,         adminFaqRouter         } from './routes/faq.routes.js';
import { publicSettingsRouter,    adminSettingsRouter    } from './routes/settings.routes.js';
import { publicContactRouter,     adminContactRouter     } from './routes/contact.routes.js';

import { notFound }          from './middleware/notFound.js';
import { errorHandler }      from './middleware/errorHandler.js';
import { generalApiLimiter } from './middleware/rateLimiter.middleware.js';

const app = express();

// Trust proxy (needed for correct req.ip behind Nginx / reverse proxy)
app.set('trust proxy', 1);

// Remove X-Powered-By header (defence in depth)
app.disable('x-powered-by');

// Security headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: false, // Disabled — frontend handles its own CSP
}));

// Request logging — skip in test
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers — 1 MB limit prevents large payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// CORS — allow CLIENT_URL (supports comma-separated list for dev multi-port)
const allowedOrigins = (CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve uploaded files as static
// dotfile access disabled — prevents .htaccess / .env leaks
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index:    false,
  maxAge:   '1d',
}));

// Global rate limiter on all /api routes
app.use('/api', generalApiLimiter);

// Health check
app.use('/api/health', healthRouter);

// Auth
app.use('/api/auth', authRouter);

// Public read-only routes
app.use('/api/content',      publicContentRouter);
app.use('/api/gallery',      publicGalleryRouter);
app.use('/api/news',         publicNewsRouter);
app.use('/api/documents',    publicDocumentRouter);
app.use('/api/fees',         publicFeeRouter);
app.use('/api/faqs',         publicFaqRouter);
app.use('/api/settings',     publicSettingsRouter);
app.use('/api/contact',      publicContactRouter);
app.use('/api/applications', publicApplicationRouter);

// Admin routes (auth enforced inside each router)
app.use('/api/admin/users',        userRouter);
app.use('/api/admin/dashboard',    dashboardRouter);
app.use('/api/admin/applications', adminApplicationRouter);
app.use('/api/admin/content',      adminContentRouter);
app.use('/api/admin/gallery',      adminGalleryRouter);
app.use('/api/admin/news',         adminNewsRouter);
app.use('/api/admin/documents',    adminDocumentRouter);
app.use('/api/admin/fees',         adminFeeRouter);
app.use('/api/admin/faqs',         adminFaqRouter);
app.use('/api/admin/settings',     adminSettingsRouter);
app.use('/api/admin/contact',      adminContactRouter);

// 404 + global error handler — must be last
app.use(notFound);
app.use(errorHandler);

export default app;
