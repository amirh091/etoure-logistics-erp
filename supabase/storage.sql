-- ============================================================
--  E-TOURÉ LOGISTICS ERP — Stockage des fichiers (Supabase Storage)
--  À exécuter APRÈS supabase/schema.sql et policies.sql
-- ============================================================
--  Buckets :
--    documents  → documents chauffeurs (permis, visite médicale, contrats)
--    invoices   → factures / devis PDF générés
--    proofs     → preuves de livraison (signatures, photos)
--  Convention de chemin : {tenant_id}/{entite}/{fichier}
--  → l'isolation par entreprise est garantie par le premier segment du chemin.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 10485760, ARRAY['image/png','image/jpeg','application/pdf']),
  ('invoices',  'invoices',  false, 10485760, ARRAY['application/pdf']),
  ('proofs',    'proofs',    false, 10485760, ARRAY['image/png','image/jpeg','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Lecture : un utilisateur authentifié ne lit que les fichiers de son entreprise
CREATE POLICY "storage_read_tenant" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('documents','invoices','proofs')
  AND (storage.foldername(name))[1] = auth.tenant_id()::text
);

-- Écriture : idem (les chauffeurs/exploitants peuvent déposer des preuves)
CREATE POLICY "storage_write_tenant" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('documents','invoices','proofs')
  AND (storage.foldername(name))[1] = auth.tenant_id()::text
);

-- Suppression : administrateurs seulement
CREATE POLICY "storage_delete_admin" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('documents','invoices','proofs')
  AND (storage.foldername(name))[1] = auth.tenant_id()::text
  AND auth.user_role() = 'admin'
);

-- ============================================================
--  Astuce : URLs signées côté client
--  const { data } = await supabase.storage
--    .from('invoices')
--    .createSignedUrl(`${tenantId}/FAC-2026-1001.pdf`, 60); // 60 s
-- ============================================================
