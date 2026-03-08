ALTER TABLE public.layers 
  ADD COLUMN IF NOT EXISTS stroke_color text DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS stroke_opacity numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fill_color text,
  ADD COLUMN IF NOT EXISTS fill_opacity numeric DEFAULT 0.3;