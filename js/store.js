/* ============================================================
   Couche de données
   - mode « cloud » (Supabase configuré) :
       · élèves : identifiant + code à 6 chiffres, session par jeton
       · professeur : adresse e-mail + mot de passe
   - mode « demo » : tout reste dans le navigateur.
   ============================================================ */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG || {};
  const LS_KEY = 'efp_dossier_demo_v1';
  const TOKEN_KEY = 'efp_eleve_token';
  const APERCU_KEY = 'efp_dossier_apercu_prof';
  let sb = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* navigation privée */ } }

  const Store = {
    mode: 'demo',
    user: null,
    profile: null,
    token: null,          // jeton de session de l'élève
    onExpired: null,      // appelé si la session élève expire

    apercu: false,        // professeur qui regarde la version élève
    isEleve: function () { return this.mode === 'cloud' && !!this.token; },
    setApercu: function (on) {
      this.apercu = !!on;
      try { if (on) sessionStorage.setItem('efp_apercu', '1'); else sessionStorage.removeItem('efp_apercu'); } catch (e) { /* navigation privée */ }
    },
    isProf: function () { return !!(this.profile && this.profile.role === 'prof'); },

    init: async function () {
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        this.mode = 'cloud';
        this.user = null; this.profile = null; this.token = null;
        // 1. Élève déjà connecté sur ce navigateur ?
        const tok = lsGet(TOKEN_KEY);
        if (tok) {
          const { data, error } = await sb.rpc('eleve_session', { p_token: tok });
          if (!error && data) { this.setEleve(tok, data); return; }
          if (!error) lsDel(TOKEN_KEY);
        }
        // 2. Professeur connecté ?
        const { data } = await sb.auth.getSession();
        if (data && data.session) {
          this.user = data.session.user;
          await this.loadProfile();
          try { this.apercu = sessionStorage.getItem('efp_apercu') === '1'; } catch (e) { this.apercu = false; }
        }
      } else {
        this.mode = 'demo';
        this.user = { id: 'demo' };
        this.profile = { id: 'demo', prenom: '', nom: '', role: 'etudiant', classe: '' };
      }
    },

    setEleve: function (token, e) {
      this.token = token;
      this.user = { id: e.id };
      this.profile = { id: e.id, prenom: e.prenom, nom: e.nom, classe: e.classe, identifiant: e.identifiant, cle_depot: e.cle_depot, role: 'etudiant' };
    },

    /* ---------- Connexion élève ---------- */
    signInEleve: async function (identifiant, code) {
      const { data, error } = await sb.rpc('eleve_connexion', { p_identifiant: String(identifiant || ''), p_code: String(code || '').replace(/\s/g, '') });
      if (error) throw traduire(error);
      if (data && data.erreur) {
        if (data.erreur === 'TROP_D_ESSAIS') throw new Error('Trop d’essais. Réessayez dans ' + data.minutes + ' minute' + (data.minutes > 1 ? 's' : '') + ', ou demandez un nouveau code à votre professeur.');
        if (data.erreur === 'COMPTE_DESACTIVE') throw new Error('Ce compte est désactivé. Voyez votre professeur.');
        throw new Error('Identifiant ou code incorrect.');
      }
      if (sb) await sb.auth.signOut().catch(function () {});
      lsSet(TOKEN_KEY, data.token);
      this.setEleve(data.token, data.eleve);
    },

    /* ---------- Compte professeur ---------- */
    signUp: async function (o) {
      const { data, error } = await sb.auth.signUp({
        email: o.email.trim(), password: o.password,
        options: { data: { nom: o.nom.trim(), prenom: o.prenom.trim(), classe: o.classe.trim().toUpperCase() }, emailRedirectTo: location.origin + location.pathname }
      });
      if (error) throw traduire(error);
      if (data.session) { this.user = data.user; await this.loadProfile(); return { session: true }; }
      return { session: false };
    },

    signIn: async function (email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: password });
      if (error) throw traduire(error);
      lsDel(TOKEN_KEY); this.token = null;
      this.user = data.user;
      await this.loadProfile();
    },

    resetPassword: async function (email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname + '#nouveau-mot-de-passe' });
      if (error) throw traduire(error);
    },

    updatePassword: async function (password) {
      const { error } = await sb.auth.updateUser({ password: password });
      if (error) throw traduire(error);
    },

    onRecovery: function (cb) {
      if (!sb) return;
      sb.auth.onAuthStateChange(function (event) { if (event === 'PASSWORD_RECOVERY') cb(); });
    },

    signOut: async function () {
      if (this.token && sb) { try { await sb.rpc('eleve_deconnexion', { p_token: this.token }); } catch (e) { /* hors ligne */ } }
      lsDel(TOKEN_KEY); lsDel('efp_current');
      this.token = null; this.setApercu(false);
      if (sb) { try { await sb.auth.signOut(); } catch (e) { /* déjà déconnecté */ } }
      this.user = null; this.profile = null;
    },

    loadProfile: async function () {
      const { data, error } = await sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
      if (error) throw traduire(error);
      if (!data) { await sb.auth.signOut(); this.user = null; throw new Error('Ce compte n’est pas un compte professeur.'); }
      this.profile = data;
    },

    /* ---------- Dossier ---------- */
    loadDossier: async function (eleveId) {
      if (this.mode === 'demo' || (this.apercu && !eleveId)) {
        try { return JSON.parse(lsGet(this.apercu ? APERCU_KEY : LS_KEY)) || { data: {}, progress: {} }; }
        catch (e) { return { data: {}, progress: {} }; }
      }
      if (this.isEleve() && !eleveId) {
        const { data, error } = await sb.rpc('eleve_charger', { p_token: this.token });
        if (error) throw this.erreurEleve(error);
        return data || { data: {}, progress: {} };
      }
      const { data, error } = await sb.from('dossiers').select('data, progress, updated_at').eq('eleve_id', eleveId).maybeSingle();
      if (error) throw traduire(error);
      return data || { data: {}, progress: {} };
    },

    saveDossier: async function (dossierData, progress) {
      if (this.mode === 'demo' || this.apercu) {
        lsSet(this.apercu ? APERCU_KEY : LS_KEY, JSON.stringify({ data: dossierData, progress: progress, updated_at: new Date().toISOString() }));
        return;
      }
      if (!this.isEleve()) return;
      const { error } = await sb.rpc('eleve_enregistrer', { p_token: this.token, p_data: dossierData, p_progress: progress });
      if (error) throw this.erreurEleve(error);
    },

    resetDemo: function () { lsDel(LS_KEY); },

    erreurEleve: function (error) {
      if (/SESSION_EXPIREE/.test(error.message || '')) {
        lsDel(TOKEN_KEY); this.token = null;
        if (typeof this.onExpired === 'function') this.onExpired();
        return new Error('Votre session a expiré. Reconnectez-vous avec votre identifiant et votre code.');
      }
      return traduire(error);
    },

    /* ---------- Dépôts PDF ---------- */
    listDepots: async function () {
      if (!this.isEleve()) return [];
      const { data, error } = await sb.rpc('eleve_depots', { p_token: this.token });
      if (error) throw this.erreurEleve(error);
      return data || [];
    },

    uploadPdf: async function (file) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = this.profile.cle_depot + '/' + stamp + '.pdf';
      const up = await sb.storage.from('depots').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (up.error) throw traduire(up.error);
      const { error } = await sb.rpc('eleve_depot_ajouter', { p_token: this.token, p_path: path, p_filename: file.name, p_size: file.size });
      if (error) throw this.erreurEleve(error);
    },

    pdfUrl: async function (path, filename) {
      const { data, error } = await sb.storage.from('depots').createSignedUrl(path, 600, { download: filename || true });
      if (error) throw traduire(error);
      return data.signedUrl;
    },

    /* ---------- Espace professeur ---------- */
    listEtudiants: async function () {
      const p = await sb.from('eleves').select('id, nom, prenom, identifiant, classe, actif, bloque_jusqua, derniere_connexion, created_at').order('classe').order('nom').order('prenom');
      if (p.error) throw traduire(p.error);
      const d = await sb.from('dossiers').select('eleve_id, progress, updated_at');
      if (d.error) throw traduire(d.error);
      const dep = await sb.from('depots').select('eleve_id, path, filename, created_at').order('created_at', { ascending: false });
      if (dep.error) throw traduire(dep.error);
      const dossiers = {}; (d.data || []).forEach(function (x) { dossiers[x.eleve_id] = x; });
      const depots = {}; (dep.data || []).forEach(function (x) { (depots[x.eleve_id] = depots[x.eleve_id] || []).push(x); });
      return (p.data || []).map(function (e) {
        return Object.assign({}, e, { dossier: dossiers[e.id] || null, depots: depots[e.id] || [] });
      });
    },

    creerEleves: async function (classe, liste) {
      const { data, error } = await sb.rpc('prof_creer_eleves', { p_classe: classe, p_liste: liste });
      if (error) throw traduire(error);
      return data || [];
    },

    nouveauCode: async function (eleveId) {
      const { data, error } = await sb.rpc('prof_nouveau_code', { p_eleve: eleveId });
      if (error) throw traduire(error);
      return data;
    },

    supprimerEleve: async function (eleveId) {
      const { error } = await sb.rpc('prof_supprimer_eleve', { p_eleve: eleveId });
      if (error) throw traduire(error);
    },

    listClasses: async function () {
      const { data, error } = await sb.from('classes').select('*').eq('prof', false).order('code');
      if (error) throw traduire(error);
      return data || [];
    },

    addClasse: async function (code, nom) {
      const { error } = await sb.from('classes').insert({ code: code.trim().toUpperCase(), nom: nom.trim() });
      if (error) throw traduire(error);
    }
  };

  function traduire(err) {
    const m = (err && err.message) || String(err);
    const table = [
      [/Invalid login credentials/i, 'Adresse e-mail ou mot de passe incorrect.'],
      [/Email not confirmed/i, 'Confirmez d’abord votre adresse e-mail (lien reçu par e-mail).'],
      [/User already registered/i, 'Un compte existe déjà avec cette adresse. Connectez-vous.'],
      [/Password should be at least/i, 'Le mot de passe doit contenir au moins 8 caractères.'],
      [/CODE_PROF_INVALIDE|Database error saving new user/i, 'Code professeur inconnu ou déjà utilisé.'],
      [/CLASSE_INCONNUE/i, 'Choisissez d’abord une classe.'],
      [/RESERVE_AU_PROF/i, 'Action réservée au professeur.'],
      [/duplicate key.*classes/i, 'Cette classe existe déjà.'],
      [/rate limit/i, 'Trop de tentatives. Patientez quelques minutes.'],
      [/mime type|invalid_mime/i, 'Seuls les fichiers PDF sont acceptés.'],
      [/Payload too large|exceeded the maximum/i, 'Fichier trop lourd.'],
      [/Failed to fetch|NetworkError|Load failed/i, 'Connexion impossible. Vérifiez votre accès à Internet.']
    ];
    for (let i = 0; i < table.length; i++) if (table[i][0].test(m)) return new Error(table[i][1]);
    return new Error(m);
  }

  window.Store = Store;
})();
