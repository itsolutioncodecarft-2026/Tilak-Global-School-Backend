import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const FEE_CLASS_GROUPS = ['Nursery–UKG', 'I–V', 'VI–VIII', 'IX–XII'];

const feeRowSchema = new Schema(
  {
    classGroup: {
      type: String,
      enum: {
        values: FEE_CLASS_GROUPS,
        message: '{VALUE} is not a valid class group',
      },
      required: [true, 'Class group is required'],
      // unique declared here only — NOT repeated in .index() below
      unique: true,
    },

    // All fee amounts default to null — school fills via admin panel.
    // IMPORTANT: Never hardcode or invent fee amounts.
    admissionFee: {
      type: Number,
      default: null,
      min: [0, 'Admission fee cannot be negative'],
    },

    tuitionFeePerTerm: {
      type: Number,
      default: null,
      min: [0, 'Tuition fee cannot be negative'],
    },

    otherCharges: {
      type: Number,
      default: null,
      min: [0, 'Other charges cannot be negative'],
    },

    // Optional note (e.g. "includes lab fee", "3 terms per year")
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must be 500 characters or less'],
      default: '',
    },

    // Controls display order in fee table
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

// ── Indexes — classGroup unique already declared in field def above ────────────
// Only secondary non-unique indexes here
feeRowSchema.index({ isActive: 1, order: 1 });

const FeeRow = model('FeeRow', feeRowSchema);
export default FeeRow;
