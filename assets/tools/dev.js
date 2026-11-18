/* Developer tools. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH;
  const faqD = [['Is my data sent anywhere?', 'No. Everything runs in your browser. Your data never leaves your device.']];
  const copyBox = (t, id, rows) => { const k = id || 'ob'; setTimeout(() => { const e = FF.$(k); if (e) { e.value = t; FF.$(k + '-c').onclick = () => FF.copy(t); const d = FF.$(k + '-d'); if (d) d.onclick = () => FF.save(new Blob([t], { type: 'text/plain' }), 'result.txt'); } }, 0); return '<textarea id="' + k + '" class="mono" rows="' + (rows || 8) + '" readonly></textarea><div class="btns"><button type="button" id="' + k + '-c">Copy result</button><button type="button" class="ghost" id="' + k + '-d">Download</button></div>'; };
  const tool = (def, o) => (o = o || def, FF.tool(Object.assign({ cat: 'dev', faq: faqD }, def, {
    html: H.card(H.area('in', o.label || 'Input', o.sample || '', o.rows || 8, { mono: true }), o.fields || '') + H.out('res'),
    init(root) { const out = FF.$('res'); FF.live(root, () => { try { const r = o.run(FF.$('in').value); out.innerHTML = r; } catch (e) { out.innerHTML = FF.msg('err', e.userMsg || e.message || 'Something went wrong.'); } }); }
  })));
  const U = m => { throw { userMsg: m }; };

  /* ---- JSON ---- */
  // finds the first JSON syntax error (browsers differ in what they report)
  const jsonErr = s => { let i = 0; const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; }, fail = m => { throw { pos: i, msg: m }; };
    const str = () => { i++; while (i < s.length) { const c = s[i]; if (c === '"') { i++; return; } if (c === '\\') { i += 2; continue; } if (c < ' ') fail('A line break or control character inside a string. Use \\n instead'); i++; } fail('A string is not closed'); };
    const val = () => { ws(); const c = s[i];
      if (c === '{') { i++; ws(); if (s[i] === '}') { i++; return; } for (;;) { ws(); if (s[i] !== '"') fail('Expected a property name in double quotes'); str(); ws(); if (s[i] !== ':') fail('Expected ":" after the property name'); i++; val(); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === '}') { i++; return; } fail('Expected "," or "}"'); } }
      if (c === '[') { i++; ws(); if (s[i] === ']') { i++; return; } for (;;) { val(); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === ']') { i++; return; } fail('Expected "," or "]"'); } }
      if (c === '"') return str(); if (c !== undefined && /[-0-9]/.test(c)) { const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i)); if (!m) fail('Invalid number'); i += m[0].length; return; }
      for (const k of ['true', 'false', 'null']) if (s.startsWith(k, i)) { i += k.length; return; } fail(i >= s.length ? 'The text ends too early' : 'Unexpected character "' + c + '"'); };
    try { val(); ws(); if (i < s.length) fail('Extra text after the JSON ends'); } catch (e) { return e && e.pos !== undefined ? e : null; } return null; };
  tool({
    slug: 'json-formatter', name: 'JSON Formatter & Validator', icon: '{ }', short: 'Pretty-print, minify and validate JSON.',
    title: 'JSON Formatter & Validator: Pretty Print and Minify', desc: 'Format, validate and minify JSON online. Shows the line and column of any error. Free and private.', h1: 'JSON Formatter & Validator', keywords: ['json', 'format', 'validate', 'beautify', 'minify', 'pretty print'],
    label: 'Paste JSON', sample: '{"name":"FitFile","tools":[1,2,3],"free":true}', fields: H.grid(H.sel('mode', 'Output', [['2', 'Pretty (2 spaces)'], ['4', 'Pretty (4 spaces)'], ['tab', 'Pretty (tabs)'], ['min', 'Minified']], '2'), H.chk('sort', 'Sort keys A to Z', false)),
    run: t => {
      if (!t.trim()) return ''; let v; try { v = JSON.parse(t); } catch (e) { const f = jsonErr(t); if (f) { const before = t.slice(0, f.pos), ln = before.split('\n').length, col = f.pos - before.lastIndexOf('\n'); U('Not valid JSON at line ' + ln + ', column ' + col + ': ' + f.msg + '.'); } U('Not valid JSON. ' + e.message); }
      const sortK = x => Array.isArray(x) ? x.map(sortK) : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o, k) => (o[k] = sortK(x[k]), o), {}) : x; if (FF.$('sort').checked) v = sortK(v);
      const m = FF.$('mode').value, s = JSON.stringify(v, null, m === 'min' ? 0 : m === 'tab' ? '\t' : +m); return FF.msg('ok', 'Valid JSON.') + copyBox(s, 'ob', 12);
    }
  });

  /* ---- Base64 ---- */
  tool({
    slug: 'base64-encode-decode', name: 'Base64 Encode & Decode', icon: '🔐', short: 'Encode text to Base64 or decode it back.',
    title: 'Base64 Encode and Decode Online', desc: 'Encode text to Base64 or decode Base64 back to text. Supports UTF-8 and URL-safe Base64. Free and private.', h1: 'Base64 Encode & Decode', keywords: ['base64', 'encode', 'decode', 'utf-8'],
    label: 'Text or Base64', sample: 'Hello, FitFile! नमस्ते', fields: H.grid(H.sel('op', 'Action', [['enc', 'Encode to Base64'], ['dec', 'Decode from Base64']], 'enc'), H.chk('url', 'URL-safe (- and _ instead of + and /)', false)),
    run: t => {
      if (!t) return ''; const url = FF.$('url').checked;
      if (FF.$('op').value === 'enc') { const b = new TextEncoder().encode(t); let s = ''; b.forEach(x => s += String.fromCharCode(x)); let r = btoa(s); if (url) r = r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return copyBox(r); }
      let s = t.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); if (/[^A-Za-z0-9+/=]/.test(s)) U('That is not valid Base64. It contains characters Base64 does not use.'); while (s.length % 4) s += '=';
      let bin; try { bin = atob(s); } catch (e) { U('That is not valid Base64.'); } const u = Uint8Array.from(bin, c => c.charCodeAt(0)); let out; try { out = new TextDecoder('utf-8', { fatal: true }).decode(u); } catch (e) { U('Decoded fine, but the result is not readable text (it may be an image or file).'); } return copyBox(out);
    }
  });

  /* ---- URL ---- */
  tool({
    slug: 'url-encode-decode', name: 'URL Encode & Decode', icon: '🌐', short: 'Percent-encode or decode URLs and text.',
    title: 'URL Encoder & Decoder: Percent Encoding Online', desc: 'Encode text for use in a URL or decode percent-encoded text. Free and private.', h1: 'URL Encode & Decode', keywords: ['url', 'encode', 'decode', 'percent', 'uri', 'query string'],
    label: 'Text or URL', sample: 'https://example.com/search?q=chai & biscuits', fields: H.grid(H.sel('op', 'Action', [['enc', 'Encode'], ['dec', 'Decode']], 'enc'), H.sel('sc', 'Encode mode', [['c', 'Component (encodes / ? & =)'], ['f', 'Full URL (keeps / ? & =)']], 'c')),
    run: t => { if (!t) return ''; try { return copyBox(FF.$('op').value === 'enc' ? (FF.$('sc').value === 'c' ? encodeURIComponent(t) : encodeURI(t)) : decodeURIComponent(t.replace(/\+/g, ' '))); } catch (e) { U('Could not decode. There is a broken % sequence in the text.'); } }
  });

  /* ---- JWT ---- */
  tool({
    slug: 'jwt-decoder', name: 'JWT Decoder', icon: '🎫', short: 'Read the header and payload of a JWT.',
    title: 'JWT Decoder: Read JSON Web Token Header and Payload', desc: 'Decode a JWT to see its header, payload and expiry. The token never leaves your browser. Does not verify the signature.', h1: 'JWT Decoder', keywords: ['jwt', 'token', 'json web token', 'decode', 'auth'],
    label: 'Paste a JWT', rows: 5, sample: '',
    run: t => {
      t = t.trim(); if (!t) return ''; const p = t.replace(/^Bearer\s+/i, '').split('.'); if (p.length !== 3) U('A JWT has three parts separated by dots.'); const dec = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)))); }; let h, d; try { h = dec(p[0]); d = dec(p[1]); } catch (e) { U('This does not look like a valid JWT. The header or payload could not be read.'); }
      let info = ''; ['exp', 'iat', 'nbf'].forEach(k => { if (typeof d[k] === 'number') info += FF.row(k === 'exp' ? 'Expires' : k === 'iat' ? 'Issued' : 'Not before', new Date(d[k] * 1000).toString().replace(/ GMT.*/, '')); }); if (typeof d.exp === 'number') info += FF.msg(d.exp * 1000 < Date.now() ? 'err' : 'ok', d.exp * 1000 < Date.now() ? 'This token has expired.' : 'This token has not expired yet.');
      return info + '<label>Header</label>' + copyBox(JSON.stringify(h, null, 2), 'h1', 4) + '<label>Payload</label>' + copyBox(JSON.stringify(d, null, 2), 'p1', 8) + FF.msg('warn', 'The signature is not checked. Never trust a token just because it decodes. Do not paste live production tokens into any website you do not trust.');
    }
  });

  /* ---- CSV <-> JSON ---- */
  const parseCSV = (t, d) => { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === d) { r.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; r.push(f); rows.push(r); r = []; f = ''; } else f += c; } if (q) U('A quote was opened but never closed. Check the CSV.'); if (f !== '' || r.length) { r.push(f); rows.push(r); } return rows.filter(x => !(x.length === 1 && x[0] === '')); };
  tool({
    slug: 'csv-to-json', name: 'CSV to JSON', icon: '🗃️', short: 'Convert CSV rows to a JSON array.',
    title: 'CSV to JSON Converter Online', desc: 'Convert CSV to JSON with header detection, quoted fields and custom delimiters. Free and private.', h1: 'CSV to JSON Converter', keywords: ['csv', 'json', 'convert', 'spreadsheet', 'excel'],
    label: 'Paste CSV', sample: 'name,city,age\n"Das, Pritam",Bhubaneswar,22\nAsha,Pune,25', fields: H.grid(H.sel('d', 'Separator', [[',', 'Comma'], [';', 'Semicolon'], ['\t', 'Tab'], ['|', 'Pipe']], ','), H.chk('hdr', 'First row is the header', true), H.chk('num', 'Turn numbers into numbers', true)),
    run: t => { if (!t.trim()) return ''; const rows = parseCSV(t, FF.$('d').value); if (!rows.length) return ''; const hdr = FF.$('hdr').checked, head = hdr ? rows[0] : rows[0].map((_, i) => 'column' + (i + 1)), body = hdr ? rows.slice(1) : rows, conv = v => FF.$('num').checked && /^-?\d+(\.\d+)?$/.test(v.trim()) && v.trim().length < 16 ? Number(v) : v; const j = body.map(r => head.reduce((o, h, i) => (o[h || 'column' + (i + 1)] = conv(r[i] === undefined ? '' : r[i]), o), {})); return FF.row('Rows', j.length) + copyBox(JSON.stringify(j, null, 2), 'ob', 12); }
  });
  tool({
    slug: 'json-to-csv', name: 'JSON to CSV', icon: '📊', short: 'Convert a JSON array to CSV for Excel.',
    title: 'JSON to CSV Converter Online', desc: 'Convert a JSON array of objects to CSV you can open in Excel or Google Sheets. Free and private.', h1: 'JSON to CSV Converter', keywords: ['json', 'csv', 'convert', 'excel', 'spreadsheet'],
    label: 'Paste a JSON array', sample: '[{"name":"Asha","city":"Pune"},{"name":"Ravi","city":"Delhi","age":30}]', fields: H.sel('d', 'Separator', [[',', 'Comma'], [';', 'Semicolon'], ['\t', 'Tab']], ','),
    run: t => { if (!t.trim()) return ''; let v; try { v = JSON.parse(t); } catch (e) { U('That is not valid JSON.'); } if (!Array.isArray(v)) v = [v]; if (!v.length || v.some(x => !x || typeof x !== 'object' || Array.isArray(x))) U('Expected a JSON array of objects, like [{"a":1},{"a":2}].'); const d = FF.$('d').value, keys = [...new Set(v.flatMap(Object.keys))], esc = x => { x = x === null || x === undefined ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x); if (/^[=+\-@]/.test(x) && isNaN(x)) x = "'" + x; return /["\n\r]/.test(x) || x.includes(d) ? '"' + x.replace(/"/g, '""') + '"' : x; }; const csv = [keys.map(esc).join(d)].concat(v.map(r => keys.map(k => esc(r[k])).join(d))).join('\r\n'); return FF.row('Rows', v.length) + copyBox(csv, 'ob', 10) + FF.msg('ok', 'Cells starting with = + - @ get a leading apostrophe so spreadsheets do not run them as formulas.'); }
  });

  /* ---- Regex ---- */
  FF.tool({
    slug: 'regex-tester', name: 'Regex Tester', cat: 'dev', icon: '🔍', short: 'Test regular expressions with live highlighting.',
    title: 'Regex Tester: Test Regular Expressions Online', desc: 'Test JavaScript regular expressions with live match highlighting, groups and flags. Protected against patterns that hang the page.', h1: 'Regex Tester', keywords: ['regex', 'regular expression', 'test', 'match', 'pattern'], faq: faqD.concat([['Which regex flavour is this?', 'JavaScript (ECMAScript). Most common syntax works the same in other languages, but some features like lookbehind or named groups can differ.']]),
    html: H.card(H.grid(H.text('re', 'Pattern', '(\\d{3})-(\\d{4})', { mono: true, full: true }), H.chk('g', 'g global', true), H.chk('i', 'i ignore case', false), H.chk('m', 'm multiline', false), H.chk('s', 's dot matches newline', false)), H.area('tx', 'Test text', 'Call 555-1234 or 555-9876 today.', 5, { mono: true })) + H.out('res'),
    init(root) {
      const out = FF.$('res'); let worker, seq = 0;
      const src = 'onmessage=function(e){var d=e.data;try{var r=new RegExp(d.p,d.f),a=[],m;if(d.f.indexOf("g")<0){m=r.exec(d.t);if(m)a.push([m.index,m[0],m.slice(1)])}else{while((m=r.exec(d.t))!==null&&a.length<1000){a.push([m.index,m[0],m.slice(1)]);if(m[0]===""){r.lastIndex++}}}postMessage({ok:1,a:a})}catch(x){postMessage({ok:0,e:String(x.message)})}}';
      const mk = () => { try { worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); } catch (e) { worker = null; } };
      const show = (t, a) => { let h = '', pos = 0; a.forEach(m => { h += FF.esc(t.slice(pos, m[0])) + '<mark class="hl">' + FF.esc(m[1]) + '</mark>'; pos = m[0] + m[1].length; }); h += FF.esc(t.slice(pos));
        out.innerHTML = FF.row('Matches', a.length + (a.length >= 1000 ? '+' : '')) + '<div class="box mono" style="margin:8px 0">' + h + '</div>' + a.slice(0, 20).map((m, i) => FF.row('#' + (i + 1) + ' at ' + m[0], FF.esc(m[1]) + (m[2].length ? ' · groups: ' + m[2].map(x => x === undefined ? '–' : FF.esc(x)).join(', ') : ''))).join(''); };
      const go = () => {
        const p = FF.$('re').value, t = FF.$('tx').value, f = ['g', 'i', 'm', 's'].filter(x => FF.$(x).checked).join(''); if (!p) { out.innerHTML = ''; return; }
        try { new RegExp(p, f); } catch (e) { out.innerHTML = FF.msg('err', 'Invalid pattern: ' + FF.esc(e.message.replace(/^Invalid regular expression: /, ''))); return; }
        if (!worker) mk(); if (!worker) { // fallback: no Worker available, small inputs only
          if (t.length > 20000) { out.innerHTML = FF.msg('err', 'Text too long to test safely here.'); return; } const r = new RegExp(p, f), a = []; let m; while ((m = r.exec(t)) !== null && a.length < 1000) { a.push([m.index, m[0], m.slice(1)]); if (!r.global) break; if (m[0] === '') r.lastIndex++; } show(t, a); return; }
        const my = ++seq; out.innerHTML = FF.msg('ok', 'Testing…'); const timer = setTimeout(() => { if (my === seq) { worker.terminate(); worker = null; out.innerHTML = FF.msg('err', 'This pattern took too long and was stopped. It may have catastrophic backtracking, for example nested repeats like (a+)+. Simplify it.'); } }, 2000);
        worker.onmessage = e => { clearTimeout(timer); if (my !== seq) return; e.data.ok ? show(t, e.data.a) : out.innerHTML = FF.msg('err', FF.esc(e.data.e)); }; worker.postMessage({ p, f, t });
      };
      let dt; root.addEventListener('input', () => { clearTimeout(dt); dt = setTimeout(go, 200); }); root.addEventListener('change', go); go();
    }
  });

  /* ---- Hash ---- */
  const md5 = b => { const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]; for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0; const n = b.length, pl = ((n + 8) >> 6) + 1, w = new Uint32Array(pl * 16); for (let i = 0; i < n; i++) w[i >> 2] |= b[i] << ((i % 4) * 8); w[n >> 2] |= 0x80 << ((n % 4) * 8); w[pl * 16 - 2] = (n * 8) >>> 0; w[pl * 16 - 1] = Math.floor(n / 536870912) >>> 0; let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let o = 0; o < w.length; o += 16) { let A = a0, B = b0, C = c0, D = d0; for (let i = 0; i < 64; i++) { let F, g; if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; } F = (F + A + K[i] + w[o + g]) | 0; A = D; D = C; C = B; const s = S[(i >> 4) * 4 + (i % 4)]; B = (B + ((F << s) | (F >>> (32 - s)))) | 0; } a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0; }
    return [a0, b0, c0, d0].map(x => { let h = ''; for (let i = 0; i < 4; i++) h += ((x >>> (i * 8)) & 255).toString(16).padStart(2, '0'); return h; }).join(''); };
  FF.tool({
    slug: 'hash-generator', name: 'Hash Generator (MD5, SHA-256)', cat: 'dev', icon: '#️⃣', short: 'MD5, SHA-1, SHA-256 and SHA-512 of text or a file.',
    title: 'Hash Generator: MD5, SHA-1, SHA-256, SHA-512 of Text or File', desc: 'Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text or a file. Runs in your browser, nothing uploaded.', h1: 'Hash Generator', keywords: ['hash', 'md5', 'sha256', 'sha1', 'sha512', 'checksum'], faq: faqD.concat([['Is MD5 secure?', 'No. MD5 and SHA-1 are broken for security use. They are fine for checking a download was not corrupted. Use SHA-256 or better for anything security related.']]),
    html: H.card(H.area('tx', 'Text', 'hello', 3, { mono: true }), '<p class="sub" style="margin:10px 0 6px">Or hash a file</p>' + H.drop('d', 'Tap to choose a file', '*/*', false, 'any file, up to about 500 MB')) + H.out('res'),
    init() {
      const out = FF.$('res'); let file = null, seq = 0;
      const run = async () => {
        const my = ++seq; let bytes; try { bytes = file ? new Uint8Array(await file.arrayBuffer()) : new TextEncoder().encode(FF.$('tx').value); } catch (e) { out.innerHTML = FF.msg('err', 'This file could not be read. It may be too large for your browser.'); return; }
        if (!window.crypto || !crypto.subtle) { out.innerHTML = FF.msg('err', 'Your browser does not support secure hashing on this page. Open the site over https.'); return; }
        const hx = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''), rows = [['MD5', md5(bytes)]]; for (const [n, a] of [['SHA-1', 'SHA-1'], ['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']]) rows.push([n, hx(await crypto.subtle.digest(a, bytes))]); if (my !== seq) return;
        out.innerHTML = (file ? FF.row('File', FF.esc(file.name) + ' · ' + FF.kb(file.size)) : '') + rows.map(([n, h], i) => '<div style="margin:8px 0"><label>' + n + '</label><div style="display:flex;gap:8px"><div class="box mono" style="flex:1;min-height:0;font-size:.78rem">' + h + '</div><button type="button" class="ghost" data-i="' + i + '">Copy</button></div></div>').join(''); out.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => FF.copy(rows[+b.dataset.i][1]));
      };
      FF.drop('d', { accept: () => true, paste: false, onFiles: f => { file = f[0]; if (file.size > 500 * 1024 * 1024) { file = null; out.innerHTML = FF.msg('err', 'That file is too large to hash in a browser.'); return; } FF.$('tx').value = ''; run(); } });
      FF.$('tx').addEventListener('input', () => { file = null; run(); }); run();
    }
  });

  /* ---- UUID ---- */
  FF.tool({
    slug: 'uuid-generator', name: 'UUID Generator', cat: 'dev', icon: '🆔', short: 'Random version 4 UUIDs, in bulk.',
    title: 'UUID Generator: Random v4 UUIDs Online', desc: 'Generate random version 4 UUIDs (GUIDs) one at a time or up to 500 at once. Free and private.', h1: 'UUID Generator', keywords: ['uuid', 'guid', 'random', 'id', 'v4'], faq: faqD,
    html: H.card(H.grid(H.num('n', 'How many', 5, { int: true, min: 1, max: 500 }), H.chk('up', 'Uppercase', false), H.chk('nd', 'Remove dashes', false)), '<div class="btns">' + H.btn('go', 'Generate') + '</div>') + H.out('res'),
    init(root) {
      const out = FF.$('res'), one = () => { if (crypto.randomUUID) return crypto.randomUUID(); const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); };
      const go = () => { const n = Math.max(1, Math.min(500, Math.round(FF.n('n')))); let a = Array.from({ length: n }, one); if (FF.$('up').checked) a = a.map(x => x.toUpperCase()); if (FF.$('nd').checked) a = a.map(x => x.replace(/-/g, '')); out.innerHTML = copyBox(a.join('\n'), 'ob', Math.min(12, n + 1)); };
      FF.$('go').onclick = go; go();
    }
  });

  /* ---- Password ---- */
  FF.tool({
    slug: 'password-generator', name: 'Password Generator', cat: 'dev', icon: '🔑', short: 'Strong random passwords made on your device.',
    title: 'Strong Password Generator: Random & Secure', desc: 'Generate strong random passwords with the length and characters you choose. Made in your browser with a secure random source, never sent anywhere.', h1: 'Password Generator', keywords: ['password', 'generator', 'strong', 'random', 'secure'], faq: faqD.concat([['How strong is it?', 'The strength meter shows entropy in bits. 60 bits is decent, 80 or more is very strong. Length matters more than symbols.'], ['Should I reuse it?', 'No. Use a different password for every account, and a password manager to remember them.']]),
    html: H.card(H.grid(H.range('len', 'Length', 16, 6, 64, 1, { full: true }), H.chk('lo', 'Lowercase a-z', true), H.chk('up', 'Uppercase A-Z', true), H.chk('di', 'Numbers 0-9', true), H.chk('sy', 'Symbols !@#$…', true), H.chk('am', 'Avoid look-alikes (0 O 1 l I)', true)), '<div class="btns">' + H.btn('go', 'Generate new') + '</div>') + H.out('res'),
    init(root) {
      const out = FF.$('res'), rnd = max => { const lim = Math.floor(4294967296 / max) * max, a = new Uint32Array(1); do { crypto.getRandomValues(a); } while (a[0] >= lim); return a[0] % max; };
      const go = () => { const am = FF.$('am').checked, rm = s => am ? s.replace(/[0O1lI|]/g, '') : s, sets = [[FF.$('lo'), 'abcdefghijklmnopqrstuvwxyz'], [FF.$('up'), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], [FF.$('di'), '0123456789'], [FF.$('sy'), '!@#$%^&*()-_=+[]{};:,.?']].filter(s => s[0].checked).map(s => rm(s[1])), len = +FF.$('len').value;
        if (!sets.length) { out.innerHTML = FF.msg('err', 'Choose at least one type of character.'); return; } if (len < sets.length) { out.innerHTML = FF.msg('err', 'Length is too short for those options.'); return; }
        const all = sets.join(''), pw = sets.map(s => s[rnd(s.length)]); while (pw.length < len) pw.push(all[rnd(all.length)]); for (let i = pw.length - 1; i > 0; i--) { const j = rnd(i + 1);[pw[i], pw[j]] = [pw[j], pw[i]]; } const p = pw.join(''), bits = len * Math.log2(all.length), lab = bits < 45 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Good' : 'Very strong';
        out.innerHTML = '<div class="box mono big" id="pw" style="font-size:1.25rem"></div>' + FF.row('Strength', lab + ' · about ' + Math.round(bits) + ' bits') + '<div class="btns"><button type="button" id="cp">Copy password</button></div>'; FF.$('pw').textContent = p; FF.$('cp').onclick = () => FF.copy(p); };
      FF.$('go').onclick = go; root.addEventListener('change', go); go();
    }
  });
})();
