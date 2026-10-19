import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const ACTIVITY_ACTIONS = [
  'login', 'logout',
  'create', 'update', 'delete',
  'publish', 'unpublish',
  'status_change', 'upload',
  'password_change',
  'user_created', 'user_updated', 'user_deactivated',
];

export const ACTIVITY_MODULES = [
  'admissions', 'content', 'gallery', 'news', 'documents',
  'fees', 'faqs', 'settings', 'users', 'auth',
];

const activityLogSchema = new Schema(
  {
    adminUser: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: [true, 'Admin user is required'],
    },

    // Denormalized name — kept even if admin account is later deleted
    adminName: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
    },

    action: {
      type: String,
      enum: {
        values: ACTIVITY_ACTIONS,
        message: '{VALUE} is not a valid action',
      },
      required: [true, 'Action is required'],
    },

    module: {
      type: String,
      enum: {
        values: ACTIVITY_MODULES,
        message: '{VALUE} is not a valid module',
      },
      required: [true, 'Module is required'],
    },

    // ID of the affected record (application ID, content key, etc.)
    targetId: {
      type: String,
      default: null,
    },

    // Human-readable label of the affected record
    targetLabel: {
      type: String,
      trim: true,
      maxlength: [300, 'Target label must be 300 characters or less'],
      default: '',
    },

    // Short summary of what changed
    detail: {
      type: String,
      trim: true,
      maxlength: [500, 'Detail must be 500 characters or less'],
      default: '',
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // No updatedAt needed for an immutable audit log
    timestamps: false,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
activityLogSchema.index({ adminUser: 1 });
activityLogSchema.index({ module: 1 });
activityLogSchema.index({ createdAt: -1 });

// TTL index — automatically purge logs older than 180 days
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 180 * 24 * 60 * 60, name: 'activity_log_ttl' }
);

const ActivityLog = model('ActivityLog', activityLogSchema);
export default ActivityLog;
