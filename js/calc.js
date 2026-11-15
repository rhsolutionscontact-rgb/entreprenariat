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
  function caCalc(r6, r3) {
    r6 = r6 || {}; r3 = r3 || {};
    const base = num(r6.base);
    const panierTTC = num(r6.panier_ttc);
    const tva = r6.tva === 'mixte' ? num(r6.tva_mixte) : num(r6.tva);
    const panierHT = panierTTC / (1 + tva / 100);
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

    return { base: base, panierTTC: panierTTC, panierHT: panierHT, tva: tva, jours: jours, sc: sc, caPrudent: sc.prudent.ca, alertes: alertes, ok: ok };
  }

  /* ---------- Rubrique 8 : finances ---------- */
  function financeCalc(r8, ca) {
    r8 = r8 || {};
    const CA = ca ? ca.caPrudent : 0;

    // Plan de financement
    const besoins = {
      invest: num(r8.b_invest),
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
      autres: num(r8.c_autres)
    };
    const fixes = sum(fixesSaisis) + besoins.frais + remu + interets + amort;
    const resultat = CA - variables - fixes;

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
    const caf = resultat + amort;
    const ratioCaf = ann > 0 ? caf / ann : 0;

    // Contrôles
    const alertes = [];
    const ok = [];
    if (totBesoins > 0 || totRessources > 0) {
      if (Math.abs(totBesoins - totRessources) < 1) ok.push('Plan de financement équilibré : besoins = ressources.');
      else alertes.push('Plan de financement déséquilibré : il manque ' + fmtEur(Math.abs(totBesoins - totRessources)) + (totBesoins > totRessources ? ' de ressources.' : ' de besoins (ou trop de ressources).'));
    }
    if (besoins.treso <= 0 && totBesoins > 0) alertes.push('Aucune trésorerie de départ : c’est la ligne que le jury vérifie en premier.');
    else if (besoins.treso > 0 && moisTreso < 2) alertes.push('Votre trésorerie de départ couvre ' + moisTreso.toFixed(1).replace('.', ',') + ' mois de charges : visez au moins 2 mois.');
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

    return {
      CA: CA, besoins: besoins, ressources: ressources, totBesoins: totBesoins, totRessources: totRessources, quasiFP: quasiFP,
      amort: amort, interets: interets, annuite: ann, capitalAn1: capitalAn1, remu: remu, cotisations: cotisations, micro: micro,
      tauxVar: tauxVar, variables: variables, fixesSaisis: fixesSaisis, fixes: fixes, resultat: resultat,
      tmcv: tmcv, seuil: seuil, seuilJour: seuilJour, seuilClientsExact: seuilClientsExact, seuilClients: seuilClients,
      clientsPrudent: clientsPrudent, margeSecu: margeSecu, pointMortJour: pointMortJour, stress: stress,
      decaissMensuel: decaissMensuel, moisTreso: moisTreso, caf: caf, ratioCaf: ratioCaf,
      alertes: alertes, ok: ok
    };
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
    add('La cible et la promesse sont les mêmes (positionnement, Canvas, 4 P)', 'manuel', 'À vérifier vous-même : relisez les rubriques 4, 5 et 6 côte à côte.');
    return { checks: checks, ca: ca, f: f };
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

  const api = { num: num, annuite: annuite, caCalc: caCalc, financeCalc: financeCalc, coherence: coherence, planActionsTotal: planActionsTotal, fmtEur: fmtEur, pct: pct };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Calc = api;
})(typeof window !== 'undefined' ? window : globalThis);
