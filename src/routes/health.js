import { Router }   from 'express';
import mongoose      from 'mongoose';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
      success:   true,
      message:   'Tilak Global School API is running',
      db:        dbStatus,
      env:       process.env.NODE_ENV || 'development',
      uptime:    process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

export default router;
