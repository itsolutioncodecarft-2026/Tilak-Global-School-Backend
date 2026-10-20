import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ── Granular permission flags per module ─────────────────────────────────────
const permissionsSchema = new Schema(
  {
    dashboard:        { view: { type: Boolean, default: false } },
    admissions:       { view: { type: Boolean, default: false }, updateStatus: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
    content:          { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, publish: { type: Boolean, default: false } },
    gallery:          { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
    news:             { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, publish: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
    documents:        { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false } },
    fees:             { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    faqs:             { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    settings:         { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
    contactEnquiries: { view: { type: Boolean, default: false } },
    userManagement:   { view: { type: Boolean, default: false }, edit: { type: Boolean, default: false } },
  },
  { _id: false }
);

// ── Default permission sets by role ──────────────────────────────────────────
export const DEFAULT_PERMISSIONS = {
  super_admin: {
    dashboard:        { view: true },
    admissions:       { view: true, updateStatus: true, delete: true },
    content:          { view: true, edit: true, publish: true },
    gallery:          { view: true, edit: true, delete: true },
    news:             { view: true, edit: true, publish: true, delete: true },
    documents:        { view: true, edit: true, delete: true },
    fees:             { view: true, edit: true },
    faqs:             { view: true, edit: true },
    settings:         { view: true, edit: true },
    contactEnquiries: { view: true },
    userManagement:   { view: true, edit: true },
  },
  content_editor: {
    dashboard:        { view: true },
    admissions:       { view: false, updateStatus: false, delete: false },
    content:          { view: true, edit: true, publish: true },
    gallery:          { view: true, edit: true, delete: true },
    news:             { view: true, edit: true, publish: true, delete: true },
    documents:        { view: true, edit: true, delete: true },
    fees:             { view: true, edit: true },
    faqs:             { view: true, edit: true },
    settings:         { view: false, edit: false },
    contactEnquiries: { view: false },
    userManagement:   { view: false, edit: false },
  },
  admissions_staff: {
    dashboard:        { view: true },
    admissions:       { view: true, updateStatus: true, delete: false },
    content:          { view: false, edit: false, publish: false },
    gallery:          { view: false, edit: false, delete: false },
    news:             { view: false, edit: false, publish: false, delete: false },
    documents:        { view: false, edit: false, delete: false },
    fees:             { view: false, edit: false },
    faqs:             { view: false, edit: false },
    settings:         { view: false, edit: false },
    contactEnquiries: { view: true },
    userManagement:   { view: false, edit: false },
  },
};

// ── AdminUser schema ──────────────────────────────────────────────────────────
const adminUserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or less'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      // unique declared here only — NOT repeated in .index() below
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    // select: false — never returned in queries unless explicitly requested
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['super_admin', 'content_editor', 'admissions_staff'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
    },
    permissions: {
      type: permissionsSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes — email unique already declared in field def above ────────────────
// Only add NON-unique secondary indexes here to avoid duplication warnings
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ isActive: 1 });

// ── Pre-save: apply default permissions when role is set ──────────────────────
// Mongoose 9.x: use async pre-save (no next() parameter needed)
adminUserSchema.pre('save', async function () {
  if (this.isModified('role') || this.isNew) {
    const defaults = DEFAULT_PERMISSIONS[this.role];
    if (defaults) {
      // Only auto-apply if permissions are genuinely empty
      const current = this.permissions?.toObject
        ? this.permissions.toObject()
        : this.permissions;
      const isEmpty = !current || Object.keys(current).length === 0;
      if (isEmpty) {
        this.permissions = defaults;
      }
    }
  }
});

// ── Instance method: force-reset permissions to role defaults ─────────────────
adminUserSchema.methods.applyDefaultPermissions = function () {
  this.permissions = DEFAULT_PERMISSIONS[this.role] ?? {};
};

// ── Transform: strip passwordHash from every JSON serialisation ───────────────
adminUserSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

const AdminUser = model('AdminUser', adminUserSchema);
export default AdminUser;
