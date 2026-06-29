-- Create Secure Attachments Storage Bucket (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments', 
    'attachments', 
    false, 
    10485760, -- 10MB limit (10 * 1024 * 1024)
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/json']
)
ON CONFLICT (id) DO UPDATE 
SET public = false, 
    file_size_limit = 10485760, 
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/json'];

-- 1. Upload Policy (Researchers can upload into their folder prefix)
CREATE POLICY "Researchers can upload report attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Read Policy for Researchers (Access only their own files)
CREATE POLICY "Researchers can read their own report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Read Policy for Organizations (Access reports linked to their programs)
CREATE POLICY "Organizations can read program report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'attachments' AND
    EXISTS (
        SELECT 1 FROM public.submissions s
        JOIN public.programs p ON s.program_id = p.id
        JOIN public.memberships m ON p.org_id = m.org_id
        WHERE m.user_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[2]
    )
);

-- 4. Delete Policy (Prevent deletion after submission to maintain evidence integrity)
CREATE POLICY "Prevent attachment deletion"
ON storage.objects FOR DELETE
TO authenticated
USING (
    false
);
