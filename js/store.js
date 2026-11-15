/* ============================================================
   Couche de données : Supabase (comptes, dossiers, dépôts PDF)
   ou mode démonstration (navigateur seul).
   ============================================================ */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG || {};
  const LS_KEY = 'efp_dossier_demo_v1';
  let sb = null;

  const Store = {
    mode: 'demo',
    user: null,
    profile: null,

    init: async function () {
      if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        this.mode = 'cloud';
        const { data } = await sb.auth.getSession();
        if (data && data.session) {
          this.user = data.session.user;
          await this.loadProfile();
        }
      } else {
        this.mode = 'demo';
        this.user = { id: 'demo', email: 'demo' };
        this.profile = { id: 'demo', prenom: 'Mode', nom: 'démonstration', role: 'etudiant', classe: '' };
      }
    },

    /* ---------- Comptes ---------- */
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
      if (sb) await sb.auth.signOut();
      this.user = null; this.profile = null;
    },

    loadProfile: async function () {
      const { data, error } = await sb.from('profiles').select('*').eq('id', this.user.id).single();
      if (error) throw traduire(error);
      this.profile = data;
    },

    /* ---------- Dossier de l'étudiant ---------- */
    loadDossier: async function (userId) {
      if (this.mode === 'demo') {
        try { return JSON.parse(localStorage.getItem(LS_KEY)) || { data: {}, progress: {} }; }
        catch (e) { return { data: {}, progress: {} }; }
      }
      const { data, error } = await sb.from('dossiers').select('data, progress, updated_at').eq('user_id', userId || this.user.id).maybeSingle();
      if (error) throw traduire(error);
      return data || { data: {}, progress: {} };
    },

    saveDossier: async function (dossierData, progress) {
      if (this.mode === 'demo') {
        try { localStorage.setItem(LS_KEY, JSON.stringify({ data: dossierData, progress: progress, updated_at: new Date().toISOString() })); } catch (e) {}
        return;
      }
      const { error } = await sb.from('dossiers').upsert({ user_id: this.user.id, data: dossierData, progress: progress, updated_at: new Date().toISOString() });
      if (error) throw traduire(error);
    },

    resetDemo: function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} },

    /* ---------- Dépôts PDF ---------- */
    listDepots: async function (userId) {
      if (this.mode === 'demo') return [];
      const { data, error } = await sb.from('depots').select('*').eq('user_id', userId || this.user.id).order('created_at', { ascending: false });
      if (error) throw traduire(error);
      return data || [];
    },

    uploadPdf: async function (file) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = this.user.id + '/' + stamp + '.pdf';
      const up = await sb.storage.from('depots').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (up.error) throw traduire(up.error);
      const { error } = await sb.from('depots').insert({ user_id: this.user.id, path: path, filename: file.name, size: file.size });
      if (error) throw traduire(error);
    },

    pdfUrl: async function (path, filename) {
      const { data, error } = await sb.storage.from('depots').createSignedUrl(path, 600, { download: filename || true });
      if (error) throw traduire(error);
      return data.signedUrl;
    },

    /* ---------- Espace professeur ---------- */
    listEtudiants: async function () {
      const p = await sb.from('profiles').select('id, nom, prenom, email, classe, created_at').eq('role', 'etudiant').order('classe').order('nom');
      if (p.error) throw traduire(p.error);
      const d = await sb.from('dossiers').select('user_id, progress, updated_at');
      if (d.error) throw traduire(d.error);
      const dep = await sb.from('depots').select('user_id, path, filename, created_at').order('created_at', { ascending: false });
      if (dep.error) throw traduire(dep.error);
      const dossiers = {}; (d.data || []).forEach(function (x) { dossiers[x.user_id] = x; });
      const depots = {}; (dep.data || []).forEach(function (x) { (depots[x.user_id] = depots[x.user_id] || []).push(x); });
      return (p.data || []).map(function (e) {
        return Object.assign({}, e, { dossier: dossiers[e.id] || null, depots: depots[e.id] || [] });
      });
    },

    listClasses: async function () {
      const { data, error } = await sb.from('classes').select('*').order('code');
      if (error) throw traduire(error);
      return data || [];
    },

    addClasse: async function (code, nom) {
      const { error } = await sb.from('classes').insert({ code: code.trim().toUpperCase(), nom: nom.trim() });
      if (error) throw traduire(error);
    },

    toggleClasse: async function (code, actif) {
      const { error } = await sb.from('classes').update({ actif: actif }).eq('code', code);
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
      [/CODE_CLASSE_INVALIDE|Database error saving new user/i, 'Code classe inconnu ou fermé. Demandez le code à votre professeur.'],
      [/rate limit/i, 'Trop de tentatives. Patientez quelques minutes.'],
      [/mime type|invalid_mime/i, 'Seuls les fichiers PDF sont acceptés.'],
      [/Payload too large|exceeded the maximum/i, 'Fichier trop lourd.'],
      [/Failed to fetch|NetworkError/i, 'Connexion impossible. Vérifiez votre accès à Internet.']
    ];
    for (let i = 0; i < table.length; i++) if (table[i][0].test(m)) return new Error(table[i][1]);
    return new Error(m);
  }

  window.Store = Store;
})();
