-- Cesium camera position for individual slides in photorealistic-3d stories.
-- When present, the viewer flies to this position as the slide becomes active,
-- overriding the chapter-level cesium_camera.
ALTER TABLE slides
  ADD COLUMN IF NOT EXISTS cesium_camera jsonb;
