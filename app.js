/* Free Game Art Finder – plain JS, no build step. Data comes from catalog.js (window.CATALOG). */
(function () {
  'use strict';
  const C = window.CATALOG;
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- data
  const TYPE_INFO = {
    pic:    { label: 'Pictures',    icon: '🖼️' },
    sound:  { label: 'Sounds',      icon: '🔊' },
    music:  { label: 'Music',       icon: '🎵' },
    model:  { label: '3D models',   icon: '🧊' },
    anim:   { label: 'Animations',  icon: '🏃' },
    font:   { label: 'Fonts',       icon: '🔤' },
    map:    { label: 'Game maps',   icon: '🗺️' },
    source: { label: 'Editable source files', icon: '📁' },
  };
  const VERDICT = {
    free:   { short: '✅ Free',                  cls: 'v-free' },
    credit: { short: '✅ Give credit',           cls: 'v-credit' },
    share:  { short: '🟡 Give credit + share',   cls: 'v-share' },
    nosell: { short: "⛔ Can't sell",            cls: 'v-nosell' },
    check:  { short: '❓ Not sure',              cls: 'v-check' },
  };
  const LAYER_RX = /_(n|s|a|h|g|p|norm|normal|nm|spec|specular|gloss|glow|orm|ao|mask|height|bump)\.[a-z0-9]+$/i;

  const items = C.items.map((r, i) => {
    const [dirIdx, file, typeIdx, licIdx, creditIdx, noteIdx, hasPrev, tex] = r;
    const [srcIdx, dir] = C.dirs[dirIdx];
    const src = C.sources[srcIdx];
    const licId = C.licIds[licIdx];
    const lic = C.licenses[licId];
    const path = dir ? dir + '/' + file : file;
    const nice = file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const ext = (file.split('.').pop() || '').toLowerCase();
    return {
      i, src, path, file, nice, ext, dir, type: C.types[typeIdx], licId, lic, verdict: lic.verdict,
      credit: C.credits[creditIdx], note: C.notes[noteIdx], hasPrev: !!hasPrev, tex: tex || '',
      game: src.game, layer: LAYER_RX.test(file),
      hay: (path + ' ' + src.label + ' ' + nice).toLowerCase(),
    };
  });

  // ---------------------------------------------------------------- state
  const state = { game: 'all', type: 'pic', q: '', shown: 0, list: [] };
  const PAGE = 60;
  try { const s = JSON.parse(localStorage.getItem('gaf-state') || '{}'); Object.assign(state, { game: s.game || 'all', type: s.type || 'pic' }); } catch (e) { /* ignore */ }

  function save() { try { localStorage.setItem('gaf-state', JSON.stringify({ game: state.game, type: state.type })); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- filter buttons
  function pills(el, opts, key) {
    el.innerHTML = '';
    for (const [val, text] of opts) {
      const b = document.createElement('button');
      b.className = 'pill' + (state[key] === val ? ' on' : '');
      b.textContent = text;
      b.onclick = () => { state[key] = val; save(); pills(el, opts, key); refresh(); };
      el.appendChild(b);
    }
  }
  const countBy = (pred) => items.reduce((n, it) => n + (pred(it) ? 1 : 0), 0);
  pills($('games'), [['all', '🌍 Both games'], ['0ad', '🏛️ 0 A.D. (ancient times)'], ['unv', '👾 Unvanquished (sci-fi)']], 'game');
  pills($('types'), [['all', '⭐ Everything'], ...Object.entries(TYPE_INFO).filter(([k]) => countBy(it => it.type === k)).map(([k, v]) => [k, v.icon + ' ' + v.label])], 'type');

  const boxes = ['hideBad', 'hideNoSell', 'hideCheck', 'hideShare', 'hideCredit', 'hideLayers', 'onlyPreview'];
  try { const s = JSON.parse(localStorage.getItem('gaf-boxes') || 'null'); if (s) for (const b of boxes) if (b in s) $(b).checked = !!s[b]; } catch (e) { /* ignore */ }
  const saveBoxes = () => { try { localStorage.setItem('gaf-boxes', JSON.stringify(Object.fromEntries(boxes.map(b => [b, $(b).checked])))); } catch (e) { /* ignore */ } };
  for (const b of boxes) $(b).addEventListener('change', () => { saveBoxes(); refresh(); });
  $('resetChecks').onclick = () => { for (const b of boxes) $(b).checked = (b === 'hideLayers'); saveBoxes(); refresh(); };
  let qTimer;
  $('q').addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(refresh, 200); });

  function matches(it) {
    if (state.game !== 'all' && it.game !== state.game) return false;
    if (state.type !== 'all' && it.type !== state.type) return false;
    const v = it.verdict;
    if ($('hideBad').checked && (v === 'nosell' || v === 'check')) return false;
    if ($('hideNoSell').checked && v === 'nosell') return false;
    if ($('hideCheck').checked && v === 'check') return false;
    if ($('hideShare').checked && v === 'share') return false;
    if ($('hideCredit').checked && (v === 'credit' || v === 'share')) return false;
    if ($('hideLayers').checked && it.layer && it.type === 'pic') return false;
    if ($('onlyPreview').checked && !it.hasPrev) return false;
    if (state.q) { for (const w of state.q) if (!it.hay.includes(w)) return false; }
    return true;
  }

  function refresh() {
    state.q = $('q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    state.list = items.filter(matches);
    // Problem items first? No – keep folder order, but put items with a preview first so the page looks alive.
    state.list.sort((a, b) => (b.hasPrev - a.hasPrev) || (a.i - b.i));
    state.shown = 0;
    queue.length = 0; // drop thumbnail loads for cards that are gone
    $('grid').innerHTML = '';
    const n = state.list.length;
    const bad = state.list.filter(it => it.verdict === 'nosell' || it.verdict === 'check').length;
    $('count').textContent = n.toLocaleString() + (n === 1 ? ' thing found' : ' things found') + (bad ? `  (${bad} marked red/orange)` : '');
    $('empty').hidden = n > 0;
    showMore();
  }

  function showMore() {
    const grid = $('grid');
    const next = state.list.slice(state.shown, state.shown + PAGE);
    for (const it of next) grid.appendChild(card(it));
    state.shown += next.length;
    $('more').hidden = state.shown >= state.list.length;
    $('more').textContent = `Show more (${(state.list.length - state.shown).toLocaleString()} left)`;
  }
  $('more').onclick = showMore;
  new IntersectionObserver((es) => { if (es[0].isIntersecting && !$('more').hidden) showMore(); }, { rootMargin: '600px' }).observe($('more'));

  // ---------------------------------------------------------------- URLs
  const prevUrl = (it, p) => it.src.prev + (p || it.path);
  const pageUrl = (it) => it.src.page + it.path;
  const dlUrl = (it) => it.src.dl + it.path;
  const gameName = (it) => it.game === '0ad' ? '0 A.D.' : 'Unvanquished';

  // ---------------------------------------------------------------- cards
  function card(it) {
    const d = document.createElement('div');
    d.className = 'card' + (it.verdict === 'nosell' ? ' bad-nosell' : it.verdict === 'check' ? ' bad-check' : '');
    d.tabIndex = 0;
    d.setAttribute('role', 'button');
    const t = document.createElement('div');
    t.className = 'thumb';
    t._it = it;
    d.appendChild(t);
    const v = VERDICT[it.verdict];
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<div class="name"></div><div class="where"></div><span class="badge ${v.cls}">${v.short}</span>`;
    info.querySelector('.name').textContent = TYPE_INFO[it.type].icon + ' ' + it.nice;
    info.querySelector('.where').textContent = gameName(it) + ' · ' + shortDir(it);
    d.appendChild(info);
    d.onclick = (ev) => { if (ev.target.closest('.play')) return; openDetail(it); };
    d.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openDetail(it); } };
    // Fill right away (loads are queued, 6 at a time). Only 60 cards are added per page.
    fillThumb(t, it);
    return d;
  }
  function shortDir(it) {
    const parts = it.dir.split('/').filter(p => !['public', 'mod', 'art', 'textures', 'audio', 'models', 'skins', 'meshes', 'sound', 'gfx'].includes(p));
    return parts.slice(-3).join(' / ') || it.src.label;
  }

  function fillThumb(t, it) {
    t.innerHTML = '';
    if (!it.hasPrev) {
      t.innerHTML = `<div class="nopreview"><span class="big-icon">${TYPE_INFO[it.type].icon}</span>New in the latest version.<br>Click to open it on the 0 A.D. site.</div>`;
      return;
    }
    if (it.type === 'pic') return loadPicture(prevUrl(it), it.ext).then(el => { t.innerHTML = ''; t.appendChild(el); }).catch(() => noPrev(t, it));
    if (it.type === 'sound' || it.type === 'music') {
      const b = document.createElement('button');
      b.className = 'play'; b.textContent = '▶ Play';
      b.onclick = (ev) => { ev.stopPropagation(); togglePlay(b, prevUrl(it)); };
      t.appendChild(b); return;
    }
    if (it.type === 'font') {
      const name = 'f' + it.i;
      new FontFace(name, `url("${prevUrl(it)}")`).load().then(ff => {
        document.fonts.add(ff);
        t.innerHTML = `<div class="fontsample" style="font-family:${name}">Aa Bb 123</div>`;
      }).catch(() => noPrev(t, it));
      return;
    }
    if (it.type === 'model' && it.tex) {
      const ext = it.tex.split('.').pop().toLowerCase();
      return loadPicture(prevUrl(it, it.tex), ext).then(el => {
        t.innerHTML = '';
        t.appendChild(el);
        const tag = document.createElement('div');
        tag.style.cssText = 'position:absolute;bottom:8px;right:8px;background:#000c;color:#fff;padding:4px 8px;border-radius:8px;font-size:14px';
        tag.textContent = '🧊 Click to see in 3D';
        t.appendChild(tag);
      }).catch(() => bigIcon(t, it));
    }
    bigIcon(t, it);
  }
  function bigIcon(t, it) {
    const extra = it.type === 'model' && canView3D(it) ? '<div style="font-size:15px;margin-top:6px">Click to see in 3D</div>' : '';
    t.innerHTML = `<div style="text-align:center"><div class="big-icon">${TYPE_INFO[it.type].icon}</div>${extra}</div>`;
  }
  function noPrev(t, it) { t.innerHTML = `<div class="nopreview"><span class="big-icon">${TYPE_INFO[it.type].icon}</span>No preview</div>`; }

  // one audio at a time
  let audio = null, audioBtn = null;
  function togglePlay(btn, url) {
    if (audio && audioBtn === btn && !audio.paused) { audio.pause(); btn.textContent = '▶ Play'; return; }
    if (audio) { audio.pause(); if (audioBtn) audioBtn.textContent = '▶ Play'; }
    audio = new Audio(url); audioBtn = btn;
    btn.textContent = '⏳';
    audio.play().then(() => { btn.textContent = '⏸ Stop'; }).catch(() => { btn.textContent = "😕 Can't play here"; });
    audio.onended = () => { btn.textContent = '▶ Play'; };
  }

  // ---------------------------------------------------------------- picture loading (png/jpg/webp/svg + tga + dds)
  const queue = []; let running = 0;
  function limited(fn) { return new Promise((res, rej) => { queue.push([fn, res, rej]); pump(); }); }
  function pump() {
    while (running < 6 && queue.length) {
      const [fn, res, rej] = queue.shift(); running++;
      fn().then(res, rej).finally(() => { running--; pump(); });
    }
  }
  function loadPicture(url, ext) {
    if (ext === 'dds' || ext === 'tga') {
      return limited(() => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(buf => { const img = ext === 'dds' ? decodeDDS(buf) : decodeTGA(buf); return toCanvas(img); }));
    }
    return limited(() => new Promise((res, rej) => {
      const im = new Image(); im.decoding = 'async'; // not loading=lazy: a detached lazy image never loads
      im.onload = () => res(im); im.onerror = rej; im.src = url;
    }));
  }
  function toCanvas(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
    c.className = 'pic'; return c;
  }

  function decodeTGA(buf) {
    const d = new Uint8Array(buf);
    const idLen = d[0], cmType = d[1], type = d[2];
    const w = d[12] | (d[13] << 8), h = d[14] | (d[15] << 8), bpp = d[16], desc = d[17];
    let p = 18 + idLen + (cmType ? (d[5] | (d[6] << 8)) * (d[7] >> 3) : 0);
    const out = new Uint8ClampedArray(w * h * 4);
    const bytes = bpp >> 3, gray = type === 3 || type === 11, rle = type >= 9;
    const px = new Uint8Array(4);
    const read = () => {
      if (gray) { px[0] = px[1] = px[2] = d[p]; px[3] = bytes === 2 ? d[p + 1] : 255; }
      else { px[2] = d[p]; px[1] = d[p + 1]; px[0] = d[p + 2]; px[3] = bytes === 4 ? d[p + 3] : 255; }
      p += bytes;
    };
    let i = 0; const total = w * h;
    const put = () => { out.set(px, i * 4); i++; };
    while (i < total) {
      if (rle) {
        const c = d[p++], n = (c & 127) + 1;
        if (c & 128) { read(); for (let k = 0; k < n && i < total; k++) put(); }
        else for (let k = 0; k < n && i < total; k++) { read(); put(); }
      } else { read(); put(); }
    }
    if (!(desc & 0x20)) { // bottom-up -> flip
      const row = w * 4, tmp = new Uint8ClampedArray(row);
      for (let y = 0; y < h >> 1; y++) {
        const a = y * row, b = (h - 1 - y) * row;
        tmp.set(out.subarray(a, a + row)); out.copyWithin(a, b, b + row); out.set(tmp, b);
      }
    }
    return { width: w, height: h, data: out };
  }

  function decodeDDS(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x20534444) throw new Error('not dds');
    const h = dv.getUint32(12, true), w = dv.getUint32(16, true);
    const pfFlags = dv.getUint32(80, true), four = String.fromCharCode(...new Uint8Array(buf, 84, 4));
    const rgbBits = dv.getUint32(88, true);
    const masks = [dv.getUint32(92, true), dv.getUint32(96, true), dv.getUint32(100, true), dv.getUint32(104, true)];
    const data = new Uint8Array(buf, 128);
    const out = new Uint8ClampedArray(w * h * 4);
    if (pfFlags & 4) {
      const kind = four === 'DXT1' ? 1 : (four === 'DXT3' ? 3 : (four === 'DXT5' ? 5 : 0));
      if (!kind) throw new Error('dds ' + four);
      const bs = kind === 1 ? 8 : 16; let o = 0;
      for (let by = 0; by < h; by += 4) for (let bx = 0; bx < w; bx += 4) { dxtBlock(data, o, kind, out, w, h, bx, by); o += bs; }
    } else {
      const bytes = rgbBits >> 3;
      const sh = masks.map(m => { if (!m) return [0, 0]; let s = 0; while (!((m >> s) & 1)) s++; let n = 0; while ((m >> (s + n)) & 1) n++; return [s, n]; });
      for (let i = 0; i < w * h; i++) {
        let v = 0; for (let b = 0; b < bytes; b++) v |= data[i * bytes + b] << (8 * b); v >>>= 0;
        for (let c = 0; c < 4; c++) {
          const [s, n] = sh[c];
          out[i * 4 + c] = masks[c] ? Math.round((((v & masks[c]) >>> s) / ((1 << n) - 1)) * 255) : 255;
        }
      }
    }
    return { width: w, height: h, data: out };
  }
  function c565(v) { return [((v >> 11) & 31) * 255 / 31, ((v >> 5) & 63) * 255 / 63, (v & 31) * 255 / 31]; }
  function dxtBlock(d, o, kind, out, w, h, bx, by) {
    const co = kind === 1 ? o : o + 8;
    const a0 = d[co] | (d[co + 1] << 8), a1 = d[co + 2] | (d[co + 3] << 8);
    const c0 = c565(a0), c1 = c565(a1);
    const pal = [c0, c1];
    if (kind !== 1 || a0 > a1) { pal.push(c0.map((v, i) => (2 * v + c1[i]) / 3), c0.map((v, i) => (v + 2 * c1[i]) / 3)); }
    else { pal.push(c0.map((v, i) => (v + c1[i]) / 2), [0, 0, 0, 0]); }
    const bits = (d[co + 4] | (d[co + 5] << 8) | (d[co + 6] << 16) | (d[co + 7] << 24)) >>> 0;
    let alpha = null;
    if (kind === 3) { alpha = []; for (let i = 0; i < 16; i++) alpha.push(((d[o + (i >> 1)] >> ((i & 1) * 4)) & 15) * 17); }
    if (kind === 5) {
      const A0 = d[o], A1 = d[o + 1]; const ap = [A0, A1];
      if (A0 > A1) for (let i = 1; i < 7; i++) ap.push(((7 - i) * A0 + i * A1) / 7);
      else { for (let i = 1; i < 5; i++) ap.push(((5 - i) * A0 + i * A1) / 5); ap.push(0, 255); }
      let lo = d[o + 2] | (d[o + 3] << 8) | (d[o + 4] << 16), hi = d[o + 5] | (d[o + 6] << 8) | (d[o + 7] << 16);
      alpha = []; for (let i = 0; i < 8; i++) alpha.push(ap[(lo >> (3 * i)) & 7]); for (let i = 0; i < 8; i++) alpha.push(ap[(hi >> (3 * i)) & 7]);
    }
    for (let i = 0; i < 16; i++) {
      const x = bx + (i & 3), y = by + (i >> 2); if (x >= w || y >= h) continue;
      const c = pal[(bits >> (2 * i)) & 3], p = (y * w + x) * 4;
      out[p] = c[0]; out[p + 1] = c[1]; out[p + 2] = c[2];
      out[p + 3] = alpha ? alpha[i] : (c.length === 4 ? 0 : 255);
    }
  }

  // ---------------------------------------------------------------- detail dialog
  const dlg = $('dlg');
  function canView3D(it) { return ['dae', 'obj', 'md3', 'iqe'].includes(it.ext) && it.type === 'model'; }

  function creditText(it) {
    const extra = it.game === '0ad' ? ' / Wildfire Games – https://play0ad.com' : ' / Unvanquished – https://unvanquished.net';
    return `"${it.file}" by ${it.credit}, from ${gameName(it)}${extra}. License: ${it.lic.name}${it.lic.url ? ' (' + it.lic.url + ')' : ''}. Source: ${pageUrl(it)}`;
  }

  function verdictHtml(it) {
    const v = it.verdict;
    const L = {
      free: ['✅ Yes, it\'s free', ['Use it in free or paid projects.', 'You don\'t have to do anything. (Saying thanks is nice.)']],
      credit: ['✅ Yes – give credit', ['Use it in free or paid projects.', 'Write the author\'s name in your credits (use the button below).', 'Keep the license name with it.']],
      share: ['🟡 Yes – give credit + share', ['Use it in free or paid projects.', 'Write the author\'s name in your credits (use the button below).', 'If you change this file, share your changed file under the same license.', 'Your own code and other art stay yours.']],
      nosell: ["⛔ Can't sell", ['Only for free, non-commercial projects.', 'Do NOT use it in a game or product you sell or earn money from.']],
      check: ['❓ Not sure – don\'t use yet', ['Nobody wrote down the rules for this file.', 'Ask the author first, or pick something else.']],
    }[v];
    return `<div class="verdict ${VERDICT[v].cls}"><b>${L[0]}</b><ul>${L[1].map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  let cleanup = null;
  function openDetail(it) {
    if (cleanup) { cleanup(); cleanup = null; }
    const showPrev = it.hasPrev;
    const oldNote = it.game === '0ad' && showPrev ? '<div class="small">Preview comes from a 2024 copy of the game. “Download” gets the newest version.</div>' : '';
    dlg.innerHTML = `
      <button class="close" aria-label="Close">✕</button>
      <div class="dlg">
        <div class="stage" id="stage"></div>
        <div class="side">
          <h2>${TYPE_INFO[it.type].icon} ${esc(it.nice)}</h2>
          <div class="small">${esc(gameName(it))} · ${esc(it.src.label)}<br>${esc(it.path)}</div>
          ${verdictHtml(it)}
          <div><b>Made by:</b> ${esc(it.credit)}</div>
          <div><b>License:</b> ${it.lic.url ? `<a href="${esc(it.lic.url)}" target="_blank" rel="noopener">${esc(it.lic.name)}</a>` : esc(it.lic.name)}</div>
          ${it.note ? `<div><b>Note:</b> ${esc(it.note)}</div>` : ''}
          <button class="btn primary" id="copyCredit">📋 Copy credit text</button>
          <button class="btn" id="download">⬇️ Download file</button>
          <a class="btn" href="${esc(pageUrl(it))}" target="_blank" rel="noopener">🔗 See where it comes from</a>
          ${oldNote}
        </div>
      </div>`;
    dlg.querySelector('.close').onclick = () => dlg.close();
    $('copyCredit').onclick = () => copy(creditText(it));
    $('download').onclick = () => download(it);
    if (!dlg.open) dlg.showModal();
    const stage = $('stage');
    if (!showPrev) {
      stage.innerHTML = `<div class="nopreview" style="background:none"><span class="big-icon">${TYPE_INFO[it.type].icon}</span><p>This file is new in the latest 0 A.D. version, so there's no preview here.</p><a class="btn" href="${esc(pageUrl(it))}" target="_blank" rel="noopener">Open it on the 0 A.D. site</a></div>`;
      return;
    }
    if (it.type === 'pic') {
      stage.innerHTML = '<div class="hint">Loading…</div>';
      loadPicture(prevUrl(it), it.ext).then(el => { stage.innerHTML = ''; stage.appendChild(el); size(el, stage); })
        .catch(() => { stage.innerHTML = '<div class="hint">Could not show this picture.</div>'; });
    } else if (it.type === 'sound' || it.type === 'music') {
      if (audio) audio.pause();
      stage.innerHTML = `<audio controls autoplay src="${esc(prevUrl(it))}"></audio>`;
      cleanup = () => { const a = stage.querySelector('audio'); if (a) a.pause(); };
    } else if (it.type === 'font') {
      const name = 'f' + it.i;
      new FontFace(name, `url("${prevUrl(it)}")`).load().then(ff => {
        document.fonts.add(ff);
        stage.innerHTML = `<div style="font-family:${name};font-size:40px;background:#fff;padding:30px;line-height:1.4">The quick brown fox<br>jumps over the lazy dog<br>0123456789 !?&amp;</div>`;
      }).catch(() => { stage.innerHTML = '<div class="hint">Could not show this font.</div>'; });
    } else if (canView3D(it)) {
      stage.innerHTML = '<div class="three" id="three"></div><div class="hint">Loading 3D… Drag to turn. Scroll to zoom.</div>';
      view3D(it, $('three')).then(stop => { cleanup = stop; stage.querySelector('.hint').textContent = 'Drag to turn · Scroll to zoom'; })
        .catch(err => { console.warn(err); stage.querySelector('.hint').textContent = 'Could not show this 3D model here. You can still download it.'; });
    } else {
      const why = it.type === 'anim' ? 'Animations are movements only (no body), so there is nothing to look at here.'
        : it.type === 'map' ? 'Game maps only open inside the game\'s own map editor.'
          : it.type === 'source' ? 'This is a work file for Blender or GIMP. Download it and open it there.'
            : 'No preview for this file type.';
      stage.innerHTML = `<div style="text-align:center;padding:30px"><div class="big-icon" style="font-size:80px">${TYPE_INFO[it.type].icon}</div><p>${why}</p></div>`;
    }
  }
  function size(el, stage) { if (el.naturalWidth && el.naturalWidth < 256) { el.style.width = Math.min(512, el.naturalWidth * 4) + 'px'; el.style.imageRendering = 'pixelated'; } }
  dlg.addEventListener('close', () => { if (cleanup) { cleanup(); cleanup = null; } });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.display = 'none'; }, 2600); }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast('✅ Credit text copied. Paste it into your credits file.'))
      .catch(() => { window.prompt('Copy this text:', text); });
  }
  function download(it) {
    toast('⬇️ Downloading…');
    fetch(dlUrl(it)).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = it.file;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('✅ Downloaded ' + it.file);
    }).catch(() => { window.open(dlUrl(it), '_blank', 'noopener'); toast('Opened the file in a new tab. Right-click → Save as.'); });
  }

  // ---------------------------------------------------------------- 3D viewer
  async function view3D(it, box) {
    const THREE = await import('three');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    const w = box.clientWidth || 600, h = box.clientHeight || 460;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    box.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(3, 5, 4); scene.add(sun);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true; controls.autoRotateSpeed = 1.5;
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    let map = null;
    if (it.tex) {
      const ext = it.tex.split('.').pop().toLowerCase();
      try {
        const el = await loadPicture(prevUrl(it, it.tex), ext);
        map = el.tagName === 'CANVAS' ? new THREE.CanvasTexture(el) : new THREE.Texture(el);
        map.needsUpdate = true; map.colorSpace = THREE.SRGBColorSpace;
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
      } catch (e) { map = null; }
    }
    const mat = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : 0xb9b2a5, map, side: THREE.DoubleSide, roughness: 0.8, alphaTest: map ? 0.3 : 0 });
    const url = prevUrl(it);
    let obj;
    if (it.ext === 'dae') {
      const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
      const col = await new ColladaLoader().loadAsync(url);
      obj = col.scene;
    } else if (it.ext === 'obj') {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      obj = await new OBJLoader().loadAsync(url);
    } else {
      const buf = await fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return it.ext === 'md3' ? r.arrayBuffer() : r.text(); });
      const geos = it.ext === 'md3' ? parseMD3(buf, THREE) : parseIQE(buf, THREE);
      obj = new THREE.Group();
      for (const g of geos) obj.add(new THREE.Mesh(g, mat));
      obj.rotation.x = -Math.PI / 2; // Quake is Z-up
    }
    obj.traverse(o => { if (o.isMesh) { o.material = mat; if (o.isSkinnedMesh) { o.frustumCulled = false; } } });
    scene.add(obj);
    obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj);
    const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()).length() || 1;
    controls.target.copy(c);
    camera.position.copy(c).add(new THREE.Vector3(0.6, 0.45, 0.8).normalize().multiplyScalar(s * 1.1));
    camera.near = s / 1000; camera.far = s * 100; camera.updateProjectionMatrix();
    let alive = true;
    const loop = () => { if (!alive) return; controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop); };
    loop();
    const ro = new ResizeObserver(() => { const W = box.clientWidth, H = box.clientHeight; if (W && H) { renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); } });
    ro.observe(box);
    return () => { alive = false; ro.disconnect(); renderer.dispose(); if (map) map.dispose(); };
  }

  function parseMD3(buf, THREE) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x33504449) throw new Error('not md3');
    const nSurf = dv.getInt32(84, true); let o = dv.getInt32(100, true);
    const geos = [];
    for (let s = 0; s < nSurf; s++) {
      const nVert = dv.getInt32(o + 80, true), nTri = dv.getInt32(o + 76, true);
      const oTri = dv.getInt32(o + 88, true), oSt = dv.getInt32(o + 92, true), oXyz = dv.getInt32(o + 96, true), oEnd = dv.getInt32(o + 100, true);
      const pos = new Float32Array(nVert * 3), uv = new Float32Array(nVert * 2), idx = [];
      for (let v = 0; v < nVert; v++) {
        for (let k = 0; k < 3; k++) pos[v * 3 + k] = dv.getInt16(o + oXyz + v * 8 + k * 2, true) / 64;
        uv[v * 2] = dv.getFloat32(o + oSt + v * 8, true); uv[v * 2 + 1] = 1 - dv.getFloat32(o + oSt + v * 8 + 4, true);
      }
      for (let t = 0; t < nTri; t++) idx.push(dv.getInt32(o + oTri + t * 12, true), dv.getInt32(o + oTri + t * 12 + 8, true), dv.getInt32(o + oTri + t * 12 + 4, true));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals(); geos.push(g);
      o += oEnd;
    }
    return geos;
  }

  function parseIQE(text, THREE) {
    const pos = [], uv = [], idx = []; let base = 0;
    for (const line of text.split('\n')) {
      const p = line.trim().split(/\s+/);
      if (p[0] === 'mesh') base = pos.length / 3;
      else if (p[0] === 'vp') pos.push(+p[1], +p[2], +p[3]);
      else if (p[0] === 'vt') uv.push(+p[1], 1 - +p[2]);
      else if (p[0] === 'fm') idx.push(base + +p[1], base + +p[3], base + +p[2]);
      else if (p[0] === 'fa') idx.push(+p[1], +p[3], +p[2]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv.length / 2 === pos.length / 3) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return [g];
  }

  refresh();
})();
