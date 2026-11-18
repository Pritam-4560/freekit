/* Text tools. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH;
  const faqT = [['Is my text sent anywhere?', 'No. Everything is processed in your browser. Your text never leaves your device.']];
  // text in -> text out, updates live
  const textTool = (def, o) => (o = o || def, FF.tool(Object.assign({ cat: 'text', faq: faqT }, def, {
    html: H.card(H.area('in', o.label || 'Your text', o.sample || '', o.rows || 8, { spell: true }), o.fields || '') + H.out('res'),
    init(root) { const out = FF.$('res'); FF.live(root, () => { try { out.innerHTML = o.run(FF.$('in').value); } catch (e) { out.innerHTML = FF.msg('err', e.userMsg || 'Something went wrong.'); } }); if (o.after) o.after(); }
  })));
  const stat = (a, b) => '<div class="opt" style="margin-bottom:8px"><div class="row" style="margin:0"><span>' + a + '</span><b>' + b + '</b></div></div>';
  const copyBox = (t, id) => { const k = id || 'ob'; setTimeout(() => { const e = FF.$(k); if (e) { e.value = t; FF.$(k + '-c').onclick = () => FF.copy(t); } }, 0); return '<textarea id="' + k + '" class="mono" rows="8" readonly></textarea><div class="btns"><button type="button" id="' + k + '-c">Copy result</button></div>'; };

  textTool({
    slug: 'word-counter', name: 'Word Counter', icon: '🔢', short: 'Count words, characters, sentences and reading time.',
    title: 'Word Counter: Count Words, Characters & Reading Time', desc: 'Count words, characters, sentences and paragraphs in your text, with reading and speaking time. Free and private.',
    h1: 'Word Counter', keywords: ['word count', 'characters', 'sentences', 'paragraphs', 'reading time', 'essay'], sample: '', label: 'Type or paste your text',
    run: t => { const words = t.trim() ? t.trim().split(/\s+/).length : 0, sent = (t.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (t.trim() ? 1 : 0), par = t.split(/\n\s*\n/).filter(s => s.trim()).length;
      return '<div class="res">' + stat('Words', words.toLocaleString()) + stat('Characters', t.length.toLocaleString()) + stat('Characters (no spaces)', t.replace(/\s/g, '').length.toLocaleString()) + stat('Sentences', sent) + stat('Paragraphs', par) + stat('Reading time', words ? Math.max(1, Math.round(words / 238)) + ' min' : '0 min') + stat('Speaking time', words ? Math.max(1, Math.round(words / 150)) + ' min' : '0 min') + '</div>'; }
  });

  textTool({
    slug: 'character-counter', name: 'Character Counter', icon: '🔠', short: 'Count characters against limits like X or SMS.',
    title: 'Character Counter: Check Limits for Twitter/X, SMS, Instagram', desc: 'Count characters with and without spaces and check them against limits for X (Twitter), SMS, Instagram bio, meta description and more.',
    h1: 'Character Counter', keywords: ['character count', 'twitter', 'sms', 'instagram', 'limit', 'meta description'], label: 'Type or paste your text',
    run: t => { const n = [...t].length, L = [['X (Twitter) post', 280], ['SMS (single)', 160], ['Instagram bio', 150], ['Meta description', 160], ['Page title', 60], ['LinkedIn headline', 220]];
      return stat('Characters', n.toLocaleString()) + stat('Without spaces', t.replace(/\s/g, '').length.toLocaleString()) + L.map(([nm, lim]) => '<div class="row"><span>' + nm + ' (' + lim + ')</span><b style="color:' + (n > lim ? 'var(--err)' : 'var(--ok)') + '">' + (n > lim ? (n - lim) + ' over' : (lim - n) + ' left') + '</b></div>').join(''); }
  });

  textTool({
    slug: 'case-converter', name: 'Case Converter', icon: 'Aa', short: 'UPPER, lower, Title, Sentence, camelCase and more.',
    title: 'Case Converter: Uppercase, Lowercase, Title Case & More', desc: 'Change text case: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case and kebab-case. Free and instant.',
    h1: 'Case Converter', keywords: ['uppercase', 'lowercase', 'title case', 'sentence case', 'camelcase', 'snake case', 'kebab'], sample: 'hello world. this is a test', label: 'Your text',
    run: t => { const words = s => s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean), cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(), w = words(t);
      const R = [['UPPERCASE', t.toUpperCase()], ['lowercase', t.toLowerCase()], ['Title Case', t.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())], ['Sentence case', t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())], ['camelCase', w.map((x, i) => i ? cap(x) : x.toLowerCase()).join('')], ['PascalCase', w.map(cap).join('')], ['snake_case', w.map(x => x.toLowerCase()).join('_')], ['kebab-case', w.map(x => x.toLowerCase()).join('-')], ['CONSTANT_CASE', w.map(x => x.toUpperCase()).join('_')], ['aLtErNaTiNg', [...t].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('')]];
      setTimeout(() => R.forEach(([, v], i) => { const e = FF.$('cc' + i); if (e) { e.textContent = v; e.nextElementSibling.onclick = () => FF.copy(v); } }), 0);
      return R.map(([n], i) => '<div style="margin-bottom:10px"><label>' + n + '</label><div style="display:flex;gap:8px"><div class="box" id="cc' + i + '" style="flex:1;min-height:0"></div><button type="button" class="ghost">Copy</button></div></div>').join(''); }
  });

  const lines = (slug, name, icon, short, title, desc, kw, fields, fn, sample) => textTool({ slug, name, icon, short, title, desc, h1: name, keywords: kw, label: 'One item per line', sample, fields, run: t => { const r = fn(t.split('\n')); return FF.row('Lines', r.before + ' → ' + r.lines.length) + copyBox(r.lines.join('\n'), 'ob'); } });
  lines('remove-duplicate-lines', 'Remove Duplicate Lines', '🧹', 'Delete repeated lines and keep the first of each.', 'Remove Duplicate Lines Online', 'Remove duplicate lines from a list, keeping the first copy. Option to ignore case and spaces and drop blank lines.', ['duplicate', 'dedupe', 'unique', 'lines', 'list'], H.grid(H.chk('ic', 'Ignore capital letters', false), H.chk('tr', 'Trim spaces', true), H.chk('bl', 'Remove blank lines', true)), ls => { const seen = new Set(), ic = FF.$('ic').checked, tr = FF.$('tr').checked, bl = FF.$('bl').checked; const out = []; ls.forEach(l => { const x = tr ? l.trim() : l; if (bl && !x.trim()) return; const k = ic ? x.toLowerCase() : x; if (!seen.has(k)) { seen.add(k); out.push(x); } }); return { before: ls.length, lines: out }; }, 'apple\nbanana\napple\ncherry\nBanana');
  lines('sort-lines', 'Sort Lines Alphabetically', '🔃', 'Sort a list A to Z, Z to A, by length, or randomly.', 'Sort Lines Alphabetically Online (A-Z, Z-A, Numeric)', 'Sort lines of text alphabetically, in reverse, by number, by length, or shuffle them randomly.', ['sort', 'alphabetical', 'lines', 'order', 'shuffle'], H.sel('mode', 'Sort', [['az', 'A to Z'], ['za', 'Z to A'], ['num', 'Numbers, small to large'], ['len', 'By length'], ['rev', 'Reverse order'], ['shuf', 'Shuffle']], 'az'), ls => { const m = FF.$('mode').value, a = ls.filter(l => l.trim()), c = (x, y) => x.localeCompare(y, undefined, { sensitivity: 'base', numeric: true }); if (m === 'az') a.sort(c); if (m === 'za') a.sort((x, y) => c(y, x)); if (m === 'num') a.sort((x, y) => (parseFloat(x) || 0) - (parseFloat(y) || 0)); if (m === 'len') a.sort((x, y) => x.length - y.length); if (m === 'rev') a.reverse(); if (m === 'shuf') for (let i = a.length - 1; i > 0; i--) { const b = new Uint32Array(1); crypto.getRandomValues(b); const j = b[0] % (i + 1);[a[i], a[j]] = [a[j], a[i]]; } return { before: ls.length, lines: a }; }, 'pear\napple\nfig\nbanana');

  textTool({
    slug: 'slug-generator', name: 'Slug Generator', icon: '🔗', short: 'Turn a title into a clean URL slug.',
    title: 'Slug Generator: Make URL-Friendly Slugs from Text', desc: 'Turn any title into a clean, lowercase, hyphenated URL slug. Removes accents and special characters.', h1: 'Slug Generator', keywords: ['slug', 'url', 'permalink', 'seo'], sample: 'My First Blog Post: A Beginner\'s Guide!', label: 'Title', rows: 3,
    run: t => { const s = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return s ? '<label>Slug</label><div class="box mono" id="sg"></div><div class="btns"><button type="button" id="cp">Copy</button></div>' + (setTimeout(() => { FF.$('sg').textContent = s; FF.$('cp').onclick = () => FF.copy(s); }, 0), '') : FF.msg('warn', 'Type a title. Non-English letters cannot be turned into a slug here.'); }
  });

  FF.tool({
    cat: 'text', slug: 'lorem-ipsum-generator', name: 'Lorem Ipsum Generator', icon: '📃', short: 'Placeholder text by paragraphs, sentences or words.',
    title: 'Lorem Ipsum Generator: Placeholder Text', desc: 'Generate lorem ipsum placeholder text by paragraphs, sentences or words. Copy it into your design.', h1: 'Lorem Ipsum Generator', keywords: ['lorem ipsum', 'placeholder', 'dummy text', 'filler'],
    html: H.card(H.grid3(H.num('n', 'How many', 3, { int: true, min: 1, max: 100 }), H.sel('u', 'Unit', [['p', 'Paragraphs'], ['s', 'Sentences'], ['w', 'Words']], 'p'), H.chk('st', 'Start with "Lorem ipsum"', true))) + H.out('res'), faq: faqT,
    init(root) {
      const W = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
      let seed = 7; const r = n => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed % n; };
      const sent = () => { const n = 8 + r(10), a = []; for (let i = 0; i < n; i++) a.push(W[r(W.length)]); const s = a.join(' ').replace(/ (\w+)$/, (m, x) => ' ' + x); return s.charAt(0).toUpperCase() + s.slice(1) + '.'; };
      const out = FF.$('res'); FF.live(root, () => { seed = 7; const n = Math.max(1, Math.min(100, Math.round(FF.n('n')))), u = FF.$('u').value; let t;
        const st = FF.$('st').checked, FIRST = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
        if (u === 'w') { const arr = st ? W.slice(0, Math.min(n, W.length)) : []; while (arr.length < n) arr.push(W[r(W.length)]); t = arr.join(' '); }
        else { if (u === 's') t = Array.from({ length: n }, sent).join(' '); else t = Array.from({ length: n }, () => Array.from({ length: 3 + r(4) }, sent).join(' ')).join('\n\n'); if (st) t = FIRST + t.slice(t.indexOf('.') + 1); }
        out.innerHTML = copyBox(t, 'ob'); });
    }
  });

  /* ---- text diff ---- */
  FF.tool({
    slug: 'text-diff-checker', name: 'Text Diff Checker', cat: 'text', icon: '🆚', short: 'Compare two texts and see what changed.',
    title: 'Text Diff Checker: Compare Two Texts Online', desc: 'Compare two pieces of text and see added and removed lines highlighted. Free and private, nothing is uploaded.', h1: 'Text Diff Checker', keywords: ['diff', 'compare', 'difference', 'text', 'changes'], faq: faqT,
    html: H.card(H.grid(H.area('a', 'Original', 'The quick brown fox\njumps over\nthe lazy dog', 7, { full: false, mono: true }), H.area('b', 'Changed', 'The quick red fox\njumps over\nthe sleepy dog\nand runs away', 7, { full: false, mono: true }), H.chk('ws', 'Ignore spaces at line ends', true))) + H.out('res'),
    init(root) {
      const out = FF.$('res');
      FF.live(root, () => {
        const ws = FF.$('ws').checked, f = s => s.split('\n').map(l => ws ? l.replace(/\s+$/, '') : l), A = f(FF.$('a').value), B = f(FF.$('b').value);
        if (A.length * B.length > 4000000) { out.innerHTML = FF.msg('err', 'These texts are too long to compare in the browser. Try shorter ones.'); return; }
        const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1)); for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
        let i = 0, j = 0, add = 0, del = 0, h = ''; while (i < n || j < m) { if (i < n && j < m && A[i] === B[j]) { h += '<div>  ' + FF.esc(A[i]) + '</div>'; i++; j++; } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) { h += '<div class="add">+ ' + FF.esc(B[j]) + '</div>'; j++; add++; } else { h += '<div class="del">- ' + FF.esc(A[i]) + '</div>'; i++; del++; } }
        out.innerHTML = (add || del ? FF.row('Lines added', add) + FF.row('Lines removed', del) : FF.msg('ok', 'The two texts are identical.')) + '<div class="box mono" style="white-space:pre-wrap;margin-top:10px">' + h + '</div>';
      });
    }
  });
})();
