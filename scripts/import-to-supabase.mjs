/**
 * Storylines — Supabase CSV Import
 *
 * Reads Base44 CSV exports and loads them into Supabase in FK-dependency order.
 *
 * REQUIRES the service role key (bypasses RLS — safe for server-side migration only).
 * Find it in: Supabase dashboard → Project Settings → API → service_role key
 * Add to .env:  SUPABASE_SERVICE_KEY=eyJ...
 *
 * Usage:
 *   node scripts/import-to-supabase.mjs
 *
 * Options (env vars):
 *   DRY_RUN=true   — parse and transform only, no writes to Supabase
 *   CLEAR=true     — delete all rows from each table before importing (use with care)
 */

import { createClient }  from '@supabase/supabase-js';
import { parse }         from 'csv-parse/sync';
import { readFileSync }  from 'fs';
import { config }        from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '..', 'storylines-export', 'data');
const DRY_RUN   = process.env.DRY_RUN === 'true';
const CLEAR     = process.env.CLEAR    === 'true';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌  Missing env vars. Add to .env:');
  console.error('   SUPABASE_SERVICE_KEY=eyJ...\n');
  console.error('   Find it: Supabase dashboard → Project Settings → API → service_role\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toNull    = v => (v === '' || v == null) ? null : v;
const toFloat   = v => (v === '' || v == null) ? null : parseFloat(v);
const toInt     = v => (v === '' || v == null) ? null : parseInt(v, 10);
const toBigInt  = v => (v === '' || v == null) ? null : parseInt(v, 10);
const toBool    = v => v === 'true' ? true : v === 'false' ? false : null;
const toJson    = v => {
  if (v === '' || v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
};
const slugify   = s => s.toLowerCase().trim()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '');

function readCsv(filename) {
  const path = join(DATA_DIR, filename);
  const raw  = readFileSync(path, 'utf-8');
  return parse(raw, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    relax_quotes:     true,
    relax_column_count: true,
  });
}

async function upsertBatch(table, rows, chunkSize = 100) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would upsert ${rows.length} rows into ${table}`);
    return;
  }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌  ${table} chunk ${i}–${i + chunk.length}: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
  }
  console.log(`  ✓  ${table}: ${inserted} rows`);
}

async function clearTable(table) {
  if (DRY_RUN) { console.log(`  [dry-run] would clear ${table}`); return; }
  const { error } = await supabase.from(table).delete().neq('id', '__none__');
  if (error) console.error(`  ❌  clear ${table}: ${error.message}`);
  else       console.log(`  cleared ${table}`);
}

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

function transformCategories(rows) {
  return rows.map(r => ({
    id:           r.id,
    name:         toNull(r.name),
    slug:         slugify(r.name || r.id),
    color:        toNull(r.color),
    type:         'story',          // all Base44 categories are story categories
    is_sample:    toBool(r.is_sample),
    created_date: toNull(r.created_date),
    updated_date: toNull(r.updated_date),
    created_by_id: toNull(r.created_by_id),
    created_by:   toNull(r.created_by),
  }));
}

function transformStories(rows) {
  return rows.map(r => ({
    id:                               r.id,
    title:                            toNull(r.title),
    subtitle:                         toNull(r.subtitle),
    story_description:                toNull(r.story_description),
    author:                           toNull(r.author),
    hero_image:                       toNull(r.hero_image),
    hero_video:                       toNull(r.hero_video),
    hero_video_loop:                  toBool(r.hero_video_loop),
    hero_type:                        toNull(r.hero_type) ?? 'image',
    thumbnail:                        toNull(r.thumbnail),
    coordinates:                      toJson(r.coordinates),
    zoom:                             toFloat(r.zoom),
    bearing:                          toFloat(r.bearing),
    pitch:                            toFloat(r.pitch),
    map_style:                        toNull(r.map_style) ?? 'light',
    is_published:                     toBool(r.is_published),
    is_shareable:                     toBool(r.is_shareable),
    is_main_story:                    toBool(r.is_main_story),
    is_sample:                        toBool(r.is_sample),
    category:                         toNull(r.category),
    caption_voice:                    toNull(r.caption_voice),
    custom_caption_voice_description: toNull(r.custom_caption_voice_description),
    story_context:                    toJson(r.story_context),
    created_date:                     toNull(r.created_date),
    updated_date:                     toNull(r.updated_date),
    created_by_id:                    toNull(r.created_by_id),
    created_by:                       toNull(r.created_by),
  }));
}

function transformChapters(rows) {
  return rows.map(r => ({
    id:           r.id,
    story_id:     toNull(r.story_id),
    name:         toNull(r.name),
    order:        toInt(r.order),
    alignment:    toNull(r.alignment) ?? 'left',
    is_sample:    toBool(r.is_sample),
    created_date: toNull(r.created_date),
    updated_date: toNull(r.updated_date),
    created_by_id: toNull(r.created_by_id),
    created_by:   toNull(r.created_by),
  }));
}

function transformSlides(rows) {
  return rows.map(r => ({
    id:                   r.id,
    chapter_id:           toNull(r.chapter_id),
    order:                toInt(r.order),
    title:                toNull(r.title),
    description:          toNull(r.description),
    extended_content:     toNull(r.extended_content),
    location:             toNull(r.location),
    coordinates:          toJson(r.coordinates),
    image:                toNull(r.image),
    background_image:     toNull(r.background_image),
    video_url:            toNull(r.video_url),
    video_thumbnail_url:  toNull(r.video_thumbnail_url),
    pdf_url:              toNull(r.pdf_url),
    zoom:                 toFloat(r.zoom),
    bearing:              toFloat(r.bearing),
    pitch:                toFloat(r.pitch),
    fly_duration:         toFloat(r.fly_duration),
    mapbox_layer_id:      toNull(r.mapbox_layer_id),
    card_style:           toNull(r.card_style) ?? 'default',
    is_sample:            toBool(r.is_sample),
    created_date:         toNull(r.created_date),
    updated_date:         toNull(r.updated_date),
    created_by_id:        toNull(r.created_by_id),
    created_by:           toNull(r.created_by),
  }));
}

function transformDocuments(rows) {
  return rows.map(r => ({
    id:           r.id,
    story_id:     toNull(r.story_id),       // empty string → null (standalone doc)
    title:        toNull(r.title),
    description:  toNull(r.description),
    file_url:     toNull(r.file_url),
    folder:       toNull(r.folder),
    category:     toNull(r.category),
    file_size:    toBigInt(r.file_size),
    page_count:   toInt(r.page_count),
    tags:         toJson(r.tags),
    is_sample:    toBool(r.is_sample),
    created_date: toNull(r.created_date),
    updated_date: toNull(r.updated_date),
    created_by_id: toNull(r.created_by_id),
    created_by:   toNull(r.created_by),
  }));
}

function transformMedia(rows) {
  return rows.map(r => ({
    id:           r.id,
    url:          toNull(r.url),
    filename:     toNull(r.filename),
    title:        toNull(r.title),
    description:  toNull(r.description),
    tags:         toJson(r.tags),
    category:     toNull(r.category),
    file_size:    toBigInt(r.file_size),
    dimensions:   toNull(r.dimensions),
    is_sample:    toBool(r.is_sample),
    created_date: toNull(r.created_date),
    updated_date: toNull(r.updated_date),
    created_by_id: toNull(r.created_by_id),
    created_by:   toNull(r.created_by),
  }));
}

function transformHomepageSections(rows) {
  return rows.map(r => ({
    id:              r.id,
    page_name:       toNull(r.pageName),     // CSV column is pageName
    title:           toNull(r.title),
    content:         toNull(r.content),
    image_url:       toNull(r.image_url),
    video_url:       toNull(r.video_url),
    order:           toInt(r.order),
    layout_type:     toNull(r.layout_type),
    component_type:  toNull(r.component_type),
    linked_story_id: toNull(r.linked_story_id),
    coordinates:     toJson(r.coordinates),
    zoom:            toFloat(r.zoom),
    bearing:         toFloat(r.bearing),
    pitch:           toFloat(r.pitch),
    show_gradient:   toBool(r.show_gradient),
    tagline:         toNull(r.tagline),
    cta_text:        toNull(r.cta_text),
    cta_link:        toNull(r.cta_link),
    is_sample:       toBool(r.is_sample),
    created_date:    toNull(r.created_date),
    updated_date:    toNull(r.updated_date),
    created_by_id:   toNull(r.created_by_id),
    created_by:      toNull(r.created_by),
  }));
}

function transformHeroSlides(rows) {
  return rows.map(r => ({
    id:           r.id,
    section_id:   toNull(r.section_id),
    order:        toInt(r.order),
    image_url:    toNull(r.image_url),
    title:        toNull(r.title),
    description:  toNull(r.description),
    link:         toNull(r.link),
    is_sample:    toBool(r.is_sample),
    created_date: toNull(r.created_date),
    updated_date: toNull(r.updated_date),
    created_by_id: toNull(r.created_by_id),
    created_by:   toNull(r.created_by),
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nStorylines → Supabase import ${DRY_RUN ? '[DRY RUN]' : ''}\n`);

  // Import order respects FK dependencies:
  //   categories → stories → chapters → slides
  //                        → documents
  //                        → homepage_sections → hero_slides
  //   media (no FKs)

  // Build valid-ID sets for FK filtering as we go
  const validStoryIds   = new Set(readCsv('Story_export.csv').map(r => r.id));
  const validChapterIds = new Set();

  const steps = [
    {
      file: 'Category_export.csv',
      table: 'categories',
      transform: transformCategories,
    },
    {
      file: 'Story_export.csv',
      table: 'stories',
      transform: transformStories,
    },
    {
      file: 'Chapter_export.csv',
      table: 'chapters',
      transform: raw => {
        const all      = transformChapters(raw);
        const valid    = all.filter(r => validStoryIds.has(r.story_id));
        const skipped  = all.length - valid.length;
        if (skipped) console.log(`  skipping ${skipped} orphaned chapters (story deleted)`);
        valid.forEach(r => validChapterIds.add(r.id));
        return valid;
      },
    },
    {
      file: 'Slide.csv',
      table: 'slides',
      transform: raw => {
        const all     = transformSlides(raw);
        const valid   = all.filter(r => validChapterIds.has(r.chapter_id));
        const skipped = all.length - valid.length;
        if (skipped) console.log(`  skipping ${skipped} orphaned slides (chapter deleted)`);
        return valid;
      },
    },
    {
      file: 'Document_export.csv',
      table: 'documents',
      transform: transformDocuments,
    },
    {
      file: 'Media_export.csv',
      table: 'media',
      transform: transformMedia,
    },
    {
      file: 'HomePageSection_export.csv',
      table: 'homepage_sections',
      transform: transformHomepageSections,
    },
    {
      file: 'HeroSlide_export.csv',
      table: 'hero_slides',
      transform: transformHeroSlides,
    },
  ];

  if (CLEAR) {
    console.log('Clearing tables (reverse FK order)...');
    const reversed = [...steps].reverse();
    for (const s of reversed) await clearTable(s.table);
    console.log();
  }

  for (const { file, table, transform } of steps) {
    process.stdout.write(`Importing ${file} → ${table}... `);
    try {
      const raw  = readCsv(file);
      const rows = transform(raw);
      console.log(`(${rows.length} rows)`);
      await upsertBatch(table, rows);
    } catch (err) {
      console.error(`  ❌  ${err.message}`);
    }
  }

  console.log('\nDone.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
