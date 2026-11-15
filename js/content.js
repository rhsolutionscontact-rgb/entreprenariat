/* ============================================================
   Contenu pédagogique — une rubrique par page du dossier EF3
   Source : manuel de l'étudiant (10 chapitres), fil rouge KAWA.
   ============================================================ */
window.COMPETENCES = [
  { code: 'C1', titre: 'Réaliser un diagnostic préalable', critere: 'Le diagnostic est clair et pertinent' },
  { code: 'C2', titre: 'Choisir le positionnement', critere: 'Judicieux et en cohérence avec le diagnostic' },
  { code: 'C3', titre: 'Évaluer le potentiel commercial', critere: 'Réaliste et correctement évalué' },
  { code: 'C4', titre: 'S’assurer de la solidité des partenariats', critere: 'Les partenaires couvrent les besoins de l’unité commerciale' },
  { code: 'C5', titre: 'Prévoir la gestion des ressources humaines', critere: 'Les besoins en RH sont correctement anticipés' },
  { code: 'C6', titre: 'S’assurer de la faisabilité financière', critere: 'Plan de financement rigoureux, clair, complet et précis' }
];

window.RUBRIQUES = [
  /* ---------------------------------------------------------- 0 */
  {
    id: 'r0', num: 0, titre: 'L’épreuve', court: 'L’épreuve', page: 'Avant de commencer', comp: [],
    objectif: 'Comprendre les règles du jeu avant de jouer : ce que vous rendez, comment vous êtes noté, ce que le jury attend.',
    intro: [
      '<strong>Le dossier :</strong> une dizaine de pages présentant un projet de création ou de reprise d’une unité commerciale (réel ou fictif), déposé en PDF <strong>deux semaines avant l’oral</strong>. Pas de dossier = pas d’oral.',
      '<strong>L’oral :</strong> 20 minutes devant un professeur d’économie-gestion et un professionnel du commerce : 10 minutes de présentation sans interruption, puis 10 minutes d’entretien.',
      '<strong>La notation :</strong> 6 compétences, chacune notée sur 4 niveaux (non maîtrisé, maîtrise partielle, bonne maîtrise, excellente maîtrise). Épreuve facultative : seuls les points au-dessus de 10 comptent.',
      '<strong>Le message clé :</strong> le jury note la méthode et la cohérence, pas l’originalité. Une idée simple, une méthode rigoureuse, des chiffres justifiés.'
    ],
    showCompetences: true,
    kawa: '<p>Le fil rouge de ce site est <strong>KAWA.</strong> : Lina, 22 ans, alternante en restauration à Paris, ouvre un coffee shop de spécialité près de la gare d’Aulnay-sous-Bois, avec un budget d’environ 45 000 €. À chaque rubrique, vous voyez ce que Lina a fait, puis vous le faites pour votre projet.</p><p><strong>Attention :</strong> KAWA. est un modèle de méthode, pas un modèle à recopier. Le jury connaît ce dossier.</p>',
    regles: [
      'Une idée simple, que vous pouvez observer sur le terrain.',
      'Tout justifier : chaque chiffre a une source.',
      'Sobriété en gestion : trois tableaux justes valent mieux que dix tableaux approximatifs.',
      'Micro-entreprise par défaut pour un petit projet ; une société seulement si vous savez dire pourquoi.',
      'Régularité : une rubrique à la fois, sans sauter d’étape.'
    ],
    pieges: [],
    fields: [
      { type: 'check', id: 'ok_dossier', label: 'J’ai compris ce que je dois rendre et quand (dossier PDF d’environ 10 pages, deux semaines avant l’oral).', req: true },
      { type: 'check', id: 'ok_competences', label: 'J’ai lu les 6 compétences évaluées et leurs critères.', req: true },
      { type: 'check', id: 'ok_methode', label: 'J’ai compris que le jury note la méthode et la cohérence, pas l’originalité.', req: true },
      { type: 'text', id: 'projet_nom', label: 'Le nom (provisoire) de mon projet', ph: 'Ex. : KAWA.', req: true }
    ]
  },

  /* ---------------------------------------------------------- 1 */
  {
    id: 'r1', num: 1, titre: 'Mon idée', court: 'Idée', page: 'Pages 1-2', comp: [],
    objectif: 'Formuler une idée précise (besoin + solution + clients), expliquer d’où elle vient et la tester avant de vous engager pour deux ans.',
    jury: [
      '« Comment est née votre idée ? » — racontez la vraie histoire, avec des observations concrètes.',
      '« Pourquoi vous, sur ce projet ? » — reliez l’idée à votre alternance, vos compétences MCO, votre territoire.',
      '« Avez-vous envisagé une reprise ? » — montrez que votre choix est réfléchi, pas subi.',
      '« Votre idée existe déjà ailleurs : pourquoi cela marcherait ? » — une idée qui existe ailleurs a un marché prouvé ; votre valeur, c’est le territoire et l’exécution.'
    ],
    kawa: '<p><strong>L’idée en une phrase :</strong> « Créer KAWA., un coffee shop de spécialité aux codes parisiens, près de la gare d’Aulnay-sous-Bois, pour les jeunes actifs de Seine-Saint-Denis qui ne veulent plus traverser Paris pour un bon café. »</p><p><strong>L’origine :</strong> pendant son alternance à Paris, Lina voit les files devant les coffee shops ; en rentrant à Aulnay, rien de comparable à moins de 30 minutes de RER.</p><p><strong>Création plutôt que reprise :</strong> aucun fonds de ce type à reprendre sur le territoire — c’est précisément l’opportunité.</p><p><strong>Ce qui reste à consolider :</strong> le local exact et sa formation de barista.</p>',
    pieges: [
      '<strong>L’idée vague.</strong> « Ouvrir un commerce » n’est pas une idée : appliquez la formule besoin + solution + clients.',
      '<strong>L’idée trop grosse.</strong> Une chaîne de restaurants est infinançable et invérifiable à votre échelle.',
      '<strong>L’idée inobservable.</strong> Sans terrain à étudier (passants, clients, concurrents), pas de diagnostic, donc pas de note.',
      '<strong>Changer d’idée en 2e année.</strong> Tout le dossier repose sur l’idée choisie maintenant : testez-la d’abord.'
    ],
    fields: [
      { type: 'textarea', id: 'idee_phrase', label: 'Mon idée en une phrase', help: 'Formule : besoin + solution + clients. Précisez le lieu.', ph: 'Créer…, près de…, pour… qui…', req: true, rows: 3 },
      { type: 'textarea', id: 'origine', label: 'D’où vient mon idée', help: 'Une observation vécue (alternance, quartier, entourage) vaut plus qu’une idée trouvée sur Internet.', req: true, rows: 4 },
      { type: 'select', id: 'type_projet', label: 'Création ou reprise ?', options: ['', 'Création', 'Reprise'], req: true },
      { type: 'textarea', id: 'type_justif', label: 'Pourquoi ce choix', req: true, rows: 3 },
      { type: 'heading', label: 'Le test des 5 questions' },
      { type: 'textarea', id: 'q_probleme', label: '1. Quel problème ou besoin mon idée résout-elle ?', req: true, rows: 2 },
      { type: 'textarea', id: 'q_cible', label: '2. Pour qui ? (le plus précis possible)', req: true, rows: 2 },
      { type: 'textarea', id: 'q_solution', label: '3. Quelle est ma solution concrète ?', req: true, rows: 2 },
      { type: 'textarea', id: 'q_concurrents', label: '4. Qui le fait déjà, ici ou ailleurs ?', req: true, rows: 2 },
      { type: 'textarea', id: 'q_difference', label: '5. Qu’est-ce que je fais de différent ou de plus utile ?', req: true, rows: 2 },
      { type: 'heading', label: 'Ce qui est sûr, ce qui reste à consolider' },
      { type: 'textarea', id: 'certain', label: 'Ce qui est déjà certain', rows: 2 },
      { type: 'textarea', id: 'a_consolider', label: 'Ce qui n’est pas encore clair (et comment je vais le traiter)', help: 'Assumer ses inconnues fait partie de la démarche.', req: true, rows: 3 }
    ]
  },

  /* ---------------------------------------------------------- 2 */
  {
    id: 'r2', num: 2, titre: 'Diagnostic de l’environnement', court: 'Environnement', page: 'Page 3', comp: ['C1'],
    objectif: 'Prouver que votre idée a sa place : le macro-environnement (PESTEL) et le micro-environnement (6 forces concurrentielles), avec des sources datées.',
    jury: [
      '« D’où tenez-vous cette information ? » — chaque donnée a sa source (nom + date).',
      '« Quel facteur menace le plus votre projet ? » — ne dites jamais « aucun » : nommez la menace et votre parade.',
      '« Quelle est l’utilité de cette information ? » — chaque case doit avoir un lien direct avec votre projet.',
      '« Pourquoi cette note de 4/5 ? » — chaque note de l’hexagone se justifie en une phrase concrète.'
    ],
    kawa: '<p><strong>Méthode :</strong> 12 sources consultées entre octobre et janvier (INSEE, Société du Grand Paris, presse économique, études du secteur café, mairie d’Aulnay).</p><table class="mini"><tr><th>PESTEL</th><th>Opportunité</th><th>Menace</th></tr><tr><td>Économique</td><td>Arrivée de jeunes actifs ; loyers 2 à 3 fois inférieurs à Paris</td><td>Inflation sur le café vert</td></tr><tr><td>Socioculturel</td><td>Culture du brunch et du café « lieu de vie »</td><td>Habitude locale du café à 1,50 € : risque d’image « cher »</td></tr><tr><td>Légal</td><td>Formalités simplifiées (guichet unique)</td><td>Hygiène (HACCP), ERP, autorisation de terrasse</td></tr></table><p><strong>Hexagone :</strong> deux vraies pressions, la substitution par le « café pas cher » (4/5) et la copie du concept (4/5).</p><p><strong>Conclusion :</strong> l’opportunité majeure est une demande émergente face à une offre locale inexistante ; la menace majeure est le prix perçu.</p>',
    pieges: [
      '<strong>Le PESTEL générique</strong> copié d’Internet, sans votre secteur ni votre ville : le jury le reconnaît en 10 secondes.',
      '<strong>Confondre macro et micro.</strong> L’inflation nationale = PESTEL ; le nombre de boulangeries dans votre rue = forces concurrentielles.',
      '<strong>Tout garder.</strong> Le jury note la pertinence, pas le volume : éliminez ce qui ne vous concerne pas.',
      '<strong>Oublier les sources.</strong> Notez le lien et la date au moment où vous trouvez l’information.'
    ],
    fields: [
      { type: 'grid', id: 'sources', label: 'Mes sources', help: 'Visez une dizaine de sources, notées et datées. Minimum 5 pour avancer.', dynamic: true, minRows: 5, req: 5,
        cols: [ { id: 'titre', label: 'Source (titre, organisme)' }, { id: 'date', label: 'Date de consultation', w: 'sm' }, { id: 'lien', label: 'Lien', opt: true } ] },
      { type: 'grid', id: 'pestel', label: 'Mon PESTEL', help: 'Pour chaque facteur, au moins une opportunité ou une menace qui touche VOTRE projet.', anyOf: ['opp', 'men'],
        rows: [ { id: 'p', label: 'Politique' }, { id: 'e', label: 'Économique' }, { id: 's', label: 'Socioculturel' }, { id: 't', label: 'Technologique' }, { id: 'eco', label: 'Écologique' }, { id: 'l', label: 'Légal' } ],
        cols: [ { id: 'opp', label: 'Opportunité pour mon projet', type: 'textarea' }, { id: 'men', label: 'Menace pour mon projet', type: 'textarea' } ], req: 6 },
      { type: 'hexagone', id: 'hexa', label: 'Mon hexagone sectoriel (les 6 forces concurrentielles)', help: 'Notez chaque force de 1 (faible) à 5 (forte) et justifiez en une phrase.', req: true },
      { type: 'heading', label: 'Reprise : le diagnostic de l’affaire que je reprends', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' } },
      { type: 'textarea', id: 'reprise_affaire', label: 'L’affaire : activité, ancienneté, emplacement, et pourquoi le cédant vend', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, rows: 3,
        help: 'Départ à la retraite, changement de vie, difficultés ? La raison de la vente change tout pour la négociation.' },
      { type: 'grid', id: 'reprise_historique', label: 'Les chiffres des 3 derniers exercices', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: 3,
        help: 'Relevés dans les bilans et comptes de résultat fournis par le cédant (ou son expert-comptable).',
        rows: [ { id: 'n3', label: 'Il y a 3 ans' }, { id: 'n2', label: 'Il y a 2 ans' }, { id: 'n1', label: 'Dernier exercice' } ],
        cols: [ { id: 'ca', label: 'CA HT (€)', type: 'number', w: 'sm' }, { id: 'resultat', label: 'Résultat (€)', type: 'number', w: 'sm' }, { id: 'commentaire', label: 'Ce qui explique l’évolution', opt: true } ] },
      { type: 'textarea', id: 'reprise_clientele', label: 'La clientèle reprise : qui, combien, fidèle ou non', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, rows: 2 },
      { type: 'textarea', id: 'reprise_etat', label: 'L’état du local et du matériel, les travaux et mises aux normes à prévoir', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, rows: 2 },
      { type: 'textarea', id: 'reprise_bail', label: 'Le bail commercial : durée restante, loyer, activités autorisées', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, rows: 2 },
      { type: 'textarea', id: 'reprise_salaries', label: 'Les salariés repris (nombre, postes, coût employeur) — écrivez « aucun » s’il n’y en a pas', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, rows: 2,
        help: 'En cas de vente du fonds, les contrats de travail sont transférés au repreneur (article L1224-1 du Code du travail).' },
      { type: 'number', id: 'reprise_prix', label: 'Prix demandé par le cédant (€)', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, min: 0 },
      { type: 'number', id: 'reprise_bareme_min', label: 'Barème de mon secteur : bas de la fourchette (% du CA)', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, min: 0, step: '1', inline: true },
      { type: 'number', id: 'reprise_bareme_max', label: 'Haut de la fourchette (% du CA)', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true, min: 0, step: '1', inline: true },
      { type: 'text', id: 'reprise_bareme_src', label: 'Source du barème', ph: 'Ex. : barème professionnel communiqué par la CCI ou par un expert-comptable', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' }, req: true },
      { type: 'reprise', showIf: { rub: 'r1', field: 'type_projet', equals: 'Reprise' } },
      { type: 'textarea', id: 'conclusion', label: 'Ma conclusion en 3 phrases', help: 'L’opportunité majeure, la menace majeure, et ce que cela change pour mon projet.', req: true, rows: 4 }
    ]
  },

  /* ---------------------------------------------------------- 3 */
  {
    id: 'r3', num: 3, titre: 'Étude de marché et SWOT', court: 'Marché & SWOT', page: 'Page 4', comp: ['C1'],
    objectif: 'Passer du terrain aux preuves : étude documentaire, questionnaire, diagnostic interne, puis synthèse SWOT.',
    jury: [
      '« Combien de personnes ont répondu, et qui sont-elles ? » — le chiffre exact, la période, le profil, et les limites assumées.',
      '« Que retenez-vous de votre étude de marché ? » — 3 chiffres + 1 conséquence.',
      '« Votre opportunité principale ? » — une seule, la plus forte, reliée à une preuve.',
      '« Cette faiblesse ne condamne-t-elle pas votre projet ? » — « c’est exact, et voici comment je la traite ».'
    ],
    kawa: '<p><strong>Questionnaire :</strong> 54 réponses du 3 au 17 février (QR code en sortie de gare, réseaux sociaux locaux, entreprise d’accueil).</p><ul><li>72 % consomment une boisson chaude hors domicile plusieurs fois par semaine ;</li><li>61 % se disent intéressés par le concept ;</li><li>74 % acceptent un budget de 5 à 8 € pour une boisson + une pâtisserie ;</li><li>38 % citent le prix comme frein principal.</li></ul><p><strong>SWOT (extrait) :</strong> force = connaissance du territoire et de la cible ; faiblesse = pas d’expérience barista (formation planifiée) ; opportunité = aucun concurrent direct ; menace = habitude du café à 1,50 €.</p>',
    pieges: [
      '<strong>Le questionnaire « entre amis ».</strong> 30 réponses de votre classe = un biais énorme. Variez les canaux et dites-le.',
      '<strong>Confondre opportunité et force.</strong> « Je connais le quartier » = force (interne) ; « le quartier se développe » = opportunité (externe).',
      '<strong>Le SWOT fourre-tout.</strong> 3 à 5 éléments hiérarchisés par case, pas plus.',
      '<strong>Les chiffres sans source ni date.</strong>'
    ],
    fields: [
      { type: 'textarea', id: 'offre_doc', label: 'L’offre existante (étude documentaire)', help: 'Concurrents directs et indirects, distributeurs, prescripteurs — avec les sources.', req: true, rows: 4 },
      { type: 'textarea', id: 'demande_doc', label: 'La demande (étude documentaire)', help: 'Population, revenus, habitudes de consommation, tendances — avec les sources.', req: true, rows: 4 },
      { type: 'grid', id: 'concurrents', label: 'Mes concurrents relevés sur le terrain', dynamic: true, minRows: 3, req: 3,
        cols: [ { id: 'nom', label: 'Nom' }, { id: 'type', label: 'Direct ou indirect', type: 'select', options: ['', 'Direct', 'Indirect'], w: 'sm' }, { id: 'prix', label: 'Prix relevés', w: 'sm' }, { id: 'forces', label: 'Points forts' }, { id: 'faiblesses', label: 'Points faibles' } ] },
      { type: 'heading', label: 'Mon questionnaire' },
      { type: 'number', id: 'nb_reponses', label: 'Nombre de réponses', help: '20 minimum pour exploiter les résultats.', req: true, min: 1 },
      { type: 'text', id: 'periode', label: 'Période de collecte', ph: 'Ex. : du 3 au 17 février', req: true },
      { type: 'text', id: 'canaux', label: 'Canaux de diffusion', ph: 'Ex. : QR code en sortie de gare, réseaux, entreprise d’accueil', req: true },
      { type: 'grid', id: 'chiffres_cles', label: 'Mes chiffres clés (tris à plat)', help: '3 à 5 chiffres, chacun avec ce qu’il change pour le projet.', dynamic: true, minRows: 3, req: 3,
        cols: [ { id: 'chiffre', label: 'Le chiffre', w: 'sm' }, { id: 'question', label: 'Ce qu’il mesure (question)' }, { id: 'consequence', label: 'Ce que j’en conclus' } ] },
      { type: 'number', id: 'budget_max', label: 'Budget maximum accepté par la majorité des répondants (€ TTC)', help: 'Ex. : 8 si « 74 % acceptent de 5 à 8 € ». Le site vérifiera que votre prix reste dans ce budget.', req: true, step: '0.01' },
      { type: 'textarea', id: 'limites', label: 'Les limites de mon questionnaire', help: 'Taille de l’échantillon, profils sur-représentés… Les assumer rapporte des points.', req: true, rows: 2 },
      { type: 'textarea', id: 'interne', label: 'Mon diagnostic interne', help: 'Ressources tangibles (apport, matériel) et intangibles (compétences, réseau, alternance).', req: true, rows: 3 },
      { type: 'heading', label: 'Ma synthèse SWOT' },
      { type: 'swot', id: 'swot', req: true },
      { type: 'textarea', id: 'conclusion_diag', label: 'Conclusion du diagnostic', help: 'Y a-t-il une place pour mon projet ? Quelles réponses dois-je construire ensuite ?', req: true, rows: 3 }
    ]
  },

  /* ---------------------------------------------------------- 4 */
  {
    id: 'r4', num: 4, titre: 'Positionnement', court: 'Positionnement', page: 'Page 5', comp: ['C2'],
    objectif: 'Pour qui, contre qui, avec quelle promesse : segmenter, cibler, positionner — en cohérence avec votre diagnostic.',
    jury: [
      '« Pourquoi ce segment plutôt qu’un autre ? » — reliez au questionnaire et assumez le segment écarté.',
      '« En quoi êtes-vous différent de [concurrent] ? » — répondez avec les axes de votre carte.',
      '« Votre positionnement est-il cohérent avec votre diagnostic ? » — LA question du critère officiel : « mon SWOT montre… donc je cible… avec… ».',
      '« Comment avez-vous choisi les axes de votre carte ? » — ce sont les critères de choix les plus cités dans votre questionnaire.'
    ],
    kawa: '<p><strong>Cible principale :</strong> les jeunes actifs 25-35 ans du territoire. <strong>Cibles secondaires :</strong> étudiants et télétravailleurs. <strong>Segment écarté :</strong> les habitués du café comptoir, dont le seul critère est le prix.</p><p><strong>La promesse :</strong> « Pour les jeunes actifs de Seine-Saint-Denis, KAWA. est le coffee shop de spécialité qui offre l’expérience parisienne à 10 minutes de chez soi et 20 % moins cher — parce qu’installé là où ils vivent, avec des loyers qui rendent ces prix tenables. »</p><p><strong>La carte :</strong> axes prix × expérience (les deux critères les plus cités à la question 3) ; la zone « expérience riche à prix intermédiaire » est vide sur le territoire.</p>',
    pieges: [
      '<strong>Cibler « tout le monde ».</strong> Choisir une cible, c’est renoncer aux autres.',
      '<strong>Le positionnement décrété.</strong> Chaque mot de votre phrase doit être justifiable par une donnée.',
      '<strong>La carte aux axes arbitraires.</strong> Les axes viennent du questionnaire, pas de l’envie de tomber dans la zone libre.',
      '<strong>Rompre la chaîne diagnostic → positionnement.</strong> Un SWOT « frein prix » suivi d’un positionnement luxe : incohérence fatale.'
    ],
    fields: [
      { type: 'grid', id: 'segments', label: 'Mes segments', help: 'Au moins 3 segments, dont un que vous choisissez de ne pas servir.', dynamic: true, minRows: 3, req: 3,
        cols: [ { id: 'nom', label: 'Segment' }, { id: 'criteres', label: 'Critères (âge, habitudes, budget…)' }, { id: 'preuve', label: 'Preuve (questionnaire, données)' }, { id: 'choix', label: 'Mon choix', type: 'select', options: ['', 'Cible principale', 'Cible secondaire', 'Segment écarté'], w: 'sm' } ] },
      { type: 'textarea', id: 'cible_principale', label: 'Ma cible principale, et pourquoi elle', req: true, rows: 3 },
      { type: 'textarea', id: 'segment_ecarte', label: 'Le segment que je renonce à servir, et pourquoi', req: true, rows: 2 },
      { type: 'heading', label: 'Ma phrase de positionnement' },
      { type: 'text', id: 'pos_pour', label: 'Pour…', ph: 'les jeunes actifs de Seine-Saint-Denis', req: true },
      { type: 'text', id: 'pos_est', label: '[mon projet] est…', ph: 'le coffee shop de spécialité', req: true },
      { type: 'text', id: 'pos_qui', label: 'qui…', ph: 'offre l’expérience parisienne à 10 minutes de chez soi et 20 % moins cher', req: true },
      { type: 'text', id: 'pos_parce', label: 'parce que…', ph: 'installé là où ils vivent, avec des loyers qui rendent ces prix tenables', req: true },
      { type: 'heading', label: 'Le test du triangle d’or' },
      { type: 'textarea', id: 'tri_attractif', label: 'Attractif : la cible le veut (preuve)', req: true, rows: 2 },
      { type: 'textarea', id: 'tri_diff', label: 'Différenciant : les concurrents ne l’offrent pas', req: true, rows: 2 },
      { type: 'textarea', id: 'tri_credible', label: 'Crédible : je peux tenir cette promesse', req: true, rows: 2 },
      { type: 'carte', id: 'carte', label: 'Ma carte perceptuelle', help: 'Axes = les deux critères de choix les plus cités dans votre questionnaire. Placez au moins 3 concurrents et votre projet (notes de 1 à 10).', req: true },
      { type: 'textarea', id: 'lecture_carte', label: 'Lecture de ma carte', help: 'Où est la zone libre ? Pourquoi est-ce la bonne pour moi ?', req: true, rows: 3 }
    ]
  },

  /* ---------------------------------------------------------- 5 */
  {
    id: 'r5', num: 5, titre: 'Modèle d’affaires', court: 'Canvas', page: 'Page 6', comp: [], compLabel: 'Cœur de l’oral',
    objectif: 'Montrer comment votre projet crée de la valeur et gagne de l’argent, en 9 blocs cohérents avec vos pages précédentes.',
    jury: [
      '« Business model ou business plan ? » — le business model est la logique (le Canvas) ; le business plan, sa traduction chiffrée (pages 7 à 10).',
      '« Comment gagnez-vous de l’argent, concrètement ? » — vos flux de revenus avec leurs proportions et le panier moyen.',
      '« Quelle est votre proposition de valeur ? » — le bénéfice client, pas la liste des produits.',
      '« Quel coût peut faire dérailler votre modèle ? » — votre coût critique et sa limite.'
    ],
    kawa: '<p><strong>Proposition de valeur :</strong> l’expérience coffee shop parisienne à 10 minutes de chez soi, environ 20 % moins cher ; un lieu chaleureux où l’on peut rester.</p><p><strong>Flux de revenus :</strong> sur place ≈ 60 %, à emporter ≈ 30 %, cartes prépayées et formules ≈ 10 % ; panier moyen visé : 7 € TTC.</p><p><strong>Structure de coûts :</strong> fixes = loyer, assurances, abonnements, intérêts d’emprunt ; variables = matières, emballages, commissions de paiement.</p><p><strong>En une phrase :</strong> « KAWA. gagne de l’argent en servant environ 60 clients par jour, avec une marge sur coût variable qui couvre des charges fixes maîtrisées grâce aux loyers du territoire. »</p>',
    pieges: [
      '<strong>Confondre proposition de valeur et liste de produits.</strong> Le client achète un bénéfice, pas un inventaire.',
      '<strong>Le Canvas déconnecté</strong> de votre ciblage (rubrique 4) : le jury croise les pages.',
      '<strong>Des blocs remplis « pour remplir ».</strong> Chaque puce doit être propre à VOTRE projet.',
      '<strong>Ignorer l’équilibre revenus / coûts.</strong> Ajustez maintenant plutôt qu’à la rubrique 8.',
      '<strong>Remboursement d’emprunt dans les coûts.</strong> Seuls les intérêts sont un coût ; le capital remboursé n’en est pas un.'
    ],
    fields: [
      { type: 'canvas', id: 'bmc', req: true },
      { type: 'textarea', id: 'phrase_modele', label: 'Mon modèle en une phrase', ph: '[Mon projet] gagne de l’argent en…', req: true, rows: 2 }
    ]
  },

  /* ---------------------------------------------------------- 6 */
  {
    id: 'r6', num: 6, titre: 'Potentiel commercial', court: 'Potentiel', page: 'Page 7', comp: ['C3'],
    objectif: 'Calculer un chiffre d’affaires réaliste à partir du terrain (jamais d’un pourcentage d’un grand marché), puis décliner votre positionnement en 4 P et en plan d’actions chiffré.',
    jury: [
      '« D’où sortent vos clients par jour ? » — de votre comptage terrain et d’un taux volontairement prudent.',
      '« Et si vous n’en faites que la moitié ? » — situez-vous par rapport à votre seuil et donnez votre parade.',
      '« Pourquoi ce prix ? » — il couvre votre coût, il entre dans le budget accepté, il se situe face aux concurrents.',
      '« Comment trouverez-vous vos premiers clients ? » — votre plan d’actions daté et chiffré.'
    ],
    kawa: '<p><strong>Flux :</strong> comptages sur 3 créneaux → environ 2 500 passages par jour devant le local.</p><p><strong>Taux de captation prudent :</strong> 2,4 % → 60 clients par jour (moyen 80, optimiste 110).</p><p><strong>Panier :</strong> 7 € TTC, soit <strong>6,36 € HT</strong> (TVA 10 %), dans le budget de 5 à 8 € accepté par 74 % des répondants.</p><p><strong>Jours :</strong> 6 jours sur 7, moins 3 semaines de fermeture → 300 jours.</p><p><strong>CA prudent :</strong> 60 × 6,36 € × 300 = <strong>114 545 € HT</strong>. Tous les calculs financiers reposent sur ce scénario.</p><p class="note">Le nombre de clients vient du comptage, pas des intentions du questionnaire : le questionnaire sert à valider le besoin et le prix.</p>',
    pieges: [
      '<strong>Le CA descendant.</strong> « Le marché fait 2 milliards, je vise 0,01 % » ne prouve rien.',
      '<strong>Confondre intentions et achats.</strong> 61 % d’intéressés ne font pas 61 % de clients.',
      '<strong>Les prix TTC dans le CA.</strong> La TVA n’est pas à vous : le site convertit votre panier en HT.',
      '<strong>L’année de 365 jours à plein régime.</strong> Comptez vos jours réels.',
      '<strong>Les 4 P incohérents</strong> avec le positionnement : relisez les rubriques 4 et 6 côte à côte.'
    ],
    fields: [
      { type: 'select', id: 'famille', label: 'Mon type d’activité', help: 'Il indique ce que vous devez mesurer sur le terrain.', req: true,
        options: [ ['', ''], ['flux', 'Commerce de flux (café, snack, kiosque) : passants × taux de captation'], ['capacite', 'Commerce à places (restaurant, bar, salon) : places × rotations × remplissage'], ['boutique', 'Boutique : entrants × taux de transformation'], ['location', 'Location (véhicules, matériel) : unités disponibles × taux d’occupation'], ['service', 'Service : créneaux disponibles × taux de remplissage'], ['ligne', 'Vente en ligne : visiteurs × taux de conversion'] ] },
      { type: 'textarea', id: 'zone', label: 'Ma zone de chalandise', help: 'D’où viendront vos clients ? Appuyez-vous sur votre questionnaire.', req: true, rows: 2 },
      { type: 'heading', label: 'Le calcul en 5 étapes' },
      { type: 'text', id: 'base_label', label: 'Ce que j’ai mesuré (par jour)', ph: 'Ex. : passants comptés devant le local par jour', req: true },
      { type: 'number', id: 'base', label: 'Valeur mesurée par jour', req: true, min: 0 },
      { type: 'text', id: 'source_base', label: 'Comment je l’ai mesurée', ph: 'Ex. : 3 comptages d’une heure, mardi 7h, jeudi 12h, samedi 10h', req: true },
      { type: 'number', id: 'taux_prudent', label: 'Taux prudent (%)', req: true, step: '0.1', min: 0, inline: true },
      { type: 'number', id: 'taux_moyen', label: 'Taux moyen (%)', req: true, step: '0.1', min: 0, inline: true },
      { type: 'number', id: 'taux_optimiste', label: 'Taux optimiste (%)', req: true, step: '0.1', min: 0, inline: true },
      { type: 'textarea', id: 'justif_taux', label: 'Pourquoi ces taux', help: 'Observation chez un concurrent, avis du tuteur, prudence assumée.', req: true, rows: 2 },
      { type: 'number', id: 'panier_ttc', label: 'Panier moyen (€ TTC, prix affiché)', req: true, step: '0.01', min: 0, inline: true },
      { type: 'select', id: 'tva', label: 'Taux de TVA', req: true, inline: true,
        options: [ ['', ''], ['20', '20 % (la plupart des produits et services, alcool)'], ['10', '10 % (restauration sur place, à consommer tout de suite)'], ['5.5', '5,5 % (alimentaire à emporter)'], ['mixte', 'Plusieurs gammes à des taux différents (tableau ci-dessous)'], ['0', 'Pas de TVA (micro-entreprise en franchise)'] ] },
      { type: 'grid', id: 'gammes', label: 'Mes gammes de produits', showIf: { field: 'tva', equals: 'mixte' }, dynamic: true, minRows: 2, req: 2,
        help: 'Répartissez votre panier moyen entre vos gammes (total 100 %). Le site calcule le panier HT exact et la TVA moyenne.',
        cols: [ { id: 'nom', label: 'Gamme' }, { id: 'part', label: 'Part du panier (%)', type: 'number', w: 'sm' },
          { id: 'tva', label: 'TVA (%)', type: 'select', options: ['', '20', '10', '5.5', '2.1', '0'], w: 'sm' },
          { id: 'cout', label: 'Coût d’achat (% du prix HT)', type: 'number', w: 'sm', opt: true } ] },
      { type: 'text', id: 'source_panier', label: 'D’où vient mon panier', ph: 'Ex. : relevés chez 3 concurrents + budget du questionnaire', req: true },
      { type: 'number', id: 'jours', label: 'Jours d’ouverture par an', help: 'Souvent entre 280 et 310 : retirez fermetures et congés.', req: true, min: 0 },
      { type: 'text', id: 'justif_jours', label: 'Le détail de mes jours', ph: 'Ex. : 6 jours sur 7, moins 3 semaines de fermeture', req: true },
      { type: 'ca' },
      { type: 'grid', id: 'saison', label: 'Ma saisonnalité (facultatif)', help: '100 = un mois normal. 150 = un mois 50 % plus fort, 50 = deux fois plus calme, 0 = fermé. Laissez vide si votre activité est régulière. Ces coefficients répartissent votre CA dans le plan de trésorerie (rubrique 8).',
        rows: [ { id: 'm1', label: 'Janvier' }, { id: 'm2', label: 'Février' }, { id: 'm3', label: 'Mars' }, { id: 'm4', label: 'Avril' }, { id: 'm5', label: 'Mai' }, { id: 'm6', label: 'Juin' }, { id: 'm7', label: 'Juillet' }, { id: 'm8', label: 'Août' }, { id: 'm9', label: 'Septembre' }, { id: 'm10', label: 'Octobre' }, { id: 'm11', label: 'Novembre' }, { id: 'm12', label: 'Décembre' } ],
        cols: [ { id: 'coef', label: 'Coefficient (100 = normal)', type: 'number', w: 'sm' }, { id: 'pourquoi', label: 'Pourquoi', opt: true } ], compact: true },
      { type: 'heading', label: 'Mon plan de marchéage (4 P)' },
      { type: 'textarea', id: 'p_produit', label: 'Produit', req: true, rows: 3 },
      { type: 'textarea', id: 'p_prix', label: 'Prix', help: 'Les 3 repères : coût de revient, concurrents, budget accepté.', req: true, rows: 3 },
      { type: 'textarea', id: 'p_distribution', label: 'Distribution', req: true, rows: 2 },
      { type: 'textarea', id: 'p_communication', label: 'Communication', req: true, rows: 3 },
      { type: 'grid', id: 'plan_actions', label: 'Mon plan d’actions de lancement', help: 'Chaque action : quand, combien, quel objectif mesurable.', dynamic: true, minRows: 3, req: 3,
        cols: [ { id: 'action', label: 'Action' }, { id: 'quand', label: 'Quand', w: 'sm' }, { id: 'budget', label: 'Budget (€)', type: 'number', w: 'sm' }, { id: 'objectif', label: 'Objectif mesurable' } ], total: 'budget' }
    ]
  },

  /* ---------------------------------------------------------- 7 */
  {
    id: 'r7', num: 7, titre: 'Partenaires, aides et RH', court: 'Partenaires & RH', page: 'Page 8', comp: ['C4', 'C5'],
    objectif: 'Montrer que chaque besoin de votre unité commerciale est couvert par un partenaire nommé, que vos aides sont justifiées et que vos besoins humains sont anticipés.',
    jury: [
      '« Vos partenaires couvrent-ils tous les besoins ? » — déroulez vos 5 familles.',
      '« Les avez-vous contactés ? » — si oui, avec les dates ; sinon, leurs conditions publiques.',
      '« Un partenaire, ce n’est pas un associé ? » — non : l’associé partage le capital, le partenaire est un tiers avec qui vous contractez.',
      '« Et si l’activité explose, ou si vous tombez malade ? » — votre signal de recrutement et votre solution de continuité.'
    ],
    kawa: '<p><strong>Partenaires :</strong> torréfacteur artisanal francilien et pâtissier d’Aulnay (approvisionnement) ; fournisseur CHR en reconditionné (équipement) ; banque, assureur, comptable en ligne, caisse connectée (services) ; mairie et association des commerçants (ancrage local) ; plateforme Initiative et banque (financement).</p><p><strong>Aides :</strong> ACRE (sur demande à l’URSSAF depuis 2026), prêt d’honneur de 10 000 €, accompagnement CCI.</p><p><strong>RH :</strong> année 1, Lina seule sur des horaires compatibles avec ses heures de travail ; année 2, barista à temps partiel si le CA dépasse 500 € par jour pendant 3 mois.</p>',
    pieges: [
      '<strong>La page RH fantôme.</strong> « Je travaillerai seul » en une ligne : compétence 5 non évaluable.',
      '<strong>Les partenaires anonymes.</strong> « Des fournisseurs », « une banque » : nommez, localisez, donnez les conditions.',
      '<strong>Le catalogue d’aides récité.</strong> 2 ou 3 aides auxquelles vous êtes éligible suffisent (vérifiez sur bpifrance-creation.fr).',
      '<strong>Le salarié au salaire brut.</strong> Raisonnez en coût employeur (simulateur URSSAF).',
      '<strong>Des horaires impossibles.</strong> Si vous travaillez seul, vos heures d’ouverture + préparation + gestion doivent tenir dans votre semaine.'
    ],
    fields: [
      { type: 'grid', id: 'partenaires', label: 'Mes partenaires : un besoin, un nom', req: 5,
        rows: [ { id: 'appro', label: 'S’approvisionner' }, { id: 'equip', label: 'S’équiper' }, { id: 'services', label: 'Se faire servir (banque, assurance, comptable…)' }, { id: 'local', label: 'S’ancrer localement' }, { id: 'finance', label: 'Se financer' } ],
        cols: [ { id: 'nom', label: 'Partenaire nommé (et localisé)' }, { id: 'relation', label: 'Contenu de la relation (conditions, fréquence, tarif)', type: 'textarea' } ] },
      { type: 'grid', id: 'aides', label: 'Mes aides', help: '2 ou 3 aides justifiées, vérifiées sur bpifrance-creation.fr.', dynamic: true, minRows: 2, req: 2,
        cols: [ { id: 'aide', label: 'Aide' }, { id: 'organisme', label: 'Organisme' }, { id: 'eligibilite', label: 'Pourquoi j’y suis éligible' }, { id: 'montant', label: 'Montant ou effet', w: 'sm' } ] },
      { type: 'heading', label: 'Mes ressources humaines' },
      { type: 'text', id: 'horaires', label: 'Mes horaires d’ouverture', ph: 'Ex. : 7h30-18h du lundi au vendredi, 9h-18h le samedi', req: true },
      { type: 'number', id: 'heures_ouverture', label: 'Heures d’ouverture par semaine', req: true, min: 0, inline: true },
      { type: 'number', id: 'heures_travail', label: 'Mes heures de travail par semaine (ouverture + préparation + gestion)', req: true, min: 0, inline: true },
      { type: 'textarea', id: 'organisation', label: 'Qui fait quoi, et comment je tiens ces horaires', req: true, rows: 3 },
      { type: 'textarea', id: 'competences', label: 'Les compétences qui me manquent et les formations prévues', req: true, rows: 2 },
      { type: 'textarea', id: 'signal_renfort', label: 'Mon signal de recrutement', help: 'Ex. : CA moyen au-dessus de X € par jour pendant 3 mois → embauche à temps partiel.', req: true, rows: 2 },
      { type: 'number', id: 'cout_salarie_annuel', label: 'Coût employeur des salariés prévus en année 1 (€ par an, 0 si aucun)', help: 'Il sera comparé à votre compte de résultat.', req: true, min: 0 },
      { type: 'textarea', id: 'continuite', label: 'Si je tombe malade ou si l’activité explose', req: true, rows: 2 }
    ]
  },

  /* ---------------------------------------------------------- 8 */
  {
    id: 'r8', num: 8, titre: 'Finances, statut et risques', court: 'Finances', page: 'Pages 9-10', comp: ['C6'],
    objectif: 'Prouver que le projet peut vivre : plan de financement équilibré, compte de résultat où vous vous payez, seuil de rentabilité en clients par jour, statut justifié et risques anticipés.',
    jury: [
      '« D’où viennent vos besoins ? » — ligne par ligne, avec les sources (devis, annonces, relevés).',
      '« Que se passe-t-il si votre CA baisse de 20 % ? » — situez-vous par rapport au seuil et donnez votre parade.',
      '« Expliquez-moi votre seuil de rentabilité. » — les 3 étapes avec VOS chiffres, puis la traduction en clients par jour.',
      '« Pourquoi ce statut juridique ? » — charges à déduire ? patrimoine et banque ? Deux phrases.'
    ],
    kawa: '<p><strong>Plan de financement :</strong> 45 000 € (travaux 15 000, matériel 12 000, dépôt 3 000, stock 2 000, frais de lancement 3 500, trésorerie 9 500), financés par 8 000 € d’apport, 10 000 € de prêt d’honneur et 27 000 € d’emprunt.</p><p><strong>Le calcul en HT change tout :</strong> avec un panier de 7 € TTC (6,36 € HT), le résultat n’est que de + 3 045 € et la marge de sécurité de 4 % : trop fragile. Lina construit une formule boisson + pâtisserie et porte son panier à <strong>7,50 € TTC</strong> (toujours dans le budget accepté) : CA de 122 727 € HT, résultat avant impôt + 11 227 €, point mort à <strong>52 clients par jour</strong> pour 60 prévus, soit <strong>14 % de marge de sécurité</strong>.</p><p><strong>Statut :</strong> EURL (investissements, emprunt, TVA à récupérer, responsabilité limitée).</p><p class="note">Constater, chiffrer, ajuster : c’est exactement le raisonnement que le jury veut entendre.</p>',
    pieges: [
      '<strong>Oublier la trésorerie de départ.</strong> Le jury vérifie cette ligne en premier.',
      '<strong>Confondre résultat et trésorerie.</strong> Un bénéfice annuel n’empêche pas un mois difficile.',
      '<strong>Oublier sa rémunération.</strong> « Et vous vivez de quoi ? »',
      '<strong>Compter le matériel ou le remboursement de l’emprunt en charges.</strong> Le matériel s’amortit ; seuls les intérêts sont une charge.',
      '<strong>Diviser par le mauvais taux.</strong> Seuil = charges fixes ÷ taux de marge sur coût variable (et non ÷ taux de charges variables).'
    ],
    fields: [
      { type: 'heading', label: 'Mon statut juridique (à choisir d’abord : il change le calcul des cotisations et de l’impôt)' },
      { type: 'select', id: 'statut', label: 'Le statut retenu', req: true, options: ['', 'Micro-entreprise', 'Entreprise individuelle au réel', 'EURL', 'SARL', 'SASU', 'SAS'],
        help: 'Pour comparer les statuts avec vos chiffres : simulateurs officiels sur mon-entreprise.urssaf.fr et comparatif sur bpifrance-creation.fr. Ici, l’EURL et la SARL sont calculées à l’impôt sur les sociétés.' },
      { type: 'finance', req: ['b_invest', 'b_treso', 'r_apport', 'taux_var', 'src_var', 'c_loyer', 'src_loyer', 'c_energie', 'c_assurance', 'c_compta', 'c_comm', 'remu_net', 'taux_cotis', 'bfr_stock_j', 'bfr_clients_j', 'bfr_fourn_j', 'croissance_a2', 'croissance_a3', 'mois_debut'] },
      { type: 'heading', label: 'Pourquoi ce statut' },
      { type: 'textarea', id: 'statut_justif', label: 'Pourquoi ce statut (deux phrases)', help: 'Ai-je des charges importantes à déduire ? Dois-je protéger mon patrimoine et rassurer la banque ?', req: true, rows: 3 },
      { type: 'grid', id: 'risques', label: 'Mes 5 risques et leurs parades', req: 5,
        rows: [ { id: 'r1', label: '1' }, { id: 'r2', label: '2' }, { id: 'r3', label: '3' }, { id: 'r4', label: '4' }, { id: 'r5', label: '5' } ],
        cols: [ { id: 'risque', label: 'Risque' }, { id: 'consequence', label: 'Conséquence' }, { id: 'parade', label: 'Parade' } ],
        hint: 'Le premier risque à traiter : « CA inférieur de 20 % au scénario prudent » — utilisez votre stress test.' },
      { type: 'textarea', id: 'conclusion', label: 'Ma conclusion', help: 'La marge de sécurité, et les 3 prochaines étapes si le projet se lançait demain.', req: true, rows: 3 }
    ]
  },

  /* ---------------------------------------------------------- 9 */
  {
    id: 'r9', num: 9, titre: 'Dossier final et oral', court: 'Dépôt & oral', page: 'Dépôt', comp: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
    objectif: 'Vérifier que vos chiffres sont identiques partout, préparer vos 10 minutes et l’entretien, puis déposer votre dossier en PDF.',
    jury: [
      'Le jury recoupe vos chiffres d’une page à l’autre dans la minute.',
      'Les 10 minutes servent à démontrer la démarche, pas à relire le dossier.',
      '« Je ne l’ai pas mesuré » est une réponse acceptable ; un chiffre inventé, jamais.'
    ],
    kawa: '<p>Le plan minuté ci-dessous est celui de Lina : réutilisez-le en remplaçant ses contenus par les vôtres. Elle a répété trois fois, chronométrée, avant l’oral blanc.</p>',
    pieges: [
      '<strong>Réciter le dossier.</strong> Le jury l’a lu.',
      '<strong>Exploser le chrono.</strong> 6 minutes = préparation insuffisante ; 14 minutes = incapacité à synthétiser.',
      '<strong>Le diaporama fleuve.</strong> 8 à 10 supports visuels, montrés au bon moment.',
      '<strong>Improviser une réponse chiffrée.</strong>'
    ],
    fields: [
      { type: 'coherence', id: 'coh', req: true },
      { type: 'heading', label: 'Mes 10 minutes de présentation' },
      { type: 'grid', id: 'oral', label: 'Mon plan minuté', help: 'Ce que je dis, et ce que je montre, à chaque instant.', req: 9,
        rows: [
          { id: 'b1', label: '0:00 – 0:30 · L’accroche et l’idée en une phrase' },
          { id: 'b2', label: '0:30 – 1:30 · L’origine, création ou reprise' },
          { id: 'b3', label: '1:30 – 3:00 · Le diagnostic en 3 chiffres' },
          { id: 'b4', label: '3:00 – 4:00 · Le positionnement' },
          { id: 'b5', label: '4:00 – 5:30 · Le modèle économique (Canvas)' },
          { id: 'b6', label: '5:30 – 7:00 · Le CA en 5 étapes et les scénarios' },
          { id: 'b7', label: '7:00 – 8:00 · Partenaires et RH' },
          { id: 'b8', label: '8:00 – 9:30 · Financement, résultat, seuil en clients par jour' },
          { id: 'b9', label: '9:30 – 10:00 · Conclusion et prochaines étapes' }
        ],
        cols: [ { id: 'dire', label: 'Ce que je dis (mots clés)', type: 'textarea' }, { id: 'support', label: 'Ce que je montre', opt: true } ] },
      { type: 'grid', id: 'questions', label: 'Les 20 questions du jury', help: 'Préparez une réponse courte à chacune. Au moins 15 pour avancer.', req: 15,
        rows: [
          { id: 'q1', label: 'Comment est née votre idée ? Pourquoi vous ?' },
          { id: 'q2', label: 'Avez-vous envisagé une reprise plutôt qu’une création ?' },
          { id: 'q3', label: 'Votre idée existe déjà : pourquoi cela marcherait quand même ?' },
          { id: 'q4', label: 'D’où tenez-vous cette information ? Quelles sont vos sources ?' },
          { id: 'q5', label: 'Quel facteur menace le plus votre projet, et que faites-vous contre ?' },
          { id: 'q6', label: 'Pourquoi cette note dans votre hexagone sectoriel ?' },
          { id: 'q7', label: 'Combien de réponses à votre questionnaire, et qui a répondu ?' },
          { id: 'q8', label: 'Que retenez-vous de votre étude de marché ?' },
          { id: 'q9', label: 'Cette faiblesse ne condamne-t-elle pas votre projet ?' },
          { id: 'q10', label: 'Pourquoi ce segment ? Et qui renoncez-vous à servir ?' },
          { id: 'q11', label: 'En quoi êtes-vous différent de votre principal concurrent ?' },
          { id: 'q12', label: 'Votre positionnement est-il cohérent avec votre diagnostic ?' },
          { id: 'q13', label: 'Quelle différence entre business model et business plan ?' },
          { id: 'q14', label: 'Comment gagnez-vous de l’argent, concrètement ?' },
          { id: 'q15', label: 'D’où sortent vos clients par jour ? Et si vous n’en faites que la moitié ?' },
          { id: 'q16', label: 'Pourquoi ce prix ?' },
          { id: 'q17', label: 'Vos partenaires couvrent-ils tous les besoins ? Les avez-vous contactés ?' },
          { id: 'q18', label: 'Comment ferez-vous si l’activité explose, ou si vous tombez malade ?' },
          { id: 'q19', label: 'Expliquez votre seuil de rentabilité. Et si le CA baisse de 20 % ?' },
          { id: 'q20', label: 'Pourquoi ce statut juridique ?' }
        ],
        cols: [ { id: 'reponse', label: 'Ma réponse', type: 'textarea' } ] },
      { type: 'check', id: 'repete', label: 'J’ai répété mes 10 minutes au moins trois fois, chronométré (objectif : 9 min 30).', req: true },
      { type: 'depot' }
    ]
  }
];

/* Libellés des 6 forces de l'hexagone sectoriel */
window.FORCES = [
  { id: 'intensite', label: 'Intensité concurrentielle' },
  { id: 'clients', label: 'Pouvoir des clients' },
  { id: 'fournisseurs', label: 'Pouvoir des fournisseurs' },
  { id: 'entrants', label: 'Menace des nouveaux entrants' },
  { id: 'substituts', label: 'Menace des substituts' },
  { id: 'etat', label: 'Rôle de l’État' }
];

/* Les 9 blocs du Business Model Canvas, dans la disposition classique */
window.CANVAS = [
  { id: 'partenaires', label: 'Partenaires clés', q: 'Qui m’aide à fonctionner ?', area: 'pa' },
  { id: 'activites', label: 'Activités clés', q: 'Que dois-je faire chaque jour ?', area: 'ac' },
  { id: 'ressources', label: 'Ressources clés', q: 'De quoi ai-je besoin ?', area: 'rc' },
  { id: 'valeur', label: 'Proposition de valeur', q: 'Quel bénéfice j’apporte au client ?', area: 'pv' },
  { id: 'relation', label: 'Relation client', q: 'Comment je fidélise ?', area: 'rl' },
  { id: 'canaux', label: 'Canaux', q: 'Comment je touche et je sers mes clients ?', area: 'cn' },
  { id: 'segments', label: 'Segments de clientèle', q: 'Pour qui ? (repris de la rubrique 4)', area: 'sc' },
  { id: 'couts', label: 'Structure de coûts', q: 'Mes coûts fixes et variables principaux', area: 'co' },
  { id: 'revenus', label: 'Flux de revenus', q: 'D’où vient l’argent ? (proportions, panier)', area: 're' }
];
