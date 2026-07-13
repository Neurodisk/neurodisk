-- ============================================================
-- 035 — Nom du professionnel d'un programme (pour le PDF patient)
--
-- La politique RLS profiles_select_own empêche un patient de lire le
-- profil du clinicien (id = auth.uid() OR is_admin()). Le PDF du
-- programme affichait donc toujours « Votre professionnel Neurodisk »
-- au lieu du vrai nom.
--
-- Cette fonction SECURITY DEFINER retourne UNIQUEMENT le nom complet du
-- créateur (programmes.created_by), et seulement si l'appelant est
-- autorisé à voir ce programme : le patient propriétaire OU un admin.
-- Aucune autre donnée du profil clinicien n'est exposée.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_programme_professional(p_programme_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_creator    uuid;
  v_name       text;
BEGIN
  SELECT patient_id, created_by
    INTO v_patient_id, v_creator
    FROM public.programmes
   WHERE id = p_programme_id;

  -- Programme inexistant
  IF v_patient_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Autorisation : seul le patient propriétaire ou un admin.
  IF NOT (v_patient_id = auth.uid() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_creator IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_creator;
  RETURN v_name;  -- peut être NULL si le clinicien n'a pas de nom renseigné
END $$;

REVOKE ALL ON FUNCTION public.get_programme_professional(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_programme_professional(uuid) TO authenticated;
