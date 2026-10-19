-- STAGING ONLY: do not apply until API code on the same release is ready.
-- Atomic document metadata replacement; Storage uploads are deliberately outside PostgreSQL.
CREATE OR REPLACE FUNCTION public.record_professional_document_upload_atomic(
  p_professional_id uuid, p_document_type text, p_storage_path text,
  p_original_filename text, p_mime_type text, p_file_size bigint,
  p_is_public boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_profession text;
  v_existing boolean;
  v_required boolean;
  v_currently_approved boolean;
  v_suspend boolean;
  v_doc public.professional_documents%ROWTYPE;
  v_now timestamptz := transaction_timestamp();
BEGIN
  IF p_document_type NOT IN ('identity','registration','vat','cv')
     OR p_storage_path IS NULL
     OR p_storage_path NOT LIKE p_professional_id::text || '/%'
     OR p_file_size IS NULL OR p_file_size < 1 OR p_file_size > 6291456
     OR p_mime_type NOT IN ('application/pdf','image/jpeg','image/png')
  THEN
    RAISE EXCEPTION 'Metadati documento non validi' USING ERRCODE='22023';
  END IF;

  SELECT profession, (verification_status='APPROVED' OR verified OR published)
  INTO v_profession, v_currently_approved
  FROM public.professional_profiles WHERE user_id = p_professional_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profilo professionale non trovato' USING ERRCODE='P0002';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.professional_documents
    WHERE professional_id=p_professional_id AND document_type=p_document_type
  ) INTO v_existing;
  v_required := p_document_type IN ('identity','cv')
    OR (p_document_type='registration' AND v_profession IS DISTINCT FROM 'Badante');
  v_suspend := v_required AND (v_existing OR coalesce(v_currently_approved,false));

  -- Upsert serialized by the profile row lock, shared with the admin review RPC.
  INSERT INTO public.professional_documents (
    professional_id,document_type,storage_path,original_filename,mime_type,file_size,
    is_public,verification_status,rejection_reason,uploaded_at,verified_at,verified_by,updated_at
  ) VALUES (
    p_professional_id,p_document_type,p_storage_path,p_original_filename,p_mime_type,p_file_size,
    CASE WHEN p_document_type='cv' THEN coalesce(p_is_public,false) ELSE false END,
    'PENDING',NULL,v_now,NULL,NULL,v_now
  )
  ON CONFLICT (professional_id,document_type) DO UPDATE SET
    storage_path=EXCLUDED.storage_path,original_filename=EXCLUDED.original_filename,
    mime_type=EXCLUDED.mime_type,file_size=EXCLUDED.file_size,
    is_public=EXCLUDED.is_public,verification_status='PENDING',
    rejection_reason=NULL,uploaded_at=v_now,verified_at=NULL,verified_by=NULL,updated_at=v_now
  RETURNING * INTO v_doc;

  UPDATE public.professional_profiles SET
    identity_document_path=CASE WHEN p_document_type='identity' THEN p_storage_path ELSE identity_document_path END,
    registration_document_path=CASE WHEN p_document_type='registration' THEN p_storage_path ELSE registration_document_path END,
    vat_document_path=CASE WHEN p_document_type='vat' THEN p_storage_path ELSE vat_document_path END,
    documents_submitted=true,
    verification_status=CASE WHEN v_suspend THEN 'PENDING' ELSE verification_status END,
    verified=CASE WHEN v_suspend THEN false ELSE verified END,
    published=CASE WHEN v_suspend THEN false ELSE published END,
    verified_at=CASE WHEN v_suspend THEN NULL ELSE verified_at END,
    verified_by=CASE WHEN v_suspend THEN NULL ELSE verified_by END,
    verification_notes=CASE WHEN v_suspend THEN 'Documento obbligatorio sostituito: nuova verifica richiesta.' ELSE verification_notes END,
    updated_at=v_now
  WHERE user_id=p_professional_id;

  RETURN jsonb_build_object('document',to_jsonb(v_doc),'profileSuspended',v_suspend);
END;
$$;

REVOKE ALL ON FUNCTION public.record_professional_document_upload_atomic(uuid,text,text,text,text,bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_professional_document_upload_atomic(uuid,text,text,text,text,bigint,boolean) TO service_role;

-- Remove the legacy 5-argument entry point: otherwise old callers can bypass the version check.

-- Version precondition for every review; fail closed when the admin reviewed a stale file.
-- Requires a coordinated API rollout supplying p_expected_storage_path.
CREATE OR REPLACE FUNCTION public.admin_review_professional_document_atomic(
 p_professional_id uuid,p_document_id uuid,p_admin_id uuid,p_action text,
 p_rejection_reason text,p_expected_storage_path text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_profession text; v_profile_completed boolean; v_documents_submitted boolean;
 v_document_type text; v_actual_path text; v_status text;
 v_reason text := NULLIF(btrim(p_rejection_reason),'');
 v_registration_required boolean; v_can_auto_approve boolean;
 v_revoke boolean; v_auto_approved boolean := false;
 v_document jsonb; v_now timestamptz := transaction_timestamp();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND role='ADMIN') THEN
   RAISE EXCEPTION 'Amministratore non autorizzato' USING ERRCODE='42501';
 END IF;
 IF p_action IS NULL OR p_action NOT IN ('APPROVE','REJECT') THEN
   RAISE EXCEPTION 'Azione non valida' USING ERRCODE='22023';
 END IF;
 IF p_action='REJECT' AND v_reason IS NULL THEN
   RAISE EXCEPTION 'Motivazione del rifiuto obbligatoria' USING ERRCODE='22023';
 END IF;
 IF char_length(coalesce(v_reason,''))>1500 THEN
   RAISE EXCEPTION 'Motivazione troppo lunga' USING ERRCODE='22023';
 END IF;
 SELECT profession,profile_completed,documents_submitted
 INTO v_profession,v_profile_completed,v_documents_submitted
 FROM public.professional_profiles WHERE user_id=p_professional_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profilo professionale non trovato' USING ERRCODE='P0002'; END IF;

 SELECT document_type,storage_path,verification_status
 INTO v_document_type,v_actual_path,v_status
 FROM public.professional_documents
 WHERE id=p_document_id AND professional_id=p_professional_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento professionale non trovato' USING ERRCODE='P0002'; END IF;
 IF p_expected_storage_path IS NULL OR p_expected_storage_path IS DISTINCT FROM v_actual_path THEN
   RAISE EXCEPTION 'Documento modificato: aggiornare la pagina e riesaminare il file' USING ERRCODE='40001';
 END IF;
 IF v_status IS DISTINCT FROM 'PENDING' THEN
   RAISE EXCEPTION 'Documento non in attesa di revisione' USING ERRCODE='22023';
 END IF;

 UPDATE public.professional_documents SET
   verification_status=CASE WHEN p_action='APPROVE' THEN 'APPROVED' ELSE 'REJECTED' END,
   rejection_reason=CASE WHEN p_action='REJECT' THEN v_reason ELSE NULL END,
   verified_at=v_now,verified_by=p_admin_id,updated_at=v_now
 WHERE id=p_document_id AND professional_id=p_professional_id
 RETURNING jsonb_build_object('id',id,'document_type',document_type,
   'verification_status',verification_status,'storage_path',storage_path,
   'rejection_reason',rejection_reason,'verified_at',verified_at,
   'verified_by',verified_by,'updated_at',updated_at) INTO v_document;

 v_registration_required:=v_profession IS DISTINCT FROM 'Badante';
 SELECT coalesce(bool_or(document_type='identity' AND verification_status='APPROVED'),false)
   AND coalesce(bool_or(document_type='cv' AND verification_status='APPROVED'),false)
   AND (NOT v_registration_required OR
     coalesce(bool_or(document_type='registration' AND verification_status='APPROVED'),false))
 INTO v_can_auto_approve
 FROM public.professional_documents WHERE professional_id=p_professional_id;
 v_can_auto_approve:=coalesce(v_profile_completed,false)
   AND coalesce(v_documents_submitted,false) AND coalesce(v_can_auto_approve,false);
 v_revoke:=p_action='REJECT' AND (v_document_type IN ('identity','cv')
   OR (v_registration_required AND v_document_type='registration'));
 IF v_revoke THEN
   UPDATE public.professional_profiles SET verification_status='REJECTED',
     verified=false,published=false,verification_notes=coalesce(v_reason,'Documento obbligatorio rifiutato.'),
     verified_at=v_now,verified_by=p_admin_id,updated_at=v_now
   WHERE user_id=p_professional_id;
 ELSIF p_action='APPROVE' AND v_can_auto_approve THEN
   UPDATE public.professional_profiles SET verification_status='APPROVED',
     verification_notes=NULL,verified_at=v_now,verified_by=p_admin_id,
     verified=true,published=true,updated_at=v_now
   WHERE user_id=p_professional_id;
   v_auto_approved:=true;
 END IF;
 RETURN jsonb_build_object('success',true,'document',v_document,'profileAutoApproved',v_auto_approved);
END;
$$;
-- IMPORTANT: deploy API and database together in a maintenance window.
-- The previous review signature is deliberately removed to prevent bypass.
REVOKE ALL ON FUNCTION public.admin_review_professional_document_atomic(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_professional_document_atomic(uuid,uuid,uuid,text,text,text) TO service_role;
