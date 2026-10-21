/**
 * Seed script — run once to initialise:
 *   1. Super-admin user account (from .env or defaults)
 *   2. Default SiteSettings document
 *   3. Default FeeRow stubs (amounts null — school fills via admin)
 *   4. Default FAQ stubs
 *   5. ApplicationId counter
 *
 * Usage:
 *   node src/seed/seed.js
 *
 * Safe to re-run — uses upsert / findOrCreate patterns, never duplicates.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

import { MONGO_URI } from '../config/env.js';
import AdminUser, { DEFAULT_PERMISSIONS } from '../models/AdminUser.model.js';
import SiteSettings from '../models/SiteSettings.model.js';
import FeeRow, { FEE_CLASS_GROUPS } from '../models/FeeRow.model.js';
import Faq from '../models/Faq.model.js';
import Counter from '../models/Counter.model.js';

// Read credentials from env — use .com domain to match production
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@tilakglobalschool.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Super Admin';

// ── Admin user ─────────────────────────────────────────────────────────────────
async function seedAdminUser() {
  const existing = await AdminUser.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`ℹ️  Admin user already exists: ${ADMIN_EMAIL}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await AdminUser.create({
    name:         ADMIN_NAME,
    email:        ADMIN_EMAIL,
    passwordHash,
    role:         'super_admin',
    permissions:  DEFAULT_PERMISSIONS.super_admin,
    isActive:     true,
  });

  console.log(`✅ Super admin created: ${admin.email}`);
  return admin;
}

// ── Site settings singleton ────────────────────────────────────────────────────
async function seedSiteSettings() {
  await SiteSettings.getSingleton();
  console.log('✅ SiteSettings singleton ensured.');
}

// ── Fee row stubs (one per class group) ───────────────────────────────────────
async function seedFeeRows() {
  for (let i = 0; i < FEE_CLASS_GROUPS.length; i++) {
    const group = FEE_CLASS_GROUPS[i];
    await FeeRow.findOneAndUpdate(
      { classGroup: group },
      { $setOnInsert: { classGroup: group, order: i, isActive: true } },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`✅ FeeRow stubs seeded: ${FEE_CLASS_GROUPS.join(', ')}`);
}

// ── Default FAQs ──────────────────────────────────────────────────────────────
async function seedFaqs() {
  const count = await Faq.countDocuments();
  if (count > 0) {
    console.log(`ℹ️  FAQs already exist (${count}). Skipping.`);
    return;
  }

  const faqs = [
    { question: 'Which classes are open for admission?',
      answer:   '[To be confirmed by the school]', order: 1 },
    { question: 'What documents are required for admission?',
      answer:   'Birth certificate, previous school report card / Transfer Certificate, Aadhaar card (if applicable), passport-size photographs, parent ID and address proof.', order: 2 },
    { question: 'Is there an entrance test or interaction?',
      answer:   '[To be confirmed by the school]', order: 3 },
    { question: 'How can I pay the fees?',
      answer:   '[Payment methods and schedule — to be confirmed by the school]', order: 4 },
    { question: 'Does the school provide transport?',
      answer:   '[Transport availability — to be confirmed by the school]', order: 5 },
  ];

  await Faq.insertMany(faqs);
  console.log(`✅ ${faqs.length} FAQ stubs seeded.`);
}

// ── Application ID counter ────────────────────────────────────────────────────
async function seedCounter() {
  await Counter.findByIdAndUpdate(
    'application',
    { $setOnInsert: { _id: 'application', seq: 0 } },
    { upsert: true, new: true }
  );
  console.log('✅ Application ID counter ensured.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log('🔗 Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.\n');

    await seedAdminUser();
    await seedSiteSettings();
    await seedFeeRows();
    await seedFaqs();
    await seedCounter();

    console.log('\n🎉 Seed complete.');
    console.log(`\nAdmin login:\n  Email:    ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}\n`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  }
}

main();
