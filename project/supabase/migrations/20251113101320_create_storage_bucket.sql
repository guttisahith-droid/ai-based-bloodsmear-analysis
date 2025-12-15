/*
  # Create Storage Bucket for Blood Smear Images

  ## Overview
  Creates a storage bucket for storing blood smear images with appropriate security policies

  ## New Storage Configuration
  - Bucket name: blood-smears
  - Public access: false (authenticated users only)
  - File size limit: 10MB
  - Allowed file types: image/jpeg, image/png, image/tiff

  ## Security
  - Users can only upload to their own folder (user_id/)
  - Users can only access their own uploaded images
  - Automatic file size validation
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blood-smears',
  'blood-smears',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/tiff', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blood-smears' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'blood-smears' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blood-smears' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'blood-smears' AND
  (storage.foldername(name))[1] = auth.uid()::text
);