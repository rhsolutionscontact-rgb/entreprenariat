/* ============================================================
   Deuxième partie : calculs et blocs automatiques des modules A à I.
   Chaque fonction reçoit un contexte (données, outils de format,
   chiffres du dossier) et renvoie du HTML.
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- Repères officiels 2026 (à revoir chaque rentrée) ---------- */
  const REP = {
    microTaux: { vente: 12.3, services: 21.2, liberal: 25.6 },          // URSSAF, taux 2026
    microPlafond: { vente: 203100, services: 83600, liberal: 83600 },   // plafonds 2026-2028
    franchiseTva: { vente: 85000, services: 37500, liberal: 37500 },    // seuils 2026
    tns: 0.42,          // cotisations d'un indépendant ≈ 42 % du revenu net (ordre de grandeur)
    assimile: 0.82,     // cotisations d'un président de SAS ≈ 82 % du salaire net (ordre de grandeur)
    pfu: 0.314,         // flat tax sur les dividendes en 2026
    marqueBase: 190, marqueClasse: 40   // INPI, dépôt en ligne
  };

  function eurRaw(n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; }
  function msgs(x, alertes, ok) {
    return (alertes.length ? '<ul class="msgs">' + alertes.map(function (a) { return '<li class="warn">' + x.esc(a) + '</li>'; }).join('') + '</ul>' : '') +
      (ok.length ? '<ul class="msgs">' + ok.map(function (a) { return '<li class="ok">' + x.esc(a) + '</li>'; }).join('') + '</ul>' : '');
  }
  function moyenne(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }
  function blank(v) { return v === undefined || v === null || String(v).trim() === ''; }

  /* ---------- Droits d'enregistrement ---------- */
  function droits(prix, mode, forme, partsTotal, partsCedees) {
    if (prix <= 0) return { montant: 0, detail: '' };
    if (mode === 'Les parts ou actions de la société') {
      if (forme === 'SAS ou SASU (actions)') return { montant: prix * 0.001, detail: '0,1 % du prix (actions)' };
      const ab = partsTotal > 0 && partsCedees > 0 ? 23000 * Math.min(1, partsCedees / partsTotal) : 23000;
      return { montant: Math.max(0, prix - ab) * 0.03, detail: '3 % du prix après un abattement de ' + eurRaw(ab) + ' (parts sociales)' };
    }
    if (prix <= 23000) return { montant: 25, detail: 'droit fixe sous 23 000 €' };
    const m = (Math.min(prix, 200000) - 23000) * 0.03 + Math.max(0, prix - 200000) * 0.05;
    return { montant: m, detail: '3 % entre 23 000 et 200 000 €' + (prix > 200000 ? ', 5 % au-delà' : '') + ' (fonds de commerce)' };
  }

  /* ---------- B. Diagnostic : soldes de gestion ---------- */
  function sigData(x) {
    const p = x.data.p2 || {}, r2 = x.data.r2 || {};
    const g = p.sig || {}, h = r2.reprise_historique || {};
    const remuN = x.num(p.remu_normale);
    const rows = ['n3', 'n2', 'n1'].map(function (k, i) {
      const a = g[k] || {}, b = h[k] || {};
      const ca = !blank(a.ca) ? x.num(a.ca) : x.num(b.ca);
      const res = !blank(a.resultat) ? x.num(a.resultat) : (blank(b.resultat) ? null : x.num(b.resultat));
      const ebe = blank(a.ebe) ? null : x.num(a.ebe);
      return { label: ['Il y a 3 ans', 'Il y a 2 ans', 'Dernier exercice'][i], ca: ca, marge: blank(a.marge) ? null : x.num(a.marge), ebe: ebe,
        res: res, remu: x.num(a.remu), retraite: ebe === null ? null : ebe + x.num(a.remu) - remuN };
    });
    const avecCa = rows.filter(function (r) { return r.ca > 0; });
    const avecEbe = rows.filter(function (r) { return r.ebe !== null; });
    return { rows: rows, remuN: remuN, caMoy: moyenne(avecCa.map(function (r) { return r.ca; })),
      ebeMoy: moyenne(avecEbe.map(function (r) { return r.ebe; })), retraiteMoy: moyenne(avecEbe.map(function (r) { return r.retraite; })),
      nbEbe: avecEbe.length, tendance: avecCa.length >= 2 ? (avecCa[avecCa.length - 1].ca - avecCa[0].ca) / avecCa[0].ca : 0, nbCa: avecCa.length };
  }

  /* ---------- B. Valorisation ---------- */
  function valoData(x) {
    const p = x.data.p2 || {}, r2 = x.data.r2 || {};
    const s = sigData(x);
    const m = [];
    const bmin = x.num(r2.reprise_bareme_min), bmax = x.num(r2.reprise_bareme_max);
    if (s.caMoy > 0 && bmax > 0) m.push({ nom: 'Barème professionnel', min: s.caMoy * bmin / 100, max: s.caMoy * bmax / 100, detail: 'CA moyen ' + eurRaw(s.caMoy) + ' × ' + bmin + ' à ' + bmax + ' % (rubrique 2)' });
    const cmin = x.num(p.coef_min), cmax = x.num(p.coef_max);
    if (s.nbEbe && cmax > 0 && s.retraiteMoy > 0) m.push({ nom: 'Rentabilité (multiple d’EBE)', min: s.retraiteMoy * cmin, max: s.retraiteMoy * cmax, detail: 'EBE retraité moyen ' + eurRaw(s.retraiteMoy) + ' × ' + cmin + ' à ' + cmax });
    const parts = p.mode === 'Les parts ou actions de la société';
    const patri = parts ? x.num(p.actif_net) : x.num(p.materiel) + x.num(p.stock) + x.num(p.droit_bail);
    if (patri > 0) m.push({ nom: parts ? 'Patrimoniale (actif net corrigé)' : 'Patrimoniale (matériel, stock, droit au bail)', min: patri, max: patri, detail: parts ? 'Ce que possède la société moins ses dettes' : 'Valeur des éléments repris, sans la clientèle' });
    const lo = m.length ? Math.min.apply(null, m.map(function (v) { return v.min; })) : 0;
    const hi = m.length ? Math.max.apply(null, m.map(function (v) { return v.max; })) : 0;
    const centre = m.length ? moyenne(m.map(function (v) { return (v.min + v.max) / 2; })) : 0;
    return { methodes: m, lo: lo, hi: hi, centre: centre, demande: x.num(r2.reprise_prix), offre: x.num(p.prix_offre), sig: s };
  }

  /* ---------- D. Comparateur de statuts ---------- */
  const STATUTS = [
    { id: 'micro', nom: 'Micro-entreprise', plusieurs: null, scores: { simplicite: 2, charges: 0, social: 0, associes: 0, image: 0 }, resp: 'Patrimoine personnel protégé (sauf fraude)', social: 'Indépendant, cotisations sur le CA', formalites: 'Gratuites, en ligne' },
    { id: 'ei', nom: 'Entreprise individuelle au réel', plusieurs: null, scores: { simplicite: 1, charges: 2, social: 1, associes: 0, image: 1 }, resp: 'Patrimoine personnel protégé (sauf fraude)', social: 'Indépendant (TNS)', formalites: 'Gratuites, comptabilité complète' },
    { id: 'eurl', nom: 'EURL', plusieurs: 'SARL', scores: { simplicite: 1, charges: 2, social: 1, associes: 1, image: 2 }, resp: 'Limitée aux apports', social: 'Gérant majoritaire : indépendant (TNS)', formalites: 'Statuts, capital, annonce légale (≈ 250 à 400 €)' },
    { id: 'sasu', nom: 'SASU', plusieurs: 'SAS', scores: { simplicite: 0, charges: 2, social: 2, associes: 2, image: 2 }, resp: 'Limitée aux apports', social: 'Président : assimilé salarié', formalites: 'Statuts, capital, annonce légale (≈ 250 à 400 €)' }
  ];
  const POIDS = { 'Peu important': 1, 'Important': 2, 'Essentiel': 3 };

  function statutsData(x) {
    const p = x.data.p4 || {};
    const f = x.fin();
    const act = p.activite || 'vente';
    const caT = f.caTotal || 0;
    const B = caT > 0 ? f.resultat + f.remu : 0;   // bénéfice avant la rémunération du dirigeant
    const isB = B > 0 ? Math.min(B, 42500) * 0.15 + Math.max(0, B - 42500) * 0.25 : 0;
    const microCot = caT * REP.microTaux[act] / 100;
    const nets = {
      micro: B - microCot,
      ei: B > 0 ? B / (1 + REP.tns) : B,
      eurl: B > 0 ? B / (1 + REP.tns) : B,
      sasu: B > 0 ? B / (1 + REP.assimile) : B,
      sasuDiv: B > 0 ? (B - isB) * (1 - REP.pfu) : 0
    };
    const plusieurs = p.seul === 'À plusieurs';
    const microImpossible = caT > REP.microPlafond[act];
    const ordre = ['micro', 'ei', 'eurl', 'sasu'].filter(function (id) { return !(plusieurs && (id === 'micro' || id === 'ei')) && !(id === 'micro' && microImpossible); })
      .sort(function (a, b) { return nets[b] - nets[a]; });
    const crit = p.criteres || {};
    const scores = STATUTS.map(function (s) {
      let total = 0, max = 0;
      ['simplicite', 'charges', 'social', 'associes', 'image', 'revenu'].forEach(function (k) {
        const w = POIDS[(crit[k] || {}).importance] || 0;
        if (!w) return;
        let sc = k === 'revenu' ? (caT > 0 ? (ordre.indexOf(s.id) === 0 ? 2 : (ordre.indexOf(s.id) === ordre.length - 1 ? 0 : 1)) : 1) : s.scores[k];
        if (k === 'associes' && !plusieurs) sc = 1;
        total += w * sc; max += w * 2;
      });
      const possible = !(plusieurs && !s.plusieurs) && !(s.id === 'micro' && microImpossible);
      return { s: s, nom: plusieurs && s.plusieurs ? s.plusieurs : s.nom, total: total, max: max, possible: possible };
    });
    return { f: f, act: act, caT: caT, B: B, isB: isB, microCot: microCot, nets: nets, plusieurs: plusieurs, microImpossible: microImpossible, scores: scores, crit: crit };
  }

  /* ---------- F. Rétroplanning ---------- */
  const TACHES = [
    { id: 'dossier', t: 'Finaliser le dossier et le prévisionnel', w: 26 },
    { id: 'reseau', t: 'Rencontrer un réseau d’accompagnement (CCI, CMA, BGE, Initiative)', w: 24 },
    { id: 'local1', t: 'Visiter des locaux et négocier le bail', w: 22, si: 'c_local' },
    { id: 'honneur', t: 'Passer en comité de prêt d’honneur', w: 20, si: 'c_honneur' },
    { id: 'banques', t: 'Présenter le dossier à trois banques', w: 18, si: 'c_emprunt' },
    { id: 'marque', t: 'Vérifier et déposer la marque à l’INPI', w: 16, si: 'c_marque' },
    { id: 'pret', t: 'Obtenir l’accord de prêt', w: 14, si: 'c_emprunt' },
    { id: 'bail', t: 'Signer le bail (après l’accord de prêt)', w: 14, si: 'c_local' },
    { id: 'devis', t: 'Obtenir les devis et lancer les travaux', w: 12, si: 'c_travaux' },
    { id: 'licence', t: 'Suivre la formation obligatoire, obtenir la licence ou l’autorisation', w: 10, si: 'c_licence' },
    { id: 'statuts', t: 'Rédiger les statuts et déposer le capital', w: 10, si: 'c_societe' },
    { id: 'immat', t: 'Immatriculer l’entreprise sur le guichet unique', w: 8 },
    { id: 'compte', t: 'Ouvrir le compte bancaire professionnel', w: 8 },
    { id: 'materiel', t: 'Commander le matériel', w: 8 },
    { id: 'offre', t: 'Publier l’offre d’emploi', w: 8, si: 'c_recrute' },
    { id: 'reseaux', t: 'Créer la fiche Google et les comptes sur les réseaux', w: 6 },
    { id: 'assurance', t: 'Souscrire les assurances', w: 4 },
    { id: 'mairie', t: 'Autorisations de la mairie (enseigne, terrasse)', w: 6, si: 'c_travaux' },
    { id: 'fintravaux', t: 'Réception des travaux, contrôle de sécurité si nécessaire', w: 3, si: 'c_travaux' },
    { id: 'embauche', t: 'Recruter et déclarer l’embauche (DPAE)', w: 3, si: 'c_recrute' },
    { id: 'com', t: 'Lancer la communication d’ouverture', w: 3 },
    { id: 'stock', t: 'Commander le stock de départ, installer la caisse', w: 2 },
    { id: 'test', t: 'Ouverture test avec des proches', w: 1 },
    { id: 'jourj', t: 'Ouverture', w: 0 },
    { id: 'acre', t: 'Demander l’Acre si j’y ai droit (60 jours maximum)', w: -4 },
    { id: 'bilan1', t: 'Premier point sur le tableau de bord', w: -4 }
  ];
  function retroData(x) {
    const p = x.data.p6 || {};
    if (!p.ouverture) return null;
    const ouv = new Date(p.ouverture + 'T12:00:00');
    if (isNaN(ouv)) return null;
    const today = x.today || new Date();
    const fait = p.fait || {};
    const list = TACHES.filter(function (t) { return !t.si || p[t.si] === true; }).map(function (t) {
      const d = new Date(ouv.getTime() - t.w * 7 * 86400000);
      const done = fait[t.id] === true;
      return { id: t.id, t: t.t, date: d, done: done, retard: !done && d < today && t.w > 0, jourj: t.w === 0 };
    }).sort(function (a, b) { return a.date - b.date; });
    const debut = list.length ? list[0].date : ouv;
    return { list: list, ouv: ouv, debut: debut, retards: list.filter(function (t) { return t.retard; }).length, faits: list.filter(function (t) { return t.done; }).length, today: today };
  }

  /* ---------- H. Objectifs du tableau de bord ---------- */
  function objectifsData(x) {
    const c = x.ca(), f = x.fin();
    if (!f.CA) return null;
    const r6 = x.data.r6 || {};
    let minTreso = null;
    try { minTreso = x.prev().minSolde; } catch (e) { minTreso = null; }
    return {
      clients: c.sc.prudent.clients, seuil: f.seuilClients, panierTTC: x.num(r6.panier_ttc), panierHT: c.panierHT, jours: c.jours, tva: c.tva,
      caMois: f.CA / 12, marge: f.tmcv, fixesMois: f.fixes / 12, minTreso: minTreso, loyerPart: f.CA > 0 ? x.num((x.data.r8 || {}).c_loyer) / f.CA : 0
    };
  }

  /* ================= Rendus ================= */
  const R = {};

  R.profil = function (x) {
    const g = (x.data.p1 || {}).competences || {};
    const lab = { metier: 'Métier', vente: 'Vente', gestion: 'Gestion', management: 'Management', communication: 'Communication', admin: 'Administratif' };
    const ids = Object.keys(lab);
    const notes = ids.map(function (k) { const n = parseInt(((g[k] || {}).niveau || '0'), 10) || 0; return { k: k, n: n, sol: (g[k] || {}).solution }; });
    if (!notes.some(function (v) { return v.n; })) return '<p class="muted">Votre profil s’affiche ici dès que vous indiquez vos niveaux.</p>';
    const manques = notes.filter(function (v) { return v.n > 0 && v.n <= 2 && blank(v.sol); });
    return '<h4>Mon profil en un coup d’œil</h4><div class="bars">' + notes.map(function (v) {
      return '<div class="bar-row"><span class="bar-lab">' + lab[v.k] + '</span><span class="bar-track"><span class="bar-fill lv' + v.n + '" style="width:' + (v.n * 25) + '%"></span></span><span class="bar-val">' + (v.n || '–') + '/4</span></div>';
    }).join('') + '</div>' +
      msgs(x, manques.map(function (v) { return lab[v.k] + ' : niveau ' + v.n + ' sans solution. Indiquez comment vous compensez (formation, associé, prestataire).'; }),
        manques.length ? [] : ['Chaque manque identifié a sa solution : c’est ce qu’un financeur veut voir.']);
  };

  R.sig = function (x) {
    const s = sigData(x);
    if (!s.nbCa && !s.nbEbe) return '<p class="muted">Le diagnostic s’affiche ici dès que vous saisissez les chiffres des exercices.</p>';
    const al = [], ok = [];
    const fmt = function (v) { return v === null || v === undefined ? '–' : x.eur(v); };
    const pctOf = function (a, b) { return a !== null && b > 0 ? x.pct(a / b) : '–'; };
    let h = '<h4>Mon diagnostic chiffré</h4><div class="table-wrap"><table class="result"><thead><tr><th></th><th class="num">CA HT</th><th class="num">Taux de marge</th><th class="num">EBE</th><th class="num">EBE / CA</th><th class="num">EBE retraité</th></tr></thead><tbody>' +
      s.rows.map(function (r) { return '<tr><td>' + r.label + '</td><td class="num">' + (r.ca ? x.eur(r.ca) : '–') + '</td><td class="num">' + pctOf(r.marge, r.ca) + '</td><td class="num">' + fmt(r.ebe) + '</td><td class="num">' + pctOf(r.ebe, r.ca) + '</td><td class="num">' + fmt(r.retraite) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Moyenne</td><td class="num">' + (s.caMoy ? x.eur(s.caMoy) : '–') + '</td><td></td><td class="num">' + (s.nbEbe ? x.eur(s.ebeMoy) : '–') + '</td><td></td><td class="num">' + (s.nbEbe ? x.eur(s.retraiteMoy) : '–') + '</td></tr></tbody></table></div>' +
      '<p class="help">EBE retraité = EBE + rémunération que se versait le cédant − rémunération dont vous avez besoin (' + x.eur(s.remuN) + '). C’est ce qui reste pour rembourser l’emprunt et investir.</p>';
    if (s.nbCa >= 2) { if (s.tendance < -0.05) al.push('Le CA baisse de ' + x.pct(-s.tendance) + ' sur la période : expliquez pourquoi et ce que vous changerez.'); else ok.push('CA ' + (s.tendance >= 0 ? 'en hausse de ' : 'stable (') + x.pct(Math.abs(s.tendance)) + (s.tendance >= 0 ? '' : ')') + ' sur la période.'); }
    if (s.nbEbe) {
      if (s.retraiteMoy <= 0) al.push('Après votre propre rémunération, l’affaire ne dégage plus rien : elle ne peut pas rembourser un emprunt.');
      else ok.push('Il reste en moyenne ' + x.eur(s.retraiteMoy) + ' par an après votre rémunération.');
      if (!s.remuN) al.push('Indiquez la rémunération dont vous avez besoin : sans elle, l’EBE retraité est surestimé.');
    }
    return h + msgs(x, al, ok);
  };

  R.valo = function (x) {
    const v = valoData(x);
    if (!v.methodes.length) return '<p class="muted">L’évaluation s’affiche ici : renseignez le barème (rubrique 2), les EBE et les multiples, ou la valeur des éléments repris.</p>';
    const al = [], ok = [];
    let h = '<h4>Ce que vaut l’affaire</h4><div class="table-wrap"><table class="result"><thead><tr><th>Méthode</th><th>Calcul</th><th class="num">Valeur</th></tr></thead><tbody>' +
      v.methodes.map(function (m) { return '<tr><td>' + x.esc(m.nom) + '</td><td class="small">' + x.esc(m.detail) + '</td><td class="num">' + (m.min === m.max ? x.eur(m.min) : x.eur(m.min) + ' à ' + x.eur(m.max)) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Fourchette</td><td class="small">De la valeur la plus basse à la plus haute</td><td class="num">' + x.eur(v.lo) + ' à ' + x.eur(v.hi) + '</td></tr>' +
      '<tr><td>Valeur centrale</td><td class="small">Moyenne des méthodes</td><td class="num"><strong>' + x.eur(v.centre) + '</strong></td></tr></tbody></table></div>';
    if (v.hi > v.lo) {
      const pos = function (n) { return Math.max(0, Math.min(100, (n - v.lo) / (v.hi - v.lo) * 100)); };
      h += '<div class="gauge"><span class="gauge-track"></span>' + (v.demande ? '<span class="gauge-mark ask" style="left:' + pos(v.demande) + '%" title="Prix demandé"><b>Demandé</b></span>' : '') + (v.offre ? '<span class="gauge-mark offer" style="left:' + pos(v.offre) + '%" title="Mon offre"><b>Mon offre</b></span>' : '') + '<span class="gauge-lo">' + x.eur(v.lo) + '</span><span class="gauge-hi">' + x.eur(v.hi) + '</span></div>';
    }
    if (v.demande) {
      if (v.demande > v.hi) al.push('Le prix demandé (' + x.eur(v.demande) + ') dépasse toutes vos méthodes : négociez, ou renoncez.');
      else if (v.demande > v.centre) al.push('Le prix demandé est au-dessus de la valeur centrale : votre offre peut viser autour de ' + x.eur(v.centre) + '.');
      else ok.push('Le prix demandé est sous la valeur centrale : vérifiez pourquoi (bail court, travaux, clientèle en baisse ?).');
    }
    if (v.offre && v.offre > v.hi) al.push('Votre offre dépasse la fourchette : le banquier vous demandera de la justifier.');
    return h + msgs(x, al, ok);
  };

  R.montage = function (x) {
    const p = x.data.p2 || {};
    const prix = x.num(p.prix_offre);
    if (!prix) return '<p class="muted">Le coût total s’affiche ici dès que vous indiquez le prix que vous proposez.</p>';
    const dr = droits(prix, p.mode, p.forme, x.num(p.parts_total), x.num(p.parts_cedees));
    const lignes = [['Prix proposé', prix], ['Droits d’enregistrement : ' + dr.detail, dr.montant], ['Honoraires', x.num(p.honoraires)], ['Travaux et mises aux normes', x.num(p.travaux)], ['Trésorerie de départ', x.num(p.treso)]];
    const besoin = lignes.reduce(function (s, l) { return s + l[1]; }, 0);
    const fi = p.financement || {};
    const res = ['apport', 'honneur', 'banque', 'vendeur', 'autre'].reduce(function (s, k) { return s + x.num((fi[k] || {}).montant); }, 0);
    const banque = x.num((fi.banque || {}).montant);
    const ann = x.annuite(banque, p.taux, p.duree);
    const s = sigData(x);
    const fp = x.num((fi.apport || {}).montant) + x.num((fi.honneur || {}).montant);
    const al = [], ok = [];
    let h = '<h4>Le coût total de la reprise</h4><div class="table-wrap"><table class="result"><tbody>' + lignes.map(function (l) { return '<tr><td>' + x.esc(l[0]) + '</td><td class="num">' + x.eur(l[1]) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Besoin total</td><td class="num">' + x.eur(besoin) + '</td></tr><tr><td>Ressources prévues</td><td class="num">' + x.eur(res) + '</td></tr></tbody></table></div>';
    if (Math.abs(besoin - res) < 1) ok.push('Le montage est équilibré.'); else al.push(besoin > res ? 'Il manque ' + x.eur(besoin - res) + ' de ressources.' : 'Vos ressources dépassent le besoin de ' + x.eur(res - besoin) + '.');
    if (besoin > 0) { const part = fp / besoin; if (part >= 0.3) ok.push('Apport et prêt d’honneur = ' + x.pct(part) + ' du besoin.'); else al.push('Apport et prêt d’honneur = ' + x.pct(part) + ' du besoin : une banque attend en général environ 30 %.'); }
    if (banque > 0 && !(x.num(p.taux) >= 0 && x.num(p.duree) > 0)) al.push('Indiquez le taux et la durée du prêt bancaire.');
    if (ann > 0) {
      h += '<p>Annuité du prêt bancaire : <strong>' + x.eur(ann) + '</strong> par an.' + (s.nbEbe ? ' EBE retraité moyen : <strong>' + x.eur(s.retraiteMoy) + '</strong>.' : '') + '</p>';
      if (s.nbEbe) {
        if (s.retraiteMoy <= ann) al.push('L’EBE retraité ne couvre pas l’annuité : la reprise n’est pas finançable en l’état.');
        else if (ann > s.retraiteMoy * 0.5) al.push('L’annuité absorbe ' + x.pct(ann / s.retraiteMoy) + ' de l’EBE retraité : peu de marge en cas de baisse. Repère courant : rester sous la moitié.');
        else ok.push('L’annuité représente ' + x.pct(ann / s.retraiteMoy) + ' de l’EBE retraité : il reste de la marge.');
      }
    }
    if (x.num((fi.vendeur || {}).montant) > 0) ok.push('Le crédit vendeur montre que le cédant croit en son affaire : la banque l’apprécie.');
    return h + msgs(x, al, ok) + '<p class="muted small">Reportez ces montants dans la rubrique 8 (le prix du fonds dans « fonds de commerce », le prêt dans les ressources) pour que tout votre dossier soit cohérent.</p>';
  };

  R.marque = function (x) {
    const p = x.data.p3 || {};
    if (p.depot !== 'Je dépose la marque à l’INPI') return '<p class="muted small">Le dépôt en ligne à l’INPI coûte ' + REP.marqueBase + ' € pour une classe, puis ' + REP.marqueClasse + ' € par classe supplémentaire ; la marque est protégée 10 ans, renouvelables. <a href="https://www.inpi.fr/proteger-vos-creations/proteger-votre-marque" target="_blank" rel="noopener">INPI : protéger votre marque</a></p>';
    const n = Math.max(1, x.num(p.classes) || 1);
    const cout = REP.marqueBase + REP.marqueClasse * (n - 1);
    return '<p>Coût du dépôt en ligne : ' + REP.marqueBase + ' €' + (n > 1 ? ' + ' + (n - 1) + ' × ' + REP.marqueClasse + ' €' : '') + ' = <strong>' + x.eur(cout) + '</strong>, pour une protection de 10 ans en France. Ajoutez-le aux frais de lancement (rubrique 8).</p><p class="muted small">Source : <a href="https://www.inpi.fr/proteger-vos-creations/proteger-votre-marque" target="_blank" rel="noopener">INPI</a>.</p>';
  };

  R.statuts = function (x) {
    const d = statutsData(x);
    const al = [], ok = [];
    let h = '<h4>Le comparatif</h4>';
    const nomDe = function (sc) { return sc.nom; };
    if (d.caT > 0) {
      const ligne = function (nom, net, note, imp) { return '<tr' + (imp ? ' class="off"' : '') + '><td>' + nom + '</td><td class="num">' + (imp ? '<span class="muted">impossible</span>' : x.eur(net)) + '</td><td class="small">' + note + '</td></tr>'; };
      h += '<p>Bénéfice avant votre rémunération (rubrique 8) : <strong>' + x.eur(d.B) + '</strong>. Voici ce qu’il vous resterait pour vivre, avant l’impôt sur le revenu :</p><div class="table-wrap"><table class="result"><thead><tr><th>Statut</th><th class="num">Revenu net estimé par an</th><th>Comment</th></tr></thead><tbody>' +
        ligne('Micro-entreprise', d.nets.micro, 'Cotisations de ' + REP.microTaux[d.act].toLocaleString('fr-FR') + ' % sur le CA (' + x.eur(d.microCot) + '), aucune charge déductible', d.plusieurs || d.microImpossible) +
        ligne('Entreprise individuelle au réel', d.nets.ei, 'Cotisations d’indépendant ≈ ' + Math.round(REP.tns * 100) + ' % du revenu net', d.plusieurs) +
        ligne(d.plusieurs ? 'SARL (gérant majoritaire)' : 'EURL (gérant)', d.nets.eurl, 'Tout le bénéfice versé en rémunération ; vous pouvez aussi en laisser dans la société (impôt de 15 %)', false) +
        ligne(d.plusieurs ? 'SAS (président salarié)' : 'SASU (président salarié)', d.nets.sasu, 'Cotisations d’assimilé salarié ≈ ' + Math.round(REP.assimile * 100) + ' % du salaire net, meilleure protection sociale', false) +
        ligne(d.plusieurs ? 'SAS (dividendes seuls)' : 'SASU (dividendes seuls)', d.nets.sasuDiv, 'Impôt sur les sociétés puis flat tax de ' + (REP.pfu * 100).toLocaleString('fr-FR') + ' % ; aucune cotisation, donc aucune protection sociale', false) +
        '</tbody></table></div><p class="muted small">Ordres de grandeur pour comparer, pas des montants exacts : vérifiez avec le <a href="https://mon-entreprise.urssaf.fr/simulateurs/comparaison-statuts" target="_blank" rel="noopener">comparateur de statuts de l’URSSAF</a>.</p>';
      if (d.microImpossible) al.push('Votre CA (' + x.eur(d.caT) + ') dépasse le plafond de la micro-entreprise (' + x.eur(REP.microPlafond[d.act]) + ') : ce régime est impossible.');
      else if (d.caT > REP.franchiseTva[d.act]) al.push('En micro-entreprise, votre CA dépasserait le seuil de franchise de TVA (' + x.eur(REP.franchiseTva[d.act]) + ') : vous factureriez la TVA.');
      if (d.caT > 0 && d.B < d.caT * 0.5 && !d.microImpossible && !d.plusieurs) al.push('Vos charges représentent plus de la moitié de votre CA : la micro-entreprise vous ferait payer des cotisations sur des sommes que vous ne gagnez pas.');
    } else h += '<p class="muted">Complétez les rubriques 6 et 8 pour voir le revenu estimé selon chaque statut.</p>';
    const nbCrit = Object.keys(d.crit).filter(function (k) { return POIDS[(d.crit[k] || {}).importance]; }).length;
    if (nbCrit) {
      const tri = d.scores.slice().sort(function (a, b) { return (b.possible - a.possible) || (b.total / (b.max || 1) - a.total / (a.max || 1)); });
      h += '<h4>Selon vos priorités</h4><div class="bars">' + tri.map(function (sc) {
        const v = sc.max ? Math.round(sc.total / sc.max * 100) : 0;
        return '<div class="bar-row' + (sc.possible ? '' : ' off') + '"><span class="bar-lab">' + x.esc(nomDe(sc)) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + (sc.possible ? v : 0) + '%"></span></span><span class="bar-val">' + (sc.possible ? v + ' %' : '–') + '</span></div>';
      }).join('') + '</div>';
      const best = tri.find(function (sc) { return sc.possible; });
      if (best) ok.push('Le statut le plus proche de vos priorités : ' + nomDe(best) + '. C’est une piste, pas une décision : le choix vous revient.');
    }
    const r8s = (x.data.r8 || {}).statut;
    if (r8s) ok.push('Statut retenu dans la rubrique 8 : ' + r8s + '. Vérifiez qu’il correspond à votre choix ci-dessous.');
    h += '<details class="mini-disc"><summary>Responsabilité, protection sociale, formalités</summary><div class="table-wrap"><table class="result"><thead><tr><th>Statut</th><th>Responsabilité</th><th>Protection sociale</th><th>Création</th></tr></thead><tbody>' +
      STATUTS.map(function (s) { return '<tr><td>' + x.esc(d.plusieurs && s.plusieurs ? s.plusieurs : s.nom) + '</td><td class="small">' + x.esc(s.resp) + '</td><td class="small">' + x.esc(s.social) + '</td><td class="small">' + x.esc(s.formalites) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="muted small">Source : <a href="https://bpifrance-creation.fr/encyclopedie/structures-juridiques/entreprendre-seul/comparatif-structures-unipersonnelles" target="_blank" rel="noopener">Bpifrance Création, comparatif des statuts</a>.</p></details>';
    return h + msgs(x, al, ok);
  };

  R.local = function (x) {
    const f = x.fin();
    const r8 = x.data.r8 || {};
    const loyer = x.num(r8.c_loyer);
    const v = ((x.data.p5 || {}).visites || []).filter(function (l) { return x.num(l.surface) > 0 && x.num(l.loyer) > 0; });
    let h = '';
    if (v.length) h += '<p>Loyer au m² des locaux étudiés : ' + v.map(function (l) { return '<strong>' + (x.num(l.loyer) * 12 / x.num(l.surface)).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €</strong> par m² et par an (' + x.esc(l.adresse || 'local') + ')'; }).join(' ; ') + '.</p>';
    if (!loyer || !f.CA) return h + '<p class="muted small">Le poids du loyer dans votre CA s’affiche quand les rubriques 6 et 8 sont remplies.</p>';
    const part = loyer / f.CA;
    const al = [], ok = [];
    if (part > 0.15) al.push('Votre loyer représente ' + x.pct(part) + ' de votre CA prudent : c’est lourd. Justifiez-le par le flux de l’emplacement ou négociez.');
    else if (part > 0.10) al.push('Votre loyer représente ' + x.pct(part) + ' de votre CA prudent : c’est élevé, à justifier par l’emplacement.');
    else ok.push('Votre loyer représente ' + x.pct(part) + ' de votre CA prudent.');
    return h + '<p>Loyer annuel de la rubrique 8 : <strong>' + x.eur(loyer) + '</strong>.</p>' + msgs(x, al, ok) + '<p class="muted small">Repère courant pour un commerce de proximité : un loyer autour de 10 % du CA ou moins. Il varie selon l’activité et l’emplacement.</p>';
  };

  R.assurances = function (x) {
    const a = (x.data.p5 || {}).assurances || {};
    const tot = Object.keys(a).reduce(function (s, k) { return s + x.num((a[k] || {}).prime); }, 0);
    if (!tot) return '';
    const fin = x.num((x.data.r8 || {}).c_assurance);
    const al = [], ok = [];
    if (fin && Math.abs(fin - tot) > 1) al.push('Total de vos primes : ' + x.eur(tot) + ' par an, mais ' + x.eur(fin) + ' dans la rubrique 8. Mettez le même montant.');
    else if (fin) ok.push('Le total de vos primes correspond à la rubrique 8.');
    return '<p>Total de mes primes : <strong>' + x.eur(tot) + '</strong> par an.</p>' + msgs(x, al, ok);
  };

  R.retro = function (x) {
    const d = retroData(x);
    if (!d) return '<p class="muted">Indiquez votre date d’ouverture : le planning se calcule automatiquement.</p>';
    const fmt = function (dt) { return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); };
    const semaines = Math.round((d.ouv - d.today) / (7 * 86400000));
    let h = '<h4>Mon planning</h4><p>' + (semaines > 0 ? 'Ouverture dans <strong>' + semaines + ' semaine' + (semaines > 1 ? 's' : '') + '</strong>' : (semaines === 0 ? 'Ouverture <strong>cette semaine</strong>' : 'Date d’ouverture passée')) + ' · ' + d.faits + ' tâche' + (d.faits > 1 ? 's' : '') + ' faite' + (d.faits > 1 ? 's' : '') + ' sur ' + d.list.length + (d.retards ? ' · <span class="retard-txt">' + d.retards + ' en retard</span>' : '') + '</p><ol class="retro">';
    let mois = '';
    d.list.forEach(function (t) {
      const m = t.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      if (m !== mois) { h += '<li class="retro-mois">' + m.charAt(0).toUpperCase() + m.slice(1) + '</li>'; mois = m; }
      h += '<li class="retro-t' + (t.done ? ' fait' : '') + (t.retard ? ' retard' : '') + (t.jourj ? ' jourj' : '') + '"><label><input type="checkbox" data-path="p6|fait|' + t.id + '"' + (t.done ? ' checked' : '') + x.ro + '><span class="retro-date">' + fmt(t.date) + '</span><span class="retro-txt">' + x.esc(t.t) + '</span></label></li>';
    });
    h += '</ol>';
    if (semaines > 0 && d.debut < d.today) h += '<ul class="msgs"><li class="warn">Votre date d’ouverture laisse moins de 6 mois de préparation : certaines tâches sont déjà en retard. Reculez la date ou faites plusieurs démarches en parallèle.</li></ul>';
    return h;
  };

  R.com = function (x) {
    const b = (x.data.p7 || {}).budget || [];
    const tot = b.reduce(function (s, l) { return s + x.num(l.cout); }, 0);
    if (!tot) return '';
    const fin = x.num((x.data.r8 || {}).c_comm);
    const plan = x.planActions();
    const al = [], ok = [];
    if (fin && Math.abs(fin - tot) > 1) al.push('Rubrique 8 : ' + x.eur(fin) + ' de communication par an. Ici : ' + x.eur(tot) + '. Mettez le même montant.');
    else if (fin) ok.push('Même budget que dans la rubrique 8.');
    if (plan && Math.abs(plan - tot) > 1) al.push('Votre plan d’actions de la rubrique 6 totalise ' + x.eur(plan) + '.');
    return msgs(x, al, ok);
  };

  R.objectifs = function (x) {
    const o = objectifsData(x);
    if (!o) return '<div class="callout">Les objectifs se calculent à partir des rubriques 6 et 8 : complétez-les d’abord.</div>';
    const k = function (label, val, sub) { return '<div class="kpi"><span class="kpi-label">' + label + '</span><span class="kpi-val">' + val + '</span>' + (sub ? '<span class="kpi-sub">' + sub + '</span>' : '') + '</div>'; };
    return '<h4>Mes objectifs (feu vert), tirés de mon dossier</h4><div class="kpis">' +
      k('Clients par jour', o.clients.toLocaleString('fr-FR', { maximumFractionDigits: 0 }), 'seuil de rentabilité : ' + o.seuil) +
      k('Panier moyen', x.eur(o.panierTTC || o.panierHT * (1 + o.tva / 100), 2) + ' TTC', x.eur(o.panierHT, 2) + ' HT') +
      k('CA par mois', x.eur(o.caMois) + ' HT', 'moyenne sur l’année') +
      k('Taux de marge', x.pct(o.marge), 'marge sur coût variable') +
      k('Charges fixes', x.eur(o.fixesMois) + ' par mois', 'à couvrir chaque mois') +
      (o.minTreso !== null ? k('Trésorerie', 'mini ' + x.eur(o.minTreso), 'point bas prévu en année 1') : '') +
      '</div>';
  };

  R.feux = function (x) {
    const o = objectifsData(x);
    const t = (x.data.p8 || {}).test || {};
    const ind = (x.data.p8 || {}).indicateurs || {};
    const rows = ['m1', 'm2', 'm3'].filter(function (m) { const r = t[m] || {}; return !blank(r.clients) || !blank(r.treso); });
    if (!rows.length) return '';
    if (!o) return '<p class="muted">Complétez les rubriques 6 et 8 pour tester vos feux.</p>';
    const alerteCl = x.num((ind.clients || {}).alerte) || o.seuil;
    const alerteTr = blank((ind.treso || {}).alerte) ? 0 : x.num(ind.treso.alerte);
    const feu = function (v, vert, rouge) { return v >= vert ? 'vert' : (v >= rouge ? 'orange' : 'rouge'); };
    return '<div class="table-wrap"><table class="result"><thead><tr><th></th><th class="num">Clients par jour</th><th class="num">CA estimé du mois</th><th class="num">Trésorerie</th></tr></thead><tbody>' +
      rows.map(function (m) {
        const r = t[m];
        const cl = x.num(r.clients), pan = x.num(r.panier) || o.panierTTC;
        const caM = cl * pan / (1 + o.tva / 100) * o.jours / 12;
        const fc = feu(cl, o.clients, alerteCl), fca = feu(caM, o.caMois, o.caMois * alerteCl / (o.clients || 1));
        const ft = blank(r.treso) ? '' : (x.num(r.treso) < alerteTr ? 'rouge' : (x.num(r.treso) < alerteTr * 1.5 ? 'orange' : 'vert'));
        return '<tr><td>' + { m1: 'Mois 1', m2: 'Mois 2', m3: 'Mois 3' }[m] + '</td><td class="num"><span class="feu ' + fc + '"></span>' + cl.toLocaleString('fr-FR') + '</td><td class="num"><span class="feu ' + fca + '"></span>' + x.eur(caM) + '</td><td class="num">' + (ft ? '<span class="feu ' + ft + '"></span>' + x.eur(x.num(r.treso)) : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="muted small">Vert : objectif atteint · orange : entre l’objectif et votre feu rouge · rouge : votre feu rouge est franchi (' + alerteCl + ' clients par jour' + (alerteTr ? ', ' + x.eur(alerteTr) + ' de trésorerie' : '') + ').</p>';
  };

  R.banquier = function (x) {
    const f = x.fin();
    const p = x.data.p9 || {};
    const al = [], ok = [];
    if (f.CA) {
      const emp = f.ressources.emprunt;
      if (x.num(p.montant) && emp && Math.abs(x.num(p.montant) - emp) > 1) al.push('Vous demandez ' + x.eur(x.num(p.montant)) + ' mais votre plan de financement (rubrique 8) prévoit ' + x.eur(emp) + ' d’emprunt.');
      if (f.partFP >= 0.3) ok.push('Apport, prêt d’honneur et aides : ' + x.pct(f.partFP) + ' des besoins.'); else al.push('Apport, prêt d’honneur et aides : ' + x.pct(f.partFP) + ' des besoins. Les banques attendent en général environ 30 %.');
      if (f.annuite > 0) { if (f.ratioCaf >= 1.2) ok.push('La CAF couvre ' + f.ratioCaf.toFixed(1).replace('.', ',') + ' fois l’annuité.'); else al.push('La CAF ne couvre que ' + f.ratioCaf.toFixed(1).replace('.', ',') + ' fois l’annuité : visez au moins 1,2.'); }
      if (f.margeSecu > 0.1) ok.push('Marge de sécurité de ' + x.pct(f.margeSecu) + '.'); else al.push('Marge de sécurité de ' + x.pct(f.margeSecu) + ' : le banquier la trouvera trop faible.');
    } else al.push('Complétez les rubriques 6 et 8 : le dossier banquier reprend vos chiffres.');
    return '<h4>Ce que le banquier regardera en premier</h4>' + msgs(x, al, ok) +
      '<div class="calc-box oral-launch"><h4>Mon dossier banquier</h4><p>Toutes vos réponses mises en forme pour une banque ou un réseau de prêt d’honneur : le porteur, le projet, le marché, la stratégie, le prévisionnel sur 3 ans, la demande et les garanties.</p><button type="button" class="btn" id="btn-banquier">Ouvrir mon dossier banquier</button></div>';
  };

  root.PLUS = { render: R, REP: REP, droits: droits, sigData: sigData, valoData: valoData, statutsData: statutsData, retroData: retroData, objectifsData: objectifsData, TACHES: TACHES };
})(typeof window !== 'undefined' ? window : globalThis);
