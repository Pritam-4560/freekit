/* Generators and utilities. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH;
  const rnd = max => { // unbiased random integer in [0, max)
    if (max <= 1) return 0; const lim = Math.floor(4294967296 / max) * max, a = new Uint32Array(1);
    do { crypto.getRandomValues(a); } while (a[0] >= lim); return a[0] % max;
  };

  /* ---- QR code ---- */
  const wesc = s => s.replace(/([\\;,:"])/g, '\\$1');
  FF.tool({
    slug: 'qr-code-generator', name: 'QR Code Generator', cat: 'gen', icon: '▦', short: 'QR for links, Wi-Fi, UPI, WhatsApp, email and more.',
    title: 'QR Code Generator: Free, No Signup, PNG & SVG', desc: 'Make a QR code for a link, text, Wi-Fi, UPI payment, WhatsApp chat, email or phone. Download PNG or SVG. Free, no expiry, nothing uploaded.',
    h1: 'QR Code Generator', keywords: ['qr', 'qr code', 'upi', 'wifi', 'whatsapp', 'link', 'generator'],
    html: H.card(H.grid(H.sel('type', 'What is it for?', [['text', 'Link or text'], ['wifi', 'Wi-Fi network'], ['upi', 'UPI payment (India)'], ['wa', 'WhatsApp chat'], ['email', 'Email'], ['tel', 'Phone number']], 'text'),
      '<div class="full" data-q="text"><label for="text">Link or text</label><textarea id="text" rows="2">https://example.com</textarea></div>',
      '<div data-q="wifi">' + H.text('ssid', 'Network name', '') + '</div>', '<div data-q="wifi">' + H.text('wpass', 'Password', '') + '</div>', '<div data-q="wifi">' + H.sel('wsec', 'Security', [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', 'None']], 'WPA') + '</div>',
      '<div data-q="upi">' + H.text('upi', 'UPI ID (name@bank)', '') + '</div>', '<div data-q="upi">' + H.text('upn', 'Payee name (optional)', '') + '</div>', '<div data-q="upi">' + H.num('upa', 'Amount ₹ (optional)', '', { min: 0 }) + '</div>',
      '<div data-q="wa">' + H.text('wan', 'Phone with country code', '', { ph: '919876543210' }) + '</div>', '<div data-q="wa">' + H.text('wam', 'Message (optional)', '') + '</div>',
      '<div data-q="email">' + H.text('ema', 'Email address', '') + '</div>', '<div data-q="email">' + H.text('ems', 'Subject (optional)', '') + '</div>',
      '<div data-q="tel">' + H.text('tel', 'Phone number', '', { ph: '+919876543210' }) + '</div>',
      H.sel('ecl', 'Error correction', [['L', 'Low (smallest code)'], ['M', 'Medium'], ['Q', 'Quartile'], ['H', 'High (survives damage)']], 'M'))) + H.out('out'),
    faq: [['Do QR codes expire?', 'No. These QR codes hold your data directly, so they never expire and do not depend on this website.'], ['Is it safe for UPI?', 'The code contains only the UPI ID, name and amount you type. Always test it by scanning with your payment app before printing.']],
    init(root) {
      const out = FF.$('out'); let t, seq = 0;
      const build = () => {
        const type = FF.$('type').value; root.querySelectorAll('[data-q]').forEach(el => el.style.display = el.dataset.q === type ? '' : 'none');
        const v = id => FF.$(id).value.trim();
        if (type === 'text') return v('text');
        if (type === 'wifi') return v('ssid') ? 'WIFI:T:' + FF.$('wsec').value + ';S:' + wesc(v('ssid')) + ';' + (FF.$('wsec').value !== 'nopass' ? 'P:' + wesc(FF.$('wpass').value) + ';' : '') + ';' : '';
        if (type === 'upi') { const id = v('upi'); if (!id) return ''; if (!/^[\w.\-]{2,256}@[a-zA-Z][\w.\-]{1,64}$/.test(id)) throw { userMsg: "That doesn't look like a UPI ID. It should be like name@bank." }; return 'upi://pay?pa=' + encodeURIComponent(id) + (v('upn') ? '&pn=' + encodeURIComponent(v('upn')) : '') + (FF.nn('upa') ? '&am=' + FF.nn('upa').toFixed(2) : '') + '&cu=INR'; }
        if (type === 'wa') { const n = v('wan').replace(/\D/g, ''); if (!n) return ''; if (n.length < 8) throw { userMsg: 'Enter the full number with country code, like 919876543210.' }; return 'https://wa.me/' + n + (v('wam') ? '?text=' + encodeURIComponent(v('wam')) : ''); }
        if (type === 'email') { const e = v('ema'); if (!e) return ''; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw { userMsg: 'That email address does not look right.' }; return 'mailto:' + e + (v('ems') ? '?subject=' + encodeURIComponent(v('ems')) : ''); }
        return v('tel') ? 'tel:' + v('tel').replace(/[^\d+]/g, '') : '';
      };
      const render = async () => {
        const my = ++seq; let data;
        try { data = build(); } catch (e) { out.innerHTML = FF.msg('warn', e.userMsg); return; }
        if (!data) { out.innerHTML = ''; return; }
        let qrcode; try { qrcode = await FF.lib('qr'); } catch (e) { out.innerHTML = FF.msg('err', FF.errText(e)); return; }
        let q; try { q = qrcode(0, FF.$('ecl').value); q.addData(unescape(encodeURIComponent(data))); q.make(); } catch (e) { out.innerHTML = FF.msg('err', 'That is too long for a QR code. Shorten it or lower the error correction.'); return; }
        const n = q.getModuleCount(), cell = Math.max(4, Math.floor(1024 / (n + 8))), size = (n + 8) * cell, cv = FF.canvas(size, size), cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, size, size); cx.fillStyle = '#000';
        let path = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) { cx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell); path += 'M' + (c + 4) + ' ' + (r + 4) + 'h1v1h-1z'; }
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 8) + ' ' + (n + 8) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + path + '"/></svg>';
        const blob = await FF.encode(cv, 'png'); if (my !== seq) return;
        out.innerHTML = '<div class="center"><img class="prev" style="width:260px;margin:10px auto" alt="QR code" src="' + URL.createObjectURL(blob) + '"></div><div class="btns" style="justify-content:center"><button type="button" class="go" id="dp">⬇ PNG</button><button type="button" class="go ghost" id="ds">⬇ SVG</button></div>';
        FF.$('dp').onclick = () => FF.save(blob, 'qr-code.png'); FF.$('ds').onclick = () => FF.save(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
      };
      root.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 250); }); root.addEventListener('change', () => { clearTimeout(t); t = setTimeout(render, 100); }); render();
    }
  });

  /* ---- Barcode ---- */
  FF.tool({
    slug: 'barcode-generator', name: 'Barcode Generator', cat: 'gen', icon: '║▌', short: 'Code 128, EAN-13, UPC and more as PNG.',
    title: 'Barcode Generator: Code 128, EAN-13, UPC, Code 39', desc: 'Create a barcode image from text or numbers. Supports Code 128, EAN-13, EAN-8, UPC-A and Code 39. Free PNG download.',
    h1: 'Barcode Generator', keywords: ['barcode', 'ean', 'upc', 'code128', 'code39'],
    html: H.card(H.grid(H.text('val', 'Value', '123456789012', { full: true, mono: true }), H.sel('fmt', 'Type', [['CODE128', 'Code 128 (any text)'], ['EAN13', 'EAN-13 (12 or 13 digits)'], ['EAN8', 'EAN-8 (7 or 8 digits)'], ['UPC', 'UPC-A (11 or 12 digits)'], ['CODE39', 'Code 39 (A-Z, 0-9)']], 'CODE128'), H.chk('txt', 'Show the number under the bars', true))) + H.out('out'),
    faq: [['Why does my barcode fail?', 'Each type has rules: EAN-13 needs 12 or 13 digits, EAN-8 needs 7 or 8, UPC-A needs 11 or 12, and Code 39 allows only capital letters, digits and a few symbols. Code 128 accepts any text.']],
    init(root) {
      const out = FF.$('out'); let seq = 0;
      FF.live(root, async () => {
        const my = ++seq, v = FF.$('val').value; if (!v) { out.innerHTML = ''; return; }
        let JB; try { JB = await FF.lib('barcode'); } catch (e) { out.innerHTML = FF.msg('err', FF.errText(e)); return; }
        const cv = document.createElement('canvas'); let bad = false;
        try { JB(cv, v, { format: FF.$('fmt').value, displayValue: FF.$('txt').checked, margin: 20, width: 3, height: 110, background: '#ffffff', valid: ok => { if (!ok) bad = true; } }); } catch (e) { bad = true; }
        if (bad || !cv.width) { out.innerHTML = FF.msg('err', 'That value does not fit this barcode type. Check the length and characters, or use Code 128.'); return; }
        const blob = await FF.encode(cv, 'png'); if (my !== seq) return;
        out.innerHTML = '<div class="center"><img class="prev" style="margin:10px auto" alt="Barcode" src="' + URL.createObjectURL(blob) + '"></div>'; FF.dl(out, blob, 'barcode.png', 'Download PNG');
      });
    }
  });

  /* ---- QR reader ---- */
  FF.tool({
    slug: 'qr-code-reader', name: 'QR Code Reader', cat: 'gen', icon: '🔍', short: 'Read a QR code from a photo or screenshot.',
    title: 'QR Code Reader: Scan QR from an Image', desc: 'Upload a photo or screenshot of a QR code and read what it says. Free and private, the image never leaves your device.',
    h1: 'QR Code Reader', keywords: ['qr', 'scan', 'reader', 'decode', 'screenshot'],
    html: H.card(H.drop('d', 'Tap to choose an image with a QR code', H.IMG_ACCEPT, false, 'or drag and drop, or paste a screenshot'), '<canvas id="cv" style="display:none"></canvas>') + H.out('out'),
    faq: [['Can it use my camera?', 'Not yet. Take a photo or screenshot and choose it here.'], ['Is it safe to open links?', 'Check the address before opening. Scam QR codes often point to look-alike websites.']],
    init() {
      const out = FF.$('out');
      FF.drop('d', { accept: FF.isImg, paste: true, onFiles: async f => {
        out.innerHTML = FF.msg('ok', 'Reading…');
        try {
          const jq = await FF.lib('jsqr'), img = await FF.decode(f[0]); let res = null;
          for (const sc of [1, 0.5, 0.25, 1.5]) { const s = Math.min(sc, FF.MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(40, Math.round(img.naturalWidth * s)), h = Math.max(40, Math.round(img.naturalHeight * s)), cv = FF.canvas(w, h), cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h); res = jq(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' }); if (res) break; }
          if (!res) { out.innerHTML = FF.msg('err', 'No QR code found. Try a clearer, closer photo with the whole code in view.'); return; }
          const t = res.data, link = /^https?:\/\//i.test(t);
          out.innerHTML = '<label>Result</label><div class="box" id="rt"></div><div class="btns"><button type="button" id="cp">Copy</button>' + (link ? '<a class="btn ghost" id="op" rel="noopener noreferrer" target="_blank">Open link</a>' : '') + '</div>' + (link ? FF.msg('warn', 'Check the web address before opening it.') : '');
          FF.$('rt').textContent = t; FF.$('cp').onclick = () => FF.copy(t); if (link) FF.$('op').href = t;
        } catch (e) { out.innerHTML = FF.msg('err', FF.errText(e) || 'This file could not be read as an image.'); }
      } });
    }
  });

  /* ---- Random number ---- */
  FF.tool({
    slug: 'random-number-generator', name: 'Random Number Generator', cat: 'gen', icon: '🎲', short: 'Random numbers in a range, with or without repeats.',
    title: 'Random Number Generator: Pick Numbers in a Range', desc: 'Generate one or many random numbers between any two values, with unique option. Uses your browser secure random source.',
    h1: 'Random Number Generator', keywords: ['random', 'number', 'lottery', 'pick', 'range'],
    html: H.card(H.grid(H.num('min', 'From', 1, { int: true }), H.num('max', 'To', 100, { int: true }), H.num('cnt', 'How many', 1, { int: true, min: 1, max: 1000 }), H.chk('uniq', 'No repeats', true)), '<div class="btns">' + H.btn('go', 'Generate') + '</div>') + H.out('out'),
    faq: [['Is it truly random?', 'It uses the secure random generator built into your browser, which is suitable for draws and games. It is not a certified lottery system.']],
    init() {
      const out = FF.$('out');
      FF.$('go').onclick = () => {
        let a = Math.round(FF.n('min')), b = Math.round(FF.n('max')), c = Math.max(1, Math.min(1000, Math.round(FF.n('cnt')))); if (a > b) [a, b] = [b, a]; const span = b - a + 1;
        if (span > 4e9) { out.innerHTML = FF.msg('err', 'Range is too large. Keep it under 4 billion.'); return; }
        if (FF.$('uniq').checked && c > span) { out.innerHTML = FF.msg('err', 'You asked for ' + c + ' unique numbers but the range only has ' + span + '.'); return; }
        const res = []; if (FF.$('uniq').checked) { const used = new Set(); while (res.length < c) { const x = a + rnd(span); if (!used.has(x)) { used.add(x); res.push(x); } } } else for (let i = 0; i < c; i++) res.push(a + rnd(span));
        out.innerHTML = '<div class="big" style="word-break:break-word">' + res.join(', ') + '</div><div class="btns"><button type="button" class="ghost" id="cp">Copy</button></div>'; FF.$('cp').onclick = () => FF.copy(res.join(', '));
      };
    }
  });

  FF.tool({
    slug: 'coin-flip-and-dice', name: 'Coin Flip & Dice Roller', cat: 'gen', icon: '🪙', short: 'Flip a coin or roll dice.',
    title: 'Coin Flip & Dice Roller Online', desc: 'Flip a fair coin or roll one or more dice with 4 to 20 sides. Quick, free, and fair.',
    h1: 'Coin Flip & Dice Roller', keywords: ['coin', 'flip', 'dice', 'roll', 'toss', 'heads', 'tails'],
    html: H.card('<div class="pickbox" id="show" aria-live="polite">Tap a button</div><div class="btns" style="justify-content:center">' + H.btn('flip', 'Flip a coin') + '</div><hr style="border:0;border-top:1px solid var(--line);margin:16px 0">' + H.grid(H.num('nd', 'Number of dice', 2, { int: true, min: 1, max: 20 }), H.sel('sides', 'Sides', [4, 6, 8, 10, 12, 20].map(n => [n, 'd' + n]), 6)) + '<div class="btns" style="justify-content:center">' + H.btn('go', 'Roll dice') + '</div>'),
    faq: [['Is the coin fair?', 'Yes. It uses your browser secure random source, so heads and tails are equally likely.']],
    init() {
      const s = FF.$('show');
      FF.$('flip').onclick = () => { s.textContent = rnd(2) ? 'Heads' : 'Tails'; };
      FF.$('go').onclick = () => { const n = Math.max(1, Math.min(20, Math.round(FF.n('nd')))), sd = +FF.$('sides').value, r = Array.from({ length: n }, () => 1 + rnd(sd)); s.textContent = (n > 1 ? r.join(' + ') + ' = ' : '') + r.reduce((a, b) => a + b, 0); };
    }
  });

  FF.tool({
    slug: 'random-name-picker', name: 'Random Name Picker', cat: 'gen', icon: '🎯', short: 'Pick winners or make random teams from a list.',
    title: 'Random Name Picker & Team Maker', desc: 'Paste a list of names to pick random winners or split them into balanced random teams. Free and fair.',
    h1: 'Random Name Picker', keywords: ['name', 'picker', 'raffle', 'draw', 'team', 'winner', 'random'],
    html: H.card(H.area('names', 'One name per line', 'Asha\nRavi\nMeera\nKiran\nJohn', 6), H.grid(H.sel('mode', 'Mode', [['pick', 'Pick winners'], ['teams', 'Make teams']], 'pick'), H.num('n', 'How many winners / teams', 1, { int: true, min: 1 })), '<div class="btns">' + H.btn('go', 'Go') + '</div>') + H.out('out'),
    faq: [['Can the same name win twice?', 'No. Each winner is picked without repeats. Blank lines are ignored.']],
    init() {
      const out = FF.$('out');
      FF.$('go').onclick = () => {
        const list = FF.$('names').value.split('\n').map(s => s.trim()).filter(Boolean), n = Math.max(1, Math.round(FF.n('n'))); if (list.length < 2) { out.innerHTML = FF.msg('err', 'Add at least two names.'); return; }
        const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
        if (FF.$('mode').value === 'pick') { if (n > a.length) { out.innerHTML = FF.msg('err', 'You have only ' + a.length + ' names.'); return; } out.innerHTML = '<div class="tag">Winner' + (n > 1 ? 's' : '') + '</div>' + a.slice(0, n).map(x => '<div class="big">' + FF.esc(x) + '</div>').join(''); }
        else { if (n > a.length) { out.innerHTML = FF.msg('err', 'More teams than names.'); return; } const teams = Array.from({ length: n }, () => []); a.forEach((x, i) => teams[i % n].push(x)); out.innerHTML = teams.map((t, i) => '<div class="opt" style="margin-bottom:8px"><b>Team ' + (i + 1) + '</b><div>' + t.map(FF.esc).join(', ') + '</div></div>').join(''); }
      };
    }
  });

  /* ---- Stopwatch / countdown ---- */
  const hms = ms => { const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60, cs = Math.floor(ms % 1000 / 10); return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0'); };
  FF.tool({
    slug: 'online-stopwatch', name: 'Online Stopwatch', cat: 'gen', icon: '⏱️', short: 'Stopwatch with laps.',
    title: 'Online Stopwatch with Laps', desc: 'A simple online stopwatch with lap times. Works on phone and computer, keeps correct time even if the tab is in the background.',
    h1: 'Online Stopwatch', keywords: ['stopwatch', 'timer', 'laps', 'time'],
    html: H.card('<div class="big-timer" id="t" aria-live="off">0:00.00</div><div class="btns" style="justify-content:center">' + H.btn('go', 'Start') + '<button type="button" class="ghost" id="lap" disabled>Lap</button><button type="button" class="ghost" id="rs">Reset</button></div><ol id="laps" class="steps"></ol>'),
    faq: [['Does it stay accurate in the background?', 'Yes. It measures real elapsed time rather than counting ticks, so switching tabs does not slow it down.']],
    init() {
      let run = false, base = 0, start = 0, id; const t = FF.$('t'), b = FF.$('go'), cur = () => base + (run ? performance.now() - start : 0), tick = () => { t.textContent = hms(cur()); };
      b.onclick = () => { if (run) { base = cur(); run = false; clearInterval(id); b.textContent = 'Resume'; FF.$('lap').disabled = true; } else { start = performance.now(); run = true; id = setInterval(tick, 33); b.textContent = 'Stop'; FF.$('lap').disabled = false; } tick(); };
      FF.$('lap').onclick = () => { const li = document.createElement('li'); li.textContent = hms(cur()); FF.$('laps').prepend(li); };
      FF.$('rs').onclick = () => { run = false; base = 0; clearInterval(id); b.textContent = 'Start'; FF.$('lap').disabled = true; FF.$('laps').innerHTML = ''; tick(); };
    }
  });

  FF.tool({
    slug: 'countdown-timer', name: 'Countdown Timer', cat: 'gen', icon: '⏳', short: 'Countdown with a sound alert.',
    title: 'Countdown Timer Online with Alarm', desc: 'Set a countdown in hours, minutes and seconds with a sound alert when it ends. Works on phone and computer.',
    h1: 'Countdown Timer', keywords: ['timer', 'countdown', 'alarm', 'minutes', 'pomodoro'],
    html: H.card(H.grid3(H.num('h', 'Hours', 0, { int: true, min: 0, max: 99 }), H.num('m', 'Minutes', 5, { int: true, min: 0, max: 999 }), H.num('s', 'Seconds', 0, { int: true, min: 0, max: 59 })), '<div class="big-timer" id="t" aria-live="off">5:00</div><div class="btns" style="justify-content:center">' + H.btn('go', 'Start') + '<button type="button" class="ghost" id="rs">Reset</button></div><div id="msg"></div>'),
    faq: [['Will the alarm sound on my phone?', 'Usually yes while this page is open. Phones may mute sound in the background, so keep the screen on for important timers.']],
    init() {
      let id, end = 0, left = 0, run = false; const t = FF.$('t'), b = FF.$('go'), fmt = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600); return (h ? h + ':' : '') + String(Math.floor(s % 3600 / 60)).padStart(h ? 2 : 1, '0') + ':' + String(s % 60).padStart(2, '0'); };
      const total = () => FF.nn('h') * 3600000 + FF.nn('m') * 60000 + FF.nn('s') * 1000, show = () => { t.textContent = fmt(run ? end - Date.now() : left || total()); };
      const beep = () => { try { const A = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(d => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; o.connect(g); g.connect(A.destination); g.gain.setValueAtTime(.3, A.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, A.currentTime + d + .3); o.start(A.currentTime + d); o.stop(A.currentTime + d + .32); }); } catch (e) {} };
      const stop = () => { clearInterval(id); run = false; };
      const upd = () => { const r = end - Date.now(); if (r <= 0) { stop(); left = 0; t.textContent = '0:00'; b.textContent = 'Start'; FF.$('msg').innerHTML = FF.msg('ok', 'Time is up!'); document.title = 'Time is up!'; beep(); } else { t.textContent = fmt(r); document.title = fmt(r) + ' · Timer'; } };
      b.onclick = () => { if (run) { left = end - Date.now(); stop(); b.textContent = 'Resume'; } else { const d = left || total(); if (d <= 0) { FF.$('msg').innerHTML = FF.msg('err', 'Set a time above zero.'); return; } FF.$('msg').innerHTML = ''; end = Date.now() + d; run = true; id = setInterval(upd, 200); b.textContent = 'Pause'; upd(); } };
      FF.$('rs').onclick = () => { stop(); left = 0; b.textContent = 'Start'; FF.$('msg').innerHTML = ''; document.title = 'Countdown Timer'; show(); };
      ['h', 'm', 's'].forEach(i => FF.$(i).addEventListener('input', () => { if (!run) { left = 0; show(); } })); show();
    }
  });

  /* ---- Notepad ---- */
  FF.tool({
    slug: 'online-notepad', name: 'Online Notepad', cat: 'gen', icon: '📝', short: 'A private notepad that saves in your browser.',
    title: 'Online Notepad: Private, Auto-Saves in Your Browser', desc: 'A simple notepad that saves automatically in your browser. Private, no login, download as a text file. Your notes never leave your device.',
    h1: 'Online Notepad', keywords: ['notepad', 'notes', 'text', 'scratch', 'memo'],
    html: H.card('<textarea id="pad" rows="14" placeholder="Start typing. Your note saves automatically on this device."></textarea><div class="row"><span id="stat">0 words</span><span id="saved"></span></div><div class="btns"><button type="button" id="dl">Download .txt</button><button type="button" class="ghost" id="cl">Clear</button></div><div id="warn"></div>'),
    faq: [['Where are my notes stored?', 'In your own browser storage on this device only. Clearing browser data, private browsing, or another device will not have them, so download anything important.']],
    init() {
      const KEY = 'fitfile-notepad', pad = FF.$('pad'); let ok = true;
      try { pad.value = localStorage.getItem(KEY) || ''; } catch (e) { ok = false; FF.$('warn').innerHTML = FF.msg('warn', 'Your browser is blocking storage here, so notes will not be saved after you close this page. Use Download to keep them.'); }
      const stat = () => { const t = pad.value.trim(); FF.$('stat').textContent = (t ? t.split(/\s+/).length : 0) + ' words · ' + pad.value.length + ' characters'; };
      pad.addEventListener('input', () => { stat(); if (ok) try { localStorage.setItem(KEY, pad.value); FF.$('saved').textContent = 'Saved'; } catch (e) { FF.$('saved').textContent = 'Could not save'; } });
      FF.$('dl').onclick = () => FF.save(new Blob([pad.value], { type: 'text/plain' }), 'note.txt');
      FF.$('cl').onclick = () => { if (!pad.value || confirm('Clear the note?')) { pad.value = ''; pad.dispatchEvent(new Event('input')); } }; stat();
    }
  });
})();
