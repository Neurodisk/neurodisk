// ============================================================
// NEURODISK — Client Supabase (singleton)
// ============================================================
// Importer ce fichier en premier dans chaque page HTML :
//   <script src="/js/supabase.js" type="module"></script>
//
// Variables d'environnement requises dans netlify.toml :
//   SUPABASE_URL  et  SUPABASE_ANON_KEY
//
// En développement local, définir dans un fichier .env
// lu par un serveur local (Live Server, Vite, etc.) ou
// remplacer temporairement les constantes ci-dessous.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── Configuration ─────────────────────────────────────────
// Ces valeurs sont publiques (anon key) et sûres côté client.
// La sécurité repose sur les politiques RLS, pas sur cette clé.
const SUPABASE_URL      = window.__env?.SUPABASE_URL      || 'REMPLACER_PAR_VOTRE_URL';
const SUPABASE_ANON_KEY = window.__env?.SUPABASE_ANON_KEY || 'REMPLACER_PAR_VOTRE_ANON_KEY';

// ID de la librairie Bunny.net (visible dans le dashboard Bunny)
export const BUNNY_LIBRARY_ID = window.__env?.BUNNY_LIBRARY_ID || 'REMPLACER_PAR_LIBRARY_ID';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:    true,   // session conservée dans localStorage
    autoRefreshToken:  true,   // renouvellement automatique du JWT
    detectSessionInUrl: true,  // lit le token du magic link dans l'URL
  },
});


// ============================================================
// AUTH — Authentification
// ============================================================

/**
 * Envoie un magic link à l'adresse email fournie.
 * L'utilisateur clique sur le lien → redirigé vers auth/callback.html.
 *
 * @param {string} email
 * @returns {{ error: Error|null }}
 */
export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback.html`,
    },
  });
  return { error };
}

/**
 * Récupère la session active (null si non connecté).
 * @returns {{ session: Session|null, error: Error|null }}
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/**
 * Récupère l'utilisateur connecté.
 * @returns {{ user: User|null, error: Error|null }}
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
}

/**
 * Déconnecte l'utilisateur et redirige vers la page de connexion.
 */
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}

/**
 * Garde de route : redirige vers / si l'utilisateur n'est pas connecté.
 * À appeler en haut de chaque page protégée.
 *
 * @returns {User} l'utilisateur connecté
 */
export async function requireAuth() {
  const { session } = await getSession();
  if (!session) {
    window.location.href = '/';
    throw new Error('Non authentifié');
  }
  return session.user;
}

/**
 * Garde de route admin : redirige vers /library.html si non-admin.
 * @returns {User}
 */
export async function requireAdmin() {
  const user = await requireAuth();
  const { profile } = await getProfile(user.id);
  if (!profile?.is_admin) {
    window.location.href = '/library.html';
    throw new Error('Accès réservé aux administrateurs');
  }
  return user;
}


// ============================================================
// PROFILS
// ============================================================

/**
 * Récupère le profil de l'utilisateur courant (ou d'un ID donné).
 * @param {string} [userId] — UUID du profil (défaut : utilisateur connecté)
 * @returns {{ profile: object|null, error: Error|null }}
 */
export async function getProfile(userId) {
  const id = userId ?? (await getCurrentUser()).user?.id;
  if (!id) return { profile: null, error: new Error('Utilisateur non connecté') };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  return { profile: data, error };
}

/**
 * Vérifie si l'utilisateur connecté est administrateur.
 * @returns {boolean}
 */
export async function isAdmin() {
  const { profile } = await getProfile();
  return profile?.is_admin === true;
}

/**
 * Met à jour le nom complet du profil connecté.
 * @param {string} fullName
 * @returns {{ error: Error|null }}
 */
export async function updateProfileName(fullName) {
  const { user } = await getCurrentUser();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);
  return { error };
}


// ============================================================
// RESSOURCES — Patient
// ============================================================

/**
 * Récupère toutes les ressources assignées à l'utilisateur connecté,
 * triées par condition clinique puis par sort_order.
 *
 * @returns {{ resources: object[], error: Error|null }}
 */
export async function getMyResources() {
  const { data, error } = await supabase
    .from('patient_resources')
    .select(`
      assigned_at,
      resource:resources (
        id,
        title,
        description,
        type,
        condition_tag,
        bunny_video_id,
        pdf_url,
        thumbnail_url,
        duration_sec,
        sort_order
      )
    `)
    .order('assigned_at', { ascending: false });

  if (error) return { resources: [], error };

  // Aplatir : [ { assigned_at, ...resource } ]
  const resources = data.map(row => ({
    ...row.resource,
    assigned_at: row.assigned_at,
  }));

  return { resources, error: null };
}

/**
 * Regroupe les ressources par condition_tag.
 * Retourne un objet { arthrose: [...], hernie_discale: [...], ... }
 *
 * @param {object[]} resources — sortie de getMyResources()
 * @returns {Record<string, object[]>}
 */
export function groupByCondition(resources) {
  return resources.reduce((acc, resource) => {
    const tag = resource.condition_tag;
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(resource);
    acc[tag].sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {});
}

/**
 * Construit l'URL d'embed Bunny.net pour une vidéo.
 * @param {string} videoId — bunny_video_id de la ressource
 * @returns {string}
 */
export function getBunnyEmbedUrl(videoId) {
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=false&responsive=true`;
}


// ============================================================
// RESSOURCES — Admin
// ============================================================

/**
 * Récupère toutes les ressources (admin uniquement via RLS).
 * @returns {{ resources: object[], error: Error|null }}
 */
export async function getAllResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('condition_tag')
    .order('sort_order');

  return { resources: data ?? [], error };
}

/**
 * Crée une nouvelle ressource.
 * @param {object} resource — champs de la table resources
 * @returns {{ resource: object|null, error: Error|null }}
 */
export async function createResource(resource) {
  const { data, error } = await supabase
    .from('resources')
    .insert(resource)
    .select()
    .single();

  return { resource: data, error };
}

/**
 * Met à jour une ressource existante.
 * @param {string} resourceId
 * @param {object} updates
 * @returns {{ error: Error|null }}
 */
export async function updateResource(resourceId, updates) {
  const { error } = await supabase
    .from('resources')
    .update(updates)
    .eq('id', resourceId);

  return { error };
}

/**
 * Supprime une ressource (et ses assignations via CASCADE).
 * @param {string} resourceId
 * @returns {{ error: Error|null }}
 */
export async function deleteResource(resourceId) {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', resourceId);

  return { error };
}


// ============================================================
// PATIENTS — Admin
// ============================================================

/**
 * Récupère tous les patients (profils non-admin).
 * @returns {{ patients: object[], error: Error|null }}
 */
export async function getAllPatients() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', false)
    .order('full_name');

  return { patients: data ?? [], error };
}

/**
 * Invite un nouveau patient par email via magic link.
 * Supabase crée le compte et envoie l'email d'invitation.
 *
 * NOTE : nécessite la clé SERVICE_ROLE côté serveur ou
 * une Edge Function Supabase. Ne pas utiliser la clé anon
 * pour inviter des utilisateurs en production.
 *
 * @param {string} email
 * @param {string} fullName
 * @returns {{ error: Error|null }}
 */
export async function invitePatient(email, fullName) {
  // L'invitation crée le compte ; le trigger handle_new_user
  // crée automatiquement le profil.
  // Pour définir le nom, on écoute l'événement auth dans
  // handle_new_user ou on met à jour le profil après création.
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  return { error };
}


// ============================================================
// ASSIGNATIONS — Admin
// ============================================================

/**
 * Récupère les assignations d'un patient avec les détails des ressources.
 * @param {string} patientId
 * @returns {{ assignments: object[], error: Error|null }}
 */
export async function getPatientAssignments(patientId) {
  const { data, error } = await supabase
    .from('patient_resources')
    .select(`
      id,
      assigned_at,
      resource:resources ( id, title, type, condition_tag )
    `)
    .eq('patient_id', patientId)
    .order('assigned_at', { ascending: false });

  return { assignments: data ?? [], error };
}

/**
 * Assigne une ressource à un patient.
 * @param {string} patientId
 * @param {string} resourceId
 * @returns {{ error: Error|null }}
 */
export async function assignResource(patientId, resourceId) {
  const { user } = await getCurrentUser();
  const { error } = await supabase
    .from('patient_resources')
    .insert({
      patient_id:  patientId,
      resource_id: resourceId,
      assigned_by: user.id,
    });

  return { error };
}

/**
 * Retire l'assignation d'une ressource pour un patient.
 * @param {string} patientId
 * @param {string} resourceId
 * @returns {{ error: Error|null }}
 */
export async function removeAssignment(patientId, resourceId) {
  const { error } = await supabase
    .from('patient_resources')
    .delete()
    .eq('patient_id',  patientId)
    .eq('resource_id', resourceId);

  return { error };
}
