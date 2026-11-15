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
      if (f.showIf && d[f.showIf.field] !== f.showIf.equals) return;
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
          const fc = finance();
          if (fc.totBesoins > 0) items.push({ label: 'Plan de financement équilibré', ok: Math.abs(fc.totBesoins - fc.totRessources) < 1 });
          if (C.num(d.r_emprunt) > 0) items.push({ label: 'Taux et durée de l’emprunt', ok: filled(d.taux_emprunt) && filled(d.duree_emprunt) });
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
    if (f.showIf && d[f.showIf.field] !== f.showIf.equals) return '';
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
    return '<h4>Mon chiffre d’affaires prévisionnel (calculé automatiquement)</h4>' +
      '<div class="table-wrap"><table class="result"><thead><tr><th>Scénario</th><th>Taux</th><th>Clients / jour</th><th>Panier HT</th><th>Jours</th><th>CA annuel HT</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="formula">' + esc(C.num(rd('r6').base).toLocaleString('fr-FR')) + ' × ' + c.sc.prudent.taux.toLocaleString('fr-FR') + ' % = ' + c.sc.prudent.clients.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' clients par jour × ' + eur(c.panierHT, 2) + ' HT × ' + c.jours + ' jours = <strong>' + eur(c.caPrudent) + ' HT</strong></p>' +
      msgList(c.alertes, c.ok) +
      '<p class="muted small">C’est ce chiffre prudent qui sera repris automatiquement dans vos finances (rubrique 8).</p>';
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
    remu_net: 'Ma rémunération nette mensuelle', taux_cotis: 'Taux de cotisations sociales'
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

  function financeHtml(r, f) {
    FIN_REQ = f.req || [];
    return '<div class="fin">' +
      '<h3 class="form-heading">1. Mon plan de financement initial</h3>' +
      '<p class="help">Règle absolue : total des besoins = total des ressources. Tous les montants en HT.</p>' +
      '<div class="fin-cols"><div class="fin-col"><h4>Besoins</h4>' +
        finField('b_invest', 'Investissements amortissables', { src: 'src_invest', help: 'Travaux, matériel, mobilier, véhicule acheté' }) +
        finField('duree_amort', 'Durée d’amortissement', { unit: 'ans', help: '5 ans par défaut' }) +
        finField('b_non_amort', 'Investissements non amortis', { src: 'src_non_amort', help: 'Dépôt de garantie, fonds de commerce, droit au bail, licence' }) +
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
      finField('remu_net', 'Ma rémunération nette (par mois)') +
      (rd('r8').statut === 'Micro-entreprise'
        ? finField('taux_cotis', 'Cotisations sociales en % du chiffre d\u2019affaires', { unit: '%', help: 'Micro-entreprise : taux fixé par l\u2019URSSAF selon l\u2019activité (vente ou service), à vérifier sur urssaf.fr' })
        : finField('taux_cotis', 'Cotisations sociales en % du net', { unit: '%', help: 'Ordre de grandeur à confirmer au simulateur URSSAF selon le statut' })) +
      '<div id="fin-results">' + financeResultsHtml() + '</div></div>';
  }

  function financeResultsHtml() {
    const c = ca();
    const f = finance();
    const d = rd('r8');
    if (!f.CA) return '<div class="calc-box"><p class="muted">Complétez d’abord votre chiffre d’affaires (rubrique 6) : il est repris ici automatiquement.</p></div>';
    const line = function (label, v, src, cls) { return '<tr class="' + (cls || '') + '"><td>' + label + '</td><td class="num">' + v + '</td><td class="src-cell">' + esc(src || '') + '</td></tr>'; };
    const neg = function (v) { return '− ' + eur(v); };
    const cr = '<h4>Mon compte de résultat prévisionnel</h4><div class="table-wrap"><table class="result cr"><thead><tr><th>Poste</th><th class="num">Montant</th><th>D’où vient le chiffre</th></tr></thead><tbody>' +
      line('Chiffre d’affaires HT', eur(f.CA), 'Scénario prudent (rubrique 6)', 'strong') +
      line('Charges variables (' + C.num(d.taux_var).toLocaleString('fr-FR') + ' %)', neg(f.variables), d.src_var) +
      line('Loyer et charges', neg(f.fixesSaisis.loyer), d.src_loyer) +
      line('Énergie, eau, téléphone', neg(f.fixesSaisis.energie), d.src_energie) +
      line('Assurances', neg(f.fixesSaisis.assurance), d.src_assurance) +
      line('Comptabilité, banque, caisse', neg(f.fixesSaisis.compta), d.src_compta) +
      line('Communication', neg(f.fixesSaisis.comm), d.src_comm) +
      (f.fixesSaisis.salaires ? line('Salaires (coût employeur)', neg(f.fixesSaisis.salaires), d.src_salaires) : '') +
      (f.fixesSaisis.autres ? line('Autres charges fixes', neg(f.fixesSaisis.autres), d.src_autres) : '') +
      (f.besoins.frais ? line('Frais de lancement (année 1 seulement)', neg(f.besoins.frais), 'Plan de financement') : '') +
      line('Ma rémunération + cotisations', neg(f.remu), C.num(d.remu_net) ? eur(C.num(d.remu_net)) + ' net par mois + cotisations (' + C.num(d.taux_cotis).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' % ' + (f.micro ? 'du CA' : 'du net') + ')' : 'À compléter') +
      (f.interets ? line('Intérêts d’emprunt', neg(f.interets), eur(f.ressources.emprunt) + ' à ' + C.num(d.taux_emprunt).toLocaleString('fr-FR') + ' %') : '') +
      (f.amort ? line('Amortissements', neg(f.amort), eur(f.besoins.invest) + ' ÷ ' + (C.num(d.duree_amort) || 5) + ' ans') : '') +
      line('Résultat avant impôt', (f.resultat >= 0 ? '+ ' : '− ') + eur(Math.abs(f.resultat)), '', 'total ' + (f.resultat >= 0 ? 'pos' : 'negv')) +
      '</tbody></table></div>';

    const seuil = '<h4>Mon seuil de rentabilité</h4><ol class="steps">' +
      '<li>Charges fixes (toutes les lignes sauf les variables) : <strong>' + eur(f.fixes) + '</strong></li>' +
      '<li>Taux de marge sur coût variable : (' + eur(f.CA) + ' − ' + eur(f.variables) + ') ÷ ' + eur(f.CA) + ' = <strong>' + pct(f.tmcv, 1) + '</strong></li>' +
      '<li>Seuil = ' + eur(f.fixes) + ' ÷ ' + pct(f.tmcv, 1) + ' = <strong>' + eur(f.seuil) + '</strong>, soit ' + eur(f.seuilJour) + ' par jour, soit ' + f.seuilClientsExact.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' clients par jour à ' + eur(c.panierHT, 2) + ' HT.</li></ol>' +
      '<div class="kpis">' +
        kpi('Point mort', f.seuilClients + ' clients / jour', 'arrondi au-dessus') +
        kpi('Prévu (prudent)', c.sc.prudent.clients.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' clients / jour', '') +
        kpi('Marge de sécurité', pct(f.margeSecu), f.margeSecu < 0.10 ? 'fragile' : (f.margeSecu < 0.15 ? 'correcte' : 'solide'), f.margeSecu < 0.10 ? 'bad' : 'good') +
        kpi('Si les ventes baissent de 20 %', (f.stress >= 0 ? '+ ' : '− ') + eur(Math.abs(f.stress)), 'résultat', f.stress < 0 ? 'bad' : 'good') +
      '</div>' +
      '<p class="muted small">Point mort atteint vers le ' + f.pointMortJour + '<sup>e</sup> jour de l’année en rythme régulier.</p>';

    const treso = '<h4>Ma trésorerie et ma banque</h4><ul class="plain">' +
      '<li>Charges à payer chaque mois (sans les amortissements, avec le remboursement de l’emprunt) : <strong>' + eur(f.decaissMensuel) + '</strong></li>' +
      '<li>Ma trésorerie de départ couvre <strong>' + f.moisTreso.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' mois</strong> de charges.</li>' +
      (f.annuite ? '<li>Capacité d’autofinancement (résultat + amortissements) : <strong>' + eur(f.caf) + '</strong> pour une annuité d’emprunt de ' + eur(f.annuite) + '.</li>' : '') +
      (f.totBesoins ? '<li>Apport, prêt d’honneur et aides : <strong>' + pct(f.quasiFP / f.totBesoins) + '</strong> du besoin total.</li>' : '') +
      '</ul>';

    return '<div class="calc-box">' + cr + seuil + treso + msgList(f.alertes, f.ok) + '</div>';
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
        return '<li><span>' + (i === 0 ? '<span class="tag">version transmise</span> ' : '') + esc(dp.filename) + ' — ' + new Date(dp.created_at).toLocaleString('fr-FR') + '</span><button type="button" class="btn ghost small" data-dl="' + esc(dp.path) + '" data-fn="' + esc(dp.filename) + '">Télécharger</button></li>';
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
        (!prof ? '<button type="button" class="btn ghost small" id="btn-apercu">Aperçu de mon dossier</button>' : '') +
        '<div class="user"><span>' + esc(Store.profile ? (Store.profile.prenom + ' ' + Store.profile.nom) : '') + (Store.mode === 'demo' ? ' <span class="tag">démo</span>' : '') + '</span>' +
        (Store.mode === 'cloud' ? '<button type="button" class="btn ghost small" id="btn-logout">Déconnexion</button>' : '<button type="button" class="btn ghost small" id="btn-reset">Effacer la démo</button>') + '</div>' +
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
    }).join('') + '</ol>';
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
    refreshStatus();
    if (r.id === 'r8') refreshFinanceTotals();
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

  function onInput(e) {
    const t = e.target;
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
    if (rid === 'r8') { const el = $('#fin-results'); if (el) el.innerHTML = financeResultsHtml(); refreshFinanceTotals(); }
    if (rid === 'r9' && path[1].indexOf('coh_') === 0) { const b = $('#depot-box'); if (b) b.innerHTML = depotHtml(); }
    if (rid === 'r9') { const b = $('#depot-box'); if (b && path[1] !== 'oral' && path[1] !== 'questions') b.innerHTML = depotHtml(); }
    refreshStatus();
  }

  async function onClick(e) {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.id === 'brand') { e.preventDefault(); if (Store.profile && Store.profile.role === 'prof') renderProf(); else go(firstIncomplete()); return; }
    if (t.id === 'menu-btn') { document.body.classList.toggle('nav-open'); return; }
    if (t.id === 'btn-logout') { await saveNow(); await Store.signOut(); location.hash = ''; boot(); return; }
    if (t.id === 'btn-reset') { if (confirm('Effacer tout le travail de démonstration enregistré dans ce navigateur ?')) { Store.resetDemo(); S.data = {}; computeProgress(); go('r0'); } return; }
    if (t.id === 'btn-apercu' || t.id === 'btn-apercu2') { await saveNow(); renderApercu(S.data, Store.profile); return; }
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
  function renderApercu(data, profil, opts) {
    opts = opts || {};
    const keep = S.data;
    S.data = data || {};
    const main = $('#main');
    S.view = 'apercu';
    renderNav();
    const r0 = rd('r0');
    let h = '<div class="apercu-bar no-print"><button type="button" class="btn ghost" id="ap-back">← Retour</button><button type="button" class="btn" onclick="window.print()">Imprimer ou enregistrer en PDF</button></div>' +
      (S.readOnly ? '<p class="callout no-print">Réponses saisies sur le site par ' + esc(profil ? profil.prenom + ' ' + profil.nom : '') + ' (lecture seule). Le dossier officiel est le PDF déposé.</p>'
        : '<p class="callout no-print">Cet aperçu rassemble tout ce que vous avez saisi, dans l’ordre du dossier. Servez-vous-en comme base pour rédiger et mettre en page votre dossier final (une dizaine de pages), puis déposez-le en PDF dans la rubrique 9.</p>') +
      '<div class="doc"><section class="doc-cover"><h1>' + esc(r0.projet_nom || 'Mon projet') + '</h1><p>' + nl2br(rd('r1').idee_phrase || '') + '</p><p class="muted">Dossier EF3 — Entrepreneuriat · BTS MCO<br>' + esc(profil ? (profil.prenom + ' ' + profil.nom) : '') + (profil && profil.classe ? ' · ' + esc(profil.classe) : '') + '<br>' + esc(cfg.ETABLISSEMENT) + '</p></section>';
    R.slice(1, 9).forEach(function (r) {
      const body = r.fields.map(function (f) { return docField(r, f); }).join('').replace(/<h3>[^<]*<\/h3>(?=<h3>|$)/g, '');
      h += '<section class="doc-sec"><h2>' + r.num + '. ' + esc(r.titre) + ' <span class="muted small">' + esc(r.page) + '</span></h2>' + (body || '<p class="muted">Rubrique non encore complétée.</p>') + '</section>';
    });
    h += '</div>';
    main.innerHTML = h;
    S.data = keep;
    $('#ap-back').addEventListener('click', function () { if (opts.onBack) opts.onBack(); else go(S.current); });
    window.scrollTo(0, 0);
  }

  function docField(r, f) {
    const d = rd(r.id);
    if (f.showIf && d[f.showIf.field] !== f.showIf.equals) return '';
    const v = d[f.id];
    switch (f.type) {
      case 'heading': return '<h3>' + esc(f.label) + '</h3>';
      case 'text': case 'textarea': case 'number': case 'select':
        if (!filled(v)) return '';
        if (f.id === 'tva') return '<p><strong>TVA :</strong> ' + esc(v === 'mixte' ? 'taux moyen ' + (d.tva_mixte || '') + ' %' : v + ' %') + '</p>';
        if (f.id === 'famille') return '';
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
      case 'ca': return '<div class="doc-calc">' + caResultsHtml().replace(/<p class="muted small">[\s\S]*?<\/p>/, '').replace(/<ul class="msgs">[\s\S]*?<\/ul>/g, '') + '</div>';
      case 'finance': {
        const fin = finance();
        const dd = rd('r8');
        const pf = '<h4>Plan de financement initial</h4><table class="doc-table"><thead><tr><th>Besoins</th><th class="num">Montant</th><th>Ressources</th><th class="num">Montant</th></tr></thead><tbody>' +
          zip([['Investissements amortissables', fin.besoins.invest], ['Investissements non amortis', fin.besoins.non_amort], ['Stock de départ', fin.besoins.stock], ['Frais de lancement', fin.besoins.frais], ['Trésorerie de départ', fin.besoins.treso]].filter(function (x) { return x[1]; }),
            [['Apport personnel', fin.ressources.apport], ['Prêt d’honneur', fin.ressources.honneur], ['Aides et subventions', fin.ressources.aides], ['Emprunt bancaire' + (dd.duree_emprunt ? ' (' + C.num(dd.duree_emprunt) + ' ans' + (dd.taux_emprunt ? ', ' + C.num(dd.taux_emprunt).toLocaleString('fr-FR') + ' %' : '') + ')' : ''), fin.ressources.emprunt]].filter(function (x) { return x[1]; })) +
          '<tr class="total"><th>Total</th><td class="num">' + eur(fin.totBesoins) + '</td><th>Total</th><td class="num">' + eur(fin.totRessources) + '</td></tr></tbody></table>';
        return pf + '<div class="doc-calc">' + financeResultsHtml().replace(/<ul class="msgs">[\s\S]*?<\/ul>/g, '') + '</div>';
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
      return (!PROF.classe || e.classe === PROF.classe) && (!PROF.q || (e.nom + ' ' + e.prenom + ' ' + e.email).toLowerCase().indexOf(PROF.q.toLowerCase()) >= 0);
    });
    const nbDepots = list.filter(function (e) { return e.depots.length; }).length;
    const rows = list.map(function (e) {
      const prog = (e.dossier && e.dossier.progress) || {};
      const g = Math.round(R.reduce(function (s, r) { return s + (prog[r.id] || 0); }, 0) / R.length);
      const squares = R.map(function (r) { const p = prog[r.id] || 0; return '<span class="sq ' + (p >= 100 ? 'full' : (p > 0 ? 'part' : '')) + '" title="Rubrique ' + r.num + ' — ' + esc(r.titre) + ' : ' + p + ' %">' + r.num + '</span>'; }).join('');
      const dep = e.depots[0];
      return '<tr><td><strong>' + esc(e.nom.toUpperCase()) + '</strong> ' + esc(e.prenom) + '<br><span class="muted small">' + esc(e.email || '') + '</span></td><td>' + esc(e.classe || '') + '</td>' +
        '<td><div class="bar small"><span style="width:' + g + '%"></span></div><span class="small">' + g + ' %</span><div class="squares">' + squares + '</div></td>' +
        '<td class="small">' + (e.dossier && e.dossier.updated_at ? new Date(e.dossier.updated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—') + '</td>' +
        '<td>' + (dep ? '<span class="small">' + new Date(dep.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + (e.depots.length > 1 ? ' · ' + e.depots.length + ' versions' : '') + '</span><br><button type="button" class="btn small" data-dl="' + esc(dep.path) + '" data-fn="' + esc(fileName(e, dep)) + '">Télécharger le PDF</button>' : '<span class="muted small">Aucun dépôt</span>') + '</td>' +
        '<td><button type="button" class="btn ghost small" data-voir="' + esc(e.id) + '">Voir ses réponses</button></td></tr>';
    }).join('');
    main.innerHTML = '<article class="rubrique"><header class="rub-head"><span class="rub-kicker">Espace professeur</span><h1>Mes étudiants</h1><p class="objectif">' + list.length + ' étudiant(s) · ' + nbDepots + ' dossier(s) déposé(s)</p></header>' +
      '<section class="card"><div class="prof-tools"><select id="prof-classe"><option value="">Toutes les classes</option>' + classes.map(function (c) { return '<option' + (PROF.classe === c.code ? ' selected' : '') + ' value="' + esc(c.code) + '">' + esc(c.code + ' — ' + c.nom) + '</option>'; }).join('') + '</select>' +
      '<input type="search" id="prof-q" placeholder="Rechercher un étudiant" value="' + esc(PROF.q) + '"><button type="button" class="btn ghost small" id="prof-csv">Exporter en tableur (CSV)</button><button type="button" class="btn ghost small" id="prof-refresh">Actualiser</button></div>' +
      '<div class="table-wrap"><table class="result prof"><thead><tr><th>Étudiant</th><th>Classe</th><th>Avancement par rubrique</th><th>Dernière activité</th><th>Dossier déposé</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="muted">Aucun étudiant inscrit pour l’instant. Donnez-leur l’adresse du site et le code de leur classe.</td></tr>') + '</tbody></table></div></section>' +
      '<section class="card"><h2>Codes d’inscription des classes</h2><p class="help">Un étudiant ne peut créer son compte qu’avec le code de sa classe. Fermez un code quand toute la classe est inscrite.</p>' +
      '<table class="result"><thead><tr><th>Code</th><th>Classe</th><th>État</th><th></th></tr></thead><tbody>' + classes.map(function (c) { return '<tr><td><strong>' + esc(c.code) + '</strong></td><td>' + esc(c.nom) + '</td><td>' + (c.actif ? 'Ouvert' : 'Fermé') + '</td><td><button type="button" class="btn ghost small" data-toggle-classe="' + esc(c.code) + '" data-actif="' + (c.actif ? '0' : '1') + '">' + (c.actif ? 'Fermer' : 'Rouvrir') + '</button></td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="prof-tools"><input type="text" id="new-code" placeholder="Code (ex. MCO2-2027)"><input type="text" id="new-nom" placeholder="Nom (ex. BTS MCO 2e année)"><button type="button" class="btn small" id="add-classe">Ajouter</button></div></section></article>';

    $('#prof-classe').addEventListener('change', function (ev) { PROF.classe = ev.target.value; drawProf(); });
    $('#prof-q').addEventListener('input', function (ev) { PROF.q = ev.target.value; clearTimeout(PROF.t); PROF.t = setTimeout(function () { drawProf(); const q = $('#prof-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 300); });
    $('#prof-csv').addEventListener('click', function () { exportCsv(list); });
    $('#prof-refresh').addEventListener('click', renderProf);
    $('#add-classe').addEventListener('click', async function () {
      const code = $('#new-code').value, nom = $('#new-nom').value;
      if (!code.trim() || !nom.trim()) { toast('Indiquez le code et le nom de la classe.', 'err'); return; }
      try { await Store.addClasse(code, nom); toast('Classe ajoutée.', 'ok'); renderProf(); } catch (e) { toast(e.message, 'err'); }
    });
    $$('[data-toggle-classe]').forEach(function (b) { b.addEventListener('click', async function () { try { await Store.toggleClasse(b.getAttribute('data-toggle-classe'), b.getAttribute('data-actif') === '1'); renderProf(); } catch (e) { toast(e.message, 'err'); } }); });
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

  function fileName(e, dep) { return ('EF3_' + (e.classe || '') + '_' + e.nom + '_' + e.prenom).replace(/[^\w\-]+/g, '_') + '.pdf'; }

  function exportCsv(list) {
    const head = ['Nom', 'Prénom', 'E-mail', 'Classe', 'Avancement global (%)'].concat(R.map(function (r) { return 'R' + r.num + ' ' + r.court + ' (%)'; })).concat(['Dernière activité', 'Dernier dépôt', 'Nombre de versions']);
    const lines = [head].concat(list.map(function (e) {
      const prog = (e.dossier && e.dossier.progress) || {};
      const g = Math.round(R.reduce(function (s, r) { return s + (prog[r.id] || 0); }, 0) / R.length);
      return [e.nom, e.prenom, e.email, e.classe, g].concat(R.map(function (r) { return prog[r.id] || 0; })).concat([
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
      login: '<h2>Connexion</h2><form id="f-login"><label>Adresse e-mail<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe<input type="password" name="password" required autocomplete="current-password"></label><button class="btn wide">Se connecter</button></form><p class="auth-links"><a href="#" data-auth="signup">Créer mon compte</a> · <a href="#" data-auth="forgot">Mot de passe oublié ?</a></p>',
      signup: '<h2>Créer mon compte</h2><form id="f-signup"><div class="two"><label>Prénom<input name="prenom" required autocomplete="given-name"></label><label>Nom<input name="nom" required autocomplete="family-name"></label></div><label>Adresse e-mail<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe (8 caractères minimum)<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><label>Code de ma classe<input name="classe" required placeholder="Donné par votre professeur" autocapitalize="characters"></label><label class="check"><input type="checkbox" required><span>J’ai lu les <a href="mentions.html" target="_blank">mentions sur mes données personnelles</a>.</span></label><button class="btn wide">Créer mon compte</button></form><p class="auth-links"><a href="#" data-auth="login">J’ai déjà un compte</a></p>',
      forgot: '<h2>Mot de passe oublié</h2><form id="f-forgot"><label>Adresse e-mail<input type="email" name="email" required></label><button class="btn wide">Recevoir un lien</button></form><p class="auth-links"><a href="#" data-auth="login">Retour</a></p>',
      reset: '<h2>Nouveau mot de passe</h2><form id="f-reset"><label>Nouveau mot de passe<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="btn wide">Enregistrer</button></form>'
    };
    app.innerHTML = '<div class="auth"><div class="auth-card"><div class="auth-brand"><span class="logo">EF3</span><div><strong>' + esc(cfg.NOM_SITE) + '</strong><br><span class="muted">' + esc(cfg.ETABLISSEMENT) + '</span></div></div>' +
      '<p class="auth-intro">Construisez votre dossier d’entrepreneuriat page par page, suivez votre avancement et déposez votre dossier final.</p>' + t[mode] + '<p class="auth-msg" id="auth-msg" role="alert"></p></div><p class="foot"><a href="mentions.html">Mentions légales et données personnelles</a></p></div>';
    $$('[data-auth]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); renderAuth(a.getAttribute('data-auth')); }); });
    const msg = function (m, ok) { const el = $('#auth-msg'); el.textContent = m; el.className = 'auth-msg ' + (ok ? 'ok' : 'err'); };
    const form = $('form', app);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const btn = $('button', form); btn.disabled = true;
      try {
        if (mode === 'login') { await Store.signIn(fd.get('email'), fd.get('password')); boot(); }
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
    try { if (!Store.mode || !Store.user) await Store.init(); }
    catch (e) { app.innerHTML = '<div class="auth"><div class="auth-card"><p class="auth-msg err">' + esc(e.message) + '</p></div></div>'; return; }
    Store.onRecovery(function () { renderAuth('reset'); });
    if (location.hash === '#nouveau-mot-de-passe' && Store.user) { renderAuth('reset'); return; }
    if (Store.mode === 'cloud' && !Store.user) { renderAuth('login'); return; }
    if (Store.profile && Store.profile.role === 'prof') { renderShell(); renderProf(); return; }
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
