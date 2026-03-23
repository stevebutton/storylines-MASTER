-- Rain effect button flag on slides
ALTER TABLE slides
  ADD COLUMN IF NOT EXISTS show_rain_button boolean DEFAULT false;
