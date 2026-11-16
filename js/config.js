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
  SUPABASE_URL: 'https://uzdfongtuzjlthbeprdf.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZGZvbmd0dXpqbHRoYmVwcmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NDI0NzIsImV4cCI6MjExMDQxODQ3Mn0.If-AbSoAd-toAhG_JPE729lfXs5TzGQtb65_Dg2H7Q8',

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
