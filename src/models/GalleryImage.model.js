import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const GALLERY_CATEGORIES = ['Campus', 'Classrooms', 'Sports', 'Events', 'Activities'];

const galleryImageSchema = new Schema(
  {
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },

    thumbnailUrl: {
      type: String,
      default: '',
      trim: true,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: [120, 'Caption must be 120 characters or less'],
      default: '',
    },

    category: {
      type: String,
      enum: {
        values: GALLERY_CATEGORIES,
        message: '{VALUE} is not a valid gallery category',
      },
      required: [true, 'Category is required'],
    },

    albumName: {
      type: String,
      trim: true,
      maxlength: [150, 'Album name must be 150 characters or less'],
      default: '',
    },

    // Controls display sequence within category
    order: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values: ['published', 'draft'],
        message: '{VALUE} is not a valid status',
      },
      default: 'published',
    },

    uploadedBy: {
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
galleryImageSchema.index({ category: 1 });
galleryImageSchema.index({ status: 1 });
galleryImageSchema.index({ status: 1, category: 1, order: 1 }); // optimized public listing

const GalleryImage = model('GalleryImage', galleryImageSchema);
export default GalleryImage;
