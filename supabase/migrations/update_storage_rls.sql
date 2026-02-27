-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to the 'exam_pdfs' bucket
-- They can upload to 'submissions/', 'rubrics/', or 'bulk_uploads/' folders
CREATE POLICY "Allow authenticated uploads to exam_pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam_pdfs' AND
  (
    (storage.foldername(name))[1] = 'submissions' OR
    (storage.foldername(name))[1] = 'rubrics' OR
    (storage.foldername(name))[1] = 'bulk_uploads'
  )
);

-- Policy to allow authenticated users to read their own uploads (or public ones if needed)
-- For now, let's allow authenticated users to read from exam_pdfs generally,
-- or restrict it. The backend uses Service Role so it's fine.
-- Frontend needs read access for things like "View Document" if using signed URLs or public URLs.
-- If using the proxy `/api/download`, we don't strictly need public read access here.
-- However, the client might need to see the file immediately after upload in some UI cases.
CREATE POLICY "Allow authenticated read access to exam_pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'exam_pdfs');

-- Policy to allow updates (if needed, e.g., overwriting) - Optional
-- CREATE POLICY "Allow authenticated updates to exam_pdfs" ...
