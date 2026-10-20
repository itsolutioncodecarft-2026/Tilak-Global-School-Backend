import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { NODE_ENV, UPLOAD_DIR } from './config/env.js';

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

// Trust proxy — required for correct req.ip behind Render / Vercel / Nginx
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from frontend
  contentSecurityPolicy:     false,                       // frontend handles its own CSP
}));

// ── Request logging ───────────────────────────────────────────────────────────
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Production: tilakglobalschool.com + admin-portal subdomain
// Development: localhost:3000 + localhost:3001
// Also allow all *.vercel.app preview deployments
const ALLOWED_ORIGINS = [
  'https://tilakglobalschool.com',
  'https://www.tilakglobalschool.com',
  'https://admin-portal.tilakglobalschool.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server requests (curl, Postman, health checks)
    if (!origin) return callback(null, true);
    // Allow listed origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Allow Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  maxAge:         86400,
}));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index:    false,
  maxAge:   '1d',
}));

// ── Rate limiter ──────────────────────────────────────────────────────────────
app.use('/api', generalApiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth',   authRouter);

// Public read-only
app.use('/api/content',      publicContentRouter);
app.use('/api/gallery',      publicGalleryRouter);
app.use('/api/news',         publicNewsRouter);
app.use('/api/documents',    publicDocumentRouter);
app.use('/api/fees',         publicFeeRouter);
app.use('/api/faqs',         publicFaqRouter);
app.use('/api/settings',     publicSettingsRouter);
app.use('/api/contact',      publicContactRouter);
app.use('/api/applications', publicApplicationRouter);

// Admin (auth enforced inside each router)
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

// ── 404 + global error handler (must be last) ─────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
