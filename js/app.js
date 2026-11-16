/* ============================================================
   Application : espace étudiant, aperçu du dossier, espace prof
   ============================================================ */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG || {};
  const R = window.RUBRIQUES;
  const C = window.Calc;
  const $ = function (s, el) { return (el || document).querySelector(s); };
  const $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  const S = {
    data: {},
    progress: {},
    current: 'r0',
    view: 'rubrique',
    saveTimer: null,
    saving: false,
    dirty: false,
    depots: [],
    readOnly: false
  };

  /* ================= Utilitaires ================= */
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function eur(v, d) { return C.fmtEur(v, d); }
  function pct(v, d) { return C.pct(v, d); }
  function filled(v) { return !(v === undefined || v === null || String(v).trim() === ''); }
  function rub(id) { return R.find(function (r) { return r.id === id; }); }
  function rd(rid) { return S.data[rid] || (S.data[rid] = {}); }
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3500);
  }
  function getPath(path) {
    let o = S.data;
    for (let i = 0; i < path.length; i++) { if (o === undefined || o === null) return undefined; o = o[path[i]]; }
    return o;
  }
  function setPath(path, value) {
    let o = S.data;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i], next = path[i + 1];
      if (o[k] === undefined || o[k] === null) o[k] = /^\d+$/.test(next) ? [] : {};
      o = o[k];
    }
    o[path[path.length - 1]] = value;
  }
  function pathAttr(arr) { return esc(arr.join('|')); }

  /** Un champ conditionnel est-il visible ? (showIf peut viser une autre rubrique avec « rub ») */
  function shown(r, f) {
    if (!f.showIf) return true;
    const src = f.showIf.rub ? rd(f.showIf.rub) : rd(r.id);
    return src[f.showIf.field] === f.showIf.equals;
  }

  /* ================= Complétude ================= */
  function gridRowComplete(f, row) {
    if (!row) return false;
    if (f.anyOf) return f.anyOf.some(function (c) { return filled(row[c]); });
    return f.cols.filter(function (c) { return !c.opt; }).every(function (c) { return filled(row[c.id]); });
  }

  function requirements(r) {
    const d = rd(r.id);
    const items = [];
    r.fields.forEach(function (f) {
      if (!shown(r, f)) return;
      switch (f.type) {
        case 'text': case 'textarea': case 'select': case 'number':
          if (f.req) items.push({ label: f.label, ok: filled(d[f.id]) });
          break;
        case 'check':
          if (f.req) items.push({ label: f.label, ok: d[f.id] === true });
          break;
        case 'grid': {
          const n = f.req || 0;
          if (!n) break;
          let rows = d[f.id];
          let count = 0;
          if (f.dynamic) count = (rows || []).filter(function (row) { return gridRowComplete(f, row); }).length;
          else count = f.rows.filter(function (rw) { return gridRowComplete(f, (rows || {})[rw.id]); }).length;
          items.push({ label: f.label + ' (' + Math.min(count, n) + '/' + n + ')', ok: count >= n });
          break;
        }
        case 'hexagone': {
          const h = d[f.id] || {};
          const ok = window.FORCES.every(function (fo) { return h[fo.id] && filled(h[fo.id].note) && filled(h[fo.id].justif); });
          items.push({ label: f.label, ok: ok });
          break;
        }
        case 'swot': {
          const s = d[f.id] || {};
          items.push({ label: 'Les 4 cases du SWOT', ok: ['forces', 'faiblesses', 'opportunites', 'menaces'].every(function (k) { return filled(s[k]); }) });
          break;
        }
        case 'canvas': {
          const b = d[f.id] || {};
          const n = window.CANVAS.filter(function (c) { return filled(b[c.id]); }).length;
          items.push({ label: 'Les 9 blocs du Canvas (' + n + '/9)', ok: n === 9 });
          break;
        }
        case 'carte': {
          const c = d[f.id] || {};
          const pts = (c.points || []).filter(function (p) { return filled(p.nom) && filled(p.x) && filled(p.y); });
          const moi = pts.some(function (p) { return p.moi; });
          items.push({ label: 'Carte : les deux axes', ok: filled(c.axe_x) && filled(c.axe_y) });
          items.push({ label: 'Carte : au moins 3 concurrents et votre projet', ok: pts.length >= 4 && moi });
          break;
        }
        case 'finance': {
          (f.req || []).forEach(function (k) { items.push({ label: FIN_LABELS[k] || k, ok: filled(d[k]) }); });
          if (rd('r1').type_projet === 'Reprise') items.push({ label: FIN_LABELS.b_fonds, ok: C.num(d.b_fonds) > 0 });
          const fc = finance();
          if (fc.totBesoins > 0) items.push({ label: 'Plan de financement équilibré', ok: Math.abs(fc.totBesoins - fc.totRessources) < 1 });
          if (C.num(d.r_emprunt) > 0) items.push({ label: 'Taux et durée de l’emprunt', ok: filled(d.taux_emprunt) && filled(d.duree_emprunt) });
          break;
        }
        case 'autoeval': {
          const a = d[f.id] || {};
          const n = window.COMPETENCES.filter(function (cp) { return a[cp.code] && filled(a[cp.code].niveau); }).length;
          items.push({ label: 'Auto-évaluation des 6 compétences (' + n + '/6)', ok: n === 6 });
          break;
        }
        case 'coherence': {
          const co = C.coherence(S.data);
          const bad = co.checks.filter(function (c) { return c.etat === 'ko' || c.etat === 'todo'; });
          items.push({ label: 'Contrôle de cohérence sans erreur', ok: bad.length === 0 });
          items.push({ label: 'Cohérence vérifiée à la main (cible, promesse, communication)', ok: d.coh_manuel_1 === true && d.coh_manuel_2 === true });
          break;
        }
      }
    });
    return items;
  }

  function completion(r) {
    const items = requirements(r);
    const done = items.filter(function (i) { return i.ok; }).length;
    return { done: done, total: items.length, pct: items.length ? done / items.length : 1, missing: items.filter(function (i) { return !i.ok; }) };
  }

  function computeProgress() {
    const p = {};
    R.forEach(function (r) { p[r.id] = Math.round(completion(r).pct * 100); });
    S.progress = p;
    return p;
  }

  function globalPct() {
    const vals = R.map(function (r) { return S.progress[r.id] || 0; });
    return Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
  }

  function isUnlocked(rid) {
    if (!cfg.PROGRESSION_GUIDEE || S.readOnly) return true;
    const idx = R.findIndex(function (r) { return r.id === rid; });
    for (let i = 0; i < idx; i++) if ((S.progress[R[i].id] || 0) < 100) return false;
    return true;
  }
  function firstIncomplete() {
    const r = R.find(function (x) { return (S.progress[x.id] || 0) < 100; });
    return r ? r.id : R[R.length - 1].id;
  }

  function ca() { return C.caCalc(rd('r6'), rd('r3')); }
  function finance() { return C.financeCalc(rd('r8'), ca()); }

  /* ================= Sauvegarde ================= */
  function scheduleSave() {
    if (S.readOnly) return;
    S.dirty = true;
    setSaveStatus('pending');
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(saveNow, 900);
  }
  async function saveNow() {
    if (!S.dirty || S.readOnly) return;
    clearTimeout(S.saveTimer);
    S.dirty = false;
    setSaveStatus('saving');
    try {
      await Store.saveDossier(S.data, S.progress);
      setSaveStatus('saved');
    } catch (e) {
      S.dirty = true;
      setSaveStatus('error', e.message);
      clearTimeout(S.saveTimer);
      S.saveTimer = setTimeout(saveNow, 5000);
    }
  }
  function setSaveStatus(st, msg) {
    const el = $('#save-status');
    if (!el) return;
    const t = { pending: 'Modifications en cours…', saving: 'Enregistrement…', saved: Store.mode === 'demo' ? 'Enregistré dans ce navigateur' : 'Enregistré', error: 'Non enregistré — nouvel essai…' };
    el.textContent = t[st] || '';
    el.className = 'save-status ' + st;
    if (msg) el.title = msg;
  }

  /* ================= Rendu des champs ================= */
  function fieldHtml(r, f) {
    const d = rd(r.id);
    const p = [r.id, f.id];
    const ro = S.readOnly ? ' disabled' : '';
    const help = f.help ? '<p class="help">' + esc(f.help) + '</p>' : '';
    const req = f.req ? '<span class="req" title="Obligatoire pour avancer">*</span>' : '';
    if (!shown(r, f)) return '';
    switch (f.type) {
      case 'heading':
        return '<h3 class="form-heading">' + esc(f.label) + '</h3>';
      case 'text':
        return '<div class="field' + (f.inline ? ' inline' : '') + '"><label>' + esc(f.label) + req + '</label>' + help +
          '<input type="text" data-path="' + pathAttr(p) + '" value="' + esc(d[f.id]) + '" placeholder="' + esc(f.ph || '') + '"' + ro + '></div>';
      case 'number':
        return '<div class="field' + (f.inline ? ' inline' : '') + '"><label>' + esc(f.label) + req + '</label>' + help +
          '<input type="number" inputmode="decimal" data-path="' + pathAttr(p) + '" value="' + esc(d[f.id]) + '"' + (f.step ? ' step="' + f.step + '"' : '') + (f.min !== undefined ? ' min="' + f.min + '"' : '') + ro + '></div>';
      case 'textarea':
        return '<div class="field"><label>' + esc(f.label) + req + '</label>' + help +
          '<textarea rows="' + (f.rows || 3) + '" data-path="' + pathAttr(p) + '" placeholder="' + esc(f.ph || '') + '"' + ro + '>' + esc(d[f.id]) + '</textarea></div>';
      case 'select': {
        const opts = f.options.map(function (o) {
          const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
          return '<option value="' + esc(v) + '"' + (String(d[f.id] || '') === String(v) ? ' selected' : '') + '>' + esc(l || 'Choisir…') + '</option>';
        }).join('');
        return '<div class="field' + (f.inline ? ' inline' : '') + '"><label>' + esc(f.label) + req + '</label>' + help +
          '<select data-path="' + pathAttr(p) + '" data-rerender="1"' + ro + '>' + opts + '</select></div>';
      }
      case 'check':
        return '<label class="check"><input type="checkbox" data-path="' + pathAttr(p) + '"' + (d[f.id] === true ? ' checked' : '') + ro + '><span>' + esc(f.label) + '</span></label>';
      case 'grid': return gridHtml(r, f);
      case 'hexagone': return hexaHtml(r, f);
      case 'swot': return swotHtml(r, f);
      case 'canvas': return canvasHtml(r, f);
      case 'carte': return carteHtml(r, f);
      case 'ca': return '<div id="ca-results" class="calc-box">' + caResultsHtml() + '</div>';
      case 'finance': return financeHtml(r, f);
      case 'reprise': return '<div id="reprise-box" class="calc-box">' + repriseHtml() + '</div>';
      case 'oral': return '<div class="calc-box oral-launch"><h4>Mon kit oral</h4><p>Le site prépare vos supports du jour J (un visuel par support, dans l’ordre du plan minuté), votre fiche de chiffres à connaître par cœur et un entraînement aux questions du jury.</p><button type="button" class="btn" id="btn-oral">Ouvrir mon kit oral</button></div>';
      case 'autoeval': return '<div id="autoeval-box">' + autoevalHtml(r, f) + '</div>';
      case 'coherence': return '<div id="coherence-box">' + coherenceHtml(r) + '</div>';
      case 'depot': return '<div id="depot-box">' + depotHtml() + '</div>';
    }
    return '';
  }

  function cellInput(path, c, val) {
    const ro = S.readOnly ? ' disabled' : '';
    if (c.type === 'textarea') return '<textarea rows="2" data-path="' + pathAttr(path) + '"' + ro + '>' + esc(val) + '</textarea>';
    if (c.type === 'select') return '<select data-path="' + pathAttr(path) + '"' + ro + '>' + c.options.map(function (o) { return '<option' + (String(val || '') === o ? ' selected' : '') + ' value="' + esc(o) + '">' + esc(o || '—') + '</option>'; }).join('') + '</select>';
    if (c.type === 'number') return '<input type="number" inputmode="decimal" data-path="' + pathAttr(path) + '" value="' + esc(val) + '"' + ro + '>';
    return '<input type="text" data-path="' + pathAttr(path) + '" value="' + esc(val) + '"' + ro + '>';
  }

  function gridHtml(r, f) {
    const d = rd(r.id);
    const req = f.req ? '<span class="req">*</span>' : '';
    let rows = d[f.id];
    let body = '';
    const head = '<tr>' + (f.rows ? '<th class="rowhead"></th>' : '') + f.cols.map(function (c) { return '<th class="' + (c.w || '') + '">' + esc(c.label) + (c.opt ? ' <span class="opt">(facultatif)</span>' : '') + '</th>'; }).join('') + (f.dynamic && !S.readOnly ? '<th class="act"></th>' : '') + '</tr>';
    if (f.dynamic) {
      if (!Array.isArray(rows)) { rows = []; d[f.id] = rows; }
      while (rows.length < (f.minRows || 1)) rows.push({});
      body = rows.map(function (row, i) {
        return '<tr>' + f.cols.map(function (c) { return '<td class="' + (c.w || '') + '">' + cellInput([r.id, f.id, String(i), c.id], c, row[c.id]) + '</td>'; }).join('') +
          (!S.readOnly ? '<td class="act">' + (rows.length > (f.minRows || 1) ? '<button type="button" class="icon-btn" data-del-row="' + pathAttr([r.id, f.id, String(i)]) + '" title="Supprimer la ligne" aria-label="Supprimer la ligne">✕</button>' : '') + '</td>' : '') + '</tr>';
      }).join('');
    } else {
      rows = rows || {};
      body = f.rows.map(function (rw) {
        const row = rows[rw.id] || {};
        return '<tr><th class="rowhead">' + esc(rw.label) + '</th>' + f.cols.map(function (c) { return '<td class="' + (c.w || '') + '">' + cellInput([r.id, f.id, rw.id, c.id], c, row[c.id]) + '</td>'; }).join('') + '</tr>';
      }).join('');
    }
    let foot = '';
    if (f.total) {
      const tot = (rows || []).reduce(function (s, row) { return s + C.num(row[f.total]); }, 0);
      foot = '<p class="grid-total" data-total="' + pathAttr([r.id, f.id]) + '">Total : <strong>' + eur(tot) + '</strong></p>';
    }
    return '<div class="field grid-field"><label>' + esc(f.label) + req + '</label>' + (f.help ? '<p class="help">' + esc(f.help) + '</p>' : '') + (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') +
      '<div class="table-wrap"><table class="grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      (f.dynamic && !S.readOnly ? '<button type="button" class="btn ghost small" data-add-row="' + pathAttr([r.id, f.id]) + '">+ Ajouter une ligne</button>' : '') + foot + '</div>';
  }

  function hexaHtml(r, f) {
    const h = rd(r.id)[f.id] || {};
    const ro = S.readOnly ? ' disabled' : '';
    const rows = window.FORCES.map(function (fo) {
      const v = h[fo.id] || {};
      const opts = ['', '1', '2', '3', '4', '5'].map(function (n) { return '<option' + (String(v.note || '') === n ? ' selected' : '') + ' value="' + n + '">' + (n || '—') + '</option>'; }).join('');
      return '<tr><th class="rowhead">' + esc(fo.label) + '</th><td class="sm"><select data-path="' + pathAttr([r.id, f.id, fo.id, 'note']) + '" data-live="radar"' + ro + '>' + opts + '</select></td><td><input type="text" data-path="' + pathAttr([r.id, f.id, fo.id, 'justif']) + '" value="' + esc(v.justif) + '" placeholder="Pourquoi cette note ?"' + ro + '></td></tr>';
    }).join('');
    return '<div class="field"><label>' + esc(f.label) + '<span class="req">*</span></label><p class="help">' + esc(f.help) + '</p>' +
      '<div class="hexa-layout"><div class="table-wrap"><table class="grid"><thead><tr><th class="rowhead">Force</th><th class="sm">Note</th><th>Justification</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="radar" id="radar-' + r.id + '">' + radarSvg(h) + '</div></div></div>';
  }

  function radarSvg(h) {
    const cx = 150, cy = 140, R0 = 100, n = 6;
    const pt = function (i, v) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R0 * v / 5, cy + Math.sin(a) * R0 * v / 5]; };
    let grid = '';
    for (let lv = 1; lv <= 5; lv++) grid += '<polygon points="' + [0, 1, 2, 3, 4, 5].map(function (i) { return pt(i, lv).join(','); }).join(' ') + '" class="radar-grid"/>';
    const axes = [0, 1, 2, 3, 4, 5].map(function (i) { const e = pt(i, 5); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="radar-grid"/>'; }).join('');
    const vals = window.FORCES.map(function (fo, i) { return pt(i, C.num((h[fo.id] || {}).note)); });
    const poly = '<polygon points="' + vals.map(function (p) { return p.join(','); }).join(' ') + '" class="radar-area"/>';
    const labels = window.FORCES.map(function (fo, i) {
      const e = pt(i, 6.1); const short = fo.label.replace('Menace des ', '').replace('Pouvoir des ', '').replace('Intensité concurrentielle', 'Intensité').replace('Rôle de l’État', 'État');
      return '<text x="' + e[0] + '" y="' + (e[1] + 4) + '" text-anchor="middle" class="radar-label">' + esc(short.charAt(0).toUpperCase() + short.slice(1)) + ' ' + (C.num((h[fo.id] || {}).note) || '–') + '</text>';
    }).join('');
    return '<svg viewBox="0 0 300 285" role="img" aria-label="Hexagone sectoriel">' + grid + axes + poly + labels + '</svg>';
  }

  function swotHtml(r, f) {
    const s = rd(r.id)[f.id] || {};
    const ro = S.readOnly ? ' disabled' : '';
    const box = function (k, t, sub, cls) { return '<div class="swot-box ' + cls + '"><label>' + t + ' <span class="sub">' + sub + '</span><span class="req">*</span></label><textarea rows="5" data-path="' + pathAttr([r.id, f.id, k]) + '" placeholder="3 à 5 éléments, du plus important au moins important"' + ro + '>' + esc(s[k]) + '</textarea></div>'; };
    return '<div class="swot">' + box('forces', 'Forces', 'interne', 's') + box('faiblesses', 'Faiblesses', 'interne', 'w') + box('opportunites', 'Opportunités', 'externe', 'o') + box('menaces', 'Menaces', 'externe', 't') + '</div>';
  }

  function canvasHtml(r, f) {
    const b = rd(r.id)[f.id] || {};
    const ro = S.readOnly ? ' disabled' : '';
    return '<div class="canvas">' + window.CANVAS.map(function (c) {
      return '<div class="cv-box cv-' + c.area + '"><label>' + esc(c.label) + '<span class="req">*</span></label><p class="help">' + esc(c.q) + '</p><textarea rows="5" data-path="' + pathAttr([r.id, f.id, c.id]) + '"' + ro + '>' + esc(b[c.id]) + '</textarea></div>';
    }).join('') + '</div>';
  }

  function carteHtml(r, f) {
    const d = rd(r.id);
    const c = d[f.id] || (d[f.id] = {});
    if (!Array.isArray(c.points)) c.points = [{ nom: '', x: '', y: '', moi: true }, {}, {}, {}];
    const ro = S.readOnly ? ' disabled' : '';
    const ax = function (k, ph) { return '<input type="text" data-path="' + pathAttr([r.id, f.id, k]) + '" data-live="carte" value="' + esc(c[k]) + '" placeholder="' + ph + '"' + ro + '>'; };
    const pts = c.points.map(function (p, i) {
      return '<tr><td><input type="text" data-live="carte" data-path="' + pathAttr([r.id, f.id, 'points', String(i), 'nom']) + '" value="' + esc(p.nom) + '" placeholder="' + (p.moi ? 'Mon projet' : 'Concurrent') + '"' + ro + '></td>' +
        '<td class="sm"><input type="number" min="1" max="10" data-live="carte" data-path="' + pathAttr([r.id, f.id, 'points', String(i), 'x']) + '" value="' + esc(p.x) + '"' + ro + '></td>' +
        '<td class="sm"><input type="number" min="1" max="10" data-live="carte" data-path="' + pathAttr([r.id, f.id, 'points', String(i), 'y']) + '" value="' + esc(p.y) + '"' + ro + '></td>' +
        '<td class="sm center">' + (p.moi ? '<span class="tag">moi</span>' : '') + '</td>' +
        (!S.readOnly ? '<td class="act">' + (!p.moi && c.points.length > 4 ? '<button type="button" class="icon-btn" data-del-row="' + pathAttr([r.id, f.id, 'points', String(i)]) + '" aria-label="Supprimer">✕</button>' : '') + '</td>' : '') + '</tr>';
    }).join('');
    return '<div class="field"><label>' + esc(f.label) + '<span class="req">*</span></label><p class="help">' + esc(f.help) + '</p>' +
      '<div class="carte-axes"><div><span class="mini-label">Axe horizontal (critère 1)</span>' + ax('axe_x', 'Ex. : prix') + '</div><div><span class="mini-label">Axe vertical (critère 2)</span>' + ax('axe_y', 'Ex. : expérience proposée') + '</div></div>' +
      '<div class="hexa-layout"><div class="table-wrap"><table class="grid"><thead><tr><th>Offre</th><th class="sm">Note axe 1 (1-10)</th><th class="sm">Note axe 2 (1-10)</th><th class="sm"></th>' + (!S.readOnly ? '<th class="act"></th>' : '') + '</tr></thead><tbody>' + pts + '</tbody></table></div>' +
      '<div class="radar" id="carte-svg">' + carteSvg(c) + '</div></div>' +
      (!S.readOnly ? '<button type="button" class="btn ghost small" data-add-row="' + pathAttr([r.id, f.id, 'points']) + '">+ Ajouter un concurrent</button>' : '') + '</div>';
  }

  function carteSvg(c) {
    const W = 300, H = 285, m = 34;
    const X = function (v) { return m + (C.num(v) - 1) / 9 * (W - 2 * m); };
    const Y = function (v) { return H - m - (C.num(v) - 1) / 9 * (H - 2 * m); };
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Carte perceptuelle">';
    s += '<line x1="' + m + '" y1="' + (H / 2) + '" x2="' + (W - m) + '" y2="' + (H / 2) + '" class="axis"/><line x1="' + (W / 2) + '" y1="' + m + '" x2="' + (W / 2) + '" y2="' + (H - m) + '" class="axis"/>';
    s += '<text x="' + (W - m) + '" y="' + (H / 2 - 6) + '" text-anchor="end" class="axis-label">' + esc(c.axe_x || 'Axe 1') + ' +</text>';
    s += '<text x="' + (W / 2 + 6) + '" y="' + (m - 10) + '" class="axis-label">' + esc(c.axe_y || 'Axe 2') + ' +</text>';
    (c.points || []).forEach(function (p) {
      if (!filled(p.x) || !filled(p.y)) return;
      const x = X(p.x), y = Y(p.y);
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + (p.moi ? 8 : 6) + '" class="' + (p.moi ? 'pt-moi' : 'pt') + '"/>';
      s += '<text x="' + x + '" y="' + (y - 11) + '" text-anchor="middle" class="pt-label' + (p.moi ? ' moi' : '') + '">' + esc(p.nom || (p.moi ? 'Mon projet' : '')) + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- Bloc chiffre d'affaires ---------- */
  function caResultsHtml() {
    const c = ca();
    if (!c.base && !c.panierTTC) return '<p class="muted">Le calcul s’affiche ici dès que vous saisissez vos valeurs.</p>';
    const rows = ['prudent', 'moyen', 'optimiste'].map(function (k) {
      const s = c.sc[k];
      return '<tr' + (k === 'prudent' ? ' class="hl"' : '') + '><th>' + k.charAt(0).toUpperCase() + k.slice(1) + (k === 'prudent' ? ' (retenu)' : '') + '</th><td>' + s.taux.toLocaleString('fr-FR') + ' %</td><td>' + s.clients.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + '</td><td>' + eur(c.panierHT, 2) + '</td><td>' + c.jours + '</td><td><strong>' + eur(s.ca) + '</strong></td></tr>';
    }).join('');
    return gammesHtml(c) + '<h4>Mon chiffre d’affaires prévisionnel (calculé automatiquement)</h4>' +
      '<div class="table-wrap"><table class="result"><thead><tr><th>Scénario</th><th>Taux</th><th>Clients / jour</th><th>Panier HT</th><th>Jours</th><th>CA annuel HT</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="formula">' + esc(C.num(rd('r6').base).toLocaleString('fr-FR')) + ' × ' + c.sc.prudent.taux.toLocaleString('fr-FR') + ' % = ' + c.sc.prudent.clients.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' clients par jour × ' + eur(c.panierHT, 2) + ' HT × ' + c.jours + ' jours = <strong>' + eur(c.caPrudent) + ' HT</strong></p>' +
      scenariosSvg(c) + msgList(c.alertes, c.ok) +
      '<p class="muted small">C’est ce chiffre prudent qui sera repris automatiquement dans vos finances (rubrique 8).</p>';
  }

  function repriseHtml() {
    const rp = C.repriseCalc(rd('r2'), rd('r8'));
    if (!rp.caMoy) return '<p class="muted">L’évaluation du fonds s’affiche ici dès que vous saisissez le CA des derniers exercices.</p>';
    return '<h4>Ce que vaut l’affaire (calculé automatiquement)</h4><ol class="steps">' +
      '<li>CA moyen sur ' + rp.nbAnnees + ' exercice' + (rp.nbAnnees > 1 ? 's' : '') + ' : <strong>' + eur(rp.caMoy) + '</strong>' + (rp.nbAnnees >= 2 ? ' (évolution sur la période : ' + (rp.tendance >= 0 ? '+' : '') + pct(rp.tendance) + ')' : '') + '</li>' +
      (rp.vMax ? '<li>Méthode des barèmes : ' + eur(rp.caMoy) + ' × ' + C.num(rd('r2').reprise_bareme_min).toLocaleString('fr-FR') + ' à ' + C.num(rd('r2').reprise_bareme_max).toLocaleString('fr-FR') + ' % = <strong>' + eur(rp.vMin) + ' à ' + eur(rp.vMax) + '</strong></li>' : '') +
      (rp.annees ? '<li>Méthode de la rentabilité : le prix demandé représente <strong>' + rp.annees.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' années</strong> de résultat moyen (' + eur(rp.resMoy) + ' par an).</li>' : '') +
      '</ol>' + msgList(rp.alertes, rp.ok) +
      '<p class="muted small">Le prix que vous retenez se saisit dans le plan de financement (rubrique 8). Le CA de l’affaire est votre meilleure base pour estimer votre propre CA (rubrique 6).</p>';
  }

  function gammesHtml(c) {
    if (!c.gammes) return '';
    return '<div class="table-wrap"><table class="result"><thead><tr><th>Gamme</th><th class="num">Part</th><th class="num">TVA</th><th class="num">TTC dans le panier</th><th class="num">HT</th></tr></thead><tbody>' +
      c.gammes.rows.map(function (g) { return '<tr><td>' + esc(g.nom) + '</td><td class="num">' + g.part.toLocaleString('fr-FR') + ' %</td><td class="num">' + g.tva.toLocaleString('fr-FR') + ' %</td><td class="num">' + eur(g.ttc, 2) + '</td><td class="num">' + eur(g.ht, 2) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Panier</td><td class="num">' + c.gammes.totPart.toLocaleString('fr-FR') + ' %</td><td class="num">' + c.tva.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %</td><td class="num">' + eur(c.panierTTC, 2) + '</td><td class="num">' + eur(c.panierHT, 2) + '</td></tr></tbody></table></div>' +
      (c.gammes.tauxVar !== null ? '<p class="muted small">Coût d’achat moyen de votre panier : <strong>' + c.gammes.tauxVar.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %</strong> du CA HT — c’est le taux de charges variables à reprendre en rubrique 8.</p>' : '');
  }

    function msgList(alertes, ok) {
    return (alertes.length ? '<ul class="msgs">' + alertes.map(function (a) { return '<li class="warn">' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
      (ok.length ? '<ul class="msgs">' + ok.map(function (a) { return '<li class="ok">' + esc(a) + '</li>'; }).join('') + '</ul>' : '');
  }

  /* ---------- Bloc finances ---------- */
  const FIN_LABELS = {
    b_invest: 'Investissements amortissables (travaux, matériel)', b_treso: 'Trésorerie de départ', r_apport: 'Apport personnel',
    taux_var: 'Taux de charges variables', src_var: 'Source du taux de charges variables', c_loyer: 'Loyer annuel', src_loyer: 'Source du loyer',
    c_energie: 'Énergie et eau', c_assurance: 'Assurances', c_compta: 'Comptabilité, banque, caisse', c_comm: 'Communication après lancement',
    remu_net: 'Ma rémunération nette mensuelle', taux_cotis: 'Taux de cotisations sociales',
    b_fonds: 'Prix du fonds de commerce repris', bfr_stock_j: 'BFR : jours de stock', bfr_clients_j: 'BFR : délai de paiement des clients',
    bfr_fourn_j: 'BFR : délai de paiement des fournisseurs', croissance_a2: 'Évolution du CA en année 2', croissance_a3: 'Évolution du CA en année 3',
    mois_debut: 'Mois d’ouverture'
  };

  function finField(key, label, opts) {
    opts = opts || {};
    const d = rd('r8');
    const ro = S.readOnly ? ' disabled' : '';
    const isReq = FIN_REQ.indexOf(key) >= 0;
    const src = opts.src ? '<input type="text" class="src" data-path="' + pathAttr(['r8', opts.src]) + '" value="' + esc(d[opts.src]) + '" placeholder="D’où vient ce chiffre ?"' + ro + '>' : '';
    return '<div class="fin-row"><label>' + esc(label) + (isReq ? '<span class="req">*</span>' : '') + (opts.help ? '<span class="help">' + esc(opts.help) + '</span>' : '') + '</label>' +
      '<div class="fin-inputs"><span class="num-wrap' + (opts.unit === '%' ? ' pct' : '') + '"><input type="number" inputmode="decimal" step="any" data-path="' + pathAttr(['r8', key]) + '" value="' + esc(d[key]) + '"' + ro + '><span class="unit">' + (opts.unit || '€') + '</span></span>' + src + '</div></div>';
  }
  let FIN_REQ = [];

  function finSelect(key, label, options, help) {
    const d = rd('r8');
    const ro = S.readOnly ? ' disabled' : '';
    const isReq = FIN_REQ.indexOf(key) >= 0;
    const opts = options.map(function (o) { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(d[key] || '') === String(v) ? ' selected' : '') + '>' + esc(l || 'Choisir…') + '</option>'; }).join('');
    return '<div class="fin-row"><label>' + esc(label) + (isReq ? '<span class="req">*</span>' : '') + (help ? '<span class="help">' + esc(help) + '</span>' : '') + '</label>' +
      '<div class="fin-inputs"><select data-path="' + pathAttr(['r8', key]) + '" data-live="fin"' + ro + '>' + opts + '</select></div></div>';
  }

  /** Lignes libres de la partie finance (tableaux à lignes ajoutables). */
  const X_GRIDS = {
    x_besoins: { label: 'Mes autres besoins', help: 'Ce qui ne rentre dans aucune case ci-dessus : un véhicule, un site marchand, une licence, une caution… Choisissez sa nature : elle décide où il va dans les calculs.',
      cols: [{ id: 'lib', label: 'Quoi ?', w: 'w-lg' }, { id: 'nature', label: 'Nature', type: 'select', options: [''].concat(C.NAT_BESOINS) }, { id: 'montant', label: 'Montant HT (€)', type: 'number' }, { id: 'duree', label: 'Amorti sur (ans)', type: 'number', opt: true }, { id: 'src', label: 'Source (devis, annonce…)', w: 'w-lg' }] },
    x_ressources: { label: 'Mes autres ressources', help: 'Apport d’un associé, financement participatif, prêt Bpifrance, prêt familial, subvention de la Région… Un emprunt ajouté ici a son propre taux et sa propre durée.',
      cols: [{ id: 'lib', label: 'Quoi ?', w: 'w-lg' }, { id: 'nature', label: 'Nature', type: 'select', options: [''].concat(C.NAT_RESSOURCES) }, { id: 'montant', label: 'Montant (€)', type: 'number' }, { id: 'taux', label: 'Taux si emprunt (%)', type: 'number', opt: true }, { id: 'duree', label: 'Durée si emprunt (ans)', type: 'number', opt: true }, { id: 'src', label: 'Source', w: 'w-lg' }] },
    x_charges: { label: 'Mes autres charges fixes', help: 'Une ligne par charge qui revient chaque année, quel que soit le chiffre d’affaires : leasing ou location de matériel, logiciel de caisse, site internet, frais de déplacement, cotisation à un réseau, contrat de maintenance…',
      cols: [{ id: 'lib', label: 'Quoi ?', w: 'w-lg' }, { id: 'montant', label: 'Montant HT par an (€)', type: 'number' }, { id: 'tva', label: 'TVA', type: 'select', options: ['Avec TVA', 'Sans TVA'] }, { id: 'src', label: 'Source', w: 'w-lg' }] },
    x_var: { label: 'Mes autres charges variables', help: 'Les coûts qui suivent les ventes, en % du chiffre d’affaires : commission sur la carte bancaire, commission d’une plateforme de livraison ou de réservation, frais de port offerts, emballages…',
      cols: [{ id: 'lib', label: 'Quoi ?', w: 'w-lg' }, { id: 'pct', label: '% du CA HT', type: 'number' }, { id: 'tva', label: 'TVA', type: 'select', options: ['Avec TVA', 'Sans TVA'] }, { id: 'src', label: 'Source', w: 'w-lg' }] },
    x_recettes: { label: 'Mes recettes annexes', help: 'Ce que vous vendez en plus de votre activité principale : ateliers, privatisation, location d’espace, cartes cadeaux, vente en ligne, dépôt-vente… Indiquez le montant annuel HT et ce qu’il vous coûte.',
      cols: [{ id: 'lib', label: 'Quoi ?', w: 'w-lg' }, { id: 'montant', label: 'Montant HT par an (€)', type: 'number' }, { id: 'cout', label: 'Coût variable (% de ce montant)', type: 'number', opt: true }, { id: 'tva', label: 'TVA (%)', type: 'select', options: ['20', '10', '5.5', '0'] }, { id: 'src', label: 'Source', w: 'w-lg' }] }
  };
  function xGrid(id) { const g = X_GRIDS[id]; return '<div class="x-lines">' + gridHtml({ id: 'r8' }, { id: id, label: g.label, help: g.help, cols: g.cols, dynamic: true, minRows: 1 }) + '</div>'; }

  function financeHtml(r, f) {
    FIN_REQ = f.req || [];
    const reprise = rd('r1').type_projet === 'Reprise';
    return '<div class="fin">' +
      '<h3 class="form-heading">1. Mon plan de financement initial</h3>' +
      '<p class="help">Règle absolue : total des besoins = total des ressources. Tous les montants en HT.</p>' +
      '<div class="fin-cols"><div class="fin-col"><h4>Besoins</h4>' +
        (reprise ? finField('b_fonds', 'Rachat du fonds de commerce (prix négocié + frais d’acte)', { src: 'src_fonds', help: 'Comparez-le à la fourchette calculée en rubrique 2' }) : '') +
        finField('b_invest', 'Investissements amortissables', { src: 'src_invest', help: 'Travaux, matériel, mobilier, véhicule acheté' }) +
        finField('duree_amort', 'Durée d’amortissement', { unit: 'ans', help: '5 ans par défaut' }) +
        finField('b_non_amort', 'Investissements non amortis', { src: 'src_non_amort', help: reprise ? 'Dépôt de garantie, licence' : 'Dépôt de garantie, droit au bail ou pas-de-porte, licence' }) +
        finField('b_stock', 'Stock de départ', { src: 'src_stock' }) +
        finField('b_frais', 'Frais de lancement', { src: 'src_frais', help: 'Immatriculation, communication de lancement, formations' }) +
        finField('b_treso', 'Trésorerie de départ', { help: 'Au moins 2 mois de charges' }) +
        '<p class="fin-total" id="fin-tot-b"></p></div>' +
      '<div class="fin-col"><h4>Ressources</h4>' +
        finField('r_apport', 'Apport personnel') +
        finField('r_honneur', 'Prêt d’honneur (taux zéro)') +
        finField('r_aides', 'Aides et subventions vérifiées') +
        finField('r_emprunt', 'Emprunt bancaire') +
        finField('taux_emprunt', 'Taux de l’emprunt', { unit: '%' }) +
        finField('duree_emprunt', 'Durée de l’emprunt', { unit: 'ans' }) +
        '<p class="fin-total" id="fin-tot-r"></p></div></div>' +
      xGrid('x_besoins') + xGrid('x_ressources') +
      '<div id="fin-balance"></div>' +

      '<h3 class="form-heading">2. Mes charges (compte de résultat, année 1, scénario prudent)</h3>' +
      '<p class="help">Le chiffre d’affaires vient de la rubrique 6. Les frais de lancement, les intérêts, les amortissements et votre rémunération sont calculés pour vous.</p>' +
      finField('taux_var', 'Charges variables en % du CA HT', { unit: '%', src: 'src_var', help: 'Matières ou marchandises, emballages, commissions' }) +
      finField('c_loyer', 'Loyer et charges locatives (par an)', { src: 'src_loyer' }) +
      finField('c_energie', 'Énergie, eau, téléphone (par an)', { src: 'src_energie' }) +
      finField('c_assurance', 'Assurances (par an)', { src: 'src_assurance' }) +
      finField('c_compta', 'Comptabilité, banque, caisse (par an)', { src: 'src_compta' }) +
      finField('c_comm', 'Communication après lancement (par an)', { src: 'src_comm' }) +
      finField('c_salaires', 'Salaires, coût employeur (par an)', { src: 'src_salaires', help: 'Le même montant qu’en rubrique 7' }) +
      finField('c_autres', 'Autres charges fixes (par an)', { src: 'src_autres', help: 'Entretien, abonnements, leasing…' }) +
      finField('c_impots', 'Impôts et taxes (par an)', { src: 'src_impots', help: 'CFE (cotisation foncière des entreprises), taxe sur les enseignes… La CFE n’est pas due l’année de création.' }) +
      finField('remu_net', 'Ma rémunération nette (par mois)') +
      (rd('r8').statut === 'Micro-entreprise'
        ? finField('taux_cotis', 'Cotisations sociales en % du chiffre d\u2019affaires', { unit: '%', help: 'Micro-entreprise : taux fixé par l\u2019URSSAF selon l\u2019activité (vente ou service), à vérifier sur urssaf.fr' })
        : finField('taux_cotis', 'Cotisations sociales en % du net', { unit: '%', help: 'Ordre de grandeur à confirmer au simulateur URSSAF selon le statut' })) +
      xGrid('x_charges') + xGrid('x_var') + xGrid('x_recettes') +
      '<h3 class="form-heading">3. Mon besoin en fonds de roulement (BFR)</h3>' +
      '<p class="help">L’argent bloqué dans le cycle d’exploitation : le stock à financer, plus ce que les clients vous doivent, moins ce que vous devez à vos fournisseurs (méthode Bpifrance Création).</p>' +
      finField('bfr_stock_j', 'Stock moyen, en jours d’achats', { unit: 'jours', help: 'Ex. : 7 pour un café livré chaque semaine, 60 à 90 pour une boutique de vêtements' }) +
      finField('bfr_clients_j', 'Délai de paiement de mes clients', { unit: 'jours', help: '0 si les clients paient sur place ; 30 à 60 pour des clients professionnels' }) +
      finField('bfr_fourn_j', 'Délai de paiement accordé par mes fournisseurs', { unit: 'jours', help: '0 si vous payez à la commande ; 30 jours est courant' }) +

      '<h3 class="form-heading">4. Mes années 2 et 3</h3>' +
      '<p class="help">Seuls les changements sont à indiquer. Une case vide reprend le montant de l’année précédente.</p>' +
      finField('croissance_a2', 'Évolution du CA en année 2', { unit: '%', help: 'Ex. : 10 (bouche-à-oreille, fidélisation) — justifiez-la à l’oral' }) +
      finField('croissance_a3', 'Évolution du CA en année 3', { unit: '%', help: 'En général plus faible que l’année 2' }) +
      finField('hausse_charges', 'Hausse annuelle des charges fixes', { unit: '%', help: '2 par défaut (inflation)' }) +
      finField('c_salaires_a2', 'Salaires en année 2 (coût employeur, par an)', { help: 'Si votre signal de recrutement (rubrique 7) est atteint' }) +
      finField('c_salaires_a3', 'Salaires en année 3 (coût employeur, par an)') +
      finField('remu_net_a2', 'Ma rémunération nette en année 2 (par mois)') +
      finField('remu_net_a3', 'Ma rémunération nette en année 3 (par mois)') +

      '<h3 class="form-heading">5. Ma trésorerie mois par mois</h3>' +
      '<p class="help">Le plan de trésorerie suit l’argent réellement encaissé et payé, TVA comprise, sur les 12 premiers mois.</p>' +
      finSelect('mois_debut', 'Mois d’ouverture', [''].concat(C.MOIS)) +
      finSelect('tva_achats', 'TVA sur mes achats de marchandises', [['', 'Même taux que mes ventes'], ['20', '20 %'], ['10', '10 %'], ['5.5', '5,5 %'], ['2.1', '2,1 %'], ['0', 'Pas de TVA']], 'Les investissements et les autres charges sont comptés à 20 %.') +
      '<div id="fin-results">' + financeResultsHtml() + '</div>' +
      '<div id="fin-sim">' + simHtml() + '</div></div>';
  }

  /* ================= Simulateur « Et si… ? » =================
     Teste des variations sans toucher au dossier. */
  const SIM_DEF = [
    { k: 'clients', label: 'Clients par jour', min: -40, max: 30, step: 5, unit: '%' },
    { k: 'panier', label: 'Panier moyen', min: -20, max: 20, step: 5, unit: '%' },
    { k: 'loyer', label: 'Loyer', min: -20, max: 50, step: 10, unit: '%' },
    { k: 'var', label: 'Charges variables', min: -5, max: 10, step: 1, unit: ' pt' },
    { k: 'fixes', label: 'Autres charges fixes', min: -20, max: 50, step: 10, unit: '%' }
  ];
  function simState() { return S.sim || (S.sim = { clients: 0, panier: 0, loyer: 0, var: 0, fixes: 0 }); }
  function simCompute(v) {
    const r6 = Object.assign({}, rd('r6')), r8 = Object.assign({}, rd('r8'));
    const k = function (x) { return 1 + x / 100; };
    ['taux_prudent', 'taux_moyen', 'taux_optimiste'].forEach(function (t) { if (r6[t] !== undefined && r6[t] !== '') r6[t] = C.num(r6[t]) * k(v.clients); });
    if (r6.panier_ttc) r6.panier_ttc = C.num(r6.panier_ttc) * k(v.panier);
    if (r8.c_loyer) r8.c_loyer = C.num(r8.c_loyer) * k(v.loyer);
    r8.taux_var = Math.max(0, C.num(r8.taux_var) + v.var);
    ['c_energie', 'c_assurance', 'c_compta', 'c_comm', 'c_autres'].forEach(function (t) { if (r8[t]) r8[t] = C.num(r8[t]) * k(v.fixes); });
    if (Array.isArray(r8.x_charges)) r8.x_charges = r8.x_charges.map(function (x) { return Object.assign({}, x, { montant: C.num(x.montant) * k(v.fixes) }); });
    const c = C.caCalc(r6, rd('r3')), f = C.financeCalc(r8, c);
    let p = null; try { p = C.previsionnel(r8, c, f); } catch (e) { p = null; }
    return { c: c, f: f, p: p };
  }
  function simHtml() {
    if (!finance().CA) return '';
    const v = simState();
    return '<div class="calc-box sim"><h3 class="form-heading">Et si… ? Testez vos hypothèses</h3>' +
      '<p class="help">Le jury demande souvent : « Et si vous n’aviez que 40 clients ? », « Et si le loyer augmente ? ». Bougez les curseurs pour voir l’effet sur vos résultats. <strong>Votre dossier n’est pas modifié.</strong></p>' +
      '<div class="sim-ctrls">' + SIM_DEF.map(function (d) {
        return '<label class="sim-ctrl"><span class="sim-lab">' + esc(d.label) + ' <output id="sim-o-' + d.k + '">' + simFmt(v[d.k], d.unit) + '</output></span>' +
          '<input type="range" class="sim-range" data-sim="' + d.k + '" min="' + d.min + '" max="' + d.max + '" step="' + d.step + '" value="' + v[d.k] + '" aria-label="' + esc(d.label) + '"></label>';
      }).join('') + '</div>' +
      '<div id="sim-out">' + simOutHtml() + '</div>' +
      '<button type="button" class="btn ghost small" id="sim-reset">Revenir à mes hypothèses</button></div>';
  }
  function simFmt(x, unit) { return (x > 0 ? '+' : (x < 0 ? '−' : '')) + Math.abs(x) + unit.trim().replace(/^%$/, ' %').replace(/^pt$/, ' pt'); }
  function simOutHtml() {
    const v = simState();
    const B = simCompute({ clients: 0, panier: 0, loyer: 0, var: 0, fixes: 0 });
    const N = simCompute(v);
    const res = function (x) { return x.f.societe ? x.f.resultatNet : x.f.resultat; };
    const signe = function (x) { return (x >= 0 ? '+ ' : '− ') + eur(Math.abs(x)); };
    const delta = function (a, b, fmt) { const d = a - b; if (Math.abs(d) < 0.5) return 'inchangé'; return (d > 0 ? '+' : '−') + ' ' + fmt(Math.abs(d)) + ' par rapport à votre dossier'; };
    const cl = N.c.sc.prudent.clients, tmin = N.p ? N.p.minSolde : null;
    const r = res(N), bad = r < 0;
    const k = '<div class="kpis sim-kpis">' +
      kpi('Clients par jour', cl.toLocaleString('fr-FR', { maximumFractionDigits: 1 }), delta(cl, B.c.sc.prudent.clients, function (x) { return x.toLocaleString('fr-FR', { maximumFractionDigits: 1 }); })) +
      kpi('Chiffre d’affaires HT', eur(N.f.caTotal || N.f.CA), delta(N.f.caTotal || N.f.CA, B.f.caTotal || B.f.CA, eur)) +
      kpi(N.f.societe ? 'Résultat net' : 'Résultat avant impôt', signe(r), delta(r, res(B), eur), bad ? 'bad' : 'good') +
      kpi('Point mort', N.f.seuilClients + ' clients / jour', 'marge de sécurité ' + pct(N.f.margeSecu).replace('-', '−'), N.f.margeSecu < 0 ? 'bad' : (N.f.margeSecu < 0.10 ? '' : 'good')) +
      (tmin !== null ? kpi('Trésorerie la plus basse', signe(tmin), N.p.minMois ? 'en ' + N.p.minMois.toLowerCase() : '', tmin < 0 ? 'bad' : 'good') : '') + '</div>';
    const actif = SIM_DEF.filter(function (d) { return v[d.k]; });
    const phrase = actif.length
      ? '<p class="sim-phrase"><strong>À dire au jury :</strong> « Si ' + actif.map(function (d) { return d.label.toLowerCase() + ' ' + (v[d.k] > 0 ? 'augmentent de ' : 'baissent de ') + Math.abs(v[d.k]) + (d.unit.trim() === 'pt' ? ' point' + (Math.abs(v[d.k]) > 1 ? 's' : '') : ' %'); }).join(' et si ').replace(/panier moyen (augmentent|baissent)/, function (m, x) { return 'le panier moyen ' + (x === 'augmentent' ? 'augmente' : 'baisse'); }).replace(/loyer (augmentent|baissent)/, function (m, x) { return 'le loyer ' + (x === 'augmentent' ? 'augmente' : 'baisse'); }).replace(/^clients par jour/, 'les clients par jour') +
        ', mon ' + (N.f.societe ? 'résultat net' : 'résultat') + ' passe à ' + signe(r) + (bad ? ' : je perds de l’argent' : '') + '. Mon point mort est alors à ' + N.f.seuilClients + ' clients par jour. »</p>' +
        (bad ? '<p class="sim-warn">Préparez votre parade : quelle charge réduire, quel levier commercial activer, combien de temps votre trésorerie tient-elle ?</p>' : '')
      : '<p class="muted small">Toutes les hypothèses sont celles de votre dossier.</p>';
    return k + phrase;
  }

  function financeResultsHtml() {
    const c = ca();
    const f = finance();
    const d = rd('r8');
    if (!f.CA) return '<div class="calc-box"><p class="muted">Complétez d’abord votre chiffre d’affaires (rubrique 6) : il est repris ici automatiquement.</p></div>';
    const line = function (label, v, src, cls) { return '<tr class="' + (cls || '') + '"><td>' + label + '</td><td class="num">' + v + '</td><td class="src-cell">' + esc(src || '') + '</td></tr>'; };
    const neg = function (v) { return '− ' + eur(v); };
    const cr = '<h4>Mon compte de résultat prévisionnel</h4><div class="table-wrap"><table class="result cr"><thead><tr><th>Poste</th><th class="num">Montant</th><th>D’où vient le chiffre</th></tr></thead><tbody>' +
      line(f.annexes ? 'Ventes principales HT' : 'Chiffre d’affaires HT', eur(f.CA), 'Scénario prudent (rubrique 6)', 'strong') +
      f.X.recettes.map(function (x) { return line('+ ' + esc(x.lib || 'Recette annexe'), eur(C.num(x.montant)), x.src); }).join('') +
      (f.annexes ? line('Chiffre d’affaires total HT', eur(f.caTotal), '', 'strong') : '') +
      line('Charges variables (' + C.num(d.taux_var).toLocaleString('fr-FR') + ' %)', neg(f.CA * f.tauxAchats / 100), d.src_var) +
      f.X.variables.map(function (x) { return line(esc(x.lib || 'Charge variable') + ' (' + C.num(x.pct).toLocaleString('fr-FR') + ' %)', neg(f.CA * C.num(x.pct) / 100), x.src); }).join('') +
      (f.annexesVar ? line('Coût des recettes annexes', neg(f.annexesVar), '') : '') +
      line('Loyer et charges', neg(f.fixesSaisis.loyer), d.src_loyer) +
      line('Énergie, eau, téléphone', neg(f.fixesSaisis.energie), d.src_energie) +
      line('Assurances', neg(f.fixesSaisis.assurance), d.src_assurance) +
      line('Comptabilité, banque, caisse', neg(f.fixesSaisis.compta), d.src_compta) +
      line('Communication', neg(f.fixesSaisis.comm), d.src_comm) +
      (f.fixesSaisis.salaires ? line('Salaires (coût employeur)', neg(f.fixesSaisis.salaires), d.src_salaires) : '') +
      (f.fixesSaisis.autres ? line('Autres charges fixes', neg(f.fixesSaisis.autres), d.src_autres) : '') +
      f.X.charges.map(function (x) { return line(esc(x.lib || 'Charge fixe'), neg(C.num(x.montant)), x.src); }).join('') +
      (f.besoins.frais ? line('Frais de lancement (année 1 seulement)', neg(f.besoins.frais), 'Plan de financement') : '') +
      line('Ma rémunération + cotisations', neg(f.remu), C.num(d.remu_net) ? eur(C.num(d.remu_net)) + ' net par mois + cotisations (' + C.num(d.taux_cotis).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' % ' + (f.micro ? 'du CA' : 'du net') + ')' : 'À compléter') +
      (f.interets ? line('Intérêts d’emprunt', neg(f.interets), f.nbEmprunts > 1 ? f.nbEmprunts + ' emprunts, ' + eur(f.ressources.emprunt) + ' au total' : eur(f.ressources.emprunt) + ' à ' + C.num(d.taux_emprunt || (f.X.loans[0] || {}).taux).toLocaleString('fr-FR') + ' %') : '') +
      (f.amort ? line('Amortissements', neg(f.amort), f.amortLines.map(function (l) { return eur(l.montant) + ' ÷ ' + l.duree + ' ans'; }).join(' + ')) : '') +
      (f.fixesSaisis.impots ? line('Impôts et taxes', neg(f.fixesSaisis.impots), d.src_impots) : '') +
      line('Résultat avant impôt', (f.resultat >= 0 ? '+ ' : '− ') + eur(Math.abs(f.resultat)), '', 'total ' + (f.resultat >= 0 ? 'pos' : 'negv')) +
      (f.societe ? line('Impôt sur les sociétés', neg(f.is), '15 % jusqu’à 42 500 € de bénéfice, 25 % au-delà') + line('Résultat net', (f.resultatNet >= 0 ? '+ ' : '− ') + eur(Math.abs(f.resultatNet)), '', 'total ' + (f.resultatNet >= 0 ? 'pos' : 'negv')) : '') +
      '</tbody></table></div>';

    const seuil = '<h4>Mon seuil de rentabilité</h4><ol class="steps">' +
      '<li>Charges fixes (toutes les lignes sauf les variables) : <strong>' + eur(f.fixes) + '</strong>' + (f.margeAnnexes ? ', moins la marge des recettes annexes (' + eur(f.margeAnnexes) + ') : reste <strong>' + eur(f.fixesNet) + '</strong> à couvrir par les ventes principales' : '') + '</li>' +
      '<li>Taux de marge sur coût variable : (' + eur(f.CA) + ' − ' + eur(f.variables) + ') ÷ ' + eur(f.CA) + ' = <strong>' + pct(f.tmcv, 1) + '</strong></li>' +
      '<li>Seuil = ' + eur(f.fixesNet) + ' ÷ ' + pct(f.tmcv, 1) + ' = <strong>' + eur(f.seuil) + '</strong>, soit ' + eur(f.seuilJour) + ' par jour, soit ' + f.seuilClientsExact.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' clients par jour à ' + eur(c.panierHT, 2) + ' HT.</li></ol>' +
      '<div class="kpis">' +
        kpi('Point mort', f.seuilClients + ' clients / jour', 'arrondi au-dessus') +
        kpi('Prévu (prudent)', c.sc.prudent.clients.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' clients / jour', '') +
        kpi('Marge de sécurité', pct(f.margeSecu), f.margeSecu < 0.10 ? 'fragile' : (f.margeSecu < 0.15 ? 'correcte' : 'solide'), f.margeSecu < 0.10 ? 'bad' : 'good') +
        kpi('Si les ventes baissent de 20 %', (f.stress >= 0 ? '+ ' : '− ') + eur(Math.abs(f.stress)), 'résultat', f.stress < 0 ? 'bad' : 'good') +
      '</div>' +
      '<p class="muted small">Point mort atteint vers le ' + f.pointMortJour + '<sup>e</sup> jour de l’année en rythme régulier.</p>' + pointMortSvg(f, c);

    const treso = '<h4>Ma trésorerie et ma banque</h4><ul class="plain">' +
      '<li>Charges à payer chaque mois (sans les amortissements, avec le remboursement de l’emprunt) : <strong>' + eur(f.decaissMensuel) + '</strong></li>' +
      '<li>Ma trésorerie de départ couvre <strong>' + f.moisTreso.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' mois</strong> de charges.</li>' +
      (f.annuite ? '<li>Capacité d’autofinancement (résultat net + amortissements) : <strong>' + eur(f.caf) + '</strong> pour une annuité d’emprunt de ' + eur(f.annuite) + '.</li>' : '') +
      (f.totBesoins ? '<li>Apport, prêt d’honneur et aides : <strong>' + pct(f.quasiFP / f.totBesoins) + '</strong> du besoin total.</li>' : '') +
      '</ul>';

    const p = C.previsionnel(d, c, f);
    return '<div class="calc-box">' + cr + seuil + treso + msgList(f.alertes, f.ok) + '</div>' +
      '<div class="calc-box">' + bfrHtml(p, f) + cr3Html(p, f) + empruntHtml(p) + pf3Html(p) + tresoHtml(p) + msgList(p.alertes, p.ok) + '</div>';
  }

  function sgn(v) { return (v < 0 ? '− ' : '') + eur(Math.abs(v)); }

  function bfrHtml(p, f) {
    const b = p.ans[0].bfr;
    return '<h4>Mon besoin en fonds de roulement (année 1)</h4><div class="table-wrap"><table class="result"><tbody>' +
      '<tr><td>Stock moyen (achats HT de ' + C.num(rd('r8').bfr_stock_j) + ' jours)</td><td class="num">' + eur(b.stock) + '</td></tr>' +
      '<tr><td>+ Créances clients TTC (' + C.num(rd('r8').bfr_clients_j) + ' jours de CA)</td><td class="num">' + eur(b.clients) + '</td></tr>' +
      '<tr><td>− Dettes fournisseurs TTC (' + C.num(rd('r8').bfr_fourn_j) + ' jours d’achats)</td><td class="num">− ' + eur(b.fourn) + '</td></tr>' +
      '<tr class="total"><td>BFR</td><td class="num">' + sgn(b.bfr) + '</td></tr></tbody></table></div>' +
      '<p class="muted small">' + (b.bfr <= 0 ? 'BFR négatif : vos clients paient avant que vous payiez vos fournisseurs, c’est le cas de la plupart des commerces de détail.' : 'Ce montant doit être couvert par votre stock de départ et votre trésorerie de départ (' + eur(f.besoins.stock + f.besoins.treso) + ').') + '</p>';
  }

  function cr3Html(p, f) {
    const A = p.ans;
    const row = function (label, k, cls, neg) { return '<tr class="' + (cls || '') + '"><td>' + label + '</td>' + A.map(function (a) { const v = typeof k === 'function' ? k(a) : a[k]; return '<td class="num">' + (neg && v ? '− ' + eur(v) : sgn(v)) + '</td>'; }).join('') + '</tr>'; };
    return '<h4>Mon compte de résultat sur 3 ans</h4><div class="table-wrap"><table class="result cr3"><thead><tr><th></th><th class="num">Année 1</th><th class="num">Année 2</th><th class="num">Année 3</th></tr></thead><tbody>' +
      (f.annexes ? row('Ventes principales HT', 'ventes') + row('Recettes annexes HT', 'annexes') : '') +
      row('Chiffre d’affaires HT', 'ca', 'strong') +
      row('Achats consommés (charges variables)', 'achats', '', true) +
      (f.X.varPct ? row('Autres charges variables (commissions…)', 'autresVar', '', true) : '') +
      row('Charges externes (loyer, énergie, assurances, honoraires, publicité…)', 'externes', '', true) +
      (A.some(function (a) { return a.impots; }) ? row('Impôts et taxes', 'impots', '', true) : '') +
      (A.some(function (a) { return a.salaires; }) ? row('Salaires (coût employeur)', 'salaires', '', true) : '') +
      row('Rémunération du dirigeant et cotisations', 'remu', '', true) +
      row('Dotations aux amortissements', 'dotations', '', true) +
      (A.some(function (a) { return a.interets; }) ? row('Charges financières (intérêts)', 'interets', '', true) : '') +
      row('Résultat avant impôt', 'rai', 'total') +
      (f.societe ? row('Impôt sur les sociétés', 'is', '', true) : '') +
      row(f.societe ? 'Résultat net' : 'Résultat de l’exercice', 'net', 'total') +
      row('Capacité d’autofinancement (résultat net + amortissements)', 'caf', 'muted-row') +
      '</tbody></table></div>' +
      (!f.societe ? '<p class="muted small">Imposition à l’impôt sur le revenu : le bénéfice est imposé chez le dirigeant, en dehors de l’entreprise. En entreprise individuelle (et en EURL à l’IR), votre « rémunération » est en réalité un prélèvement sur le bénéfice : elle figure ici pour vérifier que l’activité vous fait vivre.</p>' : '');
  }

  function empruntHtml(p) {
    if (!p.emprunt.length) return '';
    return '<h4>Le remboursement de mes emprunts</h4><div class="table-wrap"><table class="result"><thead><tr><th>Année</th><th class="num">Capital restant dû</th><th class="num">Intérêts (charge)</th><th class="num">Capital remboursé</th><th class="num">Annuité</th></tr></thead><tbody>' +
      p.emprunt.map(function (l) { return '<tr><td>' + l.annee + '</td><td class="num">' + eur(l.debut) + '</td><td class="num">' + eur(l.interets) + '</td><td class="num">' + eur(l.capital) + '</td><td class="num">' + eur(l.annuite) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="muted small">Seuls les intérêts sont une charge du compte de résultat ; le capital remboursé est payé avec la trésorerie (soit environ ' + eur(p.emprunt[0].annuite / 12) + ' par mois).</p>';
  }

  function pf3Html(p) {
    const P = p.pf3;
    const r = function (label, fn, cls) { return '<tr class="' + (cls || '') + '"><td>' + label + '</td>' + P.map(function (x) { const v = fn(x); return '<td class="num">' + (v ? sgn(v) : '–') + '</td>'; }).join('') + '</tr>'; };
    return '<h4>Mon plan de financement à 3 ans</h4><div class="table-wrap"><table class="result"><thead><tr><th></th><th class="num">Année 1</th><th class="num">Année 2</th><th class="num">Année 3</th></tr></thead><tbody>' +
      '<tr class="sub"><th colspan="4">Besoins durables</th></tr>' +
      r('Investissements (y compris fonds et dépôt)', function (x) { return x.besoins.invest; }) +
      r('Frais de lancement', function (x) { return x.besoins.frais; }) +
      r('Stock et trésorerie de départ, puis hausse du BFR', function (x) { return x.besoins.bfr; }) +
      r('Remboursement du capital emprunté', function (x) { return x.besoins.remb; }) +
      r('Total des besoins', function (x) { return x.totB; }, 'total') +
      '<tr class="sub"><th colspan="4">Ressources durables</th></tr>' +
      r('Apport personnel', function (x) { return x.ressources.apport; }) +
      r('Prêt d’honneur et aides', function (x) { return x.ressources.quasi; }) +
      r('Emprunts', function (x) { return x.ressources.emprunt; }) +
      r('Capacité d’autofinancement (année 1 : avant frais de lancement, déjà financés)', function (x) { return x.ressources.caf; }) +
      r('Total des ressources', function (x) { return x.totR; }, 'total') +
      r('Excédent de l’année', function (x) { return x.excedent; }, 'strong') +
      r('Excédent cumulé', function (x) { return x.cumul; }, 'strong') +
      '</tbody></table></div>';
  }

  function tresoHtml(p) {
    const M = p.mois;
    const cell = function (v) { return '<td class="num">' + (Math.abs(v) < 0.5 ? '' : sgn(v)) + '</td>'; };
    const line = function (label, fn, cls) { return '<tr class="' + (cls || '') + '"><th>' + label + '</th>' + M.map(function (m) { return cell(fn(m)); }).join('') + '</tr>'; };
    const has = function (fn) { return M.some(function (m) { return Math.abs(fn(m)) >= 0.5; }); };
    const lines = [
      ['Ventes encaissées (TTC)', function (m) { return m.enc.ventes; }],
      ['Apports et prêt d’honneur', function (m) { return m.enc.apports; }],
      ['Emprunt débloqué', function (m) { return m.enc.emprunt; }],
      ['Remboursement de TVA', function (m) { return m.enc.rembTVA; }]
    ].filter(function (l) { return has(l[1]); });
    const dlines = [
      ['Investissements et frais (TTC)', function (m) { return m.dec.invest; }],
      ['Achats de marchandises (TTC)', function (m) { return m.dec.achats; }],
      ['Charges externes (TTC)', function (m) { return m.dec.externes; }],
      ['Rémunération et salaires', function (m) { return m.dec.personnel; }],
      ['Échéance d’emprunt', function (m) { return m.dec.emprunt; }],
      ['TVA reversée', function (m) { return m.dec.tva; }]
    ].filter(function (l) { return has(l[1]); });
    return '<h4>Mon plan de trésorerie sur 12 mois</h4>' + tresoChart(p) +
      '<div class="table-wrap"><table class="result treso"><thead><tr><th></th>' + M.map(function (m) { return '<th class="num">' + esc(moisCourt(m.nom)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr class="sub"><th colspan="13">Encaissements</th></tr>' + lines.map(function (l) { return line(l[0], l[1]); }).join('') +
      line('Total encaissements', function (m) { return m.totEnc; }, 'total') +
      '<tr class="sub"><th colspan="13">Décaissements</th></tr>' + dlines.map(function (l) { return line(l[0], l[1]); }).join('') +
      line('Total décaissements', function (m) { return m.totDec; }, 'total') +
      line('Solde du mois', function (m) { return m.solde; }) +
      line('Trésorerie en fin de mois', function (m) { return m.cumul; }, 'strong') +
      '</tbody></table></div>' +
      (p.franchise ? '<p class="muted small">Franchise de TVA : vous ne facturez pas la TVA et ne la récupérez pas sur vos achats.</p>' : '<p class="muted small">TVA de chaque mois reversée le mois suivant ; le crédit de TVA né des investissements de départ est remboursé environ 2 mois plus tard.</p>');
  }

  function moisCourt(nom) { return ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'][C.MOIS.indexOf(nom)] || nom; }

  function tresoChart(p) {
    const vals = p.mois.map(function (m) { return m.cumul; });
    const W = 640, H = 200, ml = 64, mr = 10, mt = 14, mb = 28;
    const max = Math.max(0, Math.max.apply(null, vals)), min = Math.min(0, Math.min.apply(null, vals));
    const span = (max - min) || 1;
    const Y = function (v) { return mt + (max - v) / span * (H - mt - mb); };
    const bw = (W - ml - mr) / 12;
    const ticks = [max, (max + min) / 2, min].filter(function (v, i, a) { return a.indexOf(v) === i; });
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="Trésorerie en fin de mois">';
    ticks.forEach(function (t) { svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" class="ch-grid"/><text x="' + (ml - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="ch-lbl">' + esc(eur(t)) + '</text>'; });
    p.mois.forEach(function (m, i) {
      const v = m.cumul, y0 = Y(0), y1 = Y(v);
      svg += '<rect x="' + (ml + i * bw + bw * 0.18) + '" width="' + (bw * 0.64) + '" y="' + Math.min(y0, y1) + '" height="' + Math.max(1, Math.abs(y1 - y0)) + '" class="' + (v < 0 ? 'ch-neg' : 'ch-pos') + '"><title>' + esc(m.nom + ' : ' + eur(v)) + '</title></rect>' +
        '<text x="' + (ml + i * bw + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle" class="ch-lbl">' + esc(moisCourt(m.nom)) + '</text>';
    });
    svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" class="ch-axis"/></svg>';
    return '<div class="chart-wrap">' + svg + '</div>';
  }
  function kpi(label, val, sub, cls) { return '<div class="kpi ' + (cls || '') + '"><span class="kpi-label">' + esc(label) + '</span><span class="kpi-val">' + val + '</span>' + (sub ? '<span class="kpi-sub">' + esc(sub) + '</span>' : '') + '</div>'; }

  function refreshFinanceTotals() {
    const f = finance();
    const b = $('#fin-tot-b'), rr = $('#fin-tot-r'), bal = $('#fin-balance');
    if (b) b.innerHTML = 'Total besoins : <strong>' + eur(f.totBesoins) + '</strong>';
    if (rr) rr.innerHTML = 'Total ressources : <strong>' + eur(f.totRessources) + '</strong>';
    if (bal) {
      if (!f.totBesoins && !f.totRessources) bal.innerHTML = '';
      else if (Math.abs(f.totBesoins - f.totRessources) < 1) bal.innerHTML = '<p class="balance ok">Plan équilibré : ' + eur(f.totBesoins) + ' de besoins = ' + eur(f.totRessources) + ' de ressources.</p>';
      else bal.innerHTML = '<p class="balance ko">Écart de ' + eur(Math.abs(f.totBesoins - f.totRessources)) + ' : ' + (f.totBesoins > f.totRessources ? 'il manque des ressources.' : 'vos ressources dépassent vos besoins.') + '</p>';
    }
  }

  /* ---------- Graphiques ---------- */
  function svgOpen(W, H, label) { return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="' + esc(label) + '">'; }
  function kEur(v) { return Math.abs(v) >= 10000 ? (Math.round(v / 1000)).toLocaleString('fr-FR') + ' k€' : eur(v); }

  /** Point mort : droite du CA et droite des charges totales, en clients par jour. */
  function pointMortSvg(f, c) {
    if (!f.CA || !c.panierHT || !c.jours) return '';
    const W = 640, H = 300, ml = 70, mr = 20, mt = 20, mb = 44;
    const maxCl = Math.max(c.sc.prudent.clients * 1.5, f.seuilClientsExact * 1.3, 10);
    const caAt = function (n) { return n * c.panierHT * c.jours; };
    const chAt = function (n) { return f.fixesNet + caAt(n) * (1 - f.tmcv); };
    const maxY = Math.max(caAt(maxCl), chAt(maxCl));
    const X = function (n) { return ml + n / maxCl * (W - ml - mr); };
    const Y = function (v) { return mt + (1 - v / maxY) * (H - mt - mb); };
    let s = svgOpen(W, H, 'Point mort');
    [0, 0.5, 1].forEach(function (k) { const v = maxY * k; s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="ch-grid"/><text x="' + (ml - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="ch-lbl">' + esc(kEur(v)) + '</text>'; });
    // zone de bénéfice
    const sx = X(f.seuilClientsExact), sy = Y(caAt(f.seuilClientsExact));
    s += '<polygon points="' + sx + ',' + sy + ' ' + X(maxCl) + ',' + Y(caAt(maxCl)) + ' ' + X(maxCl) + ',' + Y(chAt(maxCl)) + '" class="ch-zone"/>';
    s += '<line x1="' + X(0) + '" y1="' + Y(caAt(0)) + '" x2="' + X(maxCl) + '" y2="' + Y(caAt(maxCl)) + '" class="ch-line-ca"/>';
    s += '<line x1="' + X(0) + '" y1="' + Y(chAt(0)) + '" x2="' + X(maxCl) + '" y2="' + Y(chAt(maxCl)) + '" class="ch-line-ch"/>';
    s += '<line x1="' + sx + '" x2="' + sx + '" y1="' + sy + '" y2="' + (H - mb) + '" class="ch-dash"/><circle cx="' + sx + '" cy="' + sy + '" r="5" class="ch-dot"/>';
    s += '<text x="' + (sx - 8) + '" y="' + (sy + 22) + '" text-anchor="end" class="ch-lbl strong">Point mort : ' + f.seuilClients + ' clients/jour</text>';
    const px = X(c.sc.prudent.clients);
    s += '<line x1="' + px + '" x2="' + px + '" y1="' + mt + '" y2="' + (H - mb) + '" class="ch-dash ok"/><text x="' + (px + 6) + '" y="' + (mt + 12) + '" class="ch-lbl ok">Prévu : ' + Math.round(c.sc.prudent.clients) + '</text>';
    s += '<text x="' + (W - mr) + '" y="' + (Y(caAt(maxCl)) - 6) + '" text-anchor="end" class="ch-lbl ca">Chiffre d’affaires</text>';
    s += '<text x="' + (X(0) + 6) + '" y="' + (Y(chAt(0)) - 8) + '" class="ch-lbl ch">Charges totales</text>';
    s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (H - mb) + '" y2="' + (H - mb) + '" class="ch-axis"/>';
    for (let n = 0; n <= maxCl; n += Math.max(10, Math.round(maxCl / 6 / 10) * 10)) s += '<text x="' + X(n) + '" y="' + (H - mb + 16) + '" text-anchor="middle" class="ch-lbl">' + n + '</text>';
    s += '<text x="' + ((W + ml) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="ch-lbl">clients par jour</text></svg>';
    return '<div class="chart-wrap">' + s + '</div>';
  }

  /** Barres horizontales simples. items : [{label, value, cls}] */
  function barsSvg(items, label) {
    const W = 640, rowH = 40, ml = 170, mr = 110, H = items.length * rowH + 16;
    const max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); })) || 1;
    let s = svgOpen(W, H, label);
    items.forEach(function (it, i) {
      const y = 8 + i * rowH, w = Math.abs(it.value) / max * (W - ml - mr);
      s += '<text x="' + (ml - 10) + '" y="' + (y + 23) + '" text-anchor="end" class="ch-lbl big">' + esc(it.label) + '</text>' +
        '<rect x="' + ml + '" y="' + (y + 6) + '" width="' + Math.max(2, w) + '" height="' + (rowH - 14) + '" rx="4" class="' + (it.cls || 'ch-pos') + '"/>' +
        '<text x="' + (ml + w + 8) + '" y="' + (y + 23) + '" class="ch-lbl big strong">' + esc(it.text || eur(it.value)) + '</text>';
    });
    return '<div class="chart-wrap">' + s + '</svg></div>';
  }

  function scenariosSvg(c) {
    if (!c.caPrudent) return '';
    return barsSvg(['prudent', 'moyen', 'optimiste'].map(function (k) {
      return { label: k.charAt(0).toUpperCase() + k.slice(1) + ' · ' + Math.round(c.sc[k].clients) + ' clients', value: c.sc[k].ca, cls: k === 'prudent' ? 'ch-pos' : 'ch-soft' };
    }), 'Les trois scénarios de chiffre d’affaires');
  }

  /** Plan de financement : deux barres empilées besoins / ressources. */
  function financementSvg(f) {
    if (!f.totBesoins) return '';
    const W = 640, H = 300, top = 20, bh = 240, max = Math.max(f.totBesoins, f.totRessources) || 1;
    const col = function (x, parts, title) {
      let y = top + bh, s = '';
      parts.filter(function (p) { return p[1] > 0; }).forEach(function (p, i) {
        const h = p[1] / max * bh; y -= h;
        s += '<rect x="' + x + '" y="' + y + '" width="150" height="' + h + '" class="stk stk' + (i % 6) + '"/>' +
          (h > 16 ? '<text x="' + (x + 160) + '" y="' + (y + h / 2 + 4) + '" class="ch-lbl">' + esc(p[0] + ' : ' + eur(p[1])) + '</text>' : '');
      });
      return s + '<text x="' + (x + 75) + '" y="' + (H - 6) + '" text-anchor="middle" class="ch-lbl strong">' + esc(title) + '</text>';
    };
    const b = f.besoins, r = f.ressources;
    return '<div class="chart-wrap">' + svgOpen(W, H, 'Plan de financement') +
      col(20, [['Fonds de commerce', b.fonds], ['Investissements', b.invest], ['Dépôt, droit au bail', b.non_amort], ['Stock', b.stock], ['Frais de lancement', b.frais], ['Trésorerie', b.treso]], 'Besoins ' + eur(f.totBesoins)) +
      col(330, [['Apport', r.apport], ['Prêt d’honneur', r.honneur], ['Aides', r.aides], ['Emprunt', r.emprunt]], 'Ressources ' + eur(f.totRessources)) + '</svg></div>';
  }

  /* ---------- Kit oral ---------- */
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }
  function firstLines(s, n) { return String(s || '').split(/\n|;/).map(function (x) { return x.replace(/^[-•\s]+/, '').trim(); }).filter(Boolean).slice(0, n); }
  function shortTxt(s, nWords) { const w = String(s || '').replace(/\s+/g, ' ').trim().split(' '); return w.length > nWords ? w.slice(0, nWords).join(' ').replace(/[\s,;:.\-–(]+$/, '') + '…' : w.join(' '); }

  function slides() {
    const r0 = rd('r0'), r1 = rd('r1'), r3 = rd('r3'), r4 = rd('r4'), r5 = rd('r5'), r7 = rd('r7'), r8 = rd('r8'), r9 = rd('r9');
    const c = ca(), f = finance();
    const S2 = [];
    const add = function (minute, titre, body, txt) { S2.push({ minute: minute, titre: titre, body: body, words: words(txt) }); };
    add('0:00', r0.projet_nom || 'Mon projet', '<p class="sl-big">' + esc(r9.accroche || '') + '</p><p class="sl-sub">' + esc(rd('r4').pos_est ? rd('r4').pos_est + (rd('r6').zone ? ' · ' + shortTxt(rd('r6').zone, 6) : '') : '') + '</p>', (r9.accroche || '') + ' ' + (rd('r4').pos_est || ''));
    const ch = (r3.chiffres_cles || []).filter(function (x) { return filled(x.chiffre); }).slice(0, 3);
    add('1:30', 'Le diagnostic en 3 chiffres', '<div class="sl-figs">' + ch.map(function (x) { return '<div><strong>' + esc(x.chiffre) + '</strong><span>' + esc(shortTxt(x.question, 8)) + '</span></div>'; }).join('') + '</div>', ch.map(function (x) { return x.chiffre + ' ' + shortTxt(x.question, 8); }).join(' '));
    const sw = r3.swot || {};
    const swTxt = ['forces', 'faiblesses', 'opportunites', 'menaces'].map(function (k) { return firstLines(sw[k], 2).map(function (l) { return shortTxt(l, 4); }); });
    add('2:30', 'SWOT', '<div class="sl-swot">' + [['Forces', 's'], ['Faiblesses', 'w'], ['Opportunités', 'o'], ['Menaces', 't']].map(function (x, i) { return '<div class="' + x[1] + '"><b>' + x[0] + '</b>' + swTxt[i].map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '</div>'; }).join('') + '</div>', swTxt.join(' '));
    add('3:00', 'Mon positionnement', '<div class="sl-chart">' + carteSvg(r4.carte || {}) + '</div><p class="sl-sub">' + esc(shortTxt(r4.pos_qui, 14)) + '</p>', shortTxt(r4.pos_qui, 14));
    const b = r5.bmc || {};
    add('4:00', 'Mon modèle économique', '<div class="canvas sl-canvas">' + window.CANVAS.map(function (cv) { return '<div class="cv-box cv-' + cv.area + '"><b>' + esc(cv.label) + '</b><span>' + esc(shortTxt(firstLines(b[cv.id], 1)[0], 5)) + '</span></div>'; }).join('') + '</div>', '');
    add('5:30', 'Mon chiffre d’affaires', '<p class="sl-formula">' + C.num(rd('r6').base).toLocaleString('fr-FR') + ' × ' + c.sc.prudent.taux.toLocaleString('fr-FR') + ' % = <b>' + Math.round(c.sc.prudent.clients) + ' clients</b> × ' + eur(c.panierHT, 2) + ' HT × ' + c.jours + ' j = <b>' + eur(c.caPrudent) + '</b></p>' + scenariosSvg(c), 'formule');
    const parts = (window.RUBRIQUES.find(function (x) { return x.id === 'r7'; }).fields.find(function (x) { return x.id === 'partenaires'; }).rows).map(function (rw) { return [rw.label, ((r7.partenaires || {})[rw.id] || {}).nom]; });
    add('7:00', 'Partenaires et organisation', '<table class="sl-table">' + parts.map(function (p) { return '<tr><th>' + esc(p[0].replace(/ \(.*\)/, '')) + '</th><td>' + esc(shortTxt(p[1], 4)) + '</td></tr>'; }).join('') + '</table><p class="sl-sub">' + esc(r7.horaires || '') + (C.num(r7.cout_salarie_annuel) ? '' : ' · seul(e) la 1re année') + '</p>', parts.map(function (p) { return shortTxt(p[1], 4); }).join(' '));
    add('8:00', 'Mon plan de financement', financementSvg(f), '');
    add('8:45', 'Mon point mort', pointMortSvg(f, c) + '<p class="sl-big small">' + f.seuilClients + ' clients/jour pour ' + Math.round(c.sc.prudent.clients) + ' prévus · marge ' + pct(f.margeSecu) + '</p>', 'point mort clients prévus marge');
    const et = String(r9.etapes || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 3);
    add('9:30', 'Et demain ?', '<div class="sl-concl"><div><strong>' + pct(f.margeSecu) + '</strong><span>de marge de sécurité</span></div><div><strong>' + esc(r8.statut || '—') + '</strong><span>statut retenu</span></div></div><ol class="sl-steps">' + et.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>', et.join(' '));
    return S2;
  }

  function slideHtml(sl, i, n) {
    return '<section class="slide"><header><span class="sl-num">' + (i + 1) + '/' + n + '</span><h2>' + esc(sl.titre) + '</h2></header><div class="sl-body">' + sl.body + '</div><footer>' + esc(rd('r0').projet_nom || '') + '</footer></section>';
  }

  function chiffresCles() {
    const c = ca(), f = finance();
    const p = f.CA ? C.previsionnel(rd('r8'), c, f) : null;
    const L = [
      ['Chiffre d’affaires prudent', eur(f.CA) + ' HT', Math.round(c.sc.prudent.clients) + ' clients/jour × ' + eur(c.panierHT, 2) + ' HT × ' + c.jours + ' jours'],
      ['Point mort', f.seuilClients + ' clients par jour', 'Seuil ' + eur(f.seuil) + ' — atteint vers le ' + f.pointMortJour + 'e jour'],
      ['Marge de sécurité', pct(f.margeSecu), 'Si les ventes baissent de 20 % : ' + (f.stress >= 0 ? '+ ' : '− ') + eur(Math.abs(f.stress))],
      ['Plan de financement', eur(f.totBesoins), 'Apport et aides : ' + pct(f.partFP) + ' · emprunt ' + eur(f.ressources.emprunt)],
      ['Résultat', (f.societe ? 'net ' : '') + eur(f.resultatNet), p ? 'Année 2 : ' + eur(p.ans[1].net) + ' · année 3 : ' + eur(p.ans[2].net) : ''],
      ['Trésorerie', p ? 'point bas ' + eur(p.minSolde) : '—', p ? 'en ' + p.minMois.toLowerCase() : ''],
      ['Ma rémunération', eur(C.num(rd('r8').remu_net)) + ' net / mois', 'Statut : ' + (rd('r8').statut || '—')],
      ['Mon étude', (rd('r3').nb_reponses || '—') + ' réponses', 'Budget accepté : ' + (rd('r3').budget_max ? eur(rd('r3').budget_max, 2) : '—')]
    ];
    return '<div class="fiche">' + L.map(function (l) { return '<div class="fiche-item"><span class="fi-l">' + esc(l[0]) + '</span><strong>' + esc(l[1]) + '</strong><span class="fi-s">' + esc(l[2]) + '</span></div>'; }).join('') + '</div>';
  }

  /** Questions pièges tirées des points faibles du dossier. */
  function questionsPieges() {
    const c = ca(), f = finance(), Q = [];
    const p = f.CA ? C.previsionnel(rd('r8'), c, f) : null;
    if (f.margeSecu < 0.15) Q.push('Votre marge de sécurité n’est que de ' + pct(f.margeSecu) + ' : que faites-vous dès le premier mois si la fréquentation est plus faible ?');
    if (f.stress < 0) Q.push('Avec 20 % de ventes en moins, vous perdez ' + eur(-f.stress) + '. Comment tenez-vous ?');
    if (p && p.minSolde < f.decaissMensuel) Q.push('Votre trésorerie descend à ' + eur(p.minSolde) + ' en ' + p.minMois.toLowerCase() + ' : c’est moins d’un mois de charges. Que faites-vous ?');
    if (f.ressources.emprunt && f.partFP < 0.3) Q.push('Votre apport ne représente que ' + pct(f.partFP) + ' du besoin : pourquoi une banque vous suivrait-elle ?');
    if (C.num(rd('r8').croissance_a2) > 15) Q.push('Vous prévoyez +' + rd('r8').croissance_a2 + ' % de CA en année 2 : sur quoi repose ce chiffre ?');
    if (c.sc.optimiste.clients > c.sc.prudent.clients * 2) Q.push('Votre scénario optimiste fait plus du double du prudent : n’êtes-vous pas trop large ?');
    if (C.num(rd('r3').nb_reponses) < 50) Q.push('Seulement ' + (rd('r3').nb_reponses || 0) + ' réponses à votre questionnaire : est-ce représentatif ?');
    if (rd('r1').type_projet === 'Reprise') { const rp = C.repriseCalc(rd('r2'), rd('r8')); if (rp.tendance < 0) Q.push('Le CA de l’affaire baisse de ' + pct(-rp.tendance) + ' : pourquoi feriez-vous mieux que le cédant ?'); }
    const nbContact = Object.values(rd('r7').partenaires || {}).filter(function (x) { return x && filled(x.contact); }).length;
    if (nbContact < 3) Q.push('Lesquels de vos partenaires avez-vous réellement contactés ? Avec quel résultat ?');
    if (!C.num(rd('r7').cout_salarie_annuel)) Q.push('Vous êtes seul(e) : que se passe-t-il si vous tombez malade une semaine ?');
    return Q;
  }

  function renderOral(tab) {
    tab = tab || 'supports';
    S.view = 'oral';
    renderNav();
    const main = $('#main');
    const sl = slides();
    let h = '<div class="apercu-bar no-print"><button type="button" class="btn ghost" id="or-back">← Retour</button>' +
      ['supports', 'fiche', 'entrainement', 'notions'].map(function (t) { return '<button type="button" class="btn ' + (tab === t ? '' : 'ghost') + ' small" data-oral-tab="' + t + '">' + ({ supports: 'Mes supports', fiche: 'Mes chiffres par cœur', entrainement: 'Entraînement aux questions', notions: 'Réviser les notions' })[t] + '</button>'; }).join('') + '</div>';
    if (tab === 'supports') {
      const lourds = sl.filter(function (x) { return x.words > 30; });
      h += '<div class="no-print oral-intro"><h1>Mes supports pour l’oral</h1><p>Générés automatiquement à partir de votre dossier, dans l’ordre du plan minuté : ' + sl.length + ' supports, un visuel chacun. Votre manuel le rappelle : <strong>8 à 10 supports maximum, presque pas de texte</strong>.</p>' +
        (lourds.length ? '<ul class="msgs"><li class="warn">Trop de texte sur : ' + lourds.map(function (x) { return '« ' + esc(x.titre) + ' » (' + x.words + ' mots)'; }).join(', ') + '. Raccourcissez la source dans votre dossier (30 mots maximum par support).</li></ul>' : '<ul class="msgs"><li class="ok">Tous vos supports restent sous 30 mots.</li></ul>') +
        '<div class="oral-actions"><button type="button" class="btn" id="or-present">▶ Présenter (plein écran, chrono 10 min)</button><button type="button" class="btn ghost" id="or-print">Imprimer (une page par support)</button></div></div>' +
        '<div class="slides-grid">' + sl.map(function (x, i) { return '<div class="slide-cell"><p class="muted small no-print">' + x.minute + ' · ' + x.words + ' mots</p>' + slideHtml(x, i, sl.length) + '</div>'; }).join('') + '</div>';
    } else if (tab === 'fiche') {
      h += '<div class="oral-intro"><h1>Mes chiffres à connaître par cœur</h1><p class="no-print">À relire la veille, et seulement ça. Le jury recoupe ces chiffres avec votre dossier pendant l’entretien.</p></div>' + chiffresCles() +
        '<div class="no-print oral-actions"><button type="button" class="btn ghost" onclick="window.print()">Imprimer ma fiche</button></div>';
    } else if (tab === 'notions') {
      const ns = notionsDuDossier();
      S.revision = { list: ns, cur: null, sues: S.revision && S.revision.sues || {} };
      h += '<div class="oral-intro"><h1>Réviser les notions de mon dossier</h1><p>Le jury peut vous demander de définir un mot que vous avez employé : « C’est quoi, votre BFR ? », « Pourquoi une SASU ? ». Voici les <strong>' + ns.length + ' notions</strong> repérées dans votre dossier. Dites la définition à voix haute, puis vérifiez.</p>' +
        '<div class="oral-actions"><button type="button" class="btn" id="rv-next">Tirer une notion</button><button type="button" class="btn ghost" id="rv-all">Voir toute la liste</button></div></div>' +
        '<div class="training card" id="revision"><p class="muted">Cliquez sur « Tirer une notion ».</p></div>';
    } else {
      const base = (window.RUBRIQUES.find(function (x) { return x.id === 'r9'; }).fields.find(function (x) { return x.id === 'questions'; }).rows).map(function (q) { return { q: q.label, rep: ((rd('r9').questions || {})[q.id] || {}).reponse || '' }; });
      const pieges = questionsPieges().map(function (q) { return { q: q, rep: '', piege: true }; });
      S.training = { list: base.concat(pieges), cur: null };
      h += '<div class="oral-intro"><h1>Entraînement à l’entretien</h1><p>Une question tirée au hasard, une minute pour répondre à voix haute, puis comparez avec la réponse que vous avez préparée. ' + (pieges.length ? '<strong>' + pieges.length + ' questions pièges</strong> ont été ajoutées à partir des points faibles de votre dossier.' : '') + '</p>' +
        '<div class="oral-actions"><button type="button" class="btn" id="tr-next">Tirer une question</button><label class="check inline"><input type="checkbox" id="tr-pieges"> <span>Seulement les questions pièges</span></label></div></div>' +
        '<div class="training card" id="training"><p class="muted">Cliquez sur « Tirer une question ».</p></div>';
    }
    main.innerHTML = h;
    typo(main);
    $('#or-back').addEventListener('click', function () { go(S.current); });
    $$('[data-oral-tab]').forEach(function (b) { b.addEventListener('click', function () { renderOral(b.getAttribute('data-oral-tab')); }); });
    if ($('#or-present')) $('#or-present').addEventListener('click', function () { present(sl); });
    if ($('#or-print')) $('#or-print').addEventListener('click', function () { document.body.classList.add('print-slides'); window.print(); setTimeout(function () { document.body.classList.remove('print-slides'); }, 500); });
    if ($('#tr-next')) $('#tr-next').addEventListener('click', drawQuestion);
    if ($('#rv-next')) $('#rv-next').addEventListener('click', drawNotion);
    if ($('#rv-all')) $('#rv-all').addEventListener('click', function () {
      const R2 = S.revision;
      $('#revision').innerHTML = '<div class="rv-list">' + R2.list.map(function (e) { return '<details class="rv-item"><summary>' + esc(e.terme) + (R2.sues[e.id] ? ' <span class="tag ok">je sais</span>' : '') + '</summary>' + lexCard(e, true) + '</details>'; }).join('') + '</div>';
    });
    window.scrollTo(0, 0);
  }

  /** Notions du lexique présentes dans le dossier de l'élève, plus les incontournables de la partie financière. */
  function notionsDuDossier() {
    const txt = [];
    (function walk(o) { if (o == null) return; if (typeof o === 'string') txt.push(o); else if (typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k]); }); })(S.data);
    const all = txt.join(' \n ');
    const ids = {};
    LEX_RE.forEach(function (L) { if (!ids[L.id] && L.re.test(all)) ids[L.id] = true; });
    const f = finance();
    ['ca', 'cr', 'pf', 'seuil', 'marge-secu', 'bfr', 'tresorerie', 'caf', 'charges-fixes', 'charges-variables', 'tva', 'ht-ttc', 'amort', 'statut'].forEach(function (id) { if (LEX_BY[id]) ids[id] = true; });
    const st = { 'Micro-entreprise': 'micro', 'Entreprise individuelle au réel': 'ei', 'EURL': 'eurl', 'SARL': 'sarl', 'SASU': 'sasu', 'SAS': 'sas' }[rd('r8').statut];
    if (st && LEX_BY[st]) ids[st] = true;
    if (f.societe && LEX_BY.is) ids.is = true;
    if (f.ressources && f.ressources.emprunt && LEX_BY.emprunt) { ids.emprunt = true; if (LEX_BY.annuite) ids.annuite = true; }
    return LEX.filter(function (e) { return ids[e.id]; });
  }

  function drawNotion() {
    const R2 = S.revision;
    const pool = R2.list.filter(function (e) { return !R2.sues[e.id]; });
    const src = pool.length ? pool : R2.list;
    if (!src.length) return;
    let e; do { e = src[Math.floor(Math.random() * src.length)]; } while (src.length > 1 && e === R2.cur);
    R2.cur = e;
    const reste = R2.list.length - Object.keys(R2.sues).length;
    $('#revision').innerHTML = '<p class="muted small">' + (pool.length ? reste + ' notion' + (reste > 1 ? 's' : '') + ' à revoir' : 'Toutes les notions sont sues : on recommence pour s’entraîner.') + '</p>' +
      '<p class="tr-q">' + esc(e.terme) + '</p><p class="muted">Définissez-la en une ou deux phrases, avec un exemple tiré de votre projet.</p>' +
      '<button type="button" class="btn ghost small" id="rv-show">Voir la définition</button><div id="rv-def" hidden class="rv-def">' + lexCard(e, true) +
      '<div class="oral-actions"><button type="button" class="btn small" id="rv-ok">Je savais</button><button type="button" class="btn ghost small" id="rv-ko">À revoir</button></div></div>';
    $('#rv-show').addEventListener('click', function () { $('#rv-def').hidden = false; $('#rv-show').hidden = true; });
    $('#rv-ok').addEventListener('click', function () { R2.sues[e.id] = true; drawNotion(); });
    $('#rv-ko').addEventListener('click', drawNotion);
  }

  function drawQuestion() {
    const T = S.training;
    const onlyP = $('#tr-pieges') && $('#tr-pieges').checked;
    const pool = T.list.filter(function (x) { return !onlyP || x.piege; });
    if (!pool.length) { $('#training').innerHTML = '<p class="muted">Aucune question piège : votre dossier ne présente pas de point faible repéré automatiquement.</p>'; return; }
    let q; do { q = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && q === T.cur);
    T.cur = q;
    clearInterval(T.timer);
    let left = 60;
    $('#training').innerHTML = (q.piege ? '<span class="tag warn">Question piège</span>' : '') + '<p class="tr-q">« ' + esc(q.q) + ' »</p><p class="tr-timer" id="tr-timer">1:00</p>' +
      '<button type="button" class="btn ghost small" id="tr-show">Voir ma réponse préparée</button><div id="tr-rep" hidden><p class="tr-rep">' + (q.rep ? nl2br(q.rep) : '<em>' + (q.piege ? 'Question générée à partir de vos chiffres : préparez une réponse avec votre parade.' : 'Vous n’avez pas encore préparé cette réponse (rubrique 9).') + '</em>') + '</p></div>';
    T.timer = setInterval(function () { left--; const el = $('#tr-timer'); if (!el) { clearInterval(T.timer); return; } el.textContent = left > 0 ? '0:' + String(left).padStart(2, '0') : 'Temps écoulé'; if (left <= 10) el.classList.add('late'); if (left <= 0) clearInterval(T.timer); }, 1000);
    $('#tr-show').addEventListener('click', function () { $('#tr-rep').hidden = false; });
  }

  function present(sl) {
    let i = 0;
    const t0 = Date.now();
    const ov = document.createElement('div');
    ov.className = 'present';
    document.body.appendChild(ov);
    const draw = function () { ov.innerHTML = '<div class="pr-stage">' + slideHtml(sl[i], i, sl.length) + '</div><div class="pr-bar"><button type="button" class="pr-btn" data-pr="prev" aria-label="Précédent">←</button><span id="pr-chrono" class="pr-chrono"></span><button type="button" class="pr-btn" data-pr="next" aria-label="Suivant">→</button><button type="button" class="pr-btn" data-pr="close" aria-label="Quitter">✕</button></div>'; tick(); };
    const tick = function () { const s = Math.floor((Date.now() - t0) / 1000), el = ov.querySelector('#pr-chrono'); if (!el) return; el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' / 10:00'; el.className = 'pr-chrono' + (s >= 600 ? ' over' : (s >= 570 ? ' late' : '')); };
    const timer = setInterval(tick, 1000);
    const close = function () { clearInterval(timer); document.removeEventListener('keydown', key); ov.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); };
    const key = function (e) { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { i = Math.min(sl.length - 1, i + 1); draw(); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { i = Math.max(0, i - 1); draw(); } else if (e.key === 'Escape') close(); };
    ov.addEventListener('click', function (e) { const a = e.target.closest('[data-pr]'); if (!a) return; const k = a.getAttribute('data-pr'); if (k === 'next') { i = Math.min(sl.length - 1, i + 1); draw(); } else if (k === 'prev') { i = Math.max(0, i - 1); draw(); } else close(); });
    document.addEventListener('keydown', key);
    if (ov.requestFullscreen) ov.requestFullscreen().catch(function () {});
    draw();
  }

  /* ---------- Auto-évaluation (grille de l'annexe 19) ---------- */
  function constats(code) {
    const c = ca(), f = finance(), d = S.data;
    const r = function (id) { return d[id] || {}; };
    const nb = function (arr) { return (arr || []).filter(function (x) { return x && Object.values(x).some(filled); }).length; };
    switch (code) {
      case 'C1': return [nb(r('r2').sources) + ' sources datées', (r('r3').nb_reponses || 0) + ' réponses au questionnaire', nb(r('r3').concurrents) + ' concurrents analysés'];
      case 'C2': return [nb(r('r4').segments) + ' segments étudiés', filled(r('r4').pos_qui) ? 'Phrase de positionnement complète' : 'Phrase de positionnement incomplète', ((r('r4').carte || {}).points || []).filter(function (p) { return filled(p.nom); }).length + ' offres sur la carte'];
      case 'C3': return [f.CA ? 'CA prudent : ' + eur(f.CA) + ' HT' : 'CA non calculé', c.sc.prudent.clients ? Math.round(c.sc.prudent.clients) + ' à ' + Math.round(c.sc.optimiste.clients) + ' clients par jour selon le scénario' : '', 'Plan d’actions : ' + eur(C.planActionsTotal(r('r6')))];
      case 'C4': { const P = Object.values(r('r7').partenaires || {}); return [P.filter(function (x) { return x && filled(x.nom); }).length + '/5 besoins couverts par un partenaire nommé', P.filter(function (x) { return x && filled(x.contact); }).length + ' partenaires contactés', P.filter(function (x) { return x && x.devis === 'Oui'; }).length + ' devis ou conditions écrites']; }
      case 'C5': return [Object.values(r('r7').planning || {}).filter(function (x) { return x && filled(x.ouverture); }).length + ' jours planifiés', (r('r7').heures_travail || '?') + ' h de travail pour ' + (r('r7').heures_ouverture || '?') + ' h d’ouverture', filled(r('r7').signal_renfort) ? 'Signal de recrutement défini' : 'Pas de signal de recrutement'];
      case 'C6': { const p = f.CA ? C.previsionnel(r('r8'), c, f) : null; return [Math.abs(f.totBesoins - f.totRessources) < 1 && f.totBesoins ? 'Plan de financement équilibré' : 'Plan de financement non équilibré', 'Marge de sécurité : ' + pct(f.margeSecu), p ? 'Trésorerie au plus bas : ' + eur(p.minSolde) : '']; }
    }
    return [];
  }
  const VISER = {
    C1: 'Pour viser « Excellente maîtrise » : produire vos propres informations (comptages, questionnaire, relevés de prix) et dire ce que vous en concluez.',
    C2: 'Pour viser « Excellente maîtrise » : montrer que vous avez écarté un segment et pourquoi, en vous appuyant sur votre diagnostic.',
    C3: 'Pour viser « Excellente maîtrise » : un CA construit sur une mesure réelle, des scénarios justifiés et un stress test.',
    C4: 'Pour viser « Excellente maîtrise » : des partenaires contactés, des conditions écrites, et une solution de rechange pour le plus critique.',
    C5: 'Pour viser « Excellente maîtrise » : anticiper (planning tenable, signal de recrutement chiffré, plan de continuité).',
    C6: 'Pour viser « Excellente maîtrise » : anticiper les contraintes (trésorerie mois par mois, parade au stress test, ajustement du modèle).'
  };
  function autoevalHtml(r, f) {
    const a = rd(r.id)[f.id] || {};
    const ro = S.readOnly ? ' disabled' : '';
    return '<p class="help">Positionnez-vous honnêtement sur chaque compétence, avec les mots exacts de la grille officielle (annexe 19 de la circulaire). Le site rappelle ce qu’il constate dans votre dossier.</p>' +
      '<details class="details"><summary>Les descripteurs officiels de chaque niveau</summary><div class="table-wrap"><table class="result grille"><thead><tr>' + window.GRILLE_NIVEAUX.map(function (n) { return '<th>' + esc(n.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      window.GRILLE_NIVEAUX[0].desc.map(function (x, i) { return '<tr>' + window.GRILLE_NIVEAUX.map(function (n) { return '<td>' + esc(n.desc[i]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>' +
      window.COMPETENCES.map(function (cp) {
        const v = a[cp.code] || {};
        const opts = [['', 'Choisir…']].concat(window.GRILLE_NIVEAUX.map(function (n) { return [n.id, n.label]; })).map(function (o) { return '<option value="' + o[0] + '"' + (v.niveau === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
        return '<div class="ae-row"><div class="ae-head"><strong>' + cp.code + ' · ' + esc(cp.titre) + '</strong><span class="muted small">« ' + esc(cp.critere) + ' »</span></div>' +
          '<ul class="ae-constats">' + constats(cp.code).filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
          '<div class="ae-inputs"><select data-rerender="1" data-path="' + pathAttr([r.id, f.id, cp.code, 'niveau']) + '"' + ro + '>' + opts + '</select>' +
          '<input type="text" data-path="' + pathAttr([r.id, f.id, cp.code, 'preuve']) + '" value="' + esc(v.preuve) + '" placeholder="Ma meilleure preuve pour le jury"' + ro + '></div>' +
          (v.niveau && v.niveau !== 'em' ? '<p class="muted small">' + esc(VISER[cp.code]) + '</p>' : '') + '</div>';
      }).join('');
  }

  /* ---------- Bloc cohérence ---------- */
  function coherenceHtml(r) {
    const co = C.coherence(S.data);
    const d = rd(r.id);
    const ro = S.readOnly ? ' disabled' : '';
    const icon = { ok: '✓', ko: '✕', todo: '…', manuel: '?' };
    return '<h3 class="form-heading">Le contrôle de cohérence (celui que fera le jury)</h3><ul class="coh">' + co.checks.map(function (c) {
      return '<li class="' + c.etat + '"><span class="coh-icon">' + icon[c.etat] + '</span><div><strong>' + esc(c.label) + '</strong><br><span class="muted">' + esc(c.detail) + '</span></div></li>';
    }).join('') + '</ul>' +
      '<label class="check"><input type="checkbox" data-path="' + pathAttr([r.id, 'coh_manuel_1']) + '"' + (d.coh_manuel_1 === true ? ' checked' : '') + ro + '><span>J’ai relu mes rubriques 4, 5 et 6 côte à côte : la cible et la promesse sont les mêmes partout.</span></label>' +
      '<label class="check"><input type="checkbox" data-path="' + pathAttr([r.id, 'coh_manuel_2']) + '"' + (d.coh_manuel_2 === true ? ' checked' : '') + ro + '><span>Mon budget communication est le même dans mon plan d’actions et dans mes finances.</span></label>';
  }

  /* ---------- Bloc dépôt ---------- */
  function allComplete() {
    return R.every(function (r) { return r.id === 'r9' || (S.progress[r.id] || 0) >= 100; });
  }
  function depotHtml() {
    let h = '<h3 class="form-heading">Déposer mon dossier (PDF)</h3>';
    if (Store.mode === 'demo') return h + '<div class="callout">Le dépôt sera disponible quand le site sera relié à la base de données (comptes étudiants). En attendant, préparez votre dossier avec le bouton « Aperçu de mon dossier ».</div>';
    const deadline = cfg.DATE_LIMITE_DEPOT ? new Date(cfg.DATE_LIMITE_DEPOT + 'T23:59:59') : null;
    if (deadline) h += '<p class="help">Date limite : <strong>' + deadline.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</strong> à 23 h 59. Vous pouvez déposer une nouvelle version jusque-là ; votre professeur voit la plus récente.</p>';
    const r9 = completion(rub('r9'));
    const pretAvantDepot = allComplete() && r9.missing.length === 0;
    if (!pretAvantDepot) h += '<div class="callout warn">Terminez toutes les rubriques et le contrôle de cohérence pour pouvoir déposer.</div>';
    else if (deadline && new Date() > deadline) h += '<div class="callout warn">La date limite est passée : le dépôt est fermé. Contactez votre professeur.</div>';
    else h += '<div class="upload"><input type="file" id="pdf-input" accept="application/pdf"><button type="button" class="btn" id="pdf-send">Déposer mon PDF</button><p class="help">PDF uniquement, ' + (cfg.TAILLE_MAX_PDF_MO || 10) + ' Mo maximum.</p></div>';
    if (S.depots.length) {
      h += '<h4>Mes dépôts</h4><ul class="depots">' + S.depots.map(function (dp, i) {
        return '<li><span>' + (i === 0 ? '<span class="tag">version transmise</span> ' : '') + esc(dp.filename) + ' — ' + new Date(dp.created_at).toLocaleString('fr-FR') + ' · ' + Math.round((dp.size || 0) / 1024) + ' Ko</span></li>';
      }).join('') + '</ul>';
    }
    return h;
  }

  /* ================= Rendu des vues ================= */
  function renderShell() {
    const app = $('#app');
    const prof = Store.profile && Store.profile.role === 'prof';
    app.innerHTML =
      '<header class="topbar"><button type="button" class="menu-btn" id="menu-btn" aria-label="Menu">☰</button>' +
      '<a class="brand" href="#" id="brand"><span class="logo">EF3</span><span class="brand-txt"><strong>' + esc(cfg.NOM_SITE) + '</strong><span>' + esc(cfg.ETABLISSEMENT) + '</span></span></a>' +
      '<div class="top-right">' +
        (!prof ? '<div class="global-progress" title="Avancement global"><div class="bar"><span id="global-bar"></span></div><span id="global-pct"></span></div><span class="save-status" id="save-status"></span>' : '') +
        (!prof ? '<button type="button" class="btn ghost small" id="btn-apercu">Aperçu de mon dossier</button><button type="button" class="btn ghost small" id="btn-oral-top">Kit oral</button>' : '') +
        '<div class="user"><span>' + (Store.mode === 'demo' ? 'Mode démonstration <span class="tag">démo</span>' : esc(Store.profile ? (Store.profile.prenom + ' ' + Store.profile.nom) : '')) + '</span>' +
        (Store.mode === 'cloud' ? '<button type="button" class="btn ghost small" id="btn-logout">Se déconnecter</button>' : '<button type="button" class="btn ghost small" id="btn-reset">Effacer la démo</button>') + '</div>' +
      '</div></header>' +
      '<div class="layout">' + (!prof ? '<nav class="sidebar" id="sidebar"></nav>' : '') + '<main id="main" tabindex="-1"></main></div>' +
      '<footer class="foot">' + esc(cfg.NOM_SITE) + ' · <a href="mentions.html">Mentions légales et données personnelles</a></footer>';
    bindShell();
  }

  function renderNav() {
    const nav = $('#sidebar');
    if (!nav) return;
    nav.innerHTML = '<ol>' + R.map(function (r) {
      const p = S.progress[r.id] || 0;
      const locked = !isUnlocked(r.id);
      const comp = r.comp.length ? r.comp.join(' + ') : (r.compLabel || '');
      return '<li><button type="button" class="nav-item' + (S.current === r.id && S.view === 'rubrique' ? ' active' : '') + (locked ? ' locked' : '') + (p >= 100 ? ' done' : '') + '" data-goto="' + r.id + '">' +
        '<span class="nav-num">' + (p >= 100 ? '✓' : (locked ? '🔒' : r.num)) + '</span>' +
        '<span class="nav-txt"><span class="nav-title">' + esc(r.titre) + '</span><span class="nav-sub">' + esc(r.page) + (comp ? ' · ' + esc(comp) : '') + '</span>' +
        '<span class="nav-bar"><span style="width:' + p + '%"></span></span></span></button></li>';
    }).join('') + '</ol>' +
      '<button type="button" class="nav-item nav-lex' + (S.view === 'lexique' ? ' active' : '') + '" data-lexique=""><span class="nav-num">?</span><span class="nav-txt"><span class="nav-title">Lexique</span><span class="nav-sub">' + LEX.length + ' notions avec leurs sources</span></span></button>' +
      '<div class="nav-backup"><p class="nav-backup-t">Copie de secours</p>' +
      '<button type="button" class="btn ghost small" id="btn-export">Télécharger une copie</button>' +
      '<button type="button" class="btn ghost small" id="btn-import">Reprendre depuis une copie</button>' +
      '<input type="file" id="import-file" accept=".json,application/json" hidden></div>';
    const g = globalPct();
    const gb = $('#global-bar'), gp = $('#global-pct');
    if (gb) gb.style.width = g + '%';
    if (gp) gp.textContent = g + ' %';
  }

  function renderRubrique() {
    const r = rub(S.current);
    const main = $('#main');
    const idx = R.indexOf(r);
    if (!isUnlocked(r.id)) {
      const prev = R.slice(0, idx).find(function (x) { return (S.progress[x.id] || 0) < 100; });
      main.innerHTML = '<section class="card locked-card"><h1>🔒 ' + esc(r.titre) + '</h1><p>Cette rubrique s’ouvrira quand la rubrique <strong>' + prev.num + ' — ' + esc(prev.titre) + '</strong> sera complète. On avance page par page, comme le dossier.</p><button type="button" class="btn" data-goto="' + prev.id + '">Reprendre la rubrique ' + prev.num + '</button></section>';
      return;
    }
    const comps = r.comp.map(function (code) { const c = window.COMPETENCES.find(function (x) { return x.code === code; }); return '<span class="comp" title="' + esc(c.critere) + '">' + code + ' · ' + esc(c.titre) + '</span>'; }).join('') + (r.compLabel ? '<span class="comp alt">' + esc(r.compLabel) + '</span>' : '');
    let h = '<article class="rubrique">' +
      '<header class="rub-head"><span class="rub-kicker">Rubrique ' + r.num + ' · ' + esc(r.page) + '</span><h1>' + esc(r.titre) + '</h1><div class="comps">' + comps + '</div><p class="objectif">' + esc(r.objectif) + '</p></header>';

    if (r.intro) h += '<section class="card"><ul class="intro">' + r.intro.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></section>';
    if (r.showCompetences) h += '<section class="card"><h2>Les 6 compétences évaluées</h2><div class="table-wrap"><table class="result"><thead><tr><th>Code</th><th>Compétence</th><th>Critère officiel</th><th>Rubrique</th></tr></thead><tbody>' +
      window.COMPETENCES.map(function (c) { const rs = R.filter(function (x) { return x.comp.indexOf(c.code) >= 0 && x.id !== 'r9'; }).map(function (x) { return x.num; }).join(', '); return '<tr><td><strong>' + c.code + '</strong></td><td>' + esc(c.titre) + '</td><td>« ' + esc(c.critere) + ' »</td><td>' + rs + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="help">Chaque compétence est notée sur 4 niveaux : non maîtrisé, maîtrise partielle, bonne maîtrise, excellente maîtrise.</p></section>';
    if (r.regles) h += '<section class="card"><h2>Les 5 règles d’or</h2><ol>' + r.regles.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></section>';

    if (r.jury && r.jury.length) h += details('Ce que le jury va vous demander', '<ul>' + r.jury.map(function (j) { return '<li>' + esc(j) + '</li>'; }).join('') + '</ul>', true, 'jury');
    if (r.kawa) h += details('L’exemple de KAWA.', r.kawa, r.num === 0, 'kawa');

    h += '<section class="card form"><h2>' + (r.num === 0 ? 'Pour démarrer' : 'À vous : ma page de dossier') + '</h2>' +
      r.fields.map(function (f) { return fieldHtml(r, f); }).join('') + '</section>';

    if (r.pieges && r.pieges.length) h += details('Les pièges à éviter', '<ul>' + r.pieges.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>', false, 'pieges');

    h += '<section class="card status" id="rub-status"></section>';
    h += '<nav class="pager">' + (idx > 0 ? '<button type="button" class="btn ghost" data-goto="' + R[idx - 1].id + '">← ' + esc(R[idx - 1].court) + '</button>' : '<span></span>') +
      (idx < R.length - 1 ? '<button type="button" class="btn" id="btn-next" data-goto="' + R[idx + 1].id + '">' + esc(R[idx + 1].court) + ' →</button>' : '<button type="button" class="btn" id="btn-apercu2">Aperçu de mon dossier</button>') + '</nav></article>';

    main.innerHTML = h;
    typo(main);
    S.lexUsed = lexify(main, {});
    refreshStatus();
    if (r.id === 'r8') refreshFinanceTotals();
  }


  /* ================= Lexique : mots cliquables, bulle de définition, page dédiée ================= */
  const LEX = window.LEXIQUE || [];
  const LEX_BY = {};
  LEX.forEach(function (e) { LEX_BY[e.id] = e; });
  const LEX_RE = (function () {
    const list = [];
    LEX.forEach(function (e) {
      (e.mots || []).forEach(function (m) {
        const acronyme = /^[A-ZÉ0-9 -]{2,8}$/.test(m) && m === m.toUpperCase();
        const src = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[’']/g, '[’\']').replace(/ /g, '[\\s\\u00a0\\u202f]+');
        list.push({ id: e.id, len: m.length, re: new RegExp('(^|[^\\p{L}\\p{N}])(' + src + ')(?![\\p{L}\\p{N}])', acronyme ? 'u' : 'iu') });
      });
    });
    return list.sort(function (a, b) { return b.len - a.len; });
  })();
  const LEX_ZONES = '.objectif, .intro li, .disc-body, .help, .hint, .note, ol.steps li, .msgs li, .lex-def';

  /** Rend cliquables les notions du lexique (une seule fois chacune par page). */
  function lexify(root, used, skipId) {
    if (!root || !LEX_RE.length) return;
    used = used || {};
    if (skipId) used[skipId] = true;
    const zones = root.matches && root.matches(LEX_ZONES) ? [root] : Array.prototype.slice.call(root.querySelectorAll(LEX_ZONES));
    zones.forEach(function (z) {
      const walker = document.createTreeWalker(z, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
        return n.parentNode.closest('button, a, input, textarea, select, .lex, label > span.req') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        let n = node;
        while (n) {
          let best = null;
          for (let i = 0; i < LEX_RE.length; i++) {
            const L = LEX_RE[i];
            if (used[L.id]) continue;
            const m = L.re.exec(n.nodeValue);
            if (m && (!best || m.index + m[1].length < best.at)) best = { at: m.index + m[1].length, txt: m[2], id: L.id };
          }
          if (!best) break;
          used[best.id] = true;
          const mid = n.splitText(best.at);
          const rest = mid.splitText(best.txt.length);
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'lex'; b.setAttribute('data-lex', best.id); b.title = 'Définition : ' + LEX_BY[best.id].terme;
          b.textContent = mid.nodeValue;
          mid.parentNode.replaceChild(b, mid);
          n = rest;
        }
      });
    });
    return used;
  }

  function lexCard(e, full) {
    return '<span class="lex-cat">' + esc(e.cat) + '</span><h3>' + esc(e.terme) + '</h3><p class="lex-def">' + esc(e.def) + '</p>' +
      (e.ex ? '<p class="lex-ex"><strong>Exemple :</strong> ' + esc(e.ex) + '</p>' : '') +
      (e.lien ? '<p class="lex-link"><a href="' + esc(e.lien.url) + '" target="_blank" rel="noopener">' + esc(e.lien.label) + '</a></p>' : '') +
      (full ? '' : '<button type="button" class="btn ghost small" data-lexique="' + e.id + '">Tout le lexique</button>');
  }

  function lexClose() { const p = $('#lex-pop'); if (p) p.remove(); document.removeEventListener('keydown', lexKey); }
  function lexKey(e) { if (e.key === 'Escape') lexClose(); }
  function lexOpen(btn) {
    const e = LEX_BY[btn.getAttribute('data-lex')];
    if (!e) return;
    lexClose();
    const pop = document.createElement('div');
    pop.id = 'lex-pop'; pop.className = 'lex-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', e.terme);
    pop.innerHTML = '<button type="button" class="lex-x" aria-label="Fermer">✕</button>' + lexCard(e);
    ($('#app') || document.body).appendChild(pop);
    lexify(pop.querySelector('.lex-def'), {}, e.id);
    if (window.innerWidth > 640) {
      const r = btn.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight;
      let left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
      let top = r.bottom + 8;
      if (top + h > window.innerHeight - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
      pop.style.left = left + 'px'; pop.style.top = (top + window.scrollY) + 'px';
    } else pop.classList.add('sheet');
    document.addEventListener('keydown', lexKey);
    const x = pop.querySelector('.lex-x'); if (x) x.focus();
  }

  function renderLexique(q, cat) {
    lexClose();
    S.view = 'lexique';
    renderNav();
    document.body.classList.remove('nav-open');
    const main = $('#main');
    q = q || ''; cat = cat || '';
    const norm = function (t) { return String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
    const nq = norm(q);
    const list = LEX.filter(function (e) { return (!cat || e.cat === cat) && (!nq || norm(e.terme + ' ' + e.def + ' ' + (e.mots || []).join(' ')).indexOf(nq) >= 0); });
    const cats = (window.LEXIQUE_CATS || []).filter(function (c) { return list.some(function (e) { return e.cat === c; }); });
    main.innerHTML = '<article class="rubrique lexique"><header class="rub-head"><span class="rub-kicker">Lexique</span><h1>Les notions à connaître</h1>' +
      '<p class="objectif">' + LEX.length + ' notions de gestion, de droit, de fiscalité, de RH et de marketing, avec un lien vers la source officielle. Les mots soulignés en pointillés dans le site renvoient ici.</p></header>' +
      '<div class="lex-tools"><input type="search" id="lex-q" placeholder="Chercher une notion : BFR, bail, SASU…" value="' + esc(q) + '" aria-label="Chercher une notion">' +
      '<div class="lex-chips"><button type="button" class="chip' + (!cat ? ' on' : '') + '" data-lexcat="">Toutes</button>' + (window.LEXIQUE_CATS || []).map(function (c) { return '<button type="button" class="chip' + (cat === c ? ' on' : '') + '" data-lexcat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div></div>' +
      '<div id="lex-list">' + (list.length ? cats.map(function (c) {
        return '<section class="lex-group"><h2>' + esc(c) + '</h2><div class="lex-grid">' + list.filter(function (e) { return e.cat === c; }).map(function (e) { return '<article class="lex-item card" id="lex-' + e.id + '">' + lexCard(e, true) + '</article>'; }).join('') + '</div></section>';
      }).join('') : '<p class="muted">Aucune notion ne correspond. Essayez un autre mot.</p>') + '</div></article>';
    main.querySelectorAll('.lex-item').forEach(function (a) { lexify(a.querySelector('.lex-def'), {}, a.id.slice(4)); });
    typo(main);
    S.lexState = { q: q, cat: cat };
  }

  /* Espaces fines insécables avant : ; ? ! » et après « (typographie française) */
  function typo(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) {
      const p = n.parentNode && n.parentNode.nodeName;
      if (p === 'TEXTAREA' || p === 'SCRIPT' || p === 'STYLE' || p === 'OPTION') continue;
      const v = n.nodeValue;
      const nv = v.replace(/ ([:;?!»])/g, '\u202F$1').replace(/« /g, '«\u202F');
      if (nv !== v) n.nodeValue = nv;
    }
  }

  function details(title, body, open, cls) {
    return '<details class="card disclosure ' + (cls || '') + '"' + (open ? ' open' : '') + '><summary>' + esc(title) + '</summary><div class="disc-body">' + body + '</div></details>';
  }

  function refreshStatus() {
    const r = rub(S.current);
    const el = $('#rub-status');
    if (!el || !r) return;
    const c = completion(r);
    const p = Math.round(c.pct * 100);
    const next = $('#btn-next');
    const nextLocked = cfg.PROGRESSION_GUIDEE && p < 100;
    if (next) { next.disabled = nextLocked; next.title = nextLocked ? 'Complétez cette rubrique pour avancer' : ''; }
    el.innerHTML = '<div class="status-head"><strong>' + (p >= 100 ? 'Rubrique complète ✓' : 'Rubrique complète à ' + p + ' %') + '</strong><div class="bar"><span style="width:' + p + '%"></span></div></div>' +
      (pagesOf(r) && /Page/.test(r.page) ? (function () { const n = rubWords(r), b = pagesOf(r) * MOTS_PAR_PAGE; return '<p class="small ' + (n > b * 1.3 ? 'lg-ko' : (n > b ? 'lg-mid' : 'muted')) + '">Longueur : ' + n + ' mots rédigés, pour ' + esc(r.page.toLowerCase()) + ' dans le dossier (≈ ' + b + ' mots maximum).</p>'; })() : '') +
      (c.missing.length ? '<p class="muted">Pour avancer, il reste :</p><ul class="missing">' + c.missing.map(function (m) { return '<li>' + esc(m.label) + '</li>'; }).join('') + '</ul>' : (S.current !== 'r9' ? '<p class="muted">Vous pouvez passer à la rubrique suivante.</p>' : '<p class="muted">Vous pouvez déposer votre dossier.</p>'));
  }

  function go(rid) {
    saveNow();
    S.view = 'rubrique';
    S.current = rid;
    try { localStorage.setItem('efp_current', rid); } catch (e) {}
    renderNav();
    renderRubrique();
    window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
    if (rid === 'r9' && Store.mode === 'cloud') loadDepots();
  }

  async function loadDepots() {
    try { S.depots = await Store.listDepots(); const b = $('#depot-box'); if (b) b.innerHTML = depotHtml(); } catch (e) { toast(e.message, 'err'); }
  }

  /* ================= Événements ================= */
  function bindShell() {
    const app = $('#app');
    app.addEventListener('input', onInput);
    app.addEventListener('change', onInput);
    app.addEventListener('click', onClick);
  }

  /* ---------- Copie de secours (fichier) ---------- */
  function exporterCopie() {
    const p = Store.profile || {};
    const nom = [p.prenom, p.nom].filter(Boolean).join('-').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-') || 'dossier';
    const payload = { app: 'ef3-mco', version: 1, exporte_le: new Date().toISOString(), eleve: { prenom: p.prenom || '', nom: p.nom || '' }, data: S.data };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }));
    a.download = 'EF3-' + nom + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Copie téléchargée. Gardez-la sur une clé USB ou envoyez-la-vous par e-mail.');
  }
  async function importerCopie(file) {
    if (!file) return;
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { obj = null; }
    if (!obj || obj.app !== 'ef3-mco' || typeof obj.data !== 'object' || !obj.data) { toast('Ce fichier n’est pas une copie de dossier EF3.'); return; }
    const quand = obj.exporte_le ? new Date(obj.exporte_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'date inconnue';
    if (!confirm('Remplacer le dossier affiché par la copie du ' + quand + ' ?\n\nPensez à télécharger d’abord une copie du dossier actuel si vous voulez le garder.')) return;
    S.data = obj.data;
    computeProgress();
    S.dirty = true;
    await saveNow();
    renderNav();
    go(firstIncomplete());
    toast('Copie reprise : votre dossier est rétabli.');
  }

  function onInput(e) {
    const t = e.target;
    if (t.id === 'import-file' && e.type === 'change') { importerCopie(t.files && t.files[0]); return; }
    if (t.id === 'lex-q' && e.type === 'input') {
      const st = S.lexState || {};
      renderLexique(t.value, st.cat);
      const inp = $('#lex-q'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      return;
    }
    if (t.classList && t.classList.contains('sim-range')) {
      const k = t.getAttribute('data-sim'), d = SIM_DEF.find(function (x) { return x.k === k; });
      simState()[k] = Number(t.value);
      const o = $('#sim-o-' + k); if (o) o.textContent = simFmt(Number(t.value), d.unit);
      const out = $('#sim-out'); if (out) out.innerHTML = simOutHtml();
      return;
    }
    const p = t.getAttribute && t.getAttribute('data-path');
    if (!p || S.readOnly) return;
    if (e.type === 'change' && t.type !== 'checkbox' && t.tagName !== 'SELECT') return;
    if (e.type === 'input' && (t.type === 'checkbox' || t.tagName === 'SELECT')) return;
    const path = p.split('|');
    const val = t.type === 'checkbox' ? t.checked : t.value;
    setPath(path, val);
    computeProgress();
    scheduleSave();
    renderNav();
    // Mises à jour en direct
    const rid = path[0];
    if (t.getAttribute('data-rerender')) { renderRubrique(); return; }
    if (t.getAttribute('data-live') === 'radar') { const el = $('#radar-' + rid); if (el) el.innerHTML = radarSvg(rd(rid).hexa || {}); }
    if (t.getAttribute('data-live') === 'carte') { const el = $('#carte-svg'); if (el) el.innerHTML = carteSvg(rd(rid).carte || {}); }
    if (rid === 'r6') { const el = $('#ca-results'); if (el) el.innerHTML = caResultsHtml(); const tot = $('[data-total="r6|plan_actions"]'); if (tot) tot.innerHTML = 'Total : <strong>' + eur(C.planActionsTotal(rd('r6'))) + '</strong>'; }
    if (rid === 'r8' || rid === 'r6') { const so = $('#sim-out'); if (so) so.innerHTML = simOutHtml(); else { const sb = $('#fin-sim'); if (sb) sb.innerHTML = simHtml(); } }
    if (rid === 'r8') { const el = $('#fin-results'); if (el) { el.innerHTML = financeResultsHtml(); lexify(el, Object.assign({}, S.lexUsed)); } refreshFinanceTotals(); }
    if (rid === 'r2' && path[1].indexOf('reprise_') === 0) { const el = $('#reprise-box'); if (el) el.innerHTML = repriseHtml(); }
    if (rid === 'r9' && path[1].indexOf('coh_') === 0) { const b = $('#depot-box'); if (b) b.innerHTML = depotHtml(); }
    if (rid === 'r9') { const b = $('#depot-box'); if (b && path[1] !== 'oral' && path[1] !== 'questions') b.innerHTML = depotHtml(); }
    refreshStatus();
  }

  async function onClick(e) {
    const pop = $('#lex-pop');
    if (pop && !e.target.closest('#lex-pop') && !e.target.closest('[data-lex]')) lexClose();
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.classList.contains('lex-x')) { lexClose(); return; }
    if (t.id === 'sim-reset') { S.sim = null; const sb = $('#fin-sim'); if (sb) { sb.innerHTML = simHtml(); lexify(sb, Object.assign({}, S.lexUsed)); } return; }
    if (t.hasAttribute('data-lex')) { e.preventDefault(); lexOpen(t); return; }
    if (t.hasAttribute('data-lexique')) { const id = t.getAttribute('data-lexique'); renderLexique('', ''); if (id) { const a = document.getElementById('lex-' + id); if (a) { a.scrollIntoView({ block: 'center' }); a.classList.add('flash'); } } else window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-lexcat')) { renderLexique((S.lexState || {}).q, t.getAttribute('data-lexcat')); return; }
    if (t.id === 'brand') { e.preventDefault(); if (Store.profile && Store.profile.role === 'prof') renderProf(); else go(firstIncomplete()); return; }
    if (t.id === 'menu-btn') { document.body.classList.toggle('nav-open'); return; }
    if (t.id === 'btn-logout') { await saveNow(); await Store.signOut(); S.data = {}; S.progress = {}; location.hash = ''; boot(); return; }
    if (t.id === 'btn-reset') { if (confirm('Effacer tout le travail de démonstration enregistré dans ce navigateur ?')) { Store.resetDemo(); S.data = {}; computeProgress(); go('r0'); } return; }
    if (t.id === 'btn-export') { await saveNow(); exporterCopie(); return; }
    if (t.id === 'btn-import') { const f = $('#import-file'); if (f) { f.value = ''; f.click(); } return; }
    if (t.id === 'btn-apercu' || t.id === 'btn-apercu2') { await saveNow(); renderApercu(S.data, Store.profile); return; }
    if (t.id === 'btn-oral' || t.id === 'btn-oral-top') { await saveNow(); renderOral('supports'); return; }
    const g = t.getAttribute('data-goto');
    if (g) { go(g); return; }
    const add = t.getAttribute('data-add-row');
    if (add) { const path = add.split('|'); const arr = getPath(path) || []; arr.push({}); setPath(path, arr); computeProgress(); scheduleSave(); renderRubrique(); return; }
    const del = t.getAttribute('data-del-row');
    if (del) { const path = del.split('|'); const i = parseInt(path.pop(), 10); const arr = getPath(path); if (Array.isArray(arr)) { arr.splice(i, 1); computeProgress(); scheduleSave(); renderNav(); renderRubrique(); } return; }
    if (t.id === 'pdf-send') { uploadPdf(); return; }
    const dl = t.getAttribute('data-dl');
    if (dl) { try { const url = await Store.pdfUrl(dl, t.getAttribute('data-fn')); window.open(url, '_blank', 'noopener'); } catch (err) { toast(err.message, 'err'); } return; }
  }

  async function uploadPdf() {
    const inp = $('#pdf-input');
    const file = inp && inp.files && inp.files[0];
    if (!file) { toast('Choisissez d’abord votre fichier PDF.', 'err'); return; }
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { toast('Seuls les fichiers PDF sont acceptés.', 'err'); return; }
    if (file.size > (cfg.TAILLE_MAX_PDF_MO || 10) * 1024 * 1024) { toast('Fichier trop lourd (' + (cfg.TAILLE_MAX_PDF_MO || 10) + ' Mo maximum).', 'err'); return; }
    const btn = $('#pdf-send'); btn.disabled = true; btn.textContent = 'Envoi en cours…';
    try { await Store.uploadPdf(file); toast('Dossier déposé. Votre professeur peut le télécharger.', 'ok'); await loadDepots(); }
    catch (err) { toast(err.message, 'err'); btn.disabled = false; btn.textContent = 'Déposer mon PDF'; }
  }

  /* ================= Aperçu du dossier (imprimable) ================= */
  function pagesOf(r) { const m = String(r.page || '').match(/(\d+)(?:-(\d+))?/); return m ? (m[2] ? (+m[2] - +m[1] + 1) : 1) : 0; }
  const MOTS_PAR_PAGE = 380;
  /** Nombre de mots rédigés dans une rubrique (textes et cellules de tableaux). */
  function rubWords(r) {
    const d = rd(r.id);
    let n = 0;
    const cnt = function (v) { if (typeof v === 'string' && isNaN(Number(v.replace(',', '.')))) n += words(v); };
    r.fields.forEach(function (f) {
      if (!shown(r, f) || f.id === 'sources' || f.id === 'saison') return;
      const v = d[f.id];
      if (f.type === 'text' || f.type === 'textarea') cnt(v);
      else if (v && typeof v === 'object') JSON.stringify(v).replace(/"([^"]*)"\s*:\s*"([^"]*)"/g, function (m, k, val) { if (['nom', 'note', 'x', 'y', 'choix', 'type', 'tva', 'devis', 'niveau'].indexOf(k) < 0) cnt(val); return m; });
    });
    return n;
  }
  function longueurHtml() {
    return '<div class="table-wrap"><table class="result longueur"><thead><tr><th>Rubrique</th><th class="num">Mots rédigés</th><th class="num">Conseillé</th><th></th></tr></thead><tbody>' +
      R.slice(1, 9).map(function (r) {
        const n = rubWords(r), b = pagesOf(r) * MOTS_PAR_PAGE;
        const cls = n <= b ? 'ok' : (n <= b * 1.3 ? 'mid' : 'ko');
        return '<tr><td>' + r.num + '. ' + esc(r.titre) + ' <span class="muted small">' + esc(r.page) + '</span></td><td class="num">' + n + '</td><td class="num">≤ ' + b + '</td><td><span class="lg ' + cls + '">' + (cls === 'ok' ? 'OK' : (cls === 'mid' ? 'un peu long' : 'trop long')) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderApercu(data, profil, opts) {
    opts = opts || {};
    const mode = opts.mode || 'dossier';
    const keep = S.data;
    S.data = data || {};
    S.docMode = mode;
    const main = $('#main');
    S.view = 'apercu';
    renderNav();
    const r0 = rd('r0');
    const sub = function (m, l) { return '<button type="button" class="btn ' + (m === mode ? '' : 'ghost') + ' small" data-ap-mode="' + m + '">' + l + '</button>'; };
    let h = '<div class="apercu-bar no-print"><button type="button" class="btn ghost" id="ap-back">← Retour</button>' + sub('dossier', 'Dossier à déposer (≈ 10 pages)') + sub('annexes', 'Annexes') + '<button type="button" class="btn" onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>' +
      (S.readOnly ? '<p class="callout no-print">Réponses saisies sur le site par ' + esc(profil ? profil.prenom + ' ' + profil.nom : '') + ' (lecture seule). Le dossier officiel est le PDF déposé.</p>'
        : (mode === 'dossier'
          ? '<div class="callout no-print"><p><strong>Le dossier à déposer</strong> : une dizaine de pages, dans l’ordre de la grille. Les tableaux détaillés (sources, trésorerie mois par mois, emprunt…) sont rangés dans les annexes. Vérifiez la longueur de chaque partie :</p>' + longueurHtml() + '<p class="muted small">Estimation : environ ' + MOTS_PAR_PAGE + ' mots par page avec les tableaux. Une partie « trop longue » se resserre dans la rubrique concernée.</p></div>'
          : '<p class="callout no-print"><strong>Les annexes</strong> : les preuves et les tableaux détaillés, que le jury consulte s’il le souhaite. Elles ne comptent pas dans les 10 pages.</p>'));
    h += '<div class="doc">';
    if (mode === 'dossier') {
      h += '<section class="doc-cover"><h1>' + esc(r0.projet_nom || 'Mon projet') + '</h1><p>' + nl2br(rd('r1').idee_phrase || '') + '</p><p class="muted">Dossier EF3 — Entrepreneuriat · BTS MCO<br>' + esc(profil ? (profil.prenom + ' ' + profil.nom) : '') + (profil && profil.classe ? ' · ' + esc(profil.classe) : '') + '<br>' + esc(cfg.ETABLISSEMENT) + '</p>' +
        '<ol class="doc-toc">' + R.slice(1, 9).map(function (r) { return '<li><span>' + esc(r.titre) + '</span><span class="muted">' + esc(r.page) + '</span></li>'; }).join('') + '<li><span>Annexes</span><span class="muted">hors pagination</span></li></ol></section>';
      R.slice(1, 9).forEach(function (r) {
        const body = r.fields.map(function (f) { return docField(r, f); }).join('').replace(/<h3>[^<]*<\/h3>(?=<h3>|$)/g, '');
        h += '<section class="doc-sec"><h2>' + r.num + '. ' + esc(r.titre) + ' <span class="muted small">' + esc(r.page) + '</span></h2>' + (body || '<p class="muted">Rubrique non encore complétée.</p>') + '</section>';
      });
    } else {
      h += annexesHtml();
    }
    h += '</div>';
    main.innerHTML = h;
    S.data = keep;
    $('#ap-back').addEventListener('click', function () { if (opts.onBack) opts.onBack(); else go(S.current); });
    $$('[data-ap-mode]').forEach(function (b) { b.addEventListener('click', function () { renderApercu(data, profil, Object.assign({}, opts, { mode: b.getAttribute('data-ap-mode') })); }); });
    window.scrollTo(0, 0);
  }

  function annexesHtml() {
    const c = ca(), f = finance();
    let h = '<section class="doc-cover small-cover"><h1>Annexes</h1><p>' + esc(rd('r0').projet_nom || '') + '</p></section>';
    let n = 0;
    const sec = function (title, body) { if (!body) return; n++; h += '<section class="doc-sec"><h2>Annexe ' + n + ' — ' + esc(title) + '</h2>' + body + '</section>'; };
    const r2 = rub('r2'), r6 = rub('r6');
    sec('Mes sources', docField(r2, r2.fields.find(function (x) { return x.id === 'sources'; }), true));
    sec('Mon questionnaire : les chiffres clés', docField(rub('r3'), rub('r3').fields.find(function (x) { return x.id === 'chiffres_cles'; }), true));
    sec('Ma saisonnalité', docField(r6, r6.fields.find(function (x) { return x.id === 'saison'; }), true));
    if (f.CA) {
      const p = C.previsionnel(rd('r8'), c, f);
      sec('Compte de résultat détaillé de l’année 1 (avec les sources)', '<div class="doc-calc">' + financeResultsHtml().split('<div class="calc-box">')[1].split('<h4>Mon seuil')[0] + '</div>');
      sec('Besoin en fonds de roulement', '<div class="doc-calc">' + bfrHtml(p, f) + '</div>');
      sec('Plan de financement à 3 ans', '<div class="doc-calc">' + pf3Html(p) + '</div>');
      sec('Remboursement de l’emprunt', '<div class="doc-calc">' + empruntHtml(p) + '</div>');
      sec('Plan de trésorerie sur 12 mois', '<div class="doc-calc">' + tresoHtml(p) + '</div>');
    }
    return h;
  }

  function docField(r, f, force) {
    const d = rd(r.id);
    if (!shown(r, f)) return '';
    if (!force && S.docMode !== 'tout' && ['sources', 'saison', 'chiffres_cles'].indexOf(f.id) >= 0) return '';
    const v = d[f.id];
    switch (f.type) {
      case 'heading': return '<h3>' + esc(f.label) + '</h3>';
      case 'text': case 'textarea': case 'number': case 'select':
        if (!filled(v)) return '';
        if (f.id === 'tva') return '<p><strong>TVA :</strong> ' + esc(v === 'mixte' ? 'plusieurs gammes, taux moyen ' + ca().tva.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %' : v + ' %') + '</p>';
        if (f.id === 'famille') return '';
        if (f.type === 'select' && Array.isArray(f.options) && Array.isArray(f.options[1])) { const o = f.options.find(function (x) { return String(x[0]) === String(v); }); if (o) return '<p><strong>' + esc(f.label) + ' :</strong> ' + esc(o[1]) + '</p>'; }
        return '<p><strong>' + esc(f.label) + ' :</strong> ' + nl2br(v) + '</p>';
      case 'check': return '';
      case 'grid': {
        const rows = (f.dynamic ? (v || []) : f.rows.map(function (rw) { return Object.assign({ _label: rw.label }, (v || {})[rw.id] || {}); }))
          .filter(function (row) { return f.cols.some(function (c) { return filled(row[c.id]); }); });
        if (!rows.length) return '';
        return '<h4>' + esc(f.label) + '</h4><table class="doc-table"><thead><tr>' + (f.rows ? '<th></th>' : '') + f.cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (row) { return '<tr>' + (f.rows ? '<th>' + esc(row._label) + '</th>' : '') + f.cols.map(function (c) { return '<td>' + (c.type === 'number' && filled(row[c.id]) ? eur(row[c.id]) : nl2br(row[c.id])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
          (f.total ? '<p><strong>Total : ' + eur(rows.reduce(function (s, row) { return s + C.num(row[f.total]); }, 0)) + '</strong></p>' : '');
      }
      case 'hexagone': {
        const hx = v || {};
        return '<h4>' + esc(f.label) + '</h4><div class="doc-flex"><table class="doc-table"><tbody>' + window.FORCES.map(function (fo) { const x = hx[fo.id] || {}; return '<tr><th>' + esc(fo.label) + '</th><td>' + esc(x.note || '–') + '/5</td><td>' + esc(x.justif) + '</td></tr>'; }).join('') + '</tbody></table><div class="doc-svg">' + radarSvg(hx) + '</div></div>';
      }
      case 'swot': {
        const s = v || {};
        return '<h4>Synthèse SWOT</h4><table class="doc-table swot-doc"><tr><td><strong>Forces (interne)</strong><br>' + nl2br(s.forces) + '</td><td><strong>Faiblesses (interne)</strong><br>' + nl2br(s.faiblesses) + '</td></tr><tr><td><strong>Opportunités (externe)</strong><br>' + nl2br(s.opportunites) + '</td><td><strong>Menaces (externe)</strong><br>' + nl2br(s.menaces) + '</td></tr></table>';
      }
      case 'canvas': {
        const b = v || {};
        return '<div class="canvas doc-canvas">' + window.CANVAS.map(function (c) { return '<div class="cv-box cv-' + c.area + '"><strong>' + esc(c.label) + '</strong><div>' + nl2br(b[c.id]) + '</div></div>'; }).join('') + '</div>';
      }
      case 'carte': return '<h4>' + esc(f.label) + '</h4><div class="doc-svg wide">' + carteSvg(v || {}) + '</div>';
      case 'oral': case 'autoeval': return '';
      case 'reprise': return '<div class="doc-calc">' + repriseHtml().replace(/<p class="muted small">[\s\S]*?<\/p>/, '').replace(/<ul class="msgs">[\s\S]*?<\/ul>/g, '') + '</div>';
      case 'ca': return '<div class="doc-calc">' + caResultsHtml().replace(/<p class="muted small">[\s\S]*?<\/p>/, '').replace(/<ul class="msgs">[\s\S]*?<\/ul>/g, '') + '</div>';
      case 'finance': {
        const fin = finance();
        const dd = rd('r8');
        const pf = '<h4>Plan de financement initial</h4><table class="doc-table"><thead><tr><th>Besoins</th><th class="num">Montant</th><th>Ressources</th><th class="num">Montant</th></tr></thead><tbody>' +
          zip([['Rachat du fonds de commerce', fin.besoins.fonds], ['Investissements amortissables', C.num(dd.b_invest)], ['Investissements non amortis', C.num(dd.b_non_amort)], ['Stock de départ', C.num(dd.b_stock)], ['Frais de lancement', C.num(dd.b_frais)], ['Trésorerie de départ', C.num(dd.b_treso)]]
              .concat(fin.X.besoins.map(function (x) { return [(x.lib || 'Autre besoin') + (x.nature ? ' (' + x.nature.toLowerCase() + ')' : ''), C.num(x.montant)]; })).filter(function (x) { return x[1]; }),
            [['Apport personnel', C.num(dd.r_apport)], ['Prêt d’honneur', C.num(dd.r_honneur)], ['Aides et subventions', C.num(dd.r_aides)], ['Emprunt bancaire' + (dd.duree_emprunt ? ' (' + C.num(dd.duree_emprunt) + ' ans' + (dd.taux_emprunt ? ', ' + C.num(dd.taux_emprunt).toLocaleString('fr-FR') + ' %' : '') + ')' : ''), C.num(dd.r_emprunt)]]
              .concat(fin.X.ressources.map(function (x) { return [(x.lib || 'Autre ressource') + (x.nature === 'Emprunt' && x.duree ? ' (' + C.num(x.duree) + ' ans, ' + C.num(x.taux).toLocaleString('fr-FR') + ' %)' : ''), C.num(x.montant)]; })).filter(function (x) { return x[1]; })) +
          '<tr class="total"><th>Total</th><td class="num">' + eur(fin.totBesoins) + '</td><th>Total</th><td class="num">' + eur(fin.totRessources) + '</td></tr></tbody></table>';
        if (!fin.CA) return pf;
        const fr = financeResultsHtml();
        const seuilPart = fr.substring(fr.indexOf('<h4>Mon seuil'), fr.indexOf('<h4>Ma trésorerie'));
        const pv = C.previsionnel(dd, ca(), fin);
        return pf + '<div class="doc-calc">' + cr3Html(pv, fin) + seuilPart +
          '<ul class="plain"><li>Trésorerie : au plus bas ' + eur(pv.minSolde) + ' (' + pv.minMois.toLowerCase() + '), positive les 12 premiers mois' + (pv.minSolde < 0 ? ' : NON' : '') + ' — détail en annexe.</li>' +
          '<li>Apport, prêt d’honneur et aides : ' + pct(fin.partFP) + ' du besoin total.</li>' + (fin.annuite ? '<li>La capacité d’autofinancement couvre ' + fin.ratioCaf.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' fois l’annuité d’emprunt.</li>' : '') + '</ul></div>';
      }
    }
    return '';
  }
  function zip(a, b) {
    const n = Math.max(a.length, b.length);
    let h = '';
    for (let i = 0; i < n; i++) h += '<tr><td>' + esc(a[i] ? a[i][0] : '') + '</td><td class="num">' + (a[i] ? eur(a[i][1]) : '') + '</td><td>' + esc(b[i] ? b[i][0] : '') + '</td><td class="num">' + (b[i] ? eur(b[i][1]) : '') + '</td></tr>';
    return h;
  }

  /* ================= Espace professeur ================= */
  let PROF = { list: [], classe: '', q: '' };

  /* ---------- Grille d'évaluation officielle (annexe 19) ---------- */
  function renderGrille(etu, data, onBack) {
    const key = 'efp_grille_' + (etu.id || 'demo');
    let g = {};
    try { g = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { g = {}; }
    const save = function () { try { localStorage.setItem(key, JSON.stringify(g)); } catch (e) { /* stockage indisponible */ } };
    const auto = ((data.r9 || {}).autoeval) || {};
    const lv = [['ne', 'Non évaluable']].concat(window.GRILLE_NIVEAUX.map(function (n) { return [n.id, n.label]; }));
    S.view = 'grille';
    const main = $('#main');
    main.innerHTML = '<div class="apercu-bar no-print"><button type="button" class="btn ghost" id="gr-back">← Retour</button><button type="button" class="btn" onclick="window.print()">Imprimer la grille</button></div>' +
      '<p class="callout no-print">Grille de l’annexe 19 de la circulaire nationale BTS MCO. Vos saisies restent dans ce navigateur (rien n’est envoyé à l’étudiant). La colonne grisée rappelle l’auto-évaluation de l’étudiant.</p>' +
      '<div class="doc grille-doc"><h1>Épreuve facultative EF3 — Entrepreneuriat · Grille d’évaluation</h1>' +
      '<table class="doc-table"><tr><th>Candidat(e)</th><td>' + esc((etu.nom || '').toUpperCase() + ' ' + (etu.prenom || '')) + '</td><th>Projet</th><td>' + esc((data.r0 || {}).projet_nom || '') + '</td></tr>' +
      '<tr><th>Commission</th><td><input type="text" data-g="commission" value="' + esc(g.commission) + '"></td><th>Date</th><td><input type="text" data-g="date" value="' + esc(g.date) + '"></td></tr></table>' +
      '<h3>Partie 1 : présentation du modèle économique et du plan d’affaires (10 minutes maximum)</h3><textarea rows="4" data-g="obs1">' + esc(g.obs1) + '</textarea>' +
      '<h3>Partie 2 : entretien (10 minutes maximum)</h3><textarea rows="4" data-g="obs2">' + esc(g.obs2) + '</textarea>' +
      '<div class="table-wrap"><table class="doc-table grille-niv"><thead><tr><th>Compétence</th>' + lv.map(function (l) { return '<th>' + esc(l[1]) + '</th>'; }).join('') + '<th>Critère</th><th class="no-print auto">Auto-éval.</th></tr></thead><tbody>' +
      window.COMPETENCES.map(function (cp) {
        const a = auto[cp.code] || {};
        const al = (window.GRILLE_NIVEAUX.find(function (n) { return n.id === a.niveau; }) || {}).label || '—';
        return '<tr><th>' + cp.code + ' · ' + esc(cp.titre) + '</th>' + lv.map(function (l) { return '<td class="center"><input type="radio" name="g-' + cp.code + '" data-gn="' + cp.code + '" value="' + l[0] + '"' + (g[cp.code] === l[0] ? ' checked' : '') + ' aria-label="' + esc(cp.code + ' ' + l[1]) + '"></td>'; }).join('') + '<td class="small">' + esc(cp.critere) + '</td><td class="no-print auto small">' + esc(al) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<h3>Commentaires de la commission (justification de la note)</h3><textarea rows="5" data-g="comm">' + esc(g.comm) + '</textarea>' +
      '<p class="note-line"><strong>Note sur 20 :</strong> <input type="text" class="note20" data-g="note" value="' + esc(g.note) + '"></p></div>';
    $('#gr-back').addEventListener('click', onBack);
    const box = $('.grille-doc');
    box.addEventListener('input', function (ev) { const k = ev.target.getAttribute('data-g'); if (k) { g[k] = ev.target.value; save(); } });
    box.addEventListener('change', function (ev) { const k = ev.target.getAttribute('data-gn'); if (k) { g[k] = ev.target.value; save(); } });
    window.scrollTo(0, 0);
  }

  async function renderProf() {
    S.view = 'prof';
    const main = $('#main');
    main.innerHTML = '<p class="muted">Chargement…</p>';
    try {
      PROF.list = await Store.listEtudiants();
      PROF.classes = await Store.listClasses();
    } catch (e) { main.innerHTML = '<div class="callout warn">' + esc(e.message) + '</div>'; return; }
    drawProf();
  }

  function drawProf() {
    const main = $('#main');
    const classes = PROF.classes || [];
    let list = PROF.list.filter(function (e) {
      return (!PROF.classe || e.classe === PROF.classe) && (!PROF.q || (e.nom + ' ' + e.prenom + ' ' + e.identifiant).toLowerCase().indexOf(PROF.q.toLowerCase()) >= 0);
    });
    const nbDepots = list.filter(function (e) { return e.depots.length; }).length;
    const rows = list.map(function (e) {
      const prog = (e.dossier && e.dossier.progress) || {};
      const g = Math.round(R.reduce(function (s, r) { return s + (prog[r.id] || 0); }, 0) / R.length);
      const squares = R.map(function (r) { const p = prog[r.id] || 0; return '<span class="sq ' + (p >= 100 ? 'full' : (p > 0 ? 'part' : '')) + '" title="Rubrique ' + r.num + ' — ' + esc(r.titre) + ' : ' + p + ' %">' + r.num + '</span>'; }).join('');
      const dep = e.depots[0];
      return '<tr><td><strong>' + esc(e.nom.toUpperCase()) + '</strong> ' + esc(e.prenom) + '<br><span class="muted small">' + esc(e.identifiant || '') + (e.bloque_jusqua && new Date(e.bloque_jusqua) > new Date() ? ' · <span class="lg-ko">bloqué (trop d’essais)</span>' : '') + '</span></td><td>' + esc(e.classe || '') + '</td>' +
        '<td><div class="bar small"><span style="width:' + g + '%"></span></div><span class="small">' + g + ' %</span><div class="squares">' + squares + '</div></td>' +
        '<td class="small">' + (e.dossier && e.dossier.updated_at ? new Date(e.dossier.updated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—') + '</td>' +
        '<td>' + (dep ? '<span class="small">' + new Date(dep.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + (e.depots.length > 1 ? ' · ' + e.depots.length + ' versions' : '') + '</span><br><button type="button" class="btn small" data-dl="' + esc(dep.path) + '" data-fn="' + esc(fileName(e, dep)) + '">Télécharger le PDF</button>' : '<span class="muted small">Aucun dépôt</span>') + '</td>' +
        '<td><button type="button" class="btn ghost small" data-voir="' + esc(e.id) + '">Voir ses réponses</button> <button type="button" class="btn ghost small" data-grille="' + esc(e.id) + '">Grille d’évaluation</button> <button type="button" class="btn ghost small" data-code="' + esc(e.id) + '">Nouveau code</button> <button type="button" class="btn ghost small danger" data-suppr="' + esc(e.id) + '">Supprimer</button></td></tr>';
    }).join('');
    main.innerHTML = '<article class="rubrique"><header class="rub-head"><span class="rub-kicker">Espace professeur</span><h1>Mes élèves</h1><p class="objectif">' + list.length + ' élève(s) · ' + nbDepots + ' dossier(s) déposé(s)</p></header>' +
      '<section class="card"><div class="prof-tools"><select id="prof-classe"><option value="">Toutes les classes</option>' + classes.map(function (c) { return '<option' + (PROF.classe === c.code ? ' selected' : '') + ' value="' + esc(c.code) + '">' + esc(c.code + ' — ' + c.nom) + '</option>'; }).join('') + '</select>' +
      '<input type="search" id="prof-q" placeholder="Rechercher un élève" value="' + esc(PROF.q) + '"><button type="button" class="btn ghost small" id="prof-csv">Exporter en tableur (CSV)</button><button type="button" class="btn ghost small" id="prof-refresh">Actualiser</button></div>' +
      '<div class="table-wrap"><table class="result prof"><thead><tr><th>Élève</th><th>Classe</th><th>Avancement par rubrique</th><th>Dernière activité</th><th>Dossier déposé</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="muted">Aucun élève pour l’instant : ajoutez la liste de la classe ci-dessous.</td></tr>') + '</tbody></table></div></section>' +
      '<section class="card" id="ajout-eleves"><h2>Ajouter des élèves</h2><p class="help">Collez la liste de la classe, <strong>un élève par ligne</strong> : « Prénom Nom », « NOM Prénom » (copie depuis Pronote) ou deux colonnes copiées d’un tableur. Le site crée pour chacun un identifiant et un code personnel à 6 chiffres.</p>' +
        (classes.length ? '<div class="prof-tools"><select id="add-classe-sel">' + classes.map(function (c) { return '<option value="' + esc(c.code) + '"' + (PROF.classe === c.code ? ' selected' : '') + '>' + esc(c.code + ' — ' + c.nom) + '</option>'; }).join('') + '</select></div>' +
          '<textarea id="add-liste" rows="6" placeholder="Amine Benali&#10;DUPONT Léa&#10;Kaya	Jean-Pierre"></textarea><div id="add-apercu"></div>' +
          '<div class="prof-tools"><button type="button" class="btn" id="add-creer" disabled>Créer les comptes</button></div>'
        : '<p class="callout">Créez d’abord une classe ci-dessous.</p>') + '</section>' +
      '<section class="card"><h2>Mes classes</h2><table class="result"><thead><tr><th>Code</th><th>Classe</th><th>Élèves</th></tr></thead><tbody>' + classes.map(function (c) { return '<tr><td><strong>' + esc(c.code) + '</strong></td><td>' + esc(c.nom) + '</td><td>' + PROF.list.filter(function (e) { return e.classe === c.code; }).length + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="prof-tools"><input type="text" id="new-code" placeholder="Code court (ex. MCO2-2027)"><input type="text" id="new-nom" placeholder="Nom (ex. BTS MCO 2e année)"><button type="button" class="btn small" id="add-classe">Ajouter la classe</button></div></section></article>';

    $('#prof-classe').addEventListener('change', function (ev) { PROF.classe = ev.target.value; drawProf(); });
    $('#prof-q').addEventListener('input', function (ev) { PROF.q = ev.target.value; clearTimeout(PROF.t); PROF.t = setTimeout(function () { drawProf(); const q = $('#prof-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 300); });
    $('#prof-csv').addEventListener('click', function () { exportCsv(list); });
    $('#prof-refresh').addEventListener('click', renderProf);
    $('#add-classe').addEventListener('click', async function () {
      const code = $('#new-code').value, nom = $('#new-nom').value;
      if (!code.trim() || !nom.trim()) { toast('Indiquez le code et le nom de la classe.', 'err'); return; }
      try { await Store.addClasse(code, nom); toast('Classe ajoutée.', 'ok'); renderProf(); } catch (e) { toast(e.message, 'err'); }
    });
    bindAjoutEleves();
    $$('[data-code]').forEach(function (b) {
      b.addEventListener('click', async function () {
        const e = PROF.list.find(function (x) { return x.id === b.getAttribute('data-code'); });
        if (!confirm('Créer un nouveau code pour ' + e.prenom + ' ' + e.nom + ' ? L’ancien code ne marchera plus et l’élève sera déconnecté de ses autres appareils.')) return;
        try { const code = await Store.nouveauCode(e.id); afficherCodes([{ prenom: e.prenom, nom: e.nom, identifiant: e.identifiant, code: code, classe: e.classe }], 'Nouveau code'); }
        catch (err) { toast(err.message, 'err'); }
      });
    });
    $$('[data-suppr]').forEach(function (b) {
      b.addEventListener('click', async function () {
        const e = PROF.list.find(function (x) { return x.id === b.getAttribute('data-suppr'); });
        if (!confirm('Supprimer définitivement le compte de ' + e.prenom + ' ' + e.nom + ' ? Son dossier et ses dépôts seront effacés. Cette action est irréversible.')) return;
        try { await Store.supprimerEleve(e.id); toast('Compte supprimé.', 'ok'); renderProf(); } catch (err) { toast(err.message, 'err'); }
      });
    });
    $$('[data-grille]').forEach(function (b) {
      b.addEventListener('click', async function () {
        const e = PROF.list.find(function (x) { return x.id === b.getAttribute('data-grille'); });
        let data = {};
        try { const dos = await Store.loadDossier(e.id); data = (dos && dos.data) || {}; } catch (err) { /* grille utilisable sans le dossier */ }
        renderGrille(e, data, drawProf);
      });
    });
    $$('[data-voir]').forEach(function (b) {
      b.addEventListener('click', async function () {
        const e = PROF.list.find(function (x) { return x.id === b.getAttribute('data-voir'); });
        try {
          const dos = await Store.loadDossier(e.id);
          S.readOnly = true;
          renderApercu(dos.data || {}, e, { onBack: function () { S.readOnly = false; drawProf(); } });
        } catch (err) { toast(err.message, 'err'); }
      });
    });
  }

  /** Découpe une liste collée en { prenom, nom }. */
  function parseListe(txt) {
    const maj = function (w) { return w.length > 1 && w === w.toUpperCase() && /\p{Lu}/u.test(w); };
    const cap = function (x) { return x.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, function (m, a, c) { return a + c.toUpperCase(); }); };
    return String(txt || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      let prenom = '', nom = '';
      const cols = l.split(/\t|;|,/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (cols.length >= 2) {
        if (cols[0].split(/\s+/).every(maj) && !cols[1].split(/\s+/).every(maj)) { nom = cols[0]; prenom = cols[1]; }
        else { prenom = cols[0]; nom = cols[1]; }
      } else {
        const w = l.split(/\s+/);
        const up = w.filter(maj);
        if (up.length && up.length < w.length) { nom = up.join(' '); prenom = w.filter(function (x) { return !maj(x); }).join(' '); }
        else { prenom = w[0]; nom = w.slice(1).join(' '); }
      }
      return { prenom: cap(prenom), nom: cap(nom), ok: !!(prenom && nom) };
    });
  }

  function bindAjoutEleves() {
    const ta = $('#add-liste'); if (!ta) return;
    const norm = function (x) { return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''); };
    const lire = function () {
      const classe = $('#add-classe-sel').value;
      const deja = {};
      PROF.list.forEach(function (e) { if (e.classe === classe) deja[norm(e.prenom) + '|' + norm(e.nom)] = true; });
      const vus = {};
      return parseListe(ta.value).map(function (x) {
        const k = norm(x.prenom) + '|' + norm(x.nom);
        if (x.ok && deja[k]) { x.ok = false; x.motif = 'déjà inscrit dans cette classe : ignoré'; }
        else if (x.ok && vus[k]) { x.ok = false; x.motif = 'en double dans la liste : ignoré'; }
        else if (!x.ok) x.motif = 'prénom ou nom manquant : ligne ignorée';
        vus[k] = true;
        return x;
      });
    };
    const maj = function () {
      const l = lire();
      const ok = l.filter(function (x) { return x.ok; });
      $('#add-creer').disabled = !ok.length;
      $('#add-creer').textContent = ok.length ? 'Créer ' + ok.length + ' compte' + (ok.length > 1 ? 's' : '') : 'Créer les comptes';
      $('#add-apercu').innerHTML = l.length ? '<div class="table-wrap"><table class="result"><thead><tr><th>Prénom</th><th>Nom</th><th></th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td>' + esc(x.prenom) + '</td><td>' + esc(x.nom) + '</td><td>' + (x.ok ? '' : '<span class="lg-ko">' + esc(x.motif) + '</span>') + '</td></tr>'; }).join('') + '</tbody></table></div><p class="help">Vérifiez que prénoms et noms sont dans la bonne colonne avant de créer les comptes.</p>' : '';
    };
    ta.addEventListener('input', maj);
    $('#add-classe-sel').addEventListener('change', maj);
    $('#add-creer').addEventListener('click', async function () {
      const classe = $('#add-classe-sel').value;
      const l = lire().filter(function (x) { return x.ok; }).map(function (x) { return { prenom: x.prenom, nom: x.nom }; });
      const btn = $('#add-creer'); btn.disabled = true; btn.textContent = 'Création…';
      try {
        const res = await Store.creerEleves(classe, l);
        res.forEach(function (r) { r.classe = classe; });
        PROF.list = await Store.listEtudiants();
        afficherCodes(res, res.length + ' compte' + (res.length > 1 ? 's' : '') + ' créé' + (res.length > 1 ? 's' : ''));
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    });
  }

  /** Affiche les identifiants et codes, avec impression d'étiquettes et export CSV. */
  function afficherCodes(list, titre) {
    const main = $('#main');
    const url = location.origin + location.pathname;
    main.innerHTML = '<article class="rubrique codes-view"><div class="no-print"><header class="rub-head"><span class="rub-kicker">Espace professeur</span><h1>' + esc(titre) + '</h1></header>' +
      '<div class="callout warn"><p><strong>Notez ou imprimez ces codes maintenant</strong> : ils ne seront plus affichés. En cas de perte, vous pourrez toujours en créer un nouveau.</p></div>' +
      '<div class="oral-actions"><button type="button" class="btn" id="codes-print">Imprimer les étiquettes</button><button type="button" class="btn ghost" id="codes-csv">Télécharger la liste (CSV)</button><button type="button" class="btn ghost" id="codes-back">Retour à mes élèves</button></div></div>' +
      '<div class="etiquettes">' + list.map(function (r) {
        return '<div class="etiquette"><p class="et-nom">' + esc(r.prenom + ' ' + r.nom) + '</p><p class="et-site">' + esc(url.replace(/^https?:\/\//, '')) + '</p>' +
          '<p><span>Identifiant</span><strong>' + esc(r.identifiant) + '</strong></p><p><span>Code</span><strong class="et-code">' + esc(r.code) + '</strong></p></div>';
      }).join('') + '</div></article>';
    $('#codes-print').addEventListener('click', function () { document.body.classList.add('print-codes'); window.print(); setTimeout(function () { document.body.classList.remove('print-codes'); }, 500); });
    $('#codes-back').addEventListener('click', renderProf);
    $('#codes-csv').addEventListener('click', function () {
      const lines = [['Prénom', 'Nom', 'Classe', 'Identifiant', 'Code']].concat(list.map(function (r) { return [r.prenom, r.nom, r.classe || '', r.identifiant, r.code]; }));
      const csv = '﻿' + lines.map(function (l) { return l.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'codes-eleves-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
    });
    window.scrollTo(0, 0);
  }

  function fileName(e, dep) { return ('EF3_' + (e.classe || '') + '_' + e.nom + '_' + e.prenom).replace(/[^\w\-]+/g, '_') + '.pdf'; }

  function exportCsv(list) {
    const head = ['Nom', 'Prénom', 'Identifiant', 'Classe', 'Avancement global (%)'].concat(R.map(function (r) { return 'R' + r.num + ' ' + r.court + ' (%)'; })).concat(['Dernière activité', 'Dernier dépôt', 'Nombre de versions']);
    const lines = [head].concat(list.map(function (e) {
      const prog = (e.dossier && e.dossier.progress) || {};
      const g = Math.round(R.reduce(function (s, r) { return s + (prog[r.id] || 0); }, 0) / R.length);
      return [e.nom, e.prenom, e.identifiant, e.classe, g].concat(R.map(function (r) { return prog[r.id] || 0; })).concat([
        e.dossier && e.dossier.updated_at ? new Date(e.dossier.updated_at).toLocaleString('fr-FR') : '',
        e.depots[0] ? new Date(e.depots[0].created_at).toLocaleString('fr-FR') : '', e.depots.length]);
    }));
    const csv = '﻿' + lines.map(function (l) { return l.map(function (x) { return '"' + String(x === undefined || x === null ? '' : x).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'suivi-EF3-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  }

  /* ================= Connexion ================= */
  function renderAuth(mode) {
    mode = mode || 'login';
    const app = $('#app');
    const t = {
      login: '<h2>Connexion élève</h2><form id="f-login" autocomplete="off"><label>Mon identifiant<input name="identifiant" required autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="prenom.nom"></label><label>Mon code à 6 chiffres<input name="code" required inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" autocomplete="off" class="code-input" placeholder="••••••"></label><button class="btn wide">Se connecter</button></form>' +
        '<p class="help">Identifiant et code sont donnés par votre professeur. Code perdu ? Demandez-lui-en un nouveau.</p>' +
        '<p class="help">Sur un ordinateur partagé, cliquez sur <strong>Se déconnecter</strong> en partant : votre travail est enregistré en ligne, pas sur l’ordinateur.</p>' +
        '<p class="auth-links"><a href="#" data-auth="prof">Espace professeur</a></p>',
      prof: '<h2>Espace professeur</h2><form id="f-prof"><label>Adresse e-mail<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe<input type="password" name="password" required autocomplete="current-password"></label><button class="btn wide">Se connecter</button></form><p class="auth-links"><a href="#" data-auth="forgot">Mot de passe oublié</a> · <a href="#" data-auth="signup">Créer le compte professeur</a> · <a href="#" data-auth="login">Connexion élève</a></p>',
      signup: '<h2>Créer le compte professeur</h2><form id="f-signup"><div class="two"><label>Prénom<input name="prenom" required autocomplete="given-name"></label><label>Nom<input name="nom" required autocomplete="family-name"></label></div><label>Adresse e-mail<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe (8 caractères minimum)<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><label>Code professeur<input name="classe" required autocapitalize="characters"></label><button class="btn wide">Créer le compte</button></form><p class="auth-links"><a href="#" data-auth="prof">Retour</a></p>',
      forgot: '<h2>Mot de passe oublié</h2><form id="f-forgot"><label>Adresse e-mail<input type="email" name="email" required></label><button class="btn wide">Recevoir un lien</button></form><p class="auth-links"><a href="#" data-auth="prof">Retour</a></p>',
      reset: '<h2>Nouveau mot de passe</h2><form id="f-reset"><label>Nouveau mot de passe<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="btn wide">Enregistrer</button></form>'
    };
    app.innerHTML = '<div class="auth"><div class="auth-card"><div class="auth-brand"><span class="logo">EF3</span><div><strong>' + esc(cfg.NOM_SITE) + '</strong><br><span class="muted">' + esc(cfg.ETABLISSEMENT) + '</span></div></div>' +
      (mode === 'login' ? '<p class="auth-intro">Construisez votre dossier d’entrepreneuriat page par page. Votre travail est enregistré automatiquement : vous le retrouvez sur n’importe quel ordinateur ou téléphone.</p>' : '') + t[mode] + '<p class="auth-msg" id="auth-msg" role="alert"></p></div><p class="foot"><a href="mentions.html">Mentions légales et données personnelles</a></p></div>';
    $$('[data-auth]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); renderAuth(a.getAttribute('data-auth')); }); });
    const msg = function (m, ok) { const el = $('#auth-msg'); el.textContent = m; el.className = 'auth-msg ' + (ok ? 'ok' : 'err'); };
    const form = $('form', app);
    const first = $('input', form); if (first) first.focus();
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const btn = $('button', form); btn.disabled = true;
      try {
        if (mode === 'login') { await Store.signInEleve(fd.get('identifiant'), fd.get('code')); boot(); }
        else if (mode === 'prof') { await Store.signIn(fd.get('email'), fd.get('password')); boot(); }
        else if (mode === 'signup') {
          const res = await Store.signUp({ email: fd.get('email'), password: fd.get('password'), nom: fd.get('nom'), prenom: fd.get('prenom'), classe: fd.get('classe') });
          if (res.session) boot(); else msg('Compte créé. Ouvrez le lien reçu par e-mail pour confirmer votre adresse, puis connectez-vous.', true);
        } else if (mode === 'forgot') { await Store.resetPassword(fd.get('email')); msg('Si un compte existe avec cette adresse, un lien vient de vous être envoyé.', true); }
        else if (mode === 'reset') { await Store.updatePassword(fd.get('password')); msg('Mot de passe modifié.', true); setTimeout(function () { location.hash = ''; boot(); }, 1200); }
      } catch (err) { msg(err.message); }
      btn.disabled = false;
    });
  }

  /* ================= Démarrage ================= */
  async function boot() {
    const app = $('#app');
    app.innerHTML = '<div class="loading">Chargement…</div>';
    try { if (Store.mode !== 'cloud' || !Store.user) await Store.init(); }
    catch (e) { app.innerHTML = '<div class="auth"><div class="auth-card"><p class="auth-msg err">' + esc(e.message) + '</p></div></div>'; return; }
    Store.onRecovery(function () { renderAuth('reset'); });
    if (location.hash === '#nouveau-mot-de-passe' && Store.user) { renderAuth('reset'); return; }
    Store.onExpired = function () { toast('Votre session a expiré : reconnectez-vous.', 'err'); setTimeout(function () { renderAuth('login'); }, 800); };
    if (Store.mode === 'cloud' && !Store.user) { renderAuth('login'); return; }
    if (Store.isProf()) { renderShell(); renderProf(); return; }
    const dos = await Store.loadDossier();
    S.data = dos.data || {};
    computeProgress();
    renderShell();
    let start = null;
    try { start = localStorage.getItem('efp_current'); } catch (e) {}
    if (!start || !rub(start) || !isUnlocked(start)) start = firstIncomplete();
    go(start);
    setSaveStatus('saved');
  }

  window.addEventListener('beforeunload', function (e) { if (S.dirty) { saveNow(); e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saveNow(); });
  document.addEventListener('DOMContentLoaded', boot);
})();
