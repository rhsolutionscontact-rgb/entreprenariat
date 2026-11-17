/* ============================================================
   Deuxième partie : « Aller plus loin — de l'idée à l'ouverture »
   Neuf modules facultatifs, hors épreuve EF3. Ils réutilisent les
   réponses du dossier (rubriques 1 à 8) et ne changent pas sa note.
   Chiffres vérifiés en novembre 2026 sur les sites officiels.
   ============================================================ */
(function (root) {
  'use strict';

  const SP = 'https://entreprendre.service-public.gouv.fr/vosdroits/';
  const REPRISE = { rub: 'r1', field: 'type_projet', equals: 'Reprise' };
  const NIVEAUX = ['', '1 · à acquérir', '2 · notions', '3 · à l’aise', '4 · expert'];
  const lien = function (url, txt) { return '<a href="' + url + '" target="_blank" rel="noopener">' + txt + '</a>'; };

  const MODS = [
    /* ---------------------------------------------------------- A */
    {
      id: 'p1', num: 'A', partie: 2, titre: 'Mon profil d’entrepreneur', court: 'Profil', page: 'Le porteur de projet', comp: [], compLabel: 'Avant tout',
      objectif: 'Faire le point sur vous avant de vous engager : vos raisons, vos atouts, vos limites, et ce qu’il faut compenser.',
      intro: [
        'Un banquier ou un réseau de prêt d’honneur finance d’abord une personne, ensuite un projet. Il vérifie que le porteur et le projet vont ensemble : compétences, motivation, situation personnelle.',
        'Être honnête ici vous évite deux échecs fréquents : un projet trop lourd pour votre situation, ou une compétence clé qui manque et que personne ne couvre.'
      ],
      juryTitre: 'Ce qu’un financeur vous demandera',
      jury: [
        '« Pourquoi vous, sur ce projet ? » — reliez votre parcours, vos compétences et votre territoire.',
        '« De quoi vivrez-vous les six premiers mois ? » — chômage maintenu, emploi en parallèle, épargne : soyez précis.',
        '« Qui vous accompagne ? » — un réseau (CCI, Initiative, BGE), un mentor, un expert-comptable.'
      ],
      kawa: '<p><strong>Motivation :</strong> créer son emploi dans son quartier, avec un concept qu’elle connaît par son alternance.</p><p><strong>Atouts :</strong> service et relation client (niveau 3, deux ans d’alternance), connaissance de la cible. <strong>Manques :</strong> technique barista (niveau 1 → formation de 5 jours avant l’ouverture) et gestion (niveau 2 → expert-comptable en ligne et rendez-vous mensuel à la CCI).</p><p><strong>Contraintes :</strong> 8 000 € d’épargne, pas d’enfant, logement chez ses parents pendant le lancement : elle peut se verser un petit salaire la première année.</p>',
      pieges: [
        '<strong>Se mettre 4 partout.</strong> Un financeur se méfie d’un profil parfait : il préfère un manque identifié et compensé.',
        '<strong>Oublier sa vie personnelle.</strong> Horaires, revenus, famille : un projet qui ne tient pas avec votre vie ne tiendra pas du tout.',
        '<strong>Être seul.</strong> Les créateurs accompagnés par un réseau ont un meilleur taux de survie : citez qui vous épaule.'
      ],
      photoHint: 'Vos diplômes ou attestations de formation, une photo de vous en situation de travail.',
      fields: [
        { type: 'heading', label: 'Mes motivations' },
        { type: 'select', id: 'motivation', label: 'Ma motivation principale', req: true, options: ['', 'Être indépendant(e)', 'Créer mon propre emploi', 'Vivre de ma passion', 'Saisir une opportunité repérée', 'Reprendre une affaire familiale', 'Autre'] },
        { type: 'textarea', id: 'pourquoi', label: 'Pourquoi ce projet, et pourquoi maintenant', req: true, rows: 3 },
        { type: 'heading', label: 'Mes atouts et mes manques' },
        { type: 'grid', id: 'competences', label: 'Mes compétences pour ce projet', req: 6, help: 'Niveau 1 ou 2 : indiquez comment vous compensez (formation, associé, salarié, prestataire).',
          rows: [ { id: 'metier', label: 'Le métier (produit, technique)' }, { id: 'vente', label: 'La vente et la relation client' }, { id: 'gestion', label: 'La gestion et les chiffres' },
            { id: 'management', label: 'Le management d’une équipe' }, { id: 'communication', label: 'La communication et le numérique' }, { id: 'admin', label: 'L’administratif et le juridique' } ],
          cols: [ { id: 'niveau', label: 'Niveau', type: 'select', options: NIVEAUX, w: 'sm' }, { id: 'preuve', label: 'Ce qui le prouve (diplôme, alternance, expérience)' }, { id: 'solution', label: 'Comment je compense', opt: true } ] },
        { type: 'calc', fn: 'profil' },
        { type: 'heading', label: 'Ma situation' },
        { type: 'number', id: 'apport', label: 'Apport personnel que je peux mobiliser (€)', req: true, min: 0 },
        { type: 'select', id: 'revenu', label: 'De quoi je vis pendant le lancement', req: true, options: ['', 'Allocations chômage maintenues', 'Emploi salarié en parallèle', 'Épargne personnelle', 'Rémunération prévue dès le début', 'Aide de ma famille'] },
        { type: 'textarea', id: 'contraintes', label: 'Mes contraintes personnelles (temps, famille, mobilité, santé de mes finances)', req: true, rows: 3 },
        { type: 'heading', label: 'Mon réseau' },
        { type: 'grid', id: 'reseau', label: 'Les personnes et structures qui m’aident', dynamic: true, minRows: 3, req: 3,
          help: 'Famille, ancien employeur, tuteur d’alternance, CCI ou CMA, réseau Initiative, BGE, expert-comptable, banque…',
          cols: [ { id: 'qui', label: 'Qui' }, { id: 'apport', label: 'Ce qu’il ou elle m’apporte' } ] },
        { type: 'textarea', id: 'bilan', label: 'Mon bilan en 3 phrases : pourquoi je suis la bonne personne, et ce que je dois encore renforcer', req: true, rows: 4 }
      ]
    },

    /* ---------------------------------------------------------- B */
    {
      id: 'p2', num: 'B', partie: 2, titre: 'Reprendre une entreprise', court: 'Reprise', page: 'De la recherche à la signature', comp: [], compLabel: 'Si reprise',
      optionalUnless: REPRISE,
      objectif: 'Mener une reprise de bout en bout : trouver l’affaire, la diagnostiquer, l’évaluer, la financer et signer sans mauvaise surprise.',
      intro: [
        'Reprendre, c’est acheter une activité qui tourne déjà : des clients, un emplacement, parfois des salariés. Le risque commercial est plus faible qu’en création, mais le prix à financer est plus élevé et les erreurs de diagnostic coûtent cher.',
        'Ce module suit les 7 étapes d’une reprise. Il complète l’encadré « Reprise » de la rubrique 2 et en reprend les chiffres.',
        'Où chercher : ' + lien('https://www.transentreprise.com', 'Transentreprise (CCI et CMA)') + ', ' + lien('https://bpifrance-creation.fr/encyclopedie/reprendre-entreprise-etapes', 'Bpifrance Création') + ', les annonces des chambres consulaires, les experts-comptables et les notaires de votre secteur.'
      ],
      juryTitre: 'Ce que le cédant et la banque vous demanderont',
      jury: [
        '« Pourquoi cette affaire et pas une autre ? » — vos critères de choix, et les affaires écartées.',
        '« Comment avez-vous fixé votre prix ? » — trois méthodes, une fourchette, et votre offre dans cette fourchette.',
        '« L’EBE suffit-il à rembourser et à vous payer ? » — le calcul, avec votre rémunération retraitée.'
      ],
      kawa: '<p><strong>Et si Lina avait repris ?</strong> Lina a étudié <em>Le Terminus</em>, un bar-tabac près de la gare : CA de 180 000 € en baisse de 8 % sur 3 ans, EBE de 32 000 € après les 24 000 € par an que se versait le cédant, bail de 9 ans dont 2 restants, prix demandé 160 000 €.</p><p><strong>Son diagnostic :</strong> barème du secteur 60 à 90 % du CA → 108 000 à 162 000 € ; EBE retraité (32 000 + 24 000 − les 22 600 € dont elle a besoin) = 33 400 €, × 3 à 4 → 100 200 à 133 600 €. Le prix demandé est en haut de la fourchette, pour une affaire en baisse avec un bail court.</p><p><strong>Sa décision :</strong> elle écarte la reprise. C’est exactement ce qu’elle répond au jury : « J’ai envisagé une reprise et je l’ai chiffrée ; la création était plus solide pour mon concept. »</p>',
      pieges: [
        '<strong>Croire le CA sans les bilans.</strong> Exigez les 3 derniers bilans et comptes de résultat, et faites-les relire par un expert-comptable.',
        '<strong>Oublier la rémunération du dirigeant.</strong> Un EBE de 40 000 € sans salaire du cédant ne vaut pas un EBE de 40 000 € après salaire.',
        '<strong>Négliger le bail.</strong> Durée restante, activités autorisées, loyer, clause de cession : sans bail solide, le fonds ne vaut presque rien.',
        '<strong>Payer le prix demandé.</strong> Le prix affiché est un point de départ ; votre offre s’appuie sur vos calculs.'
      ],
      photoHint: 'La façade et l’intérieur de l’affaire, le matériel repris, l’annonce de cession.',
      fields: [
        { type: 'info', showIf: { rub: 'r1', field: 'type_projet', notEquals: 'Reprise' }, html: '<p><strong>Votre projet est une création :</strong> ce module est facultatif pour vous. Il est utile pour répondre au jury qui demande « Avez-vous envisagé une reprise ? » : chiffrez une affaire réelle de votre secteur, même pour l’écarter.</p>' },
        { type: 'heading', label: '1. Trouver l’affaire' },
        { type: 'grid', id: 'recherche', label: 'Les affaires que j’ai étudiées', dynamic: true, minRows: 2, req: 2,
          cols: [ { id: 'source', label: 'Où je l’ai trouvée' }, { id: 'affaire', label: 'L’affaire (activité, lieu, prix)' }, { id: 'verdict', label: 'Verdict', type: 'select', options: ['', 'À étudier', 'Écartée', 'Retenue'], w: 'sm' }, { id: 'raison', label: 'Pourquoi', opt: true } ] },
        { type: 'heading', label: '2. Racheter le fonds ou la société ?' },
        { type: 'select', id: 'mode', label: 'Ce que j’achète', req: true, options: ['', 'Le fonds de commerce', 'Les parts ou actions de la société'] },
        { type: 'info', html: '<table class="mini"><tr><th></th><th>Rachat du fonds</th><th>Rachat des parts ou actions</th></tr><tr><td>Ce que j’achète</td><td>Clientèle, nom, droit au bail, matériel, stock</td><td>Toute la société : ses biens, ses contrats, ses dettes</td></tr><tr><td>Les dettes passées</td><td>Restent au vendeur</td><td>Reprises avec la société : exigez une garantie d’actif et de passif</td></tr><tr><td>Les salariés</td><td>Contrats transférés (article L1224-1)</td><td>Contrats inchangés</td></tr><tr><td>Droits d’enregistrement</td><td>0 % jusqu’à 23 000 €, 3 % jusqu’à 200 000 €, 5 % au-delà</td><td>SARL : 3 % après abattement · SAS : 0,1 %</td></tr><tr><td>Pour qui</td><td>Petit commerce, structure simple</td><td>Société saine, contrats ou autorisations difficiles à transférer</td></tr></table><p class="small">Sources : ' + lien('https://www.entreprises.cci-paris-idf.fr/fiches-pratiques/acquisition-dun-fonds-de-commerce-quelles-consequences-fiscales', 'CCI Paris Île-de-France') + ', ' + lien('https://www.impots.gouv.fr/professionnel/cession-de-droits-sociaux', 'impots.gouv.fr : cession de droits sociaux') + '.</p>' },
        { type: 'select', id: 'forme', label: 'La société reprise est une…', showIf: { field: 'mode', equals: 'Les parts ou actions de la société' }, req: true, options: ['', 'SARL ou EURL (parts sociales)', 'SAS ou SASU (actions)'] },
        { type: 'textarea', id: 'mode_justif', label: 'Pourquoi ce choix', req: true, rows: 2 },
        { type: 'heading', label: '3. Le diagnostic financier' },
        { type: 'grid', id: 'sig', label: 'Les soldes de gestion des 3 derniers exercices', req: 3,
          help: 'Relevés dans les liasses fiscales. Si vous avez déjà rempli le CA et le résultat en rubrique 2, ils sont repris automatiquement quand ces cases sont vides.',
          rows: [ { id: 'n3', label: 'Il y a 3 ans' }, { id: 'n2', label: 'Il y a 2 ans' }, { id: 'n1', label: 'Dernier exercice' } ],
          cols: [ { id: 'ca', label: 'CA HT (€)', type: 'number', w: 'sm', opt: true }, { id: 'marge', label: 'Marge brute (€)', type: 'number', w: 'sm', opt: true }, { id: 'ebe', label: 'EBE (€)', type: 'number', w: 'sm' },
            { id: 'resultat', label: 'Résultat (€)', type: 'number', w: 'sm', opt: true }, { id: 'remu', label: 'Rémunération du cédant payée par l’affaire (€)', type: 'number', w: 'sm', opt: true } ] },
        { type: 'number', id: 'remu_normale', label: 'Ce que je devrai me verser pour vivre, cotisations comprises (€ par an)', req: true, min: 0,
          help: 'L’EBE est « retraité » : on rajoute ce que le cédant se versait, on retire ce que vous vous verserez. C’est l’EBE qui reste vraiment pour rembourser.' },
        { type: 'calc', fn: 'sig' },
        { type: 'heading', label: '4. Les points de vigilance' },
        { type: 'check', id: 'v_bail', label: 'J’ai lu le bail : durée restante, activités autorisées, loyer et révision, clause de cession.', req: true },
        { type: 'check', id: 'v_normes', label: 'J’ai vérifié les normes : sécurité incendie, accessibilité, hygiène (et les travaux à prévoir).', req: true },
        { type: 'check', id: 'v_salaries', label: 'J’ai la liste des salariés : contrats, ancienneté, salaires, congés dus.', req: true },
        { type: 'check', id: 'v_clientele', label: 'J’ai vérifié que la clientèle ne suit pas uniquement la personne du cédant.', req: true },
        { type: 'check', id: 'v_contrats', label: 'J’ai la liste des contrats (fournisseurs, location de matériel, licences) et je sais lesquels se transfèrent.' },
        { type: 'check', id: 'v_dettes', label: 'Rachat de parts : j’ai vérifié les dettes, les litiges et prévu une garantie d’actif et de passif.', showIf: { field: 'mode', equals: 'Les parts ou actions de la société' } },
        { type: 'textarea', id: 'vigilance', label: 'Ce que mon diagnostic révèle : forces, risques, travaux', req: true, rows: 3 },
        { type: 'heading', label: '5. Combien vaut l’affaire ?' },
        { type: 'number', id: 'coef_min', label: 'Multiple d’EBE retenu : bas', inline: true, min: 0, step: '0.5', req: true },
        { type: 'number', id: 'coef_max', label: 'Multiple d’EBE retenu : haut', inline: true, min: 0, step: '0.5', req: true },
        { type: 'text', id: 'coef_src', label: 'Source des multiples', ph: 'Ex. : 2 à 4 fois l’EBE pour un commerce de proximité, selon l’expert-comptable consulté', req: true },
        { type: 'number', id: 'materiel', label: 'Valeur actuelle du matériel et des aménagements (€)', inline: true, min: 0 },
        { type: 'number', id: 'stock', label: 'Stock repris (€)', inline: true, min: 0 },
        { type: 'number', id: 'droit_bail', label: 'Valeur estimée du droit au bail (€)', inline: true, min: 0 },
        { type: 'number', id: 'actif_net', label: 'Actif net corrigé de la société (€)', showIf: { field: 'mode', equals: 'Les parts ou actions de la société' }, min: 0,
          help: 'Ce que possède la société moins ce qu’elle doit, avec les biens à leur valeur réelle.' },
        { type: 'calc', fn: 'valo' },
        { type: 'heading', label: '6. Le coût total et le financement' },
        { type: 'number', id: 'prix_offre', label: 'Le prix que je propose (€)', req: true, min: 0 },
        { type: 'number', id: 'parts_total', label: 'Nombre total de parts de la société', inline: true, min: 0, showIf: { field: 'forme', equals: 'SARL ou EURL (parts sociales)' } },
        { type: 'number', id: 'parts_cedees', label: 'Nombre de parts rachetées', inline: true, min: 0, showIf: { field: 'forme', equals: 'SARL ou EURL (parts sociales)' } },
        { type: 'number', id: 'honoraires', label: 'Honoraires : avocat, expert-comptable, intermédiaire (€)', inline: true, min: 0 },
        { type: 'number', id: 'travaux', label: 'Travaux et mises aux normes (€)', inline: true, min: 0 },
        { type: 'number', id: 'treso', label: 'Trésorerie de départ (€)', inline: true, min: 0 },
        { type: 'grid', id: 'financement', label: 'Mon montage financier', req: 1, anyOf: ['montant'],
          rows: [ { id: 'apport', label: 'Apport personnel' }, { id: 'honneur', label: 'Prêt d’honneur' }, { id: 'banque', label: 'Prêt bancaire' }, { id: 'vendeur', label: 'Crédit vendeur (paiement échelonné au cédant)' }, { id: 'autre', label: 'Autre (aide, associé, famille)' } ],
          cols: [ { id: 'montant', label: 'Montant (€)', type: 'number', w: 'sm' }, { id: 'conditions', label: 'Conditions (taux, durée, différé)', opt: true } ] },
        { type: 'number', id: 'taux', label: 'Taux du prêt bancaire (%)', inline: true, min: 0, step: '0.1' },
        { type: 'number', id: 'duree', label: 'Durée du prêt bancaire (années)', inline: true, min: 0 },
        { type: 'calc', fn: 'montage' },
        { type: 'heading', label: '7. De l’offre à la signature' },
        { type: 'info', html: '<ol class="steps"><li><strong>Lettre d’intention</strong> : votre offre de prix et vos conditions (accès aux comptes, financement obtenu).</li><li><strong>Audit</strong> : comptes, bail, salariés, contrats, avec un expert-comptable ou un avocat.</li><li><strong>Information des salariés</strong> : dans une entreprise de moins de 50 salariés, ils doivent être informés au moins 1 mois avant la vente pour pouvoir faire une offre (règle en vigueur pour les ventes conclues après le 27 juillet 2026 ; c’était 2 mois avant).</li><li><strong>Compromis</strong> sous conditions suspensives (obtention du prêt, accord du bailleur si le bail l’exige).</li><li><strong>Acte de cession</strong>, puis publication (annonce légale et BODACC pour un fonds) et paiement des droits d’enregistrement.</li><li><strong>Accompagnement</strong> par le cédant pendant quelques semaines pour présenter les clients et les fournisseurs.</li></ol><p class="small">Sources : ' + lien(SP + 'N31902', 'Service-Public : reprendre une entreprise') + ', ' + lien('https://entreprendre.service-public.gouv.fr/actualites/A18893', 'loi de simplification du 26 mai 2026') + '.</p>' },
        { type: 'check', id: 'e_lettre', label: 'Lettre d’intention rédigée' },
        { type: 'check', id: 'e_audit', label: 'Audit réalisé avec un professionnel' },
        { type: 'check', id: 'e_salaries', label: 'Information des salariés prévue (ou pas de salarié)' },
        { type: 'check', id: 'e_compromis', label: 'Compromis avec condition suspensive d’obtention du prêt' },
        { type: 'textarea', id: 'accompagnement', label: 'L’accompagnement prévu par le cédant (durée, contenu) et la clause de non-concurrence', req: true, rows: 2 }
      ]
    },

    /* ---------------------------------------------------------- C */
    {
      id: 'p3', num: 'C', partie: 2, titre: 'Mon identité et ma marque', court: 'Marque', page: 'Nom, logo, protection', comp: [], compLabel: 'Image',
      objectif: 'Choisir un nom libre et facile à retenir, définir votre identité visuelle et savoir s’il faut la protéger.',
      intro: [
        'Votre nom apparaît partout : enseigne, réseaux sociaux, fiche Google, factures. Le changer après l’ouverture coûte cher ; vérifiez qu’il est libre avant de commander le moindre support.',
        'Le nom de l’entreprise (dénomination sociale), le nom du commerce (enseigne) et la marque sont trois choses différentes. Seul le dépôt de marque à l’INPI vous donne un droit exclusif, pour 10 ans renouvelables.'
      ],
      juryTitre: 'Ce qu’on vous demandera',
      jury: [
        '« Avez-vous vérifié que ce nom est libre ? » — la recherche INPI, le nom de domaine, les réseaux.',
        '« Que doit-on ressentir en voyant votre logo ? » — vos 3 valeurs, reliées à votre cible.'
      ],
      kawa: '<p><strong>Noms testés :</strong> « Le Quai », « Grain d’Aulnay », « KAWA. ». Le premier est déjà pris par un bar du secteur ; le deuxième est jugé difficile à prononcer par 6 personnes sur 10 interrogées.</p><p><strong>Retenu :</strong> « KAWA. » (le café en plusieurs langues, le point final pour l’affirmation). Libre sur data.inpi.fr, kawa-aulnay.fr disponible, compte Instagram libre.</p><p><strong>Charte :</strong> vert sapin et crème, police arrondie, tutoiement sur les réseaux. <strong>Marque :</strong> dépôt dans 2 classes (café et services de restauration) pour 230 €.</p>',
      pieges: [
        '<strong>Choisir un nom déjà pris.</strong> Une mise en demeure peut vous obliger à tout changer.',
        '<strong>Un nom trop descriptif.</strong> « Café de la gare » ne se protège pas et ne se distingue pas.',
        '<strong>Commander les supports avant les vérifications.</strong> Enseigne, gobelets, cartes : vérifiez d’abord.'
      ],
      photoHint: 'Vos essais de logo, vos inspirations, une devanture qui vous plaît.',
      fields: [
        { type: 'heading', label: 'Mon nom' },
        { type: 'grid', id: 'noms', label: 'Les noms que j’ai testés', dynamic: true, minRows: 3, req: 3,
          cols: [ { id: 'nom', label: 'Nom' }, { id: 'sens', label: 'Ce qu’il évoque' }, { id: 'test', label: 'Facile à dire, écrire, retenir ?', type: 'select', options: ['', 'Oui', 'Moyen', 'Non'], w: 'sm' } ] },
        { type: 'text', id: 'nom_retenu', label: 'Le nom retenu', req: true },
        { type: 'heading', label: 'Mes vérifications' },
        { type: 'check', id: 'v_inpi', label: 'J’ai cherché le nom sur data.inpi.fr (marques et entreprises).', req: true },
        { type: 'check', id: 'v_domaine', label: 'J’ai vérifié que le nom de domaine (.fr, .com) est disponible.', req: true },
        { type: 'check', id: 'v_reseaux', label: 'Le nom est libre sur les réseaux sociaux que j’utiliserai.', req: true },
        { type: 'check', id: 'v_local', label: 'Aucun commerce proche ne porte un nom proche (recherche sur Google Maps).', req: true },
        { type: 'textarea', id: 'v_resultat', label: 'Ce que j’ai trouvé', req: true, rows: 2 },
        { type: 'heading', label: 'Mon identité visuelle' },
        { type: 'grid', id: 'charte', label: 'Ma charte', req: 5,
          rows: [ { id: 'couleurs', label: 'Couleurs (2 ou 3, avec leur sens)' }, { id: 'police', label: 'Style d’écriture (police)' }, { id: 'ton', label: 'Ton de voix (tutoiement, humour…)' },
            { id: 'valeurs', label: 'Les 3 valeurs à transmettre' }, { id: 'supports', label: 'Supports à créer (enseigne, cartes, emballages…)' } ],
          cols: [ { id: 'choix', label: 'Mes choix' } ] },
        { type: 'textarea', id: 'brief', label: 'Mon brief pour un graphiste (5 lignes : qui je suis, ma cible, mes valeurs, ce que je veux, ce que je ne veux pas)', req: true, rows: 5 },
        { type: 'number', id: 'budget', label: 'Budget identité visuelle (€)', min: 0, help: 'Logo, enseigne, premiers supports. Reportez-le dans les frais de lancement de la rubrique 8.' },
        { type: 'heading', label: 'Protéger ma marque' },
        { type: 'select', id: 'depot', label: 'Mon choix', req: true, options: ['', 'Je dépose la marque à l’INPI', 'Pas tout de suite, je surveille', 'Ce n’est pas utile pour mon projet'] },
        { type: 'number', id: 'classes', label: 'Nombre de classes visées', min: 1, showIf: { field: 'depot', equals: 'Je dépose la marque à l’INPI' },
          help: 'Une classe = une famille de produits ou services (ex. classe 30 : café ; classe 43 : restauration).' },
        { type: 'calc', fn: 'marque' },
        { type: 'textarea', id: 'depot_justif', label: 'Pourquoi ce choix', req: true, rows: 2 }
      ]
    },

    /* ---------------------------------------------------------- D */
    {
      id: 'p4', num: 'D', partie: 2, titre: 'Choisir mon statut juridique', court: 'Statut', page: 'Comparateur', comp: [], compLabel: 'Juridique',
      objectif: 'Comparer les statuts avec VOS chiffres, selon vos priorités, et justifier votre choix en trois raisons.',
      intro: [
        '<strong>Entreprise individuelle</strong> (dont la micro-entreprise) : vous et l’entreprise êtes la même personne. Depuis mai 2022, votre patrimoine personnel est séparé automatiquement de votre patrimoine professionnel.',
        '<strong>Société</strong> (EURL, SASU seul ; SARL, SAS à plusieurs) : une personne morale distincte, avec des statuts, un capital et plus de formalités, mais plus de souplesse pour grandir ou s’associer.',
        'Le statut fixe aussi votre protection sociale : <strong>travailleur non salarié</strong> (entreprise individuelle, gérant majoritaire d’EURL ou de SARL) ou <strong>assimilé salarié</strong> (président de SAS ou de SASU), plus protégé mais plus cher.'
      ],
      juryTitre: 'Ce qu’on vous demandera',
      jury: [
        '« Pourquoi ce statut ? » — deux ou trois raisons tirées de vos priorités et de vos chiffres.',
        '« Combien vous restera-t-il pour vivre ? » — l’ordre de grandeur calculé ci-dessous, vérifié sur le simulateur de l’URSSAF.'
      ],
      kawa: '<p><strong>Priorités de Lina :</strong> déduire ses charges réelles (essentiel : loyer et emprunt), crédibilité auprès de la banque (essentiel), simplicité (important).</p><p><strong>Le comparateur :</strong> la micro-entreprise est écartée (aucune charge déductible, alors que ses charges dépassent la moitié de son CA). Entre EURL et SASU, l’EURL laisse un revenu plus élevé pour le même bénéfice, grâce à des cotisations plus faibles.</p><p><strong>Son choix :</strong> EURL à l’impôt sur les sociétés, capital de 1 000 €.</p>',
      pieges: [
        '<strong>Choisir la micro-entreprise par réflexe.</strong> Avec un loyer et un emprunt, aucune charge n’est déductible : vous payez des cotisations sur un CA, pas sur un bénéfice.',
        '<strong>Choisir la SASU pour « payer moins ».</strong> Les cotisations du président sont plus élevées ; l’intérêt vient des dividendes, une fois l’affaire rentable.',
        '<strong>Changer de statut entre la rubrique 8 et ici.</strong> Le statut doit être le même partout dans votre dossier.'
      ],
      photoHint: '',
      fields: [
        { type: 'select', id: 'seul', label: 'Je crée…', req: true, options: ['', 'Seul(e)', 'À plusieurs'] },
        { type: 'select', id: 'activite', label: 'Mon activité principale (pour les taux de la micro-entreprise)', req: true,
          options: [['', ''], ['vente', 'Vente de marchandises, restauration, hébergement'], ['services', 'Prestations de services commerciales ou artisanales'], ['liberal', 'Activité libérale (conseil, formation…)']] },
        { type: 'grid', id: 'criteres', label: 'Mes priorités', req: 6,
          rows: [ { id: 'simplicite', label: 'Simplicité et faible coût de gestion' }, { id: 'charges', label: 'Déduire mes charges réelles' }, { id: 'social', label: 'Bonne protection sociale (maladie, retraite)' },
            { id: 'revenu', label: 'Garder le revenu le plus élevé possible' }, { id: 'associes', label: 'Accueillir des associés ou des investisseurs' }, { id: 'image', label: 'Crédibilité auprès des banques et des fournisseurs' } ],
          cols: [ { id: 'importance', label: 'Importance', type: 'select', options: ['', 'Peu important', 'Important', 'Essentiel'] } ] },
        { type: 'calc', fn: 'statuts' },
        { type: 'textarea', id: 'choix', label: 'Mon choix et mes 3 raisons', req: true, rows: 3, help: 'Reportez le même statut dans la rubrique 8 : c’est lui qui calcule vos cotisations et votre impôt.' },
        { type: 'heading', label: 'Les aides du créateur' },
        { type: 'info', html: '<ul><li><strong>Acre</strong> : réduction de cotisations la première année, réservée depuis 2026 à certains publics (moins de 26 ans, demandeurs d’emploi indemnisés, bénéficiaires du RSA, quartiers prioritaires…). Pour une micro-entreprise créée depuis le 1<sup>er</sup> juillet 2026, la réduction est de 25 % (contre 50 % avant). À demander dans les 60 jours. ' + lien('https://entreprendre.service-public.gouv.fr/actualites/A18795', 'Service-Public') + '</li><li><strong>Allocations chômage</strong> : un demandeur d’emploi qui crée peut garder ses allocations (ARE) ou en recevoir une partie en capital (ARCE). ' + lien('https://www.francetravail.fr/candidat/vos-droits-aux-aides-et-allocati/allocations-et-aides-quelles-son/lagence-de-retour-a-lemploi-arce.html', 'France Travail') + '</li></ul>' },
        { type: 'select', id: 'acre', label: 'L’Acre pour moi', req: true, options: ['', 'J’y ai droit et je la demande', 'Je n’y ai pas droit', 'Je dois vérifier'] }
      ]
    },

    /* ---------------------------------------------------------- E */
    {
      id: 'p5', num: 'E', partie: 2, titre: 'Local, formalités et assurances', court: 'Local & formalités', page: 'Le cadre légal', comp: [], compLabel: 'Juridique',
      objectif: 'Sécuriser votre local, respecter les règles de votre activité, vous assurer et immatriculer l’entreprise dans le bon ordre.',
      intro: [
        'Le <strong>bail commercial</strong> dure au moins 9 ans ; vous pouvez partir tous les 3 ans (le « 3-6-9 ») en prévenant 6 mois avant. Le bailleur, lui, ne peut pas vous faire partir sans indemnité. ' + lien(SP + 'F22556', 'Service-Public : le bail commercial'),
        'Un local qui reçoit des clients est un <strong>établissement recevant du public (ERP)</strong> : règles de sécurité incendie et d’accessibilité. Certaines activités exigent une formation ou une licence (hygiène alimentaire, débit de boissons, taxi…).',
        'Les formalités se font en ligne sur le ' + lien('https://formalites.entreprises.gouv.fr', 'guichet unique des formalités') + ' ; vous recevez ensuite votre numéro SIRET.'
      ],
      juryTitre: 'Ce qu’on vous demandera',
      jury: [
        '« Avez-vous lu votre bail ? » — sa durée, ses activités autorisées, qui paie la taxe foncière et les gros travaux.',
        '« Quelles assurances avez-vous prévues ? » — celles qui sont obligatoires, celles qui sont conseillées, et leur coût.'
      ],
      kawa: '<p><strong>Local :</strong> 45 m² à 4 minutes de la gare, 1 500 € HT par mois, bail 3-6-9 « toutes activités sauf nuisances », dépôt de garantie de 3 mois, pas de droit d’entrée. Le loyer représente 15 % du CA prudent : c’est élevé, compensé par l’emplacement de flux.</p><p><strong>Règles :</strong> ERP de 5<sup>e</sup> catégorie, formation hygiène de 14 heures, autorisation de terrasse demandée à la mairie, pas de licence d’alcool.</p><p><strong>Assurances :</strong> multirisque professionnelle avec responsabilité civile et perte d’exploitation : 1 100 € par an.</p>',
      pieges: [
        '<strong>Signer un bail sans le faire relire.</strong> Une clause « activité exclusive de… » peut vous interdire de vendre à emporter.',
        '<strong>Oublier la mairie.</strong> Enseigne, terrasse, travaux de façade : autorisations à demander avant.',
        '<strong>Sous-estimer l’assurance.</strong> Sans perte d’exploitation, un dégât des eaux peut vous fermer trois mois sans revenu.'
      ],
      photoHint: 'Les locaux visités, la façade, la rue, l’intérieur avant travaux.',
      fields: [
        { type: 'heading', label: 'Mon local' },
        { type: 'select', id: 'local', label: 'Ma situation', req: true, options: ['', 'Bail commercial (3-6-9)', 'Bail dérogatoire (moins de 3 ans)', 'Local repris avec le fonds', 'Sans local (en ligne, marchés, domicile)', 'Propriétaire des murs'] },
        { type: 'grid', id: 'visites', label: 'Les locaux que j’ai étudiés', dynamic: true, minRows: 2, req: 2,
          cols: [ { id: 'adresse', label: 'Adresse' }, { id: 'surface', label: 'Surface (m²)', type: 'number', w: 'sm' }, { id: 'loyer', label: 'Loyer (€ HT par mois)', type: 'number', w: 'sm' }, { id: 'entree', label: 'Droit d’entrée (€)', type: 'number', w: 'sm', opt: true }, { id: 'avis', label: 'Points forts et faibles' } ] },
        { type: 'grid', id: 'bail', label: 'Ce que prévoit mon bail (ou ce que je négocie)', req: 5,
          rows: [ { id: 'duree', label: 'Durée et date de début' }, { id: 'destination', label: 'Activités autorisées' }, { id: 'loyer', label: 'Loyer et révision (indice ILC)' }, { id: 'charges', label: 'Charges refacturées (taxe foncière ?)' },
            { id: 'depot', label: 'Dépôt de garantie' }, { id: 'travaux', label: 'Qui paie les travaux' }, { id: 'cession', label: 'Conditions pour céder le bail' } ],
          cols: [ { id: 'clause', label: 'Clause' } ] },
        { type: 'calc', fn: 'local' },
        { type: 'heading', label: 'Les règles de mon activité' },
        { type: 'check', id: 'n_erp', label: 'Mon local reçoit du public : je connais les règles de sécurité incendie (extincteurs, issues, registre de sécurité).' },
        { type: 'check', id: 'n_acces', label: 'J’ai vérifié l’accessibilité aux personnes handicapées (ou la dérogation à demander).' },
        { type: 'check', id: 'n_hygiene', label: 'Si je vends de l’alimentaire : formation hygiène (14 heures) et déclaration à la DDPP.' },
        { type: 'check', id: 'n_licence', label: 'Si mon activité l’exige : licence, diplôme ou carte professionnelle identifiés.' },
        { type: 'check', id: 'n_mairie', label: 'Enseigne, terrasse, travaux de façade : autorisations à demander à la mairie.' },
        { type: 'grid', id: 'autorisations', label: 'Mes autorisations et formations obligatoires', dynamic: true, minRows: 1, req: 1,
          cols: [ { id: 'quoi', label: 'Quoi' }, { id: 'aupres', label: 'Auprès de qui' }, { id: 'cout', label: 'Coût (€)', type: 'number', w: 'sm', opt: true }, { id: 'delai', label: 'Délai', w: 'sm', opt: true } ] },
        { type: 'heading', label: 'Mes assurances' },
        { type: 'grid', id: 'assurances', label: 'Mes assurances', req: 5,
          help: 'La responsabilité civile professionnelle n’est obligatoire que pour certaines activités (santé, bâtiment, conseil juridique…) mais reste indispensable dès que vous recevez des clients.',
          rows: [ { id: 'rc', label: 'Responsabilité civile professionnelle' }, { id: 'local', label: 'Multirisque du local (incendie, dégât des eaux, vol)' }, { id: 'perte', label: 'Perte d’exploitation' },
            { id: 'prevoyance', label: 'Prévoyance du dirigeant (arrêt de travail)' }, { id: 'vehicule', label: 'Véhicule professionnel' } ],
          cols: [ { id: 'choix', label: 'Mon choix', type: 'select', options: ['', 'Obligatoire', 'Je la prends', 'Je ne la prends pas', 'Pas concerné'], w: 'sm' }, { id: 'assureur', label: 'Assureur ou devis', opt: true }, { id: 'prime', label: 'Prime (€ par an)', type: 'number', w: 'sm', opt: true } ] },
        { type: 'calc', fn: 'assurances' },
        { type: 'heading', label: 'Mon immatriculation, dans l’ordre' },
        { type: 'check', id: 'i_statuts', label: 'Société : rédiger les statuts et déposer le capital sur un compte bloqué.' },
        { type: 'check', id: 'i_annonce', label: 'Société : publier l’annonce légale de constitution.' },
        { type: 'check', id: 'i_guichet', label: 'Déclarer l’entreprise sur le guichet unique (formalites.entreprises.gouv.fr).', req: true },
        { type: 'check', id: 'i_siret', label: 'Recevoir le numéro SIRET (et le Kbis pour une société).', req: true },
        { type: 'check', id: 'i_banque', label: 'Ouvrir un compte bancaire professionnel (obligatoire pour une société ; pour une micro-entreprise, un compte dédié devient obligatoire après deux années de CA au-dessus de 10 000 €).', req: true },
        { type: 'check', id: 'i_acre', label: 'Demander l’Acre dans les 60 jours, si j’y ai droit.' },
        { type: 'check', id: 'i_caisse', label: 'Choisir une caisse certifiée (obligatoire si je suis redevable de la TVA) et un terminal de paiement.' },
        { type: 'number', id: 'cout_formalites', label: 'Coût total de mes formalités (€)', req: true, min: 0, help: 'Immatriculation, annonce légale, frais de banque, autorisations. À reporter dans les frais de lancement (rubrique 8).' }
      ]
    },

    /* ---------------------------------------------------------- F */
    {
      id: 'p6', num: 'F', partie: 2, titre: 'Mon rétroplanning jusqu’à l’ouverture', court: 'Rétroplanning', page: 'Semaine par semaine', comp: [], compLabel: 'Organisation',
      objectif: 'Partir de la date d’ouverture et remonter le temps : chaque démarche à sa date, pour ne rien oublier et ne pas ouvrir en retard.',
      intro: [
        'Un rétroplanning se construit à l’envers : on fixe la date d’ouverture, puis on place chaque démarche selon son délai. Un prêt bancaire prend 1 à 2 mois, des travaux 1 à 3 mois, une immatriculation quelques jours.',
        'Cochez ce qui concerne votre projet : le site calcule les dates. Cochez ensuite chaque tâche quand elle est faite ; celles qui ont dépassé leur date passent en rouge.'
      ],
      juryTitre: 'Ce qu’on vous demandera',
      jury: [
        '« Quand ouvrez-vous, et qu’est-ce qui pourrait vous retarder ? » — la tâche la plus longue, et votre plan si elle dérape.'
      ],
      kawa: '<p><strong>Ouverture visée :</strong> le lundi 7 septembre, pour profiter de la rentrée. Le chemin le plus long : trouver le local (avril), obtenir le prêt (mai-juin), faire les travaux (juillet-août).</p><p><strong>Plan B :</strong> si les travaux glissent, ouverture en vente à emporter seule pendant deux semaines, terrasse et salle ensuite.</p>',
      pieges: [
        '<strong>Ouvrir pendant la mauvaise saison.</strong> Croisez votre date avec votre saisonnalité (rubrique 6).',
        '<strong>Oublier les délais des autres.</strong> Banque, bailleur, mairie, artisans : ils ont leur propre calendrier.',
        '<strong>Lancer la communication trop tard.</strong> Les réseaux se construisent 4 à 6 semaines avant l’ouverture.'
      ],
      photoHint: 'L’avancement des travaux, l’installation, le jour J.',
      fields: [
        { type: 'text', id: 'ouverture', label: 'Ma date d’ouverture visée', inputType: 'date', req: true, live: true },
        { type: 'heading', label: 'Ce qui concerne mon projet' },
        { type: 'check', id: 'c_local', label: 'Je dois encore trouver mon local.', live: true },
        { type: 'check', id: 'c_travaux', label: 'Des travaux sont nécessaires.', live: true },
        { type: 'check', id: 'c_emprunt', label: 'J’ai besoin d’un emprunt bancaire.', live: true },
        { type: 'check', id: 'c_honneur', label: 'Je demande un prêt d’honneur.', live: true },
        { type: 'check', id: 'c_societe', label: 'Je crée une société (statuts, capital).', live: true },
        { type: 'check', id: 'c_licence', label: 'Mon activité exige une formation, une licence ou une autorisation.', live: true },
        { type: 'check', id: 'c_recrute', label: 'Je recrute un salarié pour l’ouverture.', live: true },
        { type: 'check', id: 'c_marque', label: 'Je dépose ma marque.', live: true },
        { type: 'calc', fn: 'retro' },
        { type: 'grid', id: 'perso', label: 'Mes tâches en plus', dynamic: true, minRows: 1,
          cols: [ { id: 'tache', label: 'Tâche' }, { id: 'date', label: 'Pour le', w: 'sm' }, { id: 'etat', label: 'État', type: 'select', options: ['', 'À faire', 'En cours', 'Fait'], w: 'sm' } ] },
        { type: 'heading', label: 'Prêt à ouvrir ?' },
        { type: 'check', id: 'o_stock', label: 'Stock de départ livré et rangé.' },
        { type: 'check', id: 'o_caisse', label: 'Caisse, terminal de paiement et affichage des prix en place.' },
        { type: 'check', id: 'o_affichage', label: 'Affichages obligatoires posés (prix, horaires, allergènes si alimentaire, interdiction de fumer).' },
        { type: 'check', id: 'o_test', label: 'Ouverture test avec des proches réalisée.' },
        { type: 'check', id: 'o_com', label: 'Communication d’ouverture lancée (réseaux, fiche Google, voisinage).' },
        { type: 'textarea', id: 'plan_b', label: 'Si l’ouverture prend du retard : mon plan', req: true, rows: 3 }
      ]
    },

    /* ---------------------------------------------------------- G */
    {
      id: 'p7', num: 'G', partie: 2, titre: 'Présence en ligne et relation client', court: 'Clients & réseaux', page: 'Attirer et fidéliser', comp: [], compLabel: 'Marketing',
      objectif: 'Savoir précisément qui est votre client, par où il passe avant d’acheter, et comment le faire revenir et parler de vous.',
      intro: [
        'Le <strong>persona</strong> est un client imaginaire mais réaliste, construit à partir de votre étude de marché. Il vous aide à choisir vos messages et vos canaux.',
        'Le <strong>parcours client</strong> décrit chaque moment de contact : quand il vous découvre, compare, achète, revient, recommande. À chaque étape, une action simple fait la différence.',
        'Collecter des numéros ou des adresses e-mail suppose l’accord du client et une utilisation limitée à ce qui a été annoncé (RGPD). ' + lien('https://www.cnil.fr/fr/rgpd-par-ou-commencer', 'CNIL : le RGPD, par où commencer')
      ],
      juryTitre: 'Ce qu’on vous demandera',
      jury: [
        '« Décrivez-moi votre client type. » — votre persona en trois phrases, avec un chiffre de votre questionnaire.',
        '« Comment allez-vous faire revenir vos clients ? » — votre programme de fidélité et son coût.'
      ],
      kawa: '<p><strong>Persona :</strong> Inès, 28 ans, chargée de clientèle à La Défense, prend le RER B chaque matin, achète déjà un café à 4,50 € à Paris, découvre les lieux sur Instagram et Google Maps.</p><p><strong>Parcours :</strong> elle découvre KAWA. sur la fiche Google en cherchant « café Aulnay » ; elle hésite sur le prix → la carte est affichée dehors ; elle revient grâce à la carte de fidélité numérique (10<sup>e</sup> boisson offerte) ; elle recommande après un atelier latte art.</p><p><strong>Budget :</strong> 2 400 € la première année, le même que dans les finances.</p>',
      pieges: [
        '<strong>Être partout.</strong> Deux canaux bien tenus valent mieux que cinq abandonnés.',
        '<strong>Ignorer les avis.</strong> Répondre poliment à un avis négatif rassure les futurs clients.',
        '<strong>Un budget différent des finances.</strong> Le budget de communication doit être le même ici, dans le plan d’actions et dans le compte de résultat.'
      ],
      photoHint: 'Vos captures de réseaux, une maquette de publication, votre fiche Google.',
      fields: [
        { type: 'heading', label: 'Mon client type' },
        { type: 'grid', id: 'persona', label: 'Mon persona', req: 6,
          rows: [ { id: 'qui', label: 'Prénom, âge, lieu de vie' }, { id: 'vie', label: 'Situation (études, travail, famille)' }, { id: 'habitudes', label: 'Habitudes d’achat' },
            { id: 'attentes', label: 'Ce qu’il ou elle attend' }, { id: 'freins', label: 'Ce qui le ou la fait hésiter' }, { id: 'canaux', label: 'Où il ou elle s’informe' } ],
          cols: [ { id: 'txt', label: 'Mon persona' } ] },
        { type: 'heading', label: 'Son parcours' },
        { type: 'grid', id: 'parcours', label: 'Le parcours de mon client', req: 5,
          rows: [ { id: 'decouvre', label: '1. Il me découvre' }, { id: 'compare', label: '2. Il hésite, il compare' }, { id: 'achete', label: '3. Il achète' }, { id: 'revient', label: '4. Il revient' }, { id: 'recommande', label: '5. Il recommande' } ],
          cols: [ { id: 'contact', label: 'Le point de contact' }, { id: 'action', label: 'Ce que je fais pour l’aider' } ] },
        { type: 'heading', label: 'Ma présence en ligne' },
        { type: 'grid', id: 'canaux', label: 'Mes canaux', req: 6, anyOf: ['choix'],
          rows: [ { id: 'google', label: 'Fiche d’établissement Google' }, { id: 'instagram', label: 'Instagram' }, { id: 'tiktok', label: 'TikTok' }, { id: 'facebook', label: 'Facebook' },
            { id: 'site', label: 'Site internet' }, { id: 'plateformes', label: 'Plateformes (avis, livraison, réservation)' } ],
          cols: [ { id: 'choix', label: 'Mon choix', type: 'select', options: ['', 'Prioritaire', 'Secondaire', 'Non'], w: 'sm' }, { id: 'contenu', label: 'Ce que j’y publie, à quel rythme', opt: true } ] },
        { type: 'heading', label: 'Fidéliser et gérer les avis' },
        { type: 'textarea', id: 'fidelite', label: 'Mon programme de fidélité (et ce qu’il me coûte)', req: true, rows: 2 },
        { type: 'textarea', id: 'avis', label: 'Comment je récolte des avis, et comment je réponds à un avis négatif', req: true, rows: 3 },
        { type: 'check', id: 'rgpd', label: 'Je collecte les coordonnées de mes clients avec leur accord et je les utilise seulement pour ce que j’ai annoncé (RGPD).', req: true },
        { type: 'heading', label: 'Mon budget de communication' },
        { type: 'grid', id: 'budget', label: 'Mes actions de la première année', dynamic: true, minRows: 3, req: 3, total: 'cout',
          cols: [ { id: 'action', label: 'Action' }, { id: 'quand', label: 'Quand', w: 'sm' }, { id: 'cout', label: 'Coût (€)', type: 'number', w: 'sm' }, { id: 'kpi', label: 'Indicateur suivi', opt: true } ] },
        { type: 'calc', fn: 'com' }
      ]
    },

    /* ---------------------------------------------------------- H */
    {
      id: 'p8', num: 'H', partie: 2, titre: 'Mon tableau de bord', court: 'Tableau de bord', page: 'Piloter après l’ouverture', comp: [], compLabel: 'Pilotage',
      objectif: 'Choisir les quelques chiffres à surveiller après l’ouverture, fixer pour chacun un seuil d’alerte et savoir quoi faire quand il est franchi.',
      intro: [
        'Les objectifs ci-dessous sont calculés à partir de votre dossier (rubriques 6 et 8). Ils deviennent votre feu vert.',
        'Fixez ensuite votre <strong>feu rouge</strong> : le chiffre qui vous oblige à agir. Et décidez dès maintenant de l’action, parce qu’on décide mal dans l’urgence.'
      ],
      juryTitre: 'Ce qu’on vous demandera',
      jury: [
        '« Comment saurez-vous que ça ne marche pas ? » — votre seuil d’alerte en clients par jour, et l’action prévue.',
        '« Quels chiffres regarderez-vous chaque semaine ? » — trois, pas dix.'
      ],
      kawa: '<p><strong>Objectifs :</strong> 60 clients par jour, panier de 7,50 € TTC, CA d’environ 10 200 € HT par mois.</p><p><strong>Feux rouges :</strong> moins de 51 clients par jour en moyenne sur 2 semaines (le seuil de rentabilité) ; trésorerie sous 3 000 €.</p><p><strong>Actions prévues :</strong> formule petit-déjeuner à 5 € pour les voyageurs du matin ; démarchage des entreprises voisines pour des commandes de réunion ; report d’un investissement.</p>',
      pieges: [
        '<strong>Trop d’indicateurs.</strong> Au-delà de six, on n’en regarde plus aucun.',
        '<strong>Regarder seulement le CA.</strong> Un bon mois peut cacher une trésorerie qui baisse.',
        '<strong>Attendre le bilan annuel.</strong> Les chiffres se regardent chaque semaine, le bilan arrive trop tard.'
      ],
      photoHint: '',
      fields: [
        { type: 'calc', fn: 'objectifs' },
        { type: 'grid', id: 'indicateurs', label: 'Mes indicateurs et mes feux rouges', req: 5,
          rows: [ { id: 'clients', label: 'Clients par jour' }, { id: 'panier', label: 'Panier moyen TTC' }, { id: 'ca', label: 'CA du mois HT' }, { id: 'marge', label: 'Taux de marge' },
            { id: 'treso', label: 'Trésorerie en fin de mois' }, { id: 'avis', label: 'Note moyenne des avis' } ],
          cols: [ { id: 'frequence', label: 'Je le regarde', type: 'select', options: ['', 'Chaque jour', 'Chaque semaine', 'Chaque mois'], w: 'sm' }, { id: 'alerte', label: 'Mon feu rouge', w: 'sm' }, { id: 'action', label: 'Ce que je fais s’il passe au rouge' } ] },
        { type: 'heading', label: 'M’entraîner avec des chiffres fictifs' },
        { type: 'grid', id: 'test', label: 'Mes trois premiers mois (inventez des chiffres pour tester)',
          rows: [ { id: 'm1', label: 'Mois 1' }, { id: 'm2', label: 'Mois 2' }, { id: 'm3', label: 'Mois 3' } ],
          cols: [ { id: 'clients', label: 'Clients par jour', type: 'number', w: 'sm', opt: true }, { id: 'panier', label: 'Panier TTC (€)', type: 'number', w: 'sm', opt: true }, { id: 'treso', label: 'Trésorerie fin de mois (€)', type: 'number', w: 'sm', opt: true } ] },
        { type: 'calc', fn: 'feux' },
        { type: 'select', id: 'outil', label: 'Mon outil de suivi', req: true, options: ['', 'Tableur', 'Statistiques de ma caisse', 'Logiciel de gestion ou de comptabilité', 'Carnet papier'] },
        { type: 'textarea', id: 'rituel', label: 'Mon rendez-vous de gestion (quand, combien de temps, avec qui)', req: true, rows: 2 }
      ]
    },

    /* ---------------------------------------------------------- I */
    {
      id: 'p9', num: 'I', partie: 2, titre: 'Mon dossier banquier', court: 'Dossier banquier', page: 'Demander un prêt', comp: [], compLabel: 'Financement',
      objectif: 'Préparer le dossier qu’on remet à une banque ou à un réseau de prêt d’honneur, rempli automatiquement avec vos réponses.',
      intro: [
        'Le banquier lit d’abord trois choses : le montant demandé et son usage, votre apport, et la capacité de l’entreprise à rembourser. Le reste sert à le rassurer.',
        'Repères : un prêt d’honneur (0 %, sans garantie, accordé à la personne) va de 3 000 à 50 000 € ; chez Initiative France, il est d’environ 10 000 € en moyenne et s’accompagne en moyenne de 9,5 € de prêt bancaire par euro prêté. ' + lien('https://bpifrance-creation.fr/pid530/prets-d-honneur.html', 'Bpifrance Création : les prêts d’honneur'),
        'Le bouton en bas de page ouvre votre dossier banquier, prêt à imprimer ou à enregistrer en PDF.'
      ],
      juryTitre: 'Ce que le banquier vous demandera',
      jury: [
        '« Combien mettez-vous vous-même ? » — votre apport, et ce qu’il représente des besoins.',
        '« Comment remboursez-vous si le CA est inférieur de 20 % ? » — votre stress test et votre trésorerie.',
        '« Quelles garanties proposez-vous ? » — garantie Bpifrance ou France Active, caution, nantissement.'
      ],
      kawa: '<p><strong>Demande :</strong> 27 000 € sur 5 ans pour financer les travaux et le matériel. <strong>Apport et quasi-fonds propres :</strong> 18 000 € (8 000 d’apport, 10 000 de prêt d’honneur), soit 40 % des besoins.</p><p><strong>Garanties :</strong> garantie France Active sur 50 % du prêt, nantissement du matériel, pas de caution personnelle.</p><p><strong>Banques :</strong> rendez-vous avec trois banques, accord de la deuxième avec un différé de 3 mois.</p>',
      pieges: [
        '<strong>Arriver sans prêt d’honneur.</strong> Il rassure la banque : passez d’abord en comité.',
        '<strong>Une seule banque.</strong> Voyez-en au moins trois : taux, frais, assurance et différé varient.',
        '<strong>Accepter la caution sans réfléchir.</strong> Elle engage vos biens personnels ; proposez d’abord une garantie d’un organisme.'
      ],
      photoHint: '',
      fields: [
        { type: 'heading', label: 'Ma demande' },
        { type: 'number', id: 'montant', label: 'Montant demandé à la banque (€)', req: true, min: 0, inline: true },
        { type: 'number', id: 'duree', label: 'Durée (années)', req: true, min: 0, inline: true },
        { type: 'textarea', id: 'objet', label: 'Ce que le prêt finance', req: true, rows: 2 },
        { type: 'grid', id: 'garanties', label: 'Les garanties que je propose', req: 4,
          rows: [ { id: 'organisme', label: 'Garantie Bpifrance ou France Active' }, { id: 'nantissement', label: 'Nantissement du fonds ou du matériel' }, { id: 'caution', label: 'Caution personnelle' }, { id: 'autre', label: 'Autre' } ],
          cols: [ { id: 'choix', label: 'Proposée ?', type: 'select', options: ['', 'Oui', 'Non', 'À discuter'], w: 'sm' }, { id: 'detail', label: 'Précisions', opt: true } ] },
        { type: 'textarea', id: 'pitch', label: 'Mon projet en 5 lignes pour le banquier', req: true, rows: 5, help: 'Qui je suis, ce que je vends et à qui, pourquoi ça va marcher (un chiffre), ce que je demande, comment je rembourse.' },
        { type: 'grid', id: 'banques', label: 'Mes rendez-vous', dynamic: true, minRows: 2, req: 2,
          cols: [ { id: 'banque', label: 'Banque ou réseau' }, { id: 'contact', label: 'Interlocuteur', opt: true }, { id: 'date', label: 'Date', w: 'sm', opt: true }, { id: 'reponse', label: 'Réponse', type: 'select', options: ['', 'À contacter', 'Rendez-vous pris', 'En attente', 'Accord', 'Refus'], w: 'sm' } ] },
        { type: 'heading', label: 'Les pièces à joindre' },
        { type: 'check', id: 'pc_id', label: 'Pièce d’identité et justificatif de domicile', req: true },
        { type: 'check', id: 'pc_cv', label: 'CV (et diplômes ou attestations de formation)', req: true },
        { type: 'check', id: 'pc_prev', label: 'Prévisionnel sur 3 ans (dans le dossier ci-dessous)', req: true },
        { type: 'check', id: 'pc_devis', label: 'Devis des investissements', req: true },
        { type: 'check', id: 'pc_bail', label: 'Bail, promesse de bail ou compromis de cession' },
        { type: 'check', id: 'pc_apport', label: 'Justificatif de l’apport (relevé d’épargne)', req: true },
        { type: 'check', id: 'pc_honneur', label: 'Accord du prêt d’honneur' },
        { type: 'check', id: 'pc_statuts', label: 'Projet de statuts (société)' },
        { type: 'calc', fn: 'banquier' }
      ]
    }
  ];

  root.RUBRIQUES_PLUS = MODS;
})(typeof window !== 'undefined' ? window : globalThis);
