
-- Create layers table for storing GIS layers
CREATE TABLE public.layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'geojson',
  visible BOOLEAN NOT NULL DEFAULT true,
  opacity NUMERIC NOT NULL DEFAULT 0.8,
  color TEXT NOT NULL DEFAULT '#3498db',
  category TEXT NOT NULL DEFAULT 'כללי',
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for storing file metadata
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  size BIGINT NOT NULL DEFAULT 0,
  location JSONB,
  layer_id UUID REFERENCES public.layers(id) ON DELETE SET NULL,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth yet - can be tightened later)
CREATE POLICY "Anyone can view layers" ON public.layers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert layers" ON public.layers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update layers" ON public.layers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete layers" ON public.layers FOR DELETE USING (true);

CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('gis-documents', 'gis-documents', true);

CREATE POLICY "Anyone can view gis documents" ON storage.objects FOR SELECT USING (bucket_id = 'gis-documents');
CREATE POLICY "Anyone can upload gis documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gis-documents');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_layers_updated_at BEFORE UPDATE ON public.layers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
