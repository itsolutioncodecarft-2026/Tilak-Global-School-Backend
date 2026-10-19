/**
 * Central export for all Mongoose models.
 * Import from here instead of individual model files where convenient.
 *
 * Usage:
 *   import { AdminUser, AdmissionApplication, NewsPost } from '../models/index.js';
 */

export { default as AdminUser, DEFAULT_PERMISSIONS } from './AdminUser.model.js';
export { default as Counter, getNextSequence, formatApplicationId } from './Counter.model.js';
export { default as AdmissionApplication, CLASS_LIST, APPLICATION_STATUSES } from './AdmissionApplication.model.js';
export { default as Content, PAGE_LIST, CONTENT_TYPES } from './Content.model.js';
export { default as SiteSettings } from './SiteSettings.model.js';
export { default as GalleryImage, GALLERY_CATEGORIES } from './GalleryImage.model.js';
export { default as NewsPost, NEWS_CATEGORIES } from './NewsPost.model.js';
export { default as Document, DOCUMENT_CATEGORIES, DOCUMENT_PAGE_LIST, DOCUMENT_FILE_TYPES } from './Document.model.js';
export { default as FeeRow, FEE_CLASS_GROUPS } from './FeeRow.model.js';
export { default as Faq } from './Faq.model.js';
export { default as ContactEnquiry } from './ContactEnquiry.model.js';
export { default as ActivityLog, ACTIVITY_ACTIONS, ACTIVITY_MODULES } from './ActivityLog.model.js';
