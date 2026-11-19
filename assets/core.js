/* FitFile core: shared helpers used by every tool page. Everything runs in the browser. */
(function () {
  'use strict';
  const FF = window.FF = window.FF || {};
  FF.tools = {};
  FF.tool = def => { FF.tools[def.slug] = def; };
  const me = document.currentScript;
  FF.assets = me ? me.src.replace(/[^\/]*$/, '') : '';
  FF.vendor = FF.assets.replace(/assets\/$/, 'vendor/');

  const $ = FF.$ = id => document.getElementById(id);
  FF.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FF.kb = b => b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
  FF.row = (a, b) => '<div class="row"><span>' + a + '</span><b>' + b + '</b></div>';
  FF.msg = (type, text) => '<div class="msg ' + type + '">' + text + '</div>';
  FF.tick = () => new Promise(r => setTimeout(r, 0));
  FF.base = name => (name || 'file').replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'file';
  // numbers: n() any number or 0, nn() non-negative or 0, has() true if the box holds a number
  FF.n = id => { const v = parseFloat($(id).value); return isFinite(v) ? v : 0; };
  FF.nn = id => Math.max(0, FF.n(id));
  FF.has = id => $(id).value.trim() !== '' && isFinite(parseFloat($(id).value));
  FF.inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  FF.money = (n, cur, dec) => new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en', { style: 'currency', currency: cur || 'INR', maximumFractionDigits: dec === undefined ? 0 : dec, minimumFractionDigits: dec === undefined ? 0 : dec }).format(n);
  FF.fmt = (n, d) => isFinite(n) ? (+n.toFixed(d === undefined ? 4 : d)).toLocaleString('en-US', { maximumFractionDigits: d === undefined ? 4 : d }) : '–';

  FF.toast = t => { const el = $('toast'); if (!el) return; el.textContent = t; el.style.display = 'block'; clearTimeout(FF.toast.t); FF.toast.t = setTimeout(() => el.style.display = 'none', 3500); };

  FF.copy = async text => {
    try { await navigator.clipboard.writeText(text); FF.toast('Copied'); return true; }
    catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} t.remove(); FF.toast(ok ? 'Copied' : 'Could not copy. Select and copy manually.'); return ok;
    }
  };

  /* ---- library loader (vendored, no CDN) ---- */
  const LIBS = { pdflib: ['pdf-lib.min.js', () => window.PDFLib], pdfjs: ['pdf.min.js', () => window.pdfjsLib], qr: ['qrcode.js', () => window.qrcode], barcode: ['JsBarcode.all.min.js', () => window.JsBarcode], jsqr: ['jsQR.js', () => window.jsQR], heic: ['heic2any.min.js', () => window.heic2any] };
  const loading = {};
  FF.lib = name => {
    const [file, get] = LIBS[name];
    if (get()) return Promise.resolve(get());
    return loading[name] || (loading[name] = new Promise((ok, bad) => {
      const s = document.createElement('script'); s.src = FF.vendor + file;
      s.onload = () => { if (name === 'pdfjs') window.pdfjsLib.GlobalWorkerOptions.workerSrc = FF.vendor + 'pdf.worker.min.js'; ok(get()); };
      s.onerror = () => { delete loading[name]; bad(Object.assign(new Error('load'), { code: 'load' })); }; document.head.appendChild(s);
    }));
  };
  FF.errText = e => e && e.code === 'load' ? 'A needed component could not load. Check your internet and try again.' : null;

  /* ---- saving files ---- */
  FF.save = (blob, filename) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
  };
  FF.dl = (out, blob, filename, label) => {
    const b = document.createElement('button'); b.className = 'go'; b.type = 'button'; b.textContent = '⬇ ' + (label || 'Download');
    b.onclick = () => FF.save(blob, filename); const p = document.createElement('p'); p.appendChild(b); out.appendChild(p); return b;
  };

  /* ---- minimal ZIP writer (stored, no compression) ---- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  FF.zip = async files => { // files: [{name, blob}]
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)), dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate());
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer()), name = enc.encode(f.name), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(h.buffer, name, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(c.buffer, name); off += 30 + name.length + data.length;
    }
    let csize = 0; central.forEach(p => csize += p.byteLength);
    const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, e.buffer], { type: 'application/zip' });
  };

  /* ---- file pickers ---- */
  FF.isImg = f => f.type === '' || /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name);
  FF.isPdf = f => f.type === '' || f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  FF.looksPdf = async f => (await f.slice(0, 1024).text()).includes('%PDF-');
  FF.drop = (id, o) => {
    const z = $(id), input = z.querySelector('input');
    const take = list => {
      let files = [...list].filter(o.accept);
      if (!files.length && list.length) { FF.toast('That file type is not supported here.'); return; }
      if (!o.multiple) files = files.slice(0, 1); if (files.length) o.onFiles(files);
    };
    input.onchange = () => { take(input.files); input.value = ''; };
    ['dragenter', 'dragover'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.remove('over'); }));
    z.addEventListener('drop', e => take(e.dataTransfer.files));
    if (o.paste !== false) document.addEventListener('paste', e => { const files = [...((e.clipboardData || {}).files || [])]; if (files.length && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); take(files); } });
  };
  FF.list = (ul, files, o) => {
    o = o || {}; ul.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = '<span>' + FF.esc(f.name) + '</span><em>' + FF.kb(f.size) + '</em>' + (o.reorder ? '<button type="button" aria-label="Move up" data-a="up">↑</button><button type="button" aria-label="Move down" data-a="down">↓</button>' : '') + '<button type="button" aria-label="Remove" data-a="rm">✕</button>';
      li.onclick = e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === 'rm') files.splice(i, 1);
        if (a === 'up' && i > 0) [files[i - 1], files[i]] = [files[i], files[i - 1]];
        if (a === 'down' && i < files.length - 1) [files[i + 1], files[i]] = [files[i], files[i + 1]];
        FF.list(ul, files, o); o.onChange && o.onChange();
      };
      ul.appendChild(li);
    });
  };

  /* ---- images ---- */
  FF.MAX_SIDE = 8192; FF.MAX_PIX = 16000000;
  FF.decode = async file => {
    const tryLoad = blob => new Promise((ok, bad) => { const url = URL.createObjectURL(blob), i = new Image(); i.onload = () => ok(i); i.onerror = () => { URL.revokeObjectURL(url); bad(new Error('decode')); }; i.src = url; });
    try { return await tryLoad(file); }
    catch (e) {
      if (/\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
        const h = await FF.lib('heic'); let out = await h({ blob: file, toType: 'image/jpeg', quality: 0.95 }); if (Array.isArray(out)) out = out[0]; return await tryLoad(out);
      }
      throw e;
    }
  };
  FF.safeDims = (w, h) => { const s = Math.min(1, FF.MAX_SIDE / Math.max(w, h), Math.sqrt(FF.MAX_PIX / (w * h))); return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))]; };
  FF.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  FF.draw = (img, w, h, mode, opaque) => {
    const cv = FF.canvas(w, h), cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high';
    if (opaque) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); }
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (mode === 'stretch') cx.drawImage(img, 0, 0, w, h);
    else { const s = mode === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih), dw = iw * s, dh = ih * s; cx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); }
    return cv;
  };
  FF.encode = (cv, type, q) => new Promise((ok, bad) => cv.toBlob(b => b ? ok(b) : bad(new Error('encode')), 'image/' + type, q));
  FF.ext = t => t === 'jpeg' ? 'jpg' : t;

  /* ---- misc UI ---- */
  // run fn on input/change of every control inside root, and once now
  FF.live = (root, fn) => { root.querySelectorAll('input,select,textarea').forEach(el => { if (el.type !== 'file') { el.addEventListener('input', fn); el.addEventListener('change', fn); } }); root.querySelectorAll('input[type=range]').forEach(r => { const v = $(r.id + '-v'); const u = () => { if (v) v.textContent = r.value; }; r.addEventListener('input', u); u(); }); fn(); };
  // press a button safely: disables it, shows errors in out
  FF.guard = (btn, out, fn) => async () => {
    btn.disabled = true;
    try { await fn(); }
    catch (e) { out.innerHTML = FF.msg('err', FF.errText(e) || (e && e.userMsg) || 'Something went wrong with that file. It may be damaged or unsupported.'); }
    btn.disabled = false;
  };
  FF.chips = (id, handler) => { const el = $(id); el.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; [...el.children].forEach(c => c.classList.toggle('on', c === b)); handler(+b.dataset.i); }; };

  /* ---- boot ---- */
  FF.boot = () => {
    const page = document.body.dataset.page;
    if (page === 'home') {
      const q = $('q'), tiles = [...document.querySelectorAll('.tile[data-k]')], cats = [...document.querySelectorAll('[data-cat]')], none = $('none');
      q.addEventListener('input', () => {
        const t = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean); let shown = 0;
        tiles.forEach(el => { const hit = t.every(w => el.dataset.k.includes(w)); el.hidden = !hit; if (hit) shown++; });
        cats.forEach(c => c.hidden = !c.querySelector('.tile:not([hidden])')); none.hidden = shown > 0;
      });
      return;
    }
    const slug = document.body.dataset.tool, d = FF.tools[slug];
    if (d && d.init) d.init($('tool'));
    FF.agent(slug, d);
  };

  /* ---- AI / agent friendliness ----
     1. URL prefill:  ?fieldId=value&run=1   (field ids are listed in /api.json)
     2. WebMCP: browsers that support navigator.modelContext get each tool registered
     3. Result text always lands in the tool's output box (#tool .out), so agents can read it */
  const fields = root => [...root.querySelectorAll('input,select,textarea')].filter(e => e.id && e.type !== 'file' && e.type !== 'button');
  const setField = (el, v) => {
    if (el.type === 'checkbox') el.checked = /^(1|true|yes|on)$/i.test(String(v)); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  let approved = false;
  FF.gate = () => new Promise(res => {
    if (approved || !document.querySelector('meta[name="ff-gate"]')) { res(true); return; }
    const root = $('tool'), card = document.createElement('div'); card.className = 'card'; card.id = 'gate'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    card.innerHTML = '<b>🤖 An AI assistant asked to run this tool</b><p class="sub" style="margin:6px 0 0">This tool is free and paid for by ads. Have a look at the sponsor message below, then approve.</p><div id="gate-slot"></div><div class="btns"><button type="button" class="go" id="gok" disabled>Approve (5)</button><button type="button" class="ghost" id="gno">Cancel</button></div>';
    root.insertBefore(card, root.firstChild);
    const tpl = $('gate-ad'); if (tpl) { $('gate-slot').appendChild(tpl.content.cloneNode(true)); if (document.querySelector('meta[name="ff-gate-live"]')) try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} }
    let n = 5; const b = $('gok'), t = setInterval(() => { n--; if (n > 0) b.textContent = 'Approve (' + n + ')'; else { clearInterval(t); b.disabled = false; b.textContent = 'Approve and run'; } }, 1000);
    const end = ok => { clearInterval(t); card.remove(); if (ok) approved = true; res(ok); };
    b.onclick = () => end(true); $('gno').onclick = () => end(false);
  });
  FF.agent = (slug, d) => {
    const root = $('tool'); if (!root) return;
    const primary = () => root.querySelector('button.go:not(:disabled)');
    const q = new URLSearchParams(location.search); let any = false;
    fields(root).forEach(el => { if (q.has(el.id)) { setField(el, q.get(el.id)); any = true; } });
    if (any && q.get('run') === '1') FF.gate().then(ok => { if (ok) { const b = primary(); if (b) b.click(); } });
    const mc = navigator.modelContext;
    if (mc && mc.registerTool && d) {
      const props = {}; fields(root).forEach(el => { props[el.id] = { type: el.type === 'checkbox' ? 'boolean' : el.type === 'number' || el.type === 'range' ? 'number' : 'string', description: ((root.querySelector('label[for="' + el.id + '"]') || el.closest('label') || {}).textContent || el.id).trim() }; });
      try {
        mc.registerTool({
          name: slug.replace(/-/g, '_'), description: d.title || d.name, inputSchema: { type: 'object', properties: props },
          async execute(args) {
            if (!(await FF.gate())) return { content: [{ type: 'text', text: 'The user declined to run this tool.' }] };
            fields(root).forEach(el => { if (args && args[el.id] !== undefined) setField(el, args[el.id]); });
            const b = primary(); if (b) b.click(); await new Promise(r => setTimeout(r, 600));
            const text = [...root.querySelectorAll('.out')].map(o => o.innerText.trim()).filter(Boolean).join('\n');
            return { content: [{ type: 'text', text: text || 'No text result. This tool produces a file or needs a file chosen by the user in the browser.' }] };
          }
        });
      } catch (e) {}
    }
  };
})();
