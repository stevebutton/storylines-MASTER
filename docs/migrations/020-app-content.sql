-- 020-app-content.sql
-- Editable panel content stored as HTML, managed via admin edit mode in each panel.

create table if not exists app_content (
    id            uuid primary key default gen_random_uuid(),
    panel_id      text not null,          -- 'help' | 'new-story' | 'story-helper'
    topic_id      text not null,          -- slug, e.g. 'overview'
    title         text not null default '',
    body          text not null default '',
    display_order int  not null default 0,
    updated_at    timestamptz not null default now(),
    unique (panel_id, topic_id)
);

-- RLS
alter table app_content enable row level security;

-- Public read
create policy "app_content_public_read"
    on app_content for select
    using (true);

-- Authenticated write (admin only in practice)
create policy "app_content_auth_write"
    on app_content for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

-- ── Seed: HelpPanel topics ──────────────────────────────────────────────────

insert into app_content (panel_id, topic_id, title, body, display_order) values

('help', 'overview', 'Overview', '
<p>Welcome to your Story Editor. This guide will help you create and manage your interactive stories.</p>
<ul>
  <li>On the left you will see your <strong>Story Settings</strong>, followed by a list of your <strong>Chapters</strong> and their <strong>Slides</strong>.</li>
  <li>The main area on the right is where you will edit the details of your selected Story, Chapter, or Slide.</li>
  <li>Above the main area you will find the story title, chapter/slide counts, and save/preview buttons.</li>
</ul>
', 0),

('help', 'story-settings', 'Story Settings', '
<p>Configure your story''s basic information and hero media.</p>
<ul>
  <li>Click on <strong>Story Settings</strong> in the left sidebar.</li>
  <li>In the main editor you can:
    <ul>
      <li>Add a <strong>Title</strong>, <strong>Subtitle</strong>, and <strong>Author</strong>.</li>
      <li>Choose a <strong>Category</strong>.</li>
      <li>Upload a <strong>Hero Image</strong> or <strong>Hero Video</strong> for your story''s introduction.</li>
      <li>Mark your story as <strong>Published</strong> or allow <strong>Social Media Sharing</strong>.</li>
    </ul>
  </li>
</ul>
', 1),

('help', 'chapters', 'Chapters', '
<p>Chapters organise your story into major sections with map locations.</p>
<ul>
  <li>To <strong>add a new Chapter</strong>, click the "Add Chapter" button under your Story Settings.</li>
  <li>To <strong>view or edit a Chapter</strong>, click its name in the left sidebar. Use the small arrow next to a chapter to expand/collapse its slides.</li>
  <li>Each chapter can have its own map location, style, and animation settings.</li>
</ul>
', 2),

('help', 'slides', 'Slides', '
<p>Slides are the individual content pieces within each chapter.</p>
<ul>
  <li>To <strong>add a new Slide</strong> to a Chapter, first click on that Chapter in the sidebar, then click "Add Slide to Chapter" in the main editor.</li>
  <li>To <strong>view or edit a Slide</strong>, click its name in the left sidebar.</li>
  <li>Slides can include text, images, videos, and PDFs.</li>
</ul>
', 3),

('help', 'content', 'Content', '
<p>Edit the text and narrative content for your chapters and slides.</p>
<ul>
  <li>Use the <strong>Content</strong> tab to edit titles and descriptions.</li>
  <li>Add location names to provide context for your readers.</li>
  <li>Keep your content concise and engaging for the best storytelling experience.</li>
</ul>
', 4),

('help', 'location', 'Location', '
<p>Set precise map views for your chapters and slides.</p>
<ul>
  <li>Use the <strong>Location</strong> tab to access the interactive map.</li>
  <li>Navigate to your desired map view (pan, zoom, rotate, tilt).</li>
  <li>Click <strong>Capture Current View</strong> to save the map''s current position, zoom, pitch, and bearing.</li>
  <li>This map view will be shown when readers reach this part of your story.</li>
</ul>
', 5),

('help', 'media', 'Media', '
<p>Upload and manage images, videos, and documents for your slides.</p>
<ul>
  <li>Use the <strong>Media</strong> tab (available for Slides) to upload content.</li>
  <li>Upload <strong>Images</strong> to show alongside your slide text.</li>
  <li>Add <strong>Videos</strong> (with optional thumbnail) for richer storytelling.</li>
  <li>Attach <strong>PDF documents</strong> for additional resources.</li>
</ul>
', 6),

('help', 'settings', 'Settings', '
<p>Customise the visual appearance and behaviour of your chapters.</p>
<ul>
  <li>Use the <strong>Settings</strong> tab (available for Chapters) to adjust:
    <ul>
      <li><strong>Map Style</strong>: Choose from light, dark, satellite, watercolor, or terrain.</li>
      <li><strong>Card Alignment</strong>: Position your content card left, right, or center.</li>
      <li><strong>Animation Duration</strong>: Control how long the map takes to fly to the next location.</li>
    </ul>
  </li>
</ul>
', 7),

('help', 'map-style', 'Working with the map', '
<p>Customise the look of your story map by choosing or designing a map style.</p>
<ul>
  <li><strong>How to style the map</strong> — use the Map Style selector in Story Settings or in each Chapter''s Map Settings to choose from the available styles.</li>
  <li>To design your own custom map style, use the Mapbox Cartogram tool: <a href="https://apps.mapbox.com/cartogram/#13.01/40.7251/-74.0051" target="_blank" rel="noopener noreferrer">apps.mapbox.com/cartogram</a></li>
</ul>
', 8),

('help', 'save-preview', 'Save & Preview', '
<p>Save your work and preview your story as readers will see it.</p>
<ul>
  <li>Always click the <strong>Save</strong> button in the top right to save your changes.</li>
  <li>Click the <strong>Preview</strong> button (next to Save) to see how your story looks to readers.</li>
  <li>Preview opens in a new tab so you can keep editing while you review.</li>
</ul>
', 9);

-- ── Seed: New Story panel option descriptions ────────────────────────────────

insert into app_content (panel_id, topic_id, title, body, display_order) values

('new-story', 'scratch', 'Start from Scratch', '<p>Build your story from the ground up with complete creative control.</p>', 0),

('new-story', 'map', 'Build a Story from Your Photographs', '<p>Import a folder of photos and let Storylines build a location-based narrative from your geotagged images.</p>', 1),

('new-story', 'interview', 'Interview Mode', '<p>Use AI-guided prompts to structure your story systematically.</p>', 2),

('new-story', 'storyboarder', 'Storyboarder', '<p>Capture in the field, finish in the Story Editor — a mobile-first tool for collaborative field storytelling.</p>', 3),

('new-story', 'storyboarder-steps', 'Storyboarder — How it works', '
<p>Storyboarder is a mobile capture tool for teams working in the field. One person captures — voice notes, photos, GPS — while another finishes the story in the desktop Story Editor. Everything syncs in real time.</p>
<ol>
  <li><strong>Name your story</strong> — say the title into the mic when prompted.</li>
  <li><strong>Name your first chapter</strong> — speak the chapter name to begin.</li>
  <li><strong>Take photos</strong> — each photo saves instantly with your GPS location.</li>
  <li><strong>Record descriptions</strong> — voice note after each shot to brief the editor (optional).</li>
  <li><strong>Finish in Story Editor</strong> — content appears in the desktop editor as it''s captured, ready to edit, sequence, and publish.</li>
</ol>
', 4);

-- ── Seed: Story Helper (photo import) panel ──────────────────────────────────

insert into app_content (panel_id, topic_id, title, body, display_order) values

('story-helper', 'intro', 'How it works', '<p>Storylines builds a complete story from your geotagged field photographs. Images are organised into chapters by folder, GPS coordinates are extracted to place each image on the map, and AI generates captions and descriptions in your chosen voice.</p>', 0),

('story-helper', 'intro-append', 'How it works (append mode)', '<p>Story Helper adds new chapters to this story from your geotagged field photographs. Each folder in the ZIP becomes a new chapter, GPS coordinates place images on the map, and AI generates captions in your chosen voice — all appended directly to the existing story.</p>', 1);
