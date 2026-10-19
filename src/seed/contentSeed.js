/**
 * Content seed — inserts default CMS blocks for every public page.
 * Safe to re-run — uses findOneAndUpdate with $setOnInsert so existing
 * values are never overwritten.
 *
 * Run: node src/seed/contentSeed.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Content from '../models/Content.model.js';

const BLOCKS = [
  // ── Home ────────────────────────────────────────────────────────────────
  { key: 'home.hero.title',         page: 'home', section: 'hero',      label: 'Hero Headline',          type: 'text',     value: 'A stress-free place where every child grows with character.' },
  { key: 'home.hero.subtitle',      page: 'home', section: 'hero',      label: 'Hero Sub-text',          type: 'text',     value: 'English-medium, CBSE school. Nursery to XII. Jaipur, Rajasthan.' },
  { key: 'home.hero.badge',         page: 'home', section: 'hero',      label: 'Admission Badge Text',   type: 'text',     value: 'Admissions Open · Session [to be confirmed]' },
  { key: 'home.welcome.title',      page: 'home', section: 'welcome',   label: 'Welcome Section Title',  type: 'text',     value: 'Welcome to Tilak Global School' },
  { key: 'home.welcome.body',       page: 'home', section: 'welcome',   label: 'Welcome Body Text',      type: 'richtext', value: 'Tilak Global School, established in 2016 as a venture of the Tilak Group, offers a holistic, NCERT/CBSE curriculum in a nurturing, co-educational environment. From Nursery to Class XII, we are committed to building character, creativity and academic excellence.' },
  { key: 'home.director.quote',     page: 'home', section: 'director',  label: "Director's Short Quote", type: 'text',     value: 'Our task is to make children aware of indigenous knowledge and prepare them to meet competition with creativity and innovation.' },
  { key: 'home.cta.title',          page: 'home', section: 'cta',       label: 'CTA Banner Title',       type: 'text',     value: 'Give your child the best start.' },
  { key: 'home.cta.subtitle',       page: 'home', section: 'cta',       label: 'CTA Banner Subtitle',    type: 'text',     value: 'Admissions open for session [to be confirmed]. Limited seats available.' },

  // ── About ────────────────────────────────────────────────────────────────
  { key: 'about.intro.body',        page: 'about', section: 'intro',    label: 'Who We Are',             type: 'richtext', value: 'Established in 2016 as a venture of the Tilak Group (also running Tilak Public School, Triveni Nagar, Jaipur), Tilak Global School follows the NCERT/CBSE curriculum with a holistic and constructivist approach. We are a co-educational, English-medium school offering classes from Nursery to XII.' },
  { key: 'about.vision.text',       page: 'about', section: 'vision',   label: 'Vision Statement',       type: 'text',     value: 'Education with positive input that builds strong human behaviour, creativity and innovation.' },
  { key: 'about.mission.text',      page: 'about', section: 'mission',  label: 'Mission Statement',      type: 'text',     value: '[Mission statement — to be confirmed by school]' },
  { key: 'about.values.list',       page: 'about', section: 'values',   label: 'Core Values',            type: 'list',     value: ['Integrity', 'Respect', 'Curiosity', 'Excellence', 'Compassion'] },
  { key: 'about.director.message',  page: 'about', section: 'director', label: "Director's Full Message", type: 'richtext', value: 'Our task is to make children aware of indigenous knowledge and prepare them to meet competition with creativity and innovation. [Full message — to be confirmed by school]' },
  { key: 'about.director.name',     page: 'about', section: 'director', label: "Director's Name",        type: 'text',     value: 'R. S. Tanwar' },
  { key: 'about.director.designation', page: 'about', section: 'director', label: 'Designation',         type: 'text',     value: 'Director' },

  // ── Academics ────────────────────────────────────────────────────────────
  { key: 'academics.kg.description',     page: 'academics', section: 'stages', label: 'Kindergarten Description', type: 'text', value: 'A safe, family-like environment where children develop social, emotional and early academic skills through play and activity.' },
  { key: 'academics.primary.description',page: 'academics', section: 'stages', label: 'Primary Description',      type: 'text', value: 'Qualified faculty guide students through foundational concepts using NCERT curriculum with an activity-based approach.' },
  { key: 'academics.middle.description', page: 'academics', section: 'stages', label: 'Middle School Description', type: 'text', value: 'Strategies aligned by teachers to develop analytical thinking, problem-solving and collaborative skills.' },
  { key: 'academics.senior.description', page: 'academics', section: 'stages', label: 'Senior School Description', type: 'text', value: 'Focused preparation for IIT, NEET, CPT and other competitive exams with dedicated career guidance.' },
  { key: 'academics.methodology.concept', page: 'academics', section: 'methodology', label: 'Concept-led Teaching', type: 'text', value: 'Deep conceptual understanding is built before procedural practice, ensuring students genuinely grasp each topic.' },
  { key: 'academics.methodology.activity', page: 'academics', section: 'methodology', label: 'Activity-based Learning', type: 'text', value: 'Hands-on experiments, projects and co-curricular activities reinforce classroom learning.' },
  { key: 'academics.methodology.career', page: 'academics', section: 'methodology', label: 'Career Guidance',      type: 'text', value: 'Senior students receive structured career counselling and subject-selection support from Class IX onwards.' },

  // ── Admissions ────────────────────────────────────────────────────────────
  { key: 'admissions.process.step1', page: 'admissions', section: 'process', label: 'Step 1 Label', type: 'text', value: 'Enquire — Fill the online enquiry form or visit the school office.' },
  { key: 'admissions.process.step2', page: 'admissions', section: 'process', label: 'Step 2 Label', type: 'text', value: 'Apply — Complete the admission application with student and parent details.' },
  { key: 'admissions.process.step3', page: 'admissions', section: 'process', label: 'Step 3 Label', type: 'text', value: 'Interaction — Attend a brief interaction/assessment session if required for the class.' },
  { key: 'admissions.process.step4', page: 'admissions', section: 'process', label: 'Step 4 Label', type: 'text', value: 'Confirm — Submit original documents and pay the admission fee to confirm the seat.' },
  { key: 'admissions.eligibility.note', page: 'admissions', section: 'eligibility', label: 'Eligibility Note', type: 'text', value: '[Minimum age requirements — to be confirmed by school]' },
  { key: 'admissions.docs.list',    page: 'admissions', section: 'documents', label: 'Required Documents', type: 'list',  value: ['Birth Certificate', 'Previous school report card / Transfer Certificate', 'Aadhaar card of student (if required)', 'Passport-size photographs (4)', 'Parent / Guardian ID proof', 'Address proof'] },

  // ── Facilities ────────────────────────────────────────────────────────────
  { key: 'facilities.smartclass.desc',  page: 'facilities', section: 'smartclass',  label: 'Smart Classrooms',     type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.sciencelab.desc',  page: 'facilities', section: 'sciencelab',  label: 'Science Laboratories', type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.computerlab.desc', page: 'facilities', section: 'computerlab', label: 'Computer Laboratory',  type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.library.desc',     page: 'facilities', section: 'library',     label: 'Library',              type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.sports.desc',      page: 'facilities', section: 'sports',      label: 'Sports Facilities',    type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.auditorium.desc',  page: 'facilities', section: 'auditorium',  label: 'Auditorium',           type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.music.desc',       page: 'facilities', section: 'music',       label: 'Music & Art Rooms',    type: 'text', value: '[Description — to be confirmed by school]' },
  { key: 'facilities.transport.desc',   page: 'facilities', section: 'transport',   label: 'Transport & Security', type: 'text', value: '[Description — to be confirmed by school]' },

  // ── Contact ────────────────────────────────────────────────────────────────
  { key: 'contact.intro.text', page: 'contact', section: 'intro', label: 'Contact Intro Text', type: 'text', value: 'We would love to hear from you. Reach out via phone, email or the form below.' },

  // ── Results ────────────────────────────────────────────────────────────────
  { key: 'results.info.statement', page: 'results', section: 'info', label: 'Results Info Statement', type: 'text', value: 'Results and examination notices are published by the school. Individual student results are not displayed publicly on this website.' },

  // ── Downloads ────────────────────────────────────────────────────────────
  { key: 'downloads.intro.text', page: 'downloads', section: 'intro', label: 'Downloads Page Intro', type: 'text', value: 'Download CBSE mandatory disclosures, school policies, certificates, academic documents and admission forms below.' },
];

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    let created = 0;
    let skipped = 0;

    for (const block of BLOCKS) {
      const existing = await Content.findOne({ key: block.key });
      if (existing) {
        skipped++;
        continue;
      }
      await Content.create({
        ...block,
        status:    'published',
        hasDraft:  false,
        draftValue: null,
      });
      created++;
    }

    console.log(`✅ Content blocks: ${created} created, ${skipped} already existed.`);
    console.log('🎉 Content seed complete.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
