/* ============================================================
   Configuration du site — à remplir une seule fois
   ------------------------------------------------------------
   1. Créez un projet gratuit sur https://supabase.com
   2. Dans Project Settings > API, copiez « Project URL » et la
      clé « anon public », puis collez-les ci-dessous.
   Tant que ces deux valeurs sont vides, le site fonctionne en
   « mode démonstration » : le travail est enregistré seulement
   dans le navigateur, sans comptes ni dépôt de PDF.
   ============================================================ */
window.APP_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Nom affiché en haut du site
  NOM_SITE: 'Entrepreneuriat BTS MCO',
  ETABLISSEMENT: 'Lycée Léonard de Vinci — Tremblay-en-France',

  // Date limite de dépôt du dossier (AAAA-MM-JJ), ou '' pour aucune
  DATE_LIMITE_DEPOT: '',

  // true : une rubrique ne s'ouvre que lorsque la précédente est complète
  // false : accès libre à toutes les rubriques
  PROGRESSION_GUIDEE: false,

  // Taille maximale du PDF déposé (en Mo)
  TAILLE_MAX_PDF_MO: 10
};
