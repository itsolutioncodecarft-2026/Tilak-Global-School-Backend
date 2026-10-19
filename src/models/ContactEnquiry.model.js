import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const contactEnquirySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [150, 'Name must be 150 characters or less'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    subject: {
      type: String,
      trim: true,
      maxlength: [300, 'Subject must be 300 characters or less'],
      default: '',
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message must be 2000 characters or less'],
    },

    status: {
      type: String,
      enum: {
        values: ['unread', 'read', 'replied'],
        message: '{VALUE} is not a valid status',
      },
      default: 'unread',
    },

    // Stored for spam/rate-limit tracking; never exposed in UI responses
    ipAddress: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
contactEnquirySchema.index({ status: 1 });
contactEnquirySchema.index({ createdAt: -1 });

const ContactEnquiry = model('ContactEnquiry', contactEnquirySchema);
export default ContactEnquiry;
