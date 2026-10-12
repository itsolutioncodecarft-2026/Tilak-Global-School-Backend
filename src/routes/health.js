import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const db = dbState === 1 ? 'connected' : 'disconnected';

  res.json({
    success: true,
    message: 'API is running',
    db,
  });
});

export default router;
