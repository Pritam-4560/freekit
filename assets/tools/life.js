/* Health, age and date tools. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH, bad = m => { throw Object.assign(new Error(m), { userMsg: m }); };
  const big = (label, v) => '<div class="opt best"><div class="tag">' + label + '</div><div class="big">' + v + '</div></div>';
  const calc = (def, compute) => FF.tool(Object.assign({ cat: 'life' }, def, {
    html: H.card(def.fields) + H.out('res'),
    init(root) { const out = FF.$('res'); FF.live(root, () => { try { out.innerHTML = compute(); } catch (e) { out.innerHTML = FF.msg('err', e.userMsg || 'Please check what you entered.'); } }); }
  }));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const pd = id => { const v = FF.$(id).value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; const [y, m, d] = v.split('-').map(Number), t = Date.UTC(y, m - 1, d), c = new Date(t); return c.getUTCFullYear() === y && c.getUTCMonth() === m - 1 && c.getUTCDate() === d ? { y, m, d, t } : null; };
  const DAY = 86400000, fmtD = t => new Date(t).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  calc({
    slug: 'bmi-calculator', name: 'BMI Calculator', icon: '⚖️', short: 'Body mass index from height and weight.',
    title: 'BMI Calculator: Body Mass Index (Metric & Imperial)', desc: 'Calculate BMI from height and weight in kg/cm or lb/inches and see the adult category. A screening number, not a diagnosis.',
    h1: 'BMI Calculator', keywords: ['bmi', 'body mass index', 'weight', 'height', 'health'],
    fields: H.grid(H.sel('u', 'Units', [['m', 'Metric (kg, cm)'], ['i', 'Imperial (lb, ft + in)']], 'm'), H.num('w', 'Weight (kg or lb)', 65, { min: 0, step: 0.1 }), H.num('h', 'Height (cm, or feet)', 170, { min: 0, step: 0.1 }), H.num('in', 'Extra inches (imperial only)', 0, { min: 0, max: 11.9, step: 0.1 })),
    faq: [['What is a healthy BMI?', 'For adults, 18.5 to 24.9 is the usual healthy range. Some Asian guidelines use 18.5 to 22.9 as normal, and 23 to 24.9 as overweight risk. BMI does not measure fat directly.'], ['Is BMI accurate?', 'It is a quick screen. It can mislead for athletes, older adults, children and pregnant women. Talk to a doctor for health decisions.']]
  }, () => {
    const imp = FF.$('u').value === 'i'; let w = FF.nn('w'), h = FF.nn('h'); if (!w || !h) bad('Enter your weight and height.');
    if (imp) { w *= 0.45359237; h = (h * 12 + FF.nn('in')) * 0.0254; } else h /= 100;
    if (h < 0.5 || h > 2.8 || w < 10 || w > 500) bad('Those numbers look out of range. Check units.');
    const b = w / (h * h), c = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal weight' : b < 30 ? 'Overweight' : 'Obese', lo = 18.5 * h * h, hi = 24.9 * h * h;
    return big('Your BMI', FF.fmt(b, 1)) + FF.row('Category (adults)', c) + FF.row('Healthy weight range', imp ? FF.fmt(lo / 0.45359237, 0) + ' to ' + FF.fmt(hi / 0.45359237, 0) + ' lb' : FF.fmt(lo, 1) + ' to ' + FF.fmt(hi, 1) + ' kg') + FF.msg('warn', 'For adults 18+. BMI is a screening number, not a diagnosis.');
  });

  calc({
    slug: 'age-calculator', name: 'Age Calculator', icon: '🎂', short: 'Exact age in years, months and days.',
    title: 'Age Calculator: Exact Age in Years, Months & Days', desc: 'Find your exact age from date of birth in years, months, days and total days, plus days until your next birthday.',
    h1: 'Age Calculator', keywords: ['age', 'birthday', 'date of birth', 'dob'],
    fields: H.grid(H.text('dob', 'Date of birth', '2000-01-01', { type: 'date' }), H.text('on', 'Age on date', today(), { type: 'date' })),
    faq: [['How is age counted?', 'Full years, then remaining full months, then days, counted on the calendar.']]
  }, () => {
    const a = pd('dob'), b = pd('on'); if (!a || !b) bad('Choose both dates.'); if (b.t < a.t) bad('The date of birth is after the other date.');
    let y = b.y - a.y, m = b.m - a.m, d = b.d - a.d; if (d < 0) { m--; d += new Date(Date.UTC(b.y, b.m - 1, 0)).getUTCDate(); } if (m < 0) { y--; m += 12; }
    let nb = Date.UTC(b.y, a.m - 1, a.d); if (a.m === 2 && a.d === 29 && new Date(nb).getUTCMonth() !== 1) nb = Date.UTC(b.y, 1, 28); if (nb < b.t) { nb = Date.UTC(b.y + 1, a.m - 1, a.d); if (a.m === 2 && a.d === 29 && new Date(nb).getUTCMonth() !== 1) nb = Date.UTC(b.y + 1, 1, 28); }
    const total = Math.round((b.t - a.t) / DAY);
    return big('Age', y + ' years, ' + m + ' months, ' + d + ' days') + FF.row('Total days', total.toLocaleString('en-IN')) + FF.row('Total weeks', Math.floor(total / 7).toLocaleString('en-IN')) + FF.row('Next birthday', Math.round((nb - b.t) / DAY) === 0 ? 'Today! 🎉' : 'in ' + Math.round((nb - b.t) / DAY) + ' days (' + fmtD(nb) + ')') + FF.row('Born on a', new Date(a.t).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }));
  });

  calc({
    slug: 'days-between-dates', name: 'Days Between Dates', icon: '📆', short: 'Days, weeks and working days between two dates.',
    title: 'Days Between Two Dates Calculator', desc: 'Count the days, weeks, months and working days between two dates. Optionally include the end date.',
    h1: 'Days Between Dates', keywords: ['days', 'between', 'dates', 'difference', 'working days', 'duration'],
    fields: H.grid(H.text('a', 'From', today(), { type: 'date' }), H.text('b', 'To', new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10), { type: 'date' }), H.chk('inc', 'Count the end date too', false)),
    faq: [['Are holidays excluded from working days?', 'No. Working days exclude Saturdays and Sundays only, because holidays differ by state and company.']]
  }, () => {
    let a = pd('a'), b = pd('b'); if (!a || !b) bad('Choose both dates.'); if (b.t < a.t) [a, b] = [b, a];
    let days = Math.round((b.t - a.t) / DAY) + (FF.$('inc').checked ? 1 : 0), wk = 0; for (let t = a.t + (FF.$('inc').checked ? 0 : DAY), i = 0; i < days; i++, t += DAY) { const g = new Date(t).getUTCDay(); if (g !== 0 && g !== 6) wk++; }
    let y = b.y - a.y, m = b.m - a.m, d = b.d - a.d; if (d < 0) { m--; d += new Date(Date.UTC(b.y, b.m - 1, 0)).getUTCDate(); } if (m < 0) { y--; m += 12; }
    return big('Days', days.toLocaleString('en-IN')) + FF.row('Weeks and days', Math.floor(days / 7) + ' weeks, ' + days % 7 + ' days') + FF.row('Years, months, days', y + 'y ' + m + 'm ' + d + 'd') + FF.row('Working days (Mon to Fri)', wk.toLocaleString('en-IN')) + FF.row('Hours', (days * 24).toLocaleString('en-IN'));
  });

  calc({
    slug: 'add-days-to-date', name: 'Add or Subtract Days from a Date', icon: '➕', short: 'What date is it after N days, months or years?',
    title: 'Add or Subtract Days, Weeks, Months from a Date', desc: 'Find the date after adding or subtracting days, weeks, months or years. Handy for deadlines, notice periods and due dates.',
    h1: 'Add or Subtract Days from a Date', keywords: ['add days', 'date', 'deadline', 'notice period', 'due date', 'after'],
    fields: H.grid(H.text('d', 'Start date', today(), { type: 'date' }), H.sel('op', 'Operation', [['1', 'Add'], ['-1', 'Subtract']], '1'), H.num('n', 'Amount', 30, { int: true, min: 0, max: 100000 }), H.sel('un', 'Unit', [['d', 'Days'], ['w', 'Weeks'], ['m', 'Months'], ['y', 'Years']], 'd')),
    faq: [['What happens when a month has fewer days?', 'Adding one month to 31 January gives 28 or 29 February, the last day of that month.']]
  }, () => {
    const s = pd('d'); if (!s) bad('Choose a start date.'); const sg = +FF.$('op').value, n = Math.round(FF.nn('n')) * sg, u = FF.$('un').value; let t;
    if (u === 'd' || u === 'w') t = s.t + n * (u === 'w' ? 7 : 1) * DAY; else { const mo = (u === 'y' ? n * 12 : n), tm = s.m - 1 + mo, y = s.y + Math.floor(tm / 12), m = ((tm % 12) + 12) % 12, last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); t = Date.UTC(y, m, Math.min(s.d, last)); }
    if (!isFinite(t) || Math.abs(t) > 8.64e15) bad('That date is out of range.'); return big('Result', fmtD(t)) + FF.row('ISO date', new Date(t).toISOString().slice(0, 10));
  });

  calc({
    slug: 'cgpa-to-percentage', name: 'CGPA to Percentage', icon: '🎓', short: 'Convert CGPA to percentage (CBSE ×9.5 and others).',
    title: 'CGPA to Percentage Calculator (×9.5 CBSE and More)', desc: 'Convert CGPA to percentage using the CBSE multiplier 9.5 or other common formulas, and percentage back to CGPA.',
    h1: 'CGPA to Percentage Calculator', keywords: ['cgpa', 'percentage', 'cbse', 'gpa', 'convert', 'marks', 'sgpa'],
    fields: H.grid(H.num('c', 'CGPA', 8.2, { min: 0, max: 10, step: 0.01 }), H.sel('f', 'Formula', [['9.5', 'CBSE: CGPA × 9.5'], ['10', 'Common university: CGPA × 10'], ['mumbai', 'Mumbai University: 7.1 × CGPA + 11']], '9.5'), H.num('p', 'Percentage (to convert back)', 78, { min: 0, max: 100, step: 0.01 })),
    faq: [['Which formula should I use?', 'Use the one your university or employer asks for. CBSE uses CGPA × 9.5. Many other universities publish their own, so check your official regulations or ask your registrar.'], ['Is this an official conversion?', 'No. It applies a published multiplier. Only your institution can issue an official equivalence certificate.']]
  }, () => {
    const c = FF.nn('c'); if (c > 10) bad('CGPA cannot be above 10.'); const f = FF.$('f').value, m = f === 'mumbai' ? c => 7.1 * c + 11 : c => c * +f, back = f === 'mumbai' ? p => (p - 11) / 7.1 : p => p / +f;
    return big('Percentage', FF.fmt(Math.min(100, m(c)), 2) + '%') + FF.row(FF.nn('p') + '% back to CGPA', FF.fmt(back(FF.nn('p')), 2)) + FF.msg('warn', 'Check which formula your university or employer accepts.');
  });
})();
