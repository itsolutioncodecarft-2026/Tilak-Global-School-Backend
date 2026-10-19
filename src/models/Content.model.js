import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ── Allowed page slugs ────────────────────────────────────────────────────────
export const PAGE_LIST = [
  'home', 'about', 'academics', 'admissions',
  'facilities', 'gallery', 'news', 'results', 'contact', 'downloads',
];

// ── Content value types ───────────────────────────────────────────────────────
export const CONTENT_TYPES = ['text', 'richtext', 'image', 'list', 'number'];

const contentSchema = new Schema(
  {
    /**
     * Unique dot-notation key identifying this content block.
     * Convention: <page>.<section>.<field>
     * Examples:
     *   home.hero.title
     *   home.hero.subtitle
     *   home.welcome.body
     *   about.director.message
     *   admissions.process.step1
     */
    key: {
      type: String,
      required: [true, 'Content key is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9._-]+$/, 'Key must be lowercase alphanumeric with dots, dashes or underscores'],
    },

    page: {
      type: String,
      enum: {
        values: PAGE_LIST,
        message: '{VALUE} is not a valid page',
      },
      required: [true, 'Page is required'],
    },

    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      maxlength: [100, 'Section name must be 100 characters or less'],
    },

    // Human-readable label for the admin UI
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
      maxlength: [200, 'Label must be 200 characters or less'],
    },

    type: {
      type: String,
      enum: {
        values: CONTENT_TYPES,
        message: '{VALUE} is not a valid content type',
      },
      required: [true, 'Content type is required'],
      default: 'text',
    },

    // Published live value
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Saved draft (not yet published)
    draftValue: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // true when draftValue differs from value and is pending publish
    hasDraft: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: {
        values: ['draft', 'published'],
        message: '{VALUE} is not a valid status',
      },
      default: 'published',
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes — key unique already declared in field def above ─────────────────
// Only secondary indexes here
contentSchema.index({ page: 1 });
contentSchema.index({ page: 1, section: 1 });
contentSchema.index({ status: 1 });

const Content = model('Content', contentSchema);
export default Content;
