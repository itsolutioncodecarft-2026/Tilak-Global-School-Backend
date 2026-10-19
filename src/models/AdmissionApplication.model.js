import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ── Class list (Nursery to XII) ───────────────────────────────────────────────
export const CLASS_LIST = [
  'Nursery', 'LKG', 'UKG',
  'I', 'II', 'III', 'IV', 'V',
  'VI', 'VII', 'VIII',
  'IX', 'X', 'XI', 'XII',
];

// ── Application status values ─────────────────────────────────────────────────
export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'info_requested'];

// ── statusHistory sub-document ────────────────────────────────────────────────
const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [1000, 'Note must be 1000 characters or less'],
      default: '',
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const admissionApplicationSchema = new Schema(
  {
    // Auto-generated unique ID e.g. APP-0001
    applicationId: {
      type: String,
      unique: true,  // index declared here only, not repeated in .index() below
    },

    source: {
      type: String,
      enum: {
        values: ['enquiry', 'application'],
        message: '{VALUE} is not a valid source',
      },
      required: [true, 'Source is required'],
      default: 'enquiry',
    },

    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
    },

    statusNote: {
      type: String,
      trim: true,
      maxlength: [1000, 'Status note must be 1000 characters or less'],
      default: '',
    },

    // ── Student information ─────────────────────────────────────────────────
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [150, 'Student name must be 150 characters or less'],
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: '{VALUE} is not a valid gender',
      },
      default: null,
    },

    classApplying: {
      type: String,
      enum: {
        values: CLASS_LIST,
        message: '{VALUE} is not a valid class',
      },
      required: [true, 'Class applying for is required'],
    },

    previousSchool: {
      type: String,
      trim: true,
      maxlength: [200, 'Previous school name must be 200 characters or less'],
      default: '',
    },

    // ── Parent / guardian information ───────────────────────────────────────
    parentName: {
      type: String,
      required: [true, 'Parent name is required'],
      trim: true,
      maxlength: [150, 'Parent name must be 150 characters or less'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^(\+91)?[6-9]\d{9}$/, 'Please enter a valid Indian mobile number'],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      default: '',
    },

    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address must be 500 characters or less'],
      default: '',
    },

    occupation: {
      type: String,
      trim: true,
      maxlength: [100, 'Occupation must be 100 characters or less'],
      default: '',
    },

    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message must be 1000 characters or less'],
      default: '',
    },

    // ── Status history (embedded) ───────────────────────────────────────────
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes — applicationId unique already declared in field def above ────────
// Only secondary indexes here
admissionApplicationSchema.index({ status: 1 });
admissionApplicationSchema.index({ classApplying: 1 });
admissionApplicationSchema.index({ createdAt: -1 });
admissionApplicationSchema.index({ phone: 1 });
admissionApplicationSchema.index({ status: 1, createdAt: -1 });  // dashboard trend
admissionApplicationSchema.index({ classApplying: 1, status: 1 }); // by-class stats

// ── Text search index for student/parent name search ─────────────────────────
admissionApplicationSchema.index(
  { studentName: 'text', parentName: 'text', applicationId: 'text' },
  { name: 'application_text_search' }
);

const AdmissionApplication = model('AdmissionApplication', admissionApplicationSchema);
export default AdmissionApplication;
