# Entrepreneuriat BTS MCO — site du dossier EF3

Site pour les étudiants de BTS MCO : ils construisent leur dossier d'entrepreneuriat
rubrique par rubrique (dans l'ordre de la grille officielle C1 à C6), le site calcule
leurs chiffres, contrôle la cohérence, puis ils déposent leur dossier final en PDF.
Le professeur suit l'avancement de chacun et télécharge les PDF.

## Ce qu'il y a dans ce dossier

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page du site |
| `js/config.js` | **Le seul fichier à modifier** : clés Supabase, date limite, options |
| `js/content.js` | Le contenu des 10 rubriques (textes, exemple KAWA., champs à remplir) |
| `js/calc.js` | Les calculs (CA, plan de financement, compte de résultat, seuil, cohérence) |
| `js/store.js` | Comptes, sauvegarde, dépôts (Supabase) |
| `js/app.js` | L'interface (espace étudiant, aperçu du dossier, espace professeur) |
| `supabase/schema.sql` | La base de données, à coller une fois dans Supabase |
| `mentions.html` | Mentions légales et données personnelles (RGPD) |

Sans clés Supabase, le site marche en **mode démonstration** : tout fonctionne,
mais le travail reste dans le navigateur, sans comptes ni dépôt de PDF.

## Mise en ligne, étape par étape (environ 20 minutes)

### 1. Supabase (comptes, sauvegarde, PDF)
1. Créez un compte gratuit sur <https://supabase.com>, puis **New project**
   (région : Europe — Paris ou Francfort). Notez le mot de passe de la base.
2. Menu **SQL Editor** → **New query** → collez tout le fichier `supabase/schema.sql`
   → **Run**. Cela crée les tables, la sécurité et l'espace de stockage des PDF,
   ainsi que deux codes classe : `MCO-2027` (étudiants) et `PROF-HR` (vous).
   Modifiez ces codes dans la section 9 du fichier avant de l'exécuter si vous voulez.
3. Menu **Project Settings → API** : copiez **Project URL** et la clé **anon public**,
   et collez-les dans `js/config.js` (`SUPABASE_URL` et `SUPABASE_ANON_KEY`).
   La clé « anon » est faite pour être publique : la sécurité est assurée par la base.
   Ne mettez **jamais** la clé « service_role » dans le site.
4. Menu **Authentication → URL Configuration** : dans **Site URL**, mettez l'adresse
   Netlify du site (étape 2), par exemple `https://ef3-mco.netlify.app`.
5. (Conseillé) **Authentication → Sign In / Providers → Email** : laissez
   « Confirm email » activé pour que chaque étudiant confirme son adresse.

### 2. Netlify (mise en ligne)
1. Sur <https://app.netlify.com> : **Add new site → Import an existing project → GitHub**,
   choisissez ce dépôt et la branche indiquée.
2. Laissez la commande de build vide, dossier de publication : `.` (déjà réglé dans `netlify.toml`).
3. **Deploy**. Dans **Site configuration → Change site name**, choisissez une adresse
   simple, par exemple `ef3-mco`.

### 3. Votre compte professeur
1. Sur le site, **Créer mon compte** avec le code classe `PROF-HR`.
2. Dans Supabase, **SQL Editor**, exécutez (avec votre adresse) :
   ```sql
   update public.profiles set role = 'prof', classe = null where email = 'votre.adresse@exemple.fr';
   update public.classes set actif = false where code = 'PROF-HR';
   ```
3. Reconnectez-vous : vous arrivez sur l'espace professeur.

### 4. Les étudiants
Donnez-leur l'adresse du site et le code de leur classe. Vous pouvez créer d'autres
codes et les fermer depuis l'espace professeur.

## Réglages utiles (`js/config.js`)
- `DATE_LIMITE_DEPOT` : par exemple `'2027-04-30'` ; le dépôt se ferme après.
- `PROGRESSION_GUIDEE` : `true` = une rubrique s'ouvre quand la précédente est complète.
- `TAILLE_MAX_PDF_MO` : 10 par défaut.

## Fin d'année
Pour respecter la durée de conservation annoncée, supprimez les comptes de la promotion
après la session (Supabase → Authentication → Users), ce qui efface aussi leurs dossiers.
Pensez à supprimer aussi les PDF dans Storage → depots.
