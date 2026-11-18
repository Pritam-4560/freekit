/* Converters. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH, bad = m => { throw Object.assign(new Error(m), { userMsg: m }); };
  const calc = (def, compute) => FF.tool(Object.assign({ cat: 'convert' }, def, {
    html: H.card(def.fields) + H.out('res'),
    init(root) { const out = FF.$('res'); FF.live(root, () => { try { out.innerHTML = compute(); } catch (e) { out.innerHTML = FF.msg('err', e.userMsg || 'Please check what you entered.'); } }); }
  }));
  const big = (label, v) => '<div class="opt best"><div class="tag">' + label + '</div><div class="big">' + v + '</div></div>';

  // units: [key, label, factorToBase]
  const unitTool = (slug, name, icon, units, from, to, kw, extra) => {
    const sel = units.map(u => [u[0], u[1]]);
    calc(Object.assign({ slug, name: name + ' Converter', icon, short: 'Convert ' + units.slice(0, 4).map(u => u[1].split(' (')[0]).join(', ') + ' and more.', title: name + ' Converter: ' + units.slice(0, 3).map(u => u[1].split(' (')[0]).join(', ') + ' & More', desc: 'Free ' + name.toLowerCase() + ' converter. Convert between ' + units.slice(0, 5).map(u => u[1].split(' (')[0].toLowerCase()).join(', ') + ' and more, instantly.', h1: name + ' Converter', keywords: kw.concat(['convert', 'converter', 'unit']), fields: H.grid(H.num('v', 'Value', 1, { step: 'any' }), H.sel('a', 'From', sel, from), H.sel('b', 'To', sel, to)) }, extra || {}), () => {
      if (!FF.has('v')) bad('Enter a number.'); const v = FF.n('v'), ua = units.find(u => u[0] === FF.$('a').value), ub = units.find(u => u[0] === FF.$('b').value), base = v * ua[2];
      return big(FF.fmt(v, 6) + ' ' + ua[1].split(' (')[0] + ' =', FF.fmt(base / ub[2], 6) + ' ' + ub[1].split(' (')[0]) + units.filter(u => u !== ub).slice(0, 8).map(u => FF.row(u[1], FF.fmt(base / u[2], 6))).join('');
    });
  };
  unitTool('length-converter', 'Length', '📏', [['m', 'Metres (m)', 1], ['km', 'Kilometres (km)', 1000], ['cm', 'Centimetres (cm)', 0.01], ['mm', 'Millimetres (mm)', 0.001], ['mi', 'Miles (mi)', 1609.344], ['yd', 'Yards (yd)', 0.9144], ['ft', 'Feet (ft)', 0.3048], ['in', 'Inches (in)', 0.0254], ['nmi', 'Nautical miles', 1852]], 'km', 'mi', ['km to miles', 'feet to meters', 'inches to cm', 'distance'], { faq: [['How many km in a mile?', 'One mile is exactly 1.609344 kilometres.']] });
  unitTool('weight-converter', 'Weight', '⚖️', [['kg', 'Kilograms (kg)', 1], ['g', 'Grams (g)', 0.001], ['mg', 'Milligrams (mg)', 0.000001], ['t', 'Tonnes', 1000], ['lb', 'Pounds (lb)', 0.45359237], ['oz', 'Ounces (oz)', 0.028349523125], ['st', 'Stone', 6.35029318], ['q', 'Quintal', 100], ['tola', 'Tola (India, 11.664 g)', 0.011664]], 'kg', 'lb', ['kg to lbs', 'pounds', 'grams', 'mass', 'tola'], { faq: [['How many pounds in a kg?', 'One kilogram is about 2.20462 pounds.']] });
  unitTool('area-converter', 'Area', '📐', [['sqm', 'Square metres (sq m)', 1], ['sqft', 'Square feet (sq ft)', 0.09290304], ['sqyd', 'Square yards / gaj', 0.83612736], ['acre', 'Acres', 4046.8564224], ['ha', 'Hectares', 10000], ['cent', 'Cent (1/100 acre)', 40.468564224], ['guntha', 'Guntha (1/40 acre)', 101.17141056], ['sqkm', 'Square kilometres', 1000000], ['sqmi', 'Square miles', 2589988.110336]], 'acre', 'sqft', ['acre to sq ft', 'cent', 'guntha', 'land', 'plot', 'gaj'], { faq: [['What about bigha and kattha?', 'Their size changes from state to state, so they are not included. Use your local land record for those.'], ['How many sq ft in an acre?', 'One acre is 43,560 square feet.']] });
  unitTool('volume-converter', 'Volume', '🧪', [['l', 'Litres (L)', 1], ['ml', 'Millilitres (mL)', 0.001], ['m3', 'Cubic metres', 1000], ['gal', 'US gallons', 3.785411784], ['ukgal', 'UK gallons', 4.54609], ['qt', 'US quarts', 0.946352946], ['pt', 'US pints', 0.473176473], ['cup', 'US cups', 0.2365882365], ['floz', 'US fluid ounces', 0.0295735295625], ['tbsp', 'Tablespoons (US)', 0.01478676478125], ['tsp', 'Teaspoons (US)', 0.00492892159375]], 'l', 'gal', ['litres', 'gallons', 'cups', 'ml'], { faq: [['Are US and UK gallons the same?', 'No. A US gallon is 3.785 litres and a UK gallon is 4.546 litres.']] });
  unitTool('speed-converter', 'Speed', '🚗', [['kmh', 'Kilometres per hour (km/h)', 1 / 3.6], ['ms', 'Metres per second', 1], ['mph', 'Miles per hour', 0.44704], ['kn', 'Knots', 1852 / 3600], ['fts', 'Feet per second', 0.3048]], 'kmh', 'mph', ['km/h to mph', 'speed', 'knots'], { title: 'Speed Converter: km/h, mph, m/s, Knots' });
  unitTool('time-converter', 'Time', '🕒', [['s', 'Seconds', 1], ['min', 'Minutes', 60], ['h', 'Hours', 3600], ['d', 'Days', 86400], ['w', 'Weeks', 604800], ['mo', 'Months (30.44 days)', 2629800], ['y', 'Years (365.25 days)', 31557600], ['ms', 'Milliseconds', 0.001]], 'h', 'min', ['hours to minutes', 'seconds', 'days'], {});

  calc({
    slug: 'temperature-converter', name: 'Temperature Converter', icon: '🌡️', short: 'Celsius, Fahrenheit and Kelvin.',
    title: 'Temperature Converter: Celsius, Fahrenheit, Kelvin', desc: 'Convert temperature between Celsius, Fahrenheit and Kelvin instantly.', h1: 'Temperature Converter', keywords: ['celsius', 'fahrenheit', 'kelvin', 'temperature', 'c to f'],
    fields: H.grid(H.num('v', 'Value', 100, { step: 'any' }), H.sel('a', 'From', [['c', 'Celsius (°C)'], ['f', 'Fahrenheit (°F)'], ['k', 'Kelvin (K)']], 'f')),
    faq: [['What is the formula?', '°F = °C × 9/5 + 32, and K = °C + 273.15.']]
  }, () => {
    if (!FF.has('v')) bad('Enter a number.'); const v = FF.n('v'), a = FF.$('a').value, c = a === 'c' ? v : a === 'f' ? (v - 32) * 5 / 9 : v - 273.15; if (c < -273.15) bad('That is below absolute zero.');
    return big('Celsius', FF.fmt(c, 2) + ' °C') + FF.row('Fahrenheit', FF.fmt(c * 9 / 5 + 32, 2) + ' °F') + FF.row('Kelvin', FF.fmt(c + 273.15, 2) + ' K');
  });

  calc({
    slug: 'data-size-converter', name: 'Data Size Converter', icon: '💾', short: 'Bytes, KB, MB, GB and TB.',
    title: 'Data Size Converter: KB, MB, GB, TB', desc: 'Convert between bytes, kilobytes, megabytes, gigabytes and terabytes using 1000 or 1024 as the base.', h1: 'Data Size Converter', keywords: ['mb to kb', 'gb to mb', 'bytes', 'storage', 'kb', 'mb'],
    fields: H.grid(H.num('v', 'Value', 1, { step: 'any' }), H.sel('a', 'From', [[0, 'Bytes'], [1, 'KB'], [2, 'MB'], [3, 'GB'], [4, 'TB'], [5, 'PB']], 2), H.sel('base', 'Base', [[1024, '1024 (computers, Windows)'], [1000, '1000 (storage makers, macOS)']], 1024)),
    faq: [['1000 or 1024?', 'Operating systems like Windows count 1 KB as 1024 bytes. Storage makers and macOS count 1 KB as 1000 bytes. That is why a "1 TB" drive shows less on Windows.']]
  }, () => {
    if (!FF.has('v')) bad('Enter a number.'); const base = +FF.$('base').value, by = FF.n('v') * Math.pow(base, +FF.$('a').value), N = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    return N.map((n, i) => FF.row(n, '<b>' + FF.fmt(by / Math.pow(base, i), 6) + '</b>')).join('');
  });

  /* ---- number to words ---- */
  const A = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], T = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? A[n] : T[Math.floor(n / 10)] + (n % 10 ? ' ' + A[n % 10] : ''), three = n => (n >= 100 ? A[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + two(n % 100);
  const wordsIN = n => { if (n === 0n) return 'Zero'; const parts = []; const cr = n / 10000000n; n %= 10000000n; if (cr) parts.push((cr >= 100n ? wordsIN(cr) : three(Number(cr))) + ' Crore'); const l = n / 100000n; n %= 100000n; if (l) parts.push(two(Number(l)) + ' Lakh'); const th = n / 1000n; n %= 1000n; if (th) parts.push(two(Number(th)) + ' Thousand'); if (n) parts.push(three(Number(n))); return parts.join(' '); };
  const wordsIntl = n => { if (n === 0n) return 'Zero'; const S = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion']; const parts = []; let i = 0; while (n > 0n) { const g = Number(n % 1000n); if (g) parts.unshift(three(g) + (S[i] ? ' ' + S[i] : '')); n /= 1000n; i++; } return parts.join(' '); };
  calc({
    slug: 'number-to-words', name: 'Number to Words', icon: '🔤', short: 'Write amounts in words, Indian or international.',
    title: 'Number to Words Converter: Rupees in Words (Lakh, Crore)', desc: 'Convert numbers to words in Indian (lakh, crore) or international (million, billion) style, with rupees and paise for cheques.',
    h1: 'Number to Words Converter', keywords: ['number to words', 'rupees in words', 'amount in words', 'cheque', 'lakh', 'crore'],
    fields: H.grid(H.text('n', 'Number', '1234567.50', { ph: 'e.g. 1234567.50', full: true }), H.sel('sys', 'Style', [['in', 'Indian (lakh, crore)'], ['intl', 'International (million, billion)']], 'in'), H.chk('rs', 'Write as rupees and paise', true)),
    faq: [['What is the largest number?', 'Up to 15 digits before the decimal point.']]
  }, () => {
    const raw = FF.$('n').value.replace(/[,\s₹]/g, ''); if (!raw) bad('Enter a number.'); if (!/^\d{1,15}(\.\d{1,2})?$/.test(raw)) bad('Use digits only, up to 15 digits and 2 decimals, like 1234567.50.');
    const [i, d = ''] = raw.split('.'), I = BigInt(i), f = FF.$('sys').value === 'in' ? wordsIN : wordsIntl, p = Number((d + '00').slice(0, 2)), rs = FF.$('rs').checked;
    const t = rs ? 'Rupees ' + f(I) + (p ? ' and ' + two(p) + ' Paise' : '') + ' Only' : f(I) + (d && p ? ' point ' + d.split('').map(x => x === '0' ? 'Zero' : A[+x]).join(' ') : '');
    return '<div class="box" id="wt"></div><div class="btns"><button type="button" id="cp">Copy</button></div>' + (setTimeout(() => { const el = FF.$('wt'); if (el) { el.textContent = t; FF.$('cp').onclick = () => FF.copy(t); } }, 0), '');
  });

  /* ---- roman numerals ---- */
  calc({
    slug: 'roman-numeral-converter', name: 'Roman Numeral Converter', icon: 'Ⅻ', short: 'Numbers to Roman numerals and back.',
    title: 'Roman Numeral Converter: Numbers to Roman and Back', desc: 'Convert numbers 1 to 3999 to Roman numerals, or Roman numerals back to numbers.', h1: 'Roman Numeral Converter', keywords: ['roman', 'numerals', 'xii', 'convert'],
    fields: H.text('v', 'Number or Roman numeral', '2026', { full: true, upper: true }), faq: [['Why up to 3999?', 'Standard Roman numerals have no symbol for 5000, so 3999 (MMMCMXCIX) is the usual limit.']]
  }, () => {
    const v = FF.$('v').value.trim().toUpperCase(); if (!v) bad('Enter a number or Roman numeral.'); const M = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    const toR = n => M.reduce((s, [k, r]) => { while (n >= k) { s += r; n -= k; } return s; }, '');
    if (/^\d+$/.test(v)) { const n = +v; if (n < 1 || n > 3999) bad('Enter a whole number from 1 to 3999.'); return big('Roman numeral', toR(n)); }
    if (!/^[MDCLXVI]+$/.test(v)) bad('Use digits, or the letters I V X L C D M.'); let n = 0; for (let i = 0; i < v.length; i++) { const a = M.find(m => m[1] === v[i])[0] || 0, b = (M.find(m => m[1] === v[i + 1]) || [0])[0]; n += a < b ? -a : a; }
    if (toR(n) !== v) bad('That is not a correctly written Roman numeral. Did you mean ' + toR(n) + '?'); return big('Number', n);
  });

  /* ---- number base ---- */
  calc({
    slug: 'number-base-converter', name: 'Number Base Converter', icon: '🔢', short: 'Binary, octal, decimal and hexadecimal.',
    title: 'Binary, Decimal, Hex & Octal Converter', desc: 'Convert numbers between binary, octal, decimal and hexadecimal. Handles very large numbers.', h1: 'Number Base Converter', keywords: ['binary', 'hex', 'octal', 'decimal', 'base'],
    fields: H.grid(H.text('v', 'Number', '255', { mono: true }), H.sel('b', 'From base', [[2, 'Binary (2)'], [8, 'Octal (8)'], [10, 'Decimal (10)'], [16, 'Hex (16)'], [36, 'Base 36']], 10)), faq: [['Does it handle negatives?', 'Yes, put a minus sign in front.']]
  }, () => {
    let v = FF.$('v').value.trim().toLowerCase().replace(/^0[xbo]/, ''); if (!v) bad('Enter a number.'); const base = +FF.$('b').value, neg = v[0] === '-'; if (neg) v = v.slice(1); const D = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
    if (!v || [...v].some(c => !D.includes(c))) bad('That is not a valid base-' + base + ' number.'); let n = 0n; for (const c of v) n = n * BigInt(base) + BigInt(D.indexOf(c)); const s = (b) => (neg ? '-' : '') + n.toString(b).toUpperCase();
    return big('Decimal', s(10)) + FF.row('Binary', s(2)) + FF.row('Octal', s(8)) + FF.row('Hexadecimal', s(16));
  });

  /* ---- colour ---- */
  calc({
    slug: 'color-converter', name: 'Colour Converter', icon: '🎨', short: 'HEX, RGB and HSL with a colour picker.',
    title: 'Color Converter: HEX, RGB, HSL', desc: 'Convert colours between HEX, RGB and HSL and pick a colour visually.', h1: 'Colour Converter', keywords: ['hex', 'rgb', 'hsl', 'color', 'colour', 'picker'],
    fields: H.grid(H.text('c', 'Pick a colour', '#2454e6', { type: 'color' }), H.text('t', 'Or type HEX / rgb() / hsl()', '', { ph: '#2454e6, rgb(36,84,230) or hsl(222,80%,52%)', mono: true })),
    faq: [['Which formats can I type?', 'HEX like #2454e6 or #25e, rgb(36, 84, 230), or hsl(222, 80%, 52%).']]
  }, () => {
    const t = FF.$('t').value.trim(); let r, g, b;
    if (t) { let m; if ((m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i))) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
      else if ((m = t.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/i))) { [r, g, b] = [+m[1], +m[2], +m[3]]; if ([r, g, b].some(x => x > 255)) bad('RGB values go from 0 to 255.'); }
      else if ((m = t.match(/^hsl\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})%?\s*[, ]\s*(\d{1,3})%?\s*\)$/i))) { const h = +m[1] % 360, s = Math.min(100, +m[2]) / 100, l = Math.min(100, +m[3]) / 100, k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); [r, g, b] = [f(0), f(8), f(4)].map(x => Math.round(x * 255)); }
      else bad('Could not read that colour. Try #2454e6 or rgb(36, 84, 230).'); }
    else { const h = FF.$('c').value; [r, g, b] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); }
    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(), r1 = r / 255, g1 = g / 255, b1 = b / 255, mx = Math.max(r1, g1, b1), mn = Math.min(r1, g1, b1), l = (mx + mn) / 2, dl = mx - mn; let hh = 0, s = 0;
    if (dl) { s = dl / (1 - Math.abs(2 * l - 1)); hh = mx === r1 ? ((g1 - b1) / dl) % 6 : mx === g1 ? (b1 - r1) / dl + 2 : (r1 - g1) / dl + 4; hh = Math.round((hh * 60 + 360) % 360); }
    return '<span class="sw" style="background:' + hex + '"></span>' + FF.row('HEX', hex) + FF.row('RGB', 'rgb(' + r + ', ' + g + ', ' + b + ')') + FF.row('HSL', 'hsl(' + hh + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)');
  });

  /* ---- unix timestamp ---- */
  FF.tool({
    slug: 'unix-timestamp-converter', name: 'Unix Timestamp Converter', cat: 'convert', icon: '🕰️', short: 'Epoch seconds or milliseconds to a date, and back.',
    title: 'Unix Timestamp Converter: Epoch to Date and Back', desc: 'Convert a Unix timestamp in seconds or milliseconds to a readable date, or a date to a timestamp. Shows UTC and local time.',
    h1: 'Unix Timestamp Converter', keywords: ['unix', 'timestamp', 'epoch', 'milliseconds', 'date'],
    html: H.card(H.grid(H.text('ts', 'Timestamp', '', { ph: 'e.g. 1767225600', mono: true }), H.text('dt', 'Or pick a date and time', '', { type: 'datetime-local' })), '<div class="btns"><button type="button" class="ghost" id="now">Use current time</button></div>') + H.out('res'),
    faq: [['Seconds or milliseconds?', 'Ten-digit numbers are seconds and thirteen-digit numbers are milliseconds. The tool detects which you entered.']],
    init(root) {
      const out = FF.$('res'), show = ms => { const d = new Date(ms); if (isNaN(d)) { out.innerHTML = FF.msg('err', 'That timestamp is out of range.'); return; } out.innerHTML = FF.row('UTC', d.toUTCString()) + FF.row('Your local time', d.toString().replace(/ GMT.*/, '') + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')') + FF.row('ISO 8601', d.toISOString()) + FF.row('Seconds', Math.floor(ms / 1000)) + FF.row('Milliseconds', ms); };
      FF.$('ts').addEventListener('input', () => { const v = FF.$('ts').value.trim(); if (!v) { out.innerHTML = ''; return; } if (!/^-?\d+(\.\d+)?$/.test(v)) { out.innerHTML = FF.msg('err', 'Enter digits only.'); return; } const n = parseFloat(v); show(Math.abs(n) >= 1e11 ? n : n * 1000); });
      FF.$('dt').addEventListener('input', () => { const v = FF.$('dt').value; if (v) { const ms = new Date(v).getTime(); FF.$('ts').value = Math.floor(ms / 1000); show(ms); } });
      FF.$('now').onclick = () => { const ms = Date.now(); FF.$('ts').value = Math.floor(ms / 1000); show(ms); };
    }
  });

  /* ---- time zone converter ---- */
  const ZONES = [['Asia/Kolkata', 'India (IST)'], ['UTC', 'UTC'], ['America/New_York', 'New York'], ['America/Chicago', 'Chicago'], ['America/Los_Angeles', 'Los Angeles'], ['America/Toronto', 'Toronto'], ['America/Sao_Paulo', 'São Paulo'], ['Europe/London', 'London'], ['Europe/Paris', 'Paris / Berlin'], ['Europe/Moscow', 'Moscow'], ['Asia/Dubai', 'Dubai'], ['Asia/Karachi', 'Karachi'], ['Asia/Dhaka', 'Dhaka'], ['Asia/Bangkok', 'Bangkok'], ['Asia/Singapore', 'Singapore'], ['Asia/Shanghai', 'China'], ['Asia/Tokyo', 'Tokyo'], ['Asia/Seoul', 'Seoul'], ['Australia/Sydney', 'Sydney'], ['Pacific/Auckland', 'Auckland'], ['Africa/Cairo', 'Cairo'], ['Africa/Johannesburg', 'Johannesburg'], ['Africa/Lagos', 'Lagos']];
  const off = (zone, utc) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(utc)).filter(x => x.type !== 'literal').map(x => [x.type, +x.value])); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utc / 1000) * 1000; };
  FF.tool({
    slug: 'time-zone-converter', name: 'Time Zone Converter', cat: 'convert', icon: '🌍', short: 'Convert a time between cities and countries.',
    title: 'Time Zone Converter: IST to EST, PST, GMT, UTC and More', desc: 'Convert a date and time from one time zone to many others at once, with daylight saving handled correctly. IST, EST, PST, GMT, CET and more.',
    h1: 'Time Zone Converter', keywords: ['time zone', 'ist', 'est', 'pst', 'gmt', 'utc', 'meeting', 'convert time'],
    html: H.card(H.grid(H.text('dt', 'Date and time', '', { type: 'datetime-local' }), H.sel('from', 'In this zone', ZONES, 'Asia/Kolkata'))) + H.out('res'),
    faq: [['Is daylight saving handled?', 'Yes. Offsets are calculated for the exact date you pick using your browser time zone data, so US and Europe clock changes are correct.']],
    init(root) {
      const n = new Date(), pad = x => String(x).padStart(2, '0'); FF.$('dt').value = n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()) + 'T' + pad(n.getHours()) + ':' + pad(n.getMinutes());
      const out = FF.$('res'); FF.live(root, () => {
        const v = FF.$('dt').value; if (!v) { out.innerHTML = FF.msg('warn', 'Choose a date and time.'); return; } const [d, t] = v.split('T'), [y, m, dd] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number), wall = Date.UTC(y, m - 1, dd, h, mi), z = FF.$('from').value;
        let u = wall - off(z, wall); u = wall - off(z, u);
        out.innerHTML = '<div class="tbl-wrap"><table class="tbl">' + ZONES.map(([zn, label]) => { const dtf = new Intl.DateTimeFormat('en-GB', { timeZone: zn, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), o = off(zn, u) / 60000, sign = o < 0 ? '-' : '+', a = Math.abs(o); return '<tr' + (zn === z ? ' style="font-weight:700"' : '') + '><td>' + label + '</td><td>' + dtf.format(new Date(u)) + '</td><td>UTC' + sign + pad(Math.floor(a / 60)) + ':' + pad(a % 60) + '</td></tr>'; }).join('') + '</table></div>';
      });
    }
  });
})();
