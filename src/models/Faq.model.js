import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const faqSchema = new Schema(
  {
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: [500, 'Question must be 500 characters or less'],
    },

    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
      maxlength: [2000, 'Answer must be 2000 characters or less'],
    },

    // Display order (lower number = shown first)
    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
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

// ── Indexes ───────────────────────────────────────────────────────────────────
faqSchema.index({ isActive: 1, order: 1 }); // public listing sorted by order

const Faq = model('Faq', faqSchema);
export default Faq;
