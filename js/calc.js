/* ============================================================
   Moteur de calcul — chiffre d'affaires et finances
   Fonctions pures : aucune dépendance au DOM (testables avec Node).
   ============================================================ */
(function (root) {
  'use strict';

  /** Convertit une saisie ("1 200,50", "12", "") en nombre. */
  function num(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const s = String(v).replace(/\s| |€|%/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /** Annuité constante d'un emprunt (capital, taux annuel en %, durée en années). */
  function annuite(capital, tauxPct, duree) {
    const i = num(tauxPct) / 100;
    const n = num(duree);
    if (capital <= 0 || n <= 0) return 0;
    if (i === 0) return capital / n;
    return capital * i / (1 - Math.pow(1 + i, -n));
  }

  /* ---------- Rubrique 6 : chiffre d'affaires ---------- */
  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const MOIS_IDS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];

  /** Gammes de produits (TVA différentes) : renvoie le détail et le panier HT pondéré. */
  function gammesCalc(r6, panierTTC) {
    const rows = (Array.isArray(r6.gammes) ? r6.gammes : []).filter(function (g) { return num(g.part) > 0; });
    if (!rows.length) return null;
    const totPart = rows.reduce(function (s, g) { return s + num(g.part); }, 0);
    let ht = 0, coutHT = 0, coutConnu = true;
    const det = rows.map(function (g) {
      const ttc = panierTTC * num(g.part) / 100;
      const t = num(g.tva);
      const h = ttc / (1 + t / 100);
      ht += h;
      if (g.cout === undefined || String(g.cout).trim() === '') coutConnu = false;
      coutHT += h * num(g.cout) / 100;
      return { nom: g.nom || '', part: num(g.part), tva: t, ttc: ttc, ht: h, cout: num(g.cout) };
    });
    return { rows: det, totPart: totPart, panierHT: ht, tauxVar: coutConnu && ht > 0 ? coutHT / ht * 100 : null };
  }

  /** Coefficients de saisonnalité par mois civil (100 = mois normal, 0 = fermé). */
  function saisonCoefs(r6) {
    const s = (r6 && r6.saison) || {};
    return MOIS_IDS.map(function (id) {
      const v = s[id] && s[id].coef;
      return v === undefined || String(v).trim() === '' ? 100 : Math.max(0, num(v));
    });
  }

  function caCalc(r6, r3) {
    r6 = r6 || {}; r3 = r3 || {};
    const base = num(r6.base);
    const panierTTC = num(r6.panier_ttc);
    const gam = r6.tva === 'mixte' ? gammesCalc(r6, panierTTC) : null;
    let tva = r6.tva === 'mixte' ? num(r6.tva_mixte) : num(r6.tva);
    let panierHT = panierTTC / (1 + tva / 100);
    if (gam && Math.abs(gam.totPart - 100) < 0.5 && gam.panierHT > 0) {
      panierHT = gam.panierHT;
      tva = (panierTTC / panierHT - 1) * 100;
    }
    const jours = num(r6.jours);
    const sc = {};
    ['prudent', 'moyen', 'optimiste'].forEach(function (k) {
      const taux = num(r6['taux_' + k]);
      const clients = base * taux / 100;
      sc[k] = { taux: taux, clients: clients, ca: clients * panierHT * jours };
    });

    const alertes = [];
    const ok = [];
    if (panierTTC > 0 && tva > 0) ok.push('Panier converti en HT : ' + fmtEur(panierTTC, 2) + ' TTC = ' + fmtEur(panierHT, 2) + ' HT.');
    if (jours > 312) alertes.push('Plus de 312 jours d’ouverture : le jury jugera ce chiffre irréaliste. Comptez vos fermetures et vos jours creux.');
    if (r6.famille === 'flux' && sc.prudent.taux > 5) alertes.push('Un taux de captation prudent au-dessus de 5 % est rare pour un commerce de flux : justifiez-le ou baissez-le.');
    if (sc.prudent.taux > 0 && (sc.prudent.taux > sc.moyen.taux || sc.moyen.taux > sc.optimiste.taux)) alertes.push('Vos scénarios doivent aller du plus bas (prudent) au plus haut (optimiste).');
    const budgetMax = num(r3.budget_max);
    if (budgetMax > 0 && panierTTC > budgetMax) alertes.push('Votre panier (' + fmtEur(panierTTC, 2) + ' TTC) dépasse le budget maximum accepté dans votre questionnaire (' + fmtEur(budgetMax, 2) + ').');
    if (budgetMax > 0 && panierTTC > 0 && panierTTC <= budgetMax) ok.push('Panier compatible avec le budget accepté au questionnaire.');
    if (r6.tva === 'mixte') {
      if (!gam) alertes.push('Complétez le tableau de vos gammes (part du panier et taux de TVA de chacune).');
      else if (Math.abs(gam.totPart - 100) >= 0.5) alertes.push('Les parts de vos gammes font ' + gam.totPart.toLocaleString('fr-FR') + ' % du panier : le total doit faire 100 %.');
      else ok.push('TVA moyenne de votre panier : ' + tva.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %.');
    }
    const coefs = saisonCoefs(r6);
    const totCoef = coefs.reduce(function (a, b) { return a + b; }, 0);
    if (totCoef <= 0) alertes.push('Saisonnalité : tous vos mois sont à 0 (fermé).');

    return { base: base, panierTTC: panierTTC, panierHT: panierHT, tva: tva, jours: jours, sc: sc, caPrudent: sc.prudent.ca, gammes: gam, saison: coefs, alertes: alertes, ok: ok };
  }

  /* ---------- Rubrique 8 : finances ---------- */
  function financeCalc(r8, ca) {
    r8 = r8 || {};
    const CA = ca ? ca.caPrudent : 0;

    // Plan de financement
    const besoins = {
      invest: num(r8.b_invest),
      fonds: num(r8.b_fonds),
      non_amort: num(r8.b_non_amort),
      stock: num(r8.b_stock),
      frais: num(r8.b_frais),
      treso: num(r8.b_treso)
    };
    const ressources = {
      apport: num(r8.r_apport),
      honneur: num(r8.r_honneur),
      emprunt: num(r8.r_emprunt),
      aides: num(r8.r_aides)
    };
    const totBesoins = sum(besoins);
    const totRessources = sum(ressources);
    const quasiFP = ressources.apport + ressources.honneur + ressources.aides;

    // Charges calculées automatiquement
    const dureeAmort = num(r8.duree_amort) || 5;
    const amort = besoins.invest / dureeAmort;
    const tauxEmprunt = num(r8.taux_emprunt);
    const dureeEmprunt = num(r8.duree_emprunt) || 5;
    const interets = ressources.emprunt * tauxEmprunt / 100;
    const ann = annuite(ressources.emprunt, tauxEmprunt, dureeEmprunt);
    const capitalAn1 = Math.max(0, ann - interets);
    const remuNet = num(r8.remu_net);
    const tauxCotis = r8.taux_cotis === undefined || r8.taux_cotis === '' ? 0 : num(r8.taux_cotis);
    const micro = r8.statut === 'Micro-entreprise';
    // Micro-entreprise : cotisations = % du chiffre d'affaires ; sinon % de la rémunération nette
    const cotisations = micro ? CA * tauxCotis / 100 : remuNet * 12 * tauxCotis / 100;
    const remu = remuNet * 12 + cotisations;

    // Compte de résultat
    const tauxVar = num(r8.taux_var);
    const variables = CA * tauxVar / 100;
    const fixesSaisis = {
      loyer: num(r8.c_loyer),
      energie: num(r8.c_energie),
      assurance: num(r8.c_assurance),
      compta: num(r8.c_compta),
      comm: num(r8.c_comm),
      salaires: num(r8.c_salaires),
      autres: num(r8.c_autres),
      impots: num(r8.c_impots)
    };
    const fixes = sum(fixesSaisis) + besoins.frais + remu + interets + amort;
    const resultat = CA - variables - fixes;
    const societe = isSociete(r8.statut) && !(r8.statut === 'EURL' && r8.regime_fiscal === 'IR');
    const is = societe ? impotSocietes(resultat) : 0;
    const resultatNet = resultat - is;

    // Seuil de rentabilité
    const tmcv = CA > 0 ? (CA - variables) / CA : (1 - tauxVar / 100);
    const seuil = tmcv > 0 ? fixes / tmcv : 0;
    const jours = ca ? ca.jours : 0;
    const panierHT = ca ? ca.panierHT : 0;
    const seuilJour = jours > 0 ? seuil / jours : 0;
    const seuilClientsExact = panierHT > 0 ? seuilJour / panierHT : 0;
    const seuilClients = Math.ceil(seuilClientsExact - 1e-9);
    const clientsPrudent = ca ? ca.sc.prudent.clients : 0;
    const margeSecu = CA > 0 ? (CA - seuil) / CA : 0;
    const pointMortJour = CA > 0 ? Math.ceil(seuil / CA * 360) : 0;
    const stress = CA * 0.8 * tmcv - fixes;

    // Trésorerie et banque
    const decaissMensuel = (fixes - amort - besoins.frais + capitalAn1) / 12;
    const moisTreso = decaissMensuel > 0 ? besoins.treso / decaissMensuel : 0;
    const caf = resultatNet + amort;
    const ratioCaf = ann > 0 ? caf / ann : 0;
    const partFP = totBesoins > 0 ? quasiFP / totBesoins : 0;

    // Contrôles
    const alertes = [];
    const ok = [];
    if (totBesoins > 0 || totRessources > 0) {
      if (Math.abs(totBesoins - totRessources) < 1) ok.push('Plan de financement équilibré : besoins = ressources.');
      else alertes.push('Plan de financement déséquilibré : il manque ' + fmtEur(Math.abs(totBesoins - totRessources)) + (totBesoins > totRessources ? ' de ressources.' : ' de besoins (ou trop de ressources).'));
    }
    if (besoins.treso <= 0 && totBesoins > 0) alertes.push('Aucune trésorerie de départ : c’est la ligne que le jury vérifie en premier.');
    else if (besoins.treso > 0 && moisTreso < 1.5) alertes.push('Votre trésorerie de départ couvre ' + moisTreso.toFixed(1).replace('.', ',') + ' mois de charges : visez au moins 2 mois.');
    else if (besoins.treso > 0) ok.push('Trésorerie de départ : environ ' + moisTreso.toFixed(1).replace('.', ',') + ' mois de charges couverts.');
    if (remuNet <= 0) alertes.push('Vous ne vous payez pas : le jury demandera « et vous vivez de quoi ? ».');

    if (tauxCotis <= 0) alertes.push(micro ? 'Indiquez le taux de cotisations de la micro-entreprise (en % du CA, voir urssaf.fr).' : 'Ajoutez les cotisations sociales à votre rémunération (simulateur URSSAF).');
    if (CA > 0 && resultat < 0) alertes.push('Résultat négatif : revoyez le modèle (prix, charges, offre) avant d’aller plus loin.');
    if (CA > 0 && seuil > 0) {
      if (margeSecu < 0) alertes.push('Votre CA prudent est sous le seuil de rentabilité.');
      else if (margeSecu < 0.10) alertes.push('Marge de sécurité inférieure à 10 % : projet fragile, à retravailler.');
      else ok.push('Marge de sécurité de ' + pct(margeSecu) + '.');
    }
    if (ressources.emprunt > 0 && tauxEmprunt <= 0) alertes.push('Indiquez le taux de votre emprunt pour calculer les intérêts.');
    if (ann > 0 && CA > 0) {
      if (ratioCaf >= 1.2) ok.push('La CAF couvre ' + ratioCaf.toFixed(1).replace('.', ',') + ' fois l’annuité d’emprunt.');
      else alertes.push('Votre CAF couvre mal l’annuité d’emprunt (' + ratioCaf.toFixed(1).replace('.', ',') + ' fois) : la banque hésitera.');
    }
    if (ressources.emprunt > 0 && totBesoins > 0) {
      if (partFP >= 0.30) ok.push('Apport, prêt d’honneur et aides = ' + pct(partFP) + ' des besoins : au-dessus des 30 % qu’attend en général une banque.');
      else alertes.push('Apport, prêt d’honneur et aides = ' + pct(partFP) + ' des besoins : une banque attend en général environ 30 % de fonds propres avant de prêter (Bpifrance Création).');
    }

    return {
      CA: CA, besoins: besoins, ressources: ressources, totBesoins: totBesoins, totRessources: totRessources, quasiFP: quasiFP, partFP: partFP,
      amort: amort, interets: interets, annuite: ann, capitalAn1: capitalAn1, remu: remu, cotisations: cotisations, micro: micro,
      tauxVar: tauxVar, variables: variables, fixesSaisis: fixesSaisis, fixes: fixes, resultat: resultat,
      societe: societe, is: is, resultatNet: resultatNet,
      tmcv: tmcv, seuil: seuil, seuilJour: seuilJour, seuilClientsExact: seuilClientsExact, seuilClients: seuilClients,
      clientsPrudent: clientsPrudent, margeSecu: margeSecu, pointMortJour: pointMortJour, stress: stress,
      decaissMensuel: decaissMensuel, moisTreso: moisTreso, caf: caf, ratioCaf: ratioCaf,
      alertes: alertes, ok: ok
    };
  }

  /* ---------- Impôt sur les sociétés ---------- */
  function isSociete(statut) { return ['EURL', 'SARL', 'SASU', 'SAS'].indexOf(statut) >= 0; }
  /** IS des PME : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà. */
  function impotSocietes(benef) {
    if (benef <= 0) return 0;
    return Math.min(benef, 42500) * 0.15 + Math.max(0, benef - 42500) * 0.25;
  }

  /** Tableau de remboursement d'un emprunt à annuités constantes. */
  function tableauEmprunt(capital, tauxPct, duree) {
    const i = num(tauxPct) / 100, n = Math.round(num(duree)) || 0;
    const a = annuite(capital, tauxPct, duree);
    const lignes = [];
    let crd = capital;
    for (let k = 1; k <= n && capital > 0; k++) {
      const int = crd * i, cap = a - int;
      lignes.push({ annee: k, debut: crd, interets: int, capital: cap, annuite: a, fin: Math.max(0, crd - cap) });
      crd -= cap;
    }
    return lignes;
  }

  /** BFR selon la formule Bpifrance : stocks + créances clients TTC − dettes fournisseurs TTC. */
  function bfrCalc(CA, tauxVar, tvaV, tvaA, r8) {
    const achatsHT = CA * tauxVar / 100;
    const stock = achatsHT / 360 * num(r8.bfr_stock_j);
    const clients = CA * (1 + tvaV / 100) / 360 * num(r8.bfr_clients_j);
    const fourn = achatsHT * (1 + tvaA / 100) / 360 * num(r8.bfr_fourn_j);
    return { stock: stock, clients: clients, fourn: fourn, bfr: stock + clients - fourn };
  }

  /** Prévisionnel complet : compte de résultat 3 ans, plan de financement 3 ans, trésorerie 12 mois. */
  function previsionnel(r8, ca, f) {
    r8 = r8 || {};
    const micro = f.micro;
    const franchise = micro && ca.tva === 0;
    const tvaV = franchise ? 0 : ca.tva;
    const tvaA = franchise ? 0 : (r8.tva_achats === undefined || r8.tva_achats === '' ? tvaV : num(r8.tva_achats));
    const tvaG = franchise ? 0 : 20;
    const g2 = num(r8.croissance_a2) / 100, g3 = num(r8.croissance_a3) / 100;
    const infl = r8.hausse_charges === undefined || r8.hausse_charges === '' ? 0.02 : num(r8.hausse_charges) / 100;
    const emp = tableauEmprunt(f.ressources.emprunt, r8.taux_emprunt, num(r8.duree_emprunt) || 5);
    const dureeAmort = num(r8.duree_amort) || 5;
    const tauxCotis = num(r8.taux_cotis);
    const ext = ['loyer', 'energie', 'assurance', 'compta', 'comm', 'autres'];

    // ---- Compte de résultat sur 3 ans
    const ans = [];
    let caY = f.CA;
    const blank = function (v) { return v === undefined || v === null || String(v).trim() === ''; };
    // Valeur de l'année y : saisie si renseignée, sinon celle de l'année précédente
    const parAn = function (key1, keyY) {
      const v = [num(r8[key1])];
      v.push(blank(r8[keyY + '2']) ? v[0] : num(r8[keyY + '2']));
      v.push(blank(r8[keyY + '3']) ? v[1] : num(r8[keyY + '3']));
      return v;
    };
    const salAn = parAn('c_salaires', 'c_salaires_a');
    const remuAn = parAn('remu_net', 'remu_net_a');
    for (let y = 1; y <= 3; y++) {
      if (y === 2) caY = caY * (1 + g2);
      if (y === 3) caY = caY * (1 + g3);
      const k = Math.pow(1 + infl, y - 1);
      const achats = caY * f.tauxVar / 100;
      const externes = ext.reduce(function (s, x) { return s + f.fixesSaisis[x] * k; }, 0) + (y === 1 ? f.besoins.frais : 0);
      const impots = f.fixesSaisis.impots * k;
      const salaires = salAn[y - 1];
      const remuNetY = remuAn[y - 1];
      const cotis = micro ? caY * tauxCotis / 100 : remuNetY * 12 * tauxCotis / 100;
      const remu = remuNetY * 12 + cotis;
      const dot = y <= dureeAmort ? f.besoins.invest / dureeAmort : 0;
      const int = emp[y - 1] ? emp[y - 1].interets : 0;
      const rai = caY - achats - externes - impots - salaires - remu - dot - int;
      const is = f.societe ? impotSocietes(rai) : 0;
      const net = rai - is;
      const bfr = bfrCalc(caY, f.tauxVar, tvaV, tvaA, r8);
      ans.push({ annee: y, ca: caY, achats: achats, externes: externes, impots: impots, salaires: salaires, remu: remu, cotis: cotis,
        dotations: dot, interets: int, rai: rai, is: is, net: net, caf: net + dot, capital: emp[y - 1] ? emp[y - 1].capital : 0, bfr: bfr });
    }

    // ---- Plan de financement à 3 ans
    const pf3 = [];
    let cumul = 0;
    for (let y = 1; y <= 3; y++) {
      const a = ans[y - 1];
      const deltaBfr = y === 1 ? 0 : Math.max(0, a.bfr.bfr - ans[y - 2].bfr.bfr);
      const b = {
        invest: y === 1 ? f.besoins.invest + f.besoins.fonds + f.besoins.non_amort : 0,
        frais: y === 1 ? f.besoins.frais : 0,
        bfr: y === 1 ? f.besoins.stock + f.besoins.treso : deltaBfr,
        remb: a.capital
      };
      const r = {
        apport: y === 1 ? f.ressources.apport : 0,
        quasi: y === 1 ? f.ressources.honneur + f.ressources.aides : 0,
        emprunt: y === 1 ? f.ressources.emprunt : 0,
        caf: y === 1 ? a.caf + f.besoins.frais : a.caf
      };
      const tb = sum(b), tr = sum(r);
      cumul += tr - tb;
      pf3.push({ annee: y, besoins: b, ressources: r, totB: tb, totR: tr, excedent: tr - tb, cumul: cumul });
    }

    // ---- Plan de trésorerie sur 12 mois (TTC)
    const debut = Math.max(0, MOIS.indexOf(r8.mois_debut));
    const coefs = ca.saison || saisonCoefs({});
    const moisCoefs = [];
    for (let m = 0; m < 12; m++) moisCoefs.push(coefs[(debut + m) % 12]);
    const totC = moisCoefs.reduce(function (s, x) { return s + x; }, 0) || 1;
    const a1 = ans[0];
    const shiftC = Math.round(num(r8.bfr_clients_j) / 30), shiftF = Math.round(num(r8.bfr_fourn_j) / 30);
    const venteHT = moisCoefs.map(function (c) { return f.CA * c / totC; });
    const achatHT = venteHT.map(function (v) { return v * f.tauxVar / 100; });
    const extTVA = (f.fixesSaisis.loyer + f.fixesSaisis.energie + f.fixesSaisis.compta + f.fixesSaisis.comm + f.fixesSaisis.autres) / 12;
    const extSansTVA = (f.fixesSaisis.assurance + f.fixesSaisis.impots) / 12;
    const remuMois = (num(r8.remu_net) * 12 + f.cotisations) / 12;
    const salMois = f.fixesSaisis.salaires / 12;
    const echeance = emp.length ? emp[0].annuite / 12 : 0;
    const mois = [];
    let solde = 0, creditTVA = 0, tvaAPayer = 0, rembTVA = 0, minSolde = Infinity, minMois = '';
    for (let m = 0; m < 12; m++) {
      const enc = {
        ventes: m - shiftC >= 0 ? venteHT[m - shiftC] * (1 + tvaV / 100) : 0,
        rembTVA: m === 2 ? rembTVA : 0,
        apports: m === 0 ? f.ressources.apport + f.ressources.honneur + f.ressources.aides : 0,
        emprunt: m === 0 ? f.ressources.emprunt : 0
      };
      const invHT = m === 0 ? f.besoins.invest : 0;
      const fraisHT = m === 0 ? f.besoins.frais : 0;
      const stockHT = m === 0 ? f.besoins.stock : 0;
      const achatPaye = m - shiftF >= 0 ? achatHT[m - shiftF] : 0;
      const dec = {
        invest: invHT * (1 + tvaG / 100) + (m === 0 ? f.besoins.fonds + f.besoins.non_amort : 0) + fraisHT * (1 + tvaG / 100),
        achats: (achatPaye + stockHT) * (1 + tvaA / 100),
        externes: extTVA * (1 + tvaG / 100) + extSansTVA,
        personnel: salMois + remuMois,
        emprunt: echeance,
        tva: tvaAPayer
      };
      // TVA du mois : collectée sur les ventes du mois, déductible sur les achats et frais du mois
      const coll = venteHT[m] * tvaV / 100;
      const ded = (invHT + fraisHT + extTVA) * tvaG / 100 + (achatHT[m] + stockHT) * tvaA / 100;
      let net = coll - ded - creditTVA;
      if (net < 0) { creditTVA = -net; net = 0; } else creditTVA = 0;
      // Le crédit de TVA né des investissements de départ est remboursé par l'État environ 2 mois plus tard
      if (m === 0 && creditTVA > 0) { rembTVA = creditTVA; creditTVA = 0; }
      tvaAPayer = net;
      const te = sum(enc), td = sum(dec);
      solde += te - td;
      if (solde < minSolde) { minSolde = solde; minMois = MOIS[(debut + m) % 12]; }
      mois.push({ nom: MOIS[(debut + m) % 12], enc: enc, dec: dec, totEnc: te, totDec: td, solde: te - td, cumul: solde });
    }

    const alertes = [], ok = [];
    if (f.CA > 0) {
      if (minSolde < 0) alertes.push('Votre trésorerie devient négative en ' + minMois.toLowerCase() + ' (' + fmtEur(minSolde) + ') : augmentez la trésorerie de départ ou négociez un découvert.');
      else ok.push('Trésorerie positive tous les mois de la 1re année (point le plus bas : ' + fmtEur(minSolde) + ' en ' + minMois.toLowerCase() + ').');
      const bfr1 = ans[0].bfr.bfr;
      if (bfr1 > 0 && f.besoins.stock + f.besoins.treso < bfr1) alertes.push('Votre stock de départ + votre trésorerie (' + fmtEur(f.besoins.stock + f.besoins.treso) + ') ne couvrent pas votre BFR calculé (' + fmtEur(bfr1) + ').');
      if (ans[2].net < 0) alertes.push('Résultat encore négatif en année 3 : le projet n’est pas viable en l’état.');
      if (pf3[2].cumul < 0) alertes.push('Plan de financement à 3 ans déficitaire : il manque ' + fmtEur(-pf3[2].cumul) + ' sur 3 ans.');
    }
    return { ans: ans, emprunt: emp, pf3: pf3, mois: mois, minSolde: minSolde, minMois: minMois, tvaV: tvaV, tvaA: tvaA, franchise: franchise, alertes: alertes, ok: ok };
  }

  /** Reprise : valeur du fonds par la méthode des barèmes (% du CA moyen) et par la rentabilité. */
  function repriseCalc(r2, r8) {
    r2 = r2 || {}; r8 = r8 || {};
    const h = r2.reprise_historique || {};
    const ids = ['n3', 'n2', 'n1'];
    const cas = ids.map(function (k) { return num((h[k] || {}).ca); }).filter(function (v) { return v > 0; });
    const res = ids.map(function (k) { return (h[k] || {}).resultat; }).filter(function (v) { return v !== undefined && String(v).trim() !== ''; }).map(num);
    const caMoy = cas.length ? cas.reduce(function (a, b) { return a + b; }, 0) / cas.length : 0;
    const resMoy = res.length ? res.reduce(function (a, b) { return a + b; }, 0) / res.length : 0;
    const vMin = caMoy * num(r2.reprise_bareme_min) / 100, vMax = caMoy * num(r2.reprise_bareme_max) / 100;
    const prix = num(r2.reprise_prix);
    const prixRetenu = num(r8.b_fonds);
    const annees = resMoy > 0 && prix > 0 ? prix / resMoy : 0;
    const tendance = cas.length >= 2 ? (cas[cas.length - 1] - cas[0]) / cas[0] : 0;
    const alertes = [], ok = [];
    if (vMax > 0 && prix > 0) {
      if (prix > vMax) alertes.push('Le prix demandé (' + fmtEur(prix) + ') dépasse la fourchette du barème (' + fmtEur(vMin) + ' à ' + fmtEur(vMax) + ') : négociez, ou justifiez ce prix.');
      else if (prix < vMin) ok.push('Le prix demandé est sous la fourchette du barème : vérifiez pourquoi (local, matériel, clientèle en baisse ?).');
      else ok.push('Le prix demandé est dans la fourchette du barème.');
    }
    if (cas.length >= 2 && tendance < -0.05) alertes.push('Le CA de l’affaire baisse de ' + pct(-tendance) + ' sur la période : expliquez pourquoi et ce que vous changerez.');
    if (resMoy <= 0 && res.length) alertes.push('L’affaire ne dégage pas de bénéfice en moyenne : le prix doit en tenir compte.');
    if (prix > 0 && prixRetenu === 0) alertes.push('Reportez le prix du fonds dans votre plan de financement (rubrique 8).');
    return { caMoy: caMoy, resMoy: resMoy, vMin: vMin, vMax: vMax, prix: prix, prixRetenu: prixRetenu, annees: annees, tendance: tendance, nbAnnees: cas.length, alertes: alertes, ok: ok };
  }

  /* ---------- Contrôle de cohérence (rubrique 9) ---------- */
  function coherence(data) {
    const r3 = data.r3 || {}, r6 = data.r6 || {}, r7 = data.r7 || {}, r8 = data.r8 || {};
    const ca = caCalc(r6, r3);
    const f = financeCalc(r8, ca);
    const checks = [];
    function add(label, etat, detail) { checks.push({ label: label, etat: etat, detail: detail || '' }); }

    add('Le CA est le même en page 7 et en page 9', ca.caPrudent > 0 ? 'ok' : 'todo',
      ca.caPrudent > 0 ? 'Calculé une seule fois (' + fmtEur(ca.caPrudent) + ' HT) et repris automatiquement.' : 'Complétez la rubrique 6.');
    const budgetMax = num(r3.budget_max);
    add('Le panier est compatible avec le budget accepté au questionnaire',
      !budgetMax || !ca.panierTTC ? 'todo' : (ca.panierTTC <= budgetMax ? 'ok' : 'ko'),
      budgetMax && ca.panierTTC ? fmtEur(ca.panierTTC, 2) + ' TTC pour un budget maximum de ' + fmtEur(budgetMax, 2) + '.' : 'Renseignez le budget accepté (rubrique 3) et le panier (rubrique 6).');
    const commPlan = planActionsTotal(r6);
    add('Le budget communication est le même dans le plan d’actions et dans les finances',
      commPlan > 0 && num(r8.c_comm) > 0 ? 'manuel' : 'todo',
      'Plan d’actions : ' + fmtEur(commPlan) + ' — compte de résultat : ' + fmtEur(num(r8.c_comm)) + ' par an (+ lancement dans les frais de démarrage). Vérifiez que ces montants se recoupent.');
    const salRH = num(r7.cout_salarie_annuel);
    add('Le coût du salarié est le même dans le plan RH et le compte de résultat',
      salRH === 0 && num(r8.c_salaires) === 0 ? 'ok' : (Math.abs(salRH - num(r8.c_salaires)) < 1 ? 'ok' : 'ko'),
      'Plan RH (année 1) : ' + fmtEur(salRH) + ' — compte de résultat : ' + fmtEur(num(r8.c_salaires)) + '.');
    const hOuv = num(r7.heures_ouverture), hTrav = num(r7.heures_travail);
    add('Vos heures de travail permettent de tenir vos horaires d\u2019ouverture',
      !hOuv || !hTrav ? 'todo' : (hTrav >= hOuv || salRH > 0 ? 'ok' : 'ko'),
      hOuv && hTrav ? hOuv + ' h d\u2019ouverture par semaine pour ' + hTrav + ' h de travail' + (salRH > 0 ? ', avec un salarié.' : '.') + (hTrav < hOuv && !salRH ? ' Impossible seul : réduisez les horaires ou prévoyez du renfort.' : '') : 'Complétez la rubrique 7.');
    add('Le plan de financement est équilibré', f.totBesoins > 0 ? (Math.abs(f.totBesoins - f.totRessources) < 1 ? 'ok' : 'ko') : 'todo',
      fmtEur(f.totBesoins) + ' de besoins pour ' + fmtEur(f.totRessources) + ' de ressources.');
    add('Votre rémunération figure au compte de résultat', num(r8.remu_net) > 0 ? 'ok' : 'ko', num(r8.remu_net) > 0 ? fmtEur(f.remu) + ' par an, cotisations comprises.' : 'Ajoutez-la (rubrique 8).');
    add('Le seuil est traduit en clients par jour, avec une marge de sécurité', f.seuilClients > 0 ? (f.margeSecu >= 0.10 ? 'ok' : 'ko') : 'todo',
      f.seuilClients > 0 ? f.seuilClients + ' clients par jour (' + pct(f.margeSecu) + ' de marge de sécurité).' : 'Complétez la rubrique 8.');
    const p = f.CA > 0 ? previsionnel(r8, ca, f) : null;
    add('La trésorerie reste positive chaque mois de la 1re année', !p ? 'todo' : (p.minSolde >= 0 ? 'ok' : 'ko'),
      p ? 'Point le plus bas : ' + fmtEur(p.minSolde) + ' en ' + p.minMois.toLowerCase() + '.' : 'Complétez la rubrique 8.');
    add('Le résultat est positif en année 3', !p ? 'todo' : (p.ans[2].net >= 0 ? 'ok' : 'ko'),
      p ? 'Résultat net année 3 : ' + fmtEur(p.ans[2].net) + '.' : 'Complétez la rubrique 8.');
    if ((data.r1 || {}).type_projet === 'Reprise') {
      const rp = repriseCalc(data.r2, r8);
      add('Reprise : le prix du fonds est justifié et repris dans le plan de financement',
        !rp.prix || !rp.vMax ? 'todo' : (rp.prixRetenu > 0 && rp.prixRetenu <= rp.vMax * 1.0001 ? 'ok' : 'ko'),
        rp.vMax ? 'Fourchette du barème : ' + fmtEur(rp.vMin) + ' à ' + fmtEur(rp.vMax) + ' — prix dans le plan de financement : ' + fmtEur(rp.prixRetenu) + '.' : 'Complétez le diagnostic de l’affaire (rubrique 2).');
    }
    add('La cible et la promesse sont les mêmes (positionnement, Canvas, 4 P)', 'manuel', 'À vérifier vous-même : relisez les rubriques 4, 5 et 6 côte à côte.');
    return { checks: checks, ca: ca, f: f, p: p };
  }

  function planActionsTotal(r6) {
    const rows = (r6 && r6.plan_actions) || [];
    return rows.reduce(function (s, r) { return s + num(r.budget); }, 0);
  }

  function sum(o) { return Object.keys(o).reduce(function (s, k) { return s + num(o[k]); }, 0); }
  function fmtEur(v, dec) {
    const d = dec || 0;
    return (num(v)).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €';
  }
  function pct(v, dec) { return (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: dec === undefined ? 0 : dec }) + ' %'; }

  const api = { num: num, annuite: annuite, caCalc: caCalc, financeCalc: financeCalc, coherence: coherence, planActionsTotal: planActionsTotal, fmtEur: fmtEur, pct: pct,
    previsionnel: previsionnel, repriseCalc: repriseCalc, tableauEmprunt: tableauEmprunt, impotSocietes: impotSocietes, isSociete: isSociete, saisonCoefs: saisonCoefs, MOIS: MOIS, MOIS_IDS: MOIS_IDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Calc = api;
})(typeof window !== 'undefined' ? window : globalThis);
