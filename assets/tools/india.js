/* India tools. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH, bad = m => { throw Object.assign(new Error(m), { userMsg: m }); };
  const big = (label, v, best) => '<div class="opt' + (best === false ? '' : ' best') + '"><div class="tag">' + label + '</div><div class="big">' + v + '</div></div>';
  const live = (def, compute) => FF.tool(Object.assign({ cat: 'india' }, def, {
    html: H.card(def.fields) + H.out('res'),
    init(root) { const out = FF.$('res'); FF.live(root, () => { try { out.innerHTML = compute(); } catch (e) { out.innerHTML = FF.msg('err', e.userMsg || 'Please check the numbers you entered.'); } }); }
  }));
  const RULES = 'Rules last verified in November 2026. Check the Income Tax Department site before filing.';

  FF.tool({
    slug: 'in-hand-salary-calculator', name: 'In-Hand Salary Calculator', cat: 'india', icon: '💼', short: 'Take-home pay under new and old tax regime, FY 2026-27.',
    title: 'In-Hand Salary Calculator India FY 2026-27 (New & Old Regime)', desc: 'Work out monthly take-home salary from CTC for FY 2026-27 under the new and old tax regime, with PF, professional tax and deductions.',
    h1: 'In-Hand Salary Calculator (India)', keywords: ['salary', 'take home', 'ctc', 'in hand', 'tax', 'regime', 'pf', 'income tax'],
    html: H.card(H.grid(H.num('gross', 'Annual salary / CTC (₹)', 600000, { min: 0 }), H.num('basic', 'Basic pay (% of salary)', 40, { min: 1, max: 100 }), H.num('pt', 'Professional tax per year (₹)', 2400, { min: 0 }), H.num('c80', 'Other 80C (₹, old regime)', 0, { min: 0 }), H.num('d80', '80D health insurance (₹, old regime)', 0, { min: 0 }), H.num('oth', 'Other old-regime deductions (₹)', 0, { min: 0 }), H.chk('pfcap', 'PF on ₹15,000 basic cap', true, { full: true }))) + H.out('res'),
    faq: [['Which regime is better?', 'The calculator shows both. The new regime wins for most people without large deductions. The old regime can win if you claim high HRA, home loan interest and 80C together.'], ['What is assumed?', 'Standard deduction of ₹75,000 (new) and ₹50,000 (old), 4% cess, employee PF at 12% of basic, rebate and marginal relief. Surcharge above ₹50 lakh is not modelled. ' + RULES]],
    init(root) {
      const out = FF.$('res');
      FF.live(root, () => {
        if (!FF.has('gross') || FF.n('gross') <= 0) { out.innerHTML = FF.msg('warn', 'Enter your annual salary.'); return; }
        const r = FFTax.compute({ grossAnnual: FF.nn('gross'), basicPct: Math.min(100, FF.nn('basic') || 40), pfCapped: FF.$('pfcap').checked, profTaxAnnual: FF.nn('pt'), other80c: FF.nn('c80'), d80: FF.nn('d80'), otherDed: FF.nn('oth') });
        const box = (k, t, key) => { const o = r[k], best = r.better === key; return '<div class="opt' + (best ? ' best' : '') + '"><div class="tag">' + (best ? 'Better for you' : '') + '</div><b>' + t + '</b><div class="big">' + FF.inr(Math.max(0, o.monthly)) + '<span style="font-size:.9rem;font-weight:400"> /month</span></div>' + FF.row('Taxable income', FF.inr(o.taxable)) + FF.row('Tax per year', FF.inr(o.tax)) + '</div>'; };
        const save = Math.abs(r.newRegime.tax - r.oldRegime.tax);
        out.innerHTML = '<div class="res">' + box('newRegime', 'New regime', 'new') + box('oldRegime', 'Old regime', 'old') + '</div><p class="sub" style="margin-top:12px">Employee PF: ' + FF.inr(r.pfAnnual) + ' a year. ' + (save ? 'The ' + r.better + ' regime saves ' + FF.inr(save) + ' a year.' : 'Both regimes give the same tax.') + ' Estimate only. ' + RULES + '</p>';
      });
    }
  });

  live({
    slug: 'gratuity-calculator', name: 'Gratuity Calculator', icon: '🎁', short: 'Gratuity from last salary and years of service.',
    title: 'Gratuity Calculator India: Formula 15/26 × Salary × Years', desc: 'Calculate gratuity in India using the formula last drawn basic + DA × 15 ÷ 26 × years of service. Free and instant.',
    h1: 'Gratuity Calculator (India)', keywords: ['gratuity', 'resign', 'retire', 'service', 'basic'],
    fields: H.grid(H.num('b', 'Last drawn basic + DA per month (₹)', 40000, { min: 0 }), H.num('y', 'Years of service', 5, { min: 0, int: true }), H.num('m', 'Extra months', 0, { min: 0, max: 11, int: true })),
    faq: [['What is the gratuity formula?', 'Gratuity = last drawn monthly basic + DA × 15 ÷ 26 × completed years of service. Six months or more in the last year is rounded up to a full year.'], ['Who gets gratuity?', 'Usually employees with 5 years of continuous service in an organisation covered by the Payment of Gratuity Act. Rules for fixed-term staff and exceptions differ, so check your employer policy.']]
  }, () => {
    const yrs = Math.floor(FF.nn('y')), m = Math.min(11, Math.floor(FF.nn('m'))), y = yrs + (m >= 6 ? 1 : 0), b = FF.nn('b'); if (!b) bad('Enter your last drawn basic salary.');
    return big('Estimated gratuity', FF.inr(15 / 26 * b * y)) + FF.row('Years counted', y) + (yrs < 5 ? FF.msg('warn', 'Gratuity usually needs at least 5 years of continuous service (some court rulings count 4 years 240 days).') : '') + FF.msg('ok', 'Tax-free limit for gratuity is ₹20 lakh (private sector). Check current rules.');
  });

  live({
    slug: 'hra-exemption-calculator', name: 'HRA Exemption Calculator', icon: '🏠', short: 'Tax-free HRA under the old regime.',
    title: 'HRA Exemption Calculator India (Old Regime)', desc: 'Calculate how much House Rent Allowance is tax-free using the lowest of actual HRA, rent minus 10% of basic, and 40% or 50% of basic.',
    h1: 'HRA Exemption Calculator', keywords: ['hra', 'rent', 'house rent allowance', 'exemption', '10(13A)'],
    fields: H.grid(H.num('b', 'Basic + DA per month (₹)', 30000, { min: 0 }), H.num('h', 'HRA received per month (₹)', 12000, { min: 0 }), H.num('r', 'Rent paid per month (₹)', 15000, { min: 0 }), H.sel('c', 'City', [[0.5, 'Metro: Delhi, Mumbai, Kolkata, Chennai (50%)'], [0.4, 'Other city (40%)']], 0.4)),
    faq: [['Does HRA exemption work in the new regime?', 'No. HRA exemption is only available under the old tax regime.'], ['Which cities are metro for HRA?', 'Delhi, Mumbai, Kolkata and Chennai get the 50% rate. Others use 40%. Check the latest rules for your city.']]
  }, () => {
    const b = FF.nn('b') * 12, h = FF.nn('h') * 12, rent = FF.nn('r') * 12, pct = parseFloat(FF.$('c').value); if (!b) bad('Enter your basic salary.');
    const c = Math.max(0, rent - 0.1 * b), d = pct * b, ex = Math.min(h, c, d);
    return big('Tax-free HRA per year', FF.inr(ex)) + FF.row('Taxable HRA per year', FF.inr(h - ex)) + FF.row('HRA received', FF.inr(h)) + FF.row('Rent − 10% of basic', FF.inr(c)) + FF.row(pct * 100 + '% of basic', FF.inr(d)) + (rent > 100000 ? FF.msg('warn', 'Rent above ₹1 lakh a year needs your landlord PAN.') : '');
  });

  /* ---- GSTIN ---- */
  const STATES = { '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory', '99': 'Centre Jurisdiction' };
  const ENTITY = { P: 'Individual', C: 'Company', H: 'Hindu Undivided Family', F: 'Firm or LLP', A: 'Association of Persons', T: 'Trust', B: 'Body of Individuals', L: 'Local Authority', J: 'Artificial Juridical Person', G: 'Government' };
  const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const gstinCheck = s => { let sum = 0; for (let i = 0; i < 14; i++) { const v = CH.indexOf(s[i]) * (i % 2 ? 2 : 1); sum += Math.floor(v / 36) + (v % 36); } return CH[(36 - (sum % 36)) % 36]; };
  live({
    slug: 'gstin-validator', name: 'GSTIN Validator', icon: '✅', short: 'Check a GST number format, state and checksum.',
    title: 'GSTIN Validator: Check GST Number Format & Checksum', desc: 'Check whether a GSTIN is correctly formed: state code, embedded PAN, entity type and checksum digit. Does not confirm the business is registered.',
    h1: 'GSTIN Validator', keywords: ['gstin', 'gst number', 'verify', 'validate', 'check'],
    fields: H.text('g', 'GSTIN (15 characters)', '', { ph: '27AAPFU0939F1ZV', upper: true, max: 15, mono: true, full: true }),
    faq: [['Does this confirm the business exists?', 'No. It checks the format and checksum only, which catches typing mistakes and many fake numbers. To confirm a business is registered, use the official GST portal search.'], ['How is the checksum worked out?', 'The 15th character is calculated from the first 14 using a base-36 weighted formula. If the characters do not produce it, the number has a typo.']]
  }, () => {
    const g = FF.$('g').value.trim().toUpperCase(); if (!g) return FF.msg('warn', 'Enter a 15-character GSTIN.');
    if (g.length !== 15) return FF.msg('err', 'A GSTIN has exactly 15 characters. You entered ' + g.length + '.');
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return FF.msg('err', 'The format is not right. It should look like 2 digits, 5 letters, 4 digits, 1 letter, 1 letter or digit, the letter Z, and 1 check character.');
    const st = STATES[g.slice(0, 2)]; if (!st) return FF.msg('err', 'State code ' + g.slice(0, 2) + ' is not a valid GST state code.');
    const ok = gstinCheck(g) === g[14], pan = g.slice(2, 12);
    return (ok ? FF.msg('ok', 'Format and checksum are valid.') : FF.msg('err', 'Checksum does not match. The last character should be ' + gstinCheck(g) + ', so there is probably a typo.')) + FF.row('State', st) + FF.row('PAN inside', pan) + FF.row('Entity type', ENTITY[pan[3]] || 'Unknown') + FF.row('Registration number', g[12]) + FF.msg('warn', 'This does not prove the business is registered. Confirm on the official GST portal.');
  });

  live({
    slug: 'pan-validator', name: 'PAN Format Checker', icon: '🪪', short: 'Check PAN structure and holder type.',
    title: 'PAN Number Format Checker: Validate PAN Structure', desc: 'Check whether a PAN follows the correct 10-character format and see what holder type the fourth letter means. Does not verify ownership.',
    h1: 'PAN Format Checker', keywords: ['pan', 'pan card', 'validate', 'check', 'format'],
    fields: H.text('p', 'PAN (10 characters)', '', { ph: 'ABCPE1234F', upper: true, max: 10, mono: true, full: true }),
    faq: [['Can this tell if a PAN is real?', 'No. It checks only the structure: 5 letters, 4 digits, 1 letter. Verifying a PAN against a person needs the official Income Tax portal.']]
  }, () => {
    const p = FF.$('p').value.trim().toUpperCase(); if (!p) return FF.msg('warn', 'Enter a 10-character PAN.');
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(p)) return FF.msg('err', 'PAN must be 5 letters, then 4 digits, then 1 letter, like ABCPE1234F.');
    if (!ENTITY[p[3]]) return FF.msg('err', 'The 4th character ' + p[3] + ' is not a valid holder type.');
    return FF.msg('ok', 'The structure is valid.') + FF.row('Holder type', ENTITY[p[3]]) + FF.row(p[3] === 'P' ? 'Surname starts with' : 'Name starts with', p[4]) + FF.msg('warn', 'This checks the pattern only. It cannot confirm who owns the PAN.');
  });

  /* ---- PDF generators (Latin text only, so amounts use "Rs.") ---- */
  const ascii = t => /^[\x20-\x7E\n\r\t]*$/.test(t);
  const rs = n => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const wrapText = (font, text, size, maxW) => { const out = []; String(text).split('\n').forEach(par => { let line = ''; par.split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); }); return out; };
  const words = n => { const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'], two = x => x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''), three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + two(x % 100); n = Math.floor(n); if (!n) return 'Zero'; let s = ''; [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']].forEach(([v, nm]) => { if (n >= v) { s += three(Math.floor(n / v)) + ' ' + nm + ' '; n %= v; } }); return (s + (n ? three(n) : '')).trim(); };
  const pdfDoc = async () => { const L = await FF.lib('pdflib'), d = await L.PDFDocument.create(); return { L, d, f: await d.embedFont(L.StandardFonts.Helvetica), b: await d.embedFont(L.StandardFonts.HelveticaBold) }; };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  FF.tool({
    slug: 'rent-receipt-generator', name: 'Rent Receipt Generator', cat: 'india', icon: '🧾', short: 'Monthly rent receipts as a PDF, for HRA claims.',
    title: 'Rent Receipt Generator for HRA: Free PDF, Multiple Months', desc: 'Create monthly rent receipts as a PDF for HRA tax claims. Add landlord name, PAN, address and amount. Free and private, nothing uploaded.',
    h1: 'Rent Receipt Generator', keywords: ['rent receipt', 'hra', 'landlord', 'tenant', 'pdf', 'receipt'],
    html: H.card(H.grid(H.text('tenant', 'Tenant name', ''), H.text('landlord', 'Landlord name', ''), H.text('lpan', 'Landlord PAN (needed if rent > ₹1 lakh/year)', '', { upper: true, max: 10 }), H.num('rent', 'Monthly rent (₹)', 15000, { min: 1 }), H.text('addr', 'Rented property address', '', { full: true }), H.sel('sm', 'First month', MONTHS.map((m, i) => [i, m]), 3), H.num('sy', 'Year', new Date().getFullYear(), { int: true, min: 2000, max: 2100 }), H.num('cnt', 'Number of months', 12, { int: true, min: 1, max: 36 }), H.sel('mode', 'Paid by', [['Bank transfer', 'Bank transfer'], ['UPI', 'UPI'], ['Cheque', 'Cheque'], ['Cash', 'Cash']], 'Bank transfer')), '<div class="btns">' + H.btn('go', 'Create receipts PDF') + '</div>') + H.out('out'),
    faq: [['Do I need a landlord PAN?', 'If total rent in a year is over ₹1 lakh, your employer may ask for the landlord PAN to allow HRA exemption.'], ['Is a revenue stamp needed?', 'Customarily a ₹1 revenue stamp is stuck on cash receipts above ₹5,000. Many employers accept signed receipts for bank payments without one. Ask your employer.'], ['Why English letters only?', 'The PDF uses a standard font that supports English letters and numbers. Write names in English.']],
    init() {
      const out = FF.$('out'), btn = FF.$('go');
      btn.onclick = FF.guard(btn, out, async () => {
        const v = id => FF.$(id).value.trim(), rent = FF.n('rent'), cnt = Math.max(1, Math.min(36, Math.floor(FF.n('cnt'))));
        if (!v('tenant') || !v('landlord') || !v('addr')) { out.innerHTML = FF.msg('err', 'Enter tenant name, landlord name and the property address.'); return; }
        if (![v('tenant'), v('landlord'), v('addr'), v('lpan')].every(ascii)) { out.innerHTML = FF.msg('err', 'Please type names and address in English letters. Other scripts are not supported in the PDF.'); return; }
        if (!(rent > 0)) { out.innerHTML = FF.msg('err', 'Enter the monthly rent.'); return; }
        if (v('lpan') && !/^[A-Z]{5}\d{4}[A-Z]$/.test(v('lpan').toUpperCase())) { out.innerHTML = FF.msg('err', 'Landlord PAN format looks wrong. It should look like ABCPE1234F, or leave it blank.'); return; }
        const { L, d, f, b } = await pdfDoc(); let m = +FF.$('sm').value, y = Math.round(FF.n('sy'));
        for (let i = 0; i < cnt; i++) {
          const p = d.addPage([595.28, 420]), W = 595.28, last = new Date(y, m + 1, 0).getDate(); let yy = 360;
          const t = (s, x, size, font, col) => p.drawText(s, { x, y: yy, size, font: font || f, color: col || L.rgb(.1, .1, .1) });
          p.drawRectangle({ x: 30, y: 30, width: W - 60, height: 360, borderColor: L.rgb(.6, .6, .6), borderWidth: 1 });
          t('RENT RECEIPT', W / 2 - b.widthOfTextAtSize('RENT RECEIPT', 18) / 2, 18, b); yy -= 34;
          t('Receipt for ' + MONTHS[m] + ' ' + y, 50, 12, b); t('Date: ' + last + ' ' + MONTHS[m] + ' ' + y, W - 50 - f.widthOfTextAtSize('Date: ' + last + ' ' + MONTHS[m] + ' ' + y, 11), 11); yy -= 30;
          const body = 'Received a sum of ' + rs(rent) + ' (Rupees ' + words(rent) + ' only) from ' + v('tenant') + ' towards rent for the month of ' + MONTHS[m] + ' ' + y + ' for the residential property at: ' + v('addr') + '. Payment mode: ' + FF.$('mode').value + '.';
          wrapText(f, body, 11, W - 100).forEach(l => { t(l, 50, 11); yy -= 17; }); yy -= 12;
          t('Landlord: ' + v('landlord'), 50, 11); yy -= 17; if (v('lpan')) { t('Landlord PAN: ' + v('lpan').toUpperCase(), 50, 11); yy -= 17; }
          p.drawRectangle({ x: 50, y: 70, width: 60, height: 40, borderColor: L.rgb(.7, .7, .7), borderWidth: 0.7 }); p.drawText('Revenue', { x: 58, y: 94, size: 8, font: f, color: L.rgb(.5, .5, .5) }); p.drawText('stamp', { x: 63, y: 83, size: 8, font: f, color: L.rgb(.5, .5, .5) });
          p.drawLine({ start: { x: W - 220, y: 85 }, end: { x: W - 50, y: 85 }, thickness: 0.7, color: L.rgb(.3, .3, .3) }); p.drawText('Landlord signature', { x: W - 220, y: 70, size: 9, font: f, color: L.rgb(.3, .3, .3) });
          m++; if (m > 11) { m = 0; y++; }
        }
        const blob = new Blob([await d.save()], { type: 'application/pdf' }); out.innerHTML = FF.row('Receipts', cnt) + FF.row('File size', FF.kb(blob.size)) + FF.msg('warn', 'Print, sign and (if paying cash above ₹5,000) add a revenue stamp. Only issue receipts for rent actually paid.'); FF.dl(out, blob, 'rent-receipts.pdf', 'Download PDF');
      });
    }
  });

  FF.tool({
    slug: 'invoice-generator', name: 'Invoice Generator', cat: 'india', icon: '🧾', short: 'Create a clean invoice PDF, with optional GST.',
    title: 'Free Invoice Generator: Create GST Invoice PDF', desc: 'Create a professional invoice PDF with items, optional GST, and notes. Free, no watermark, nothing uploaded.',
    h1: 'Invoice Generator', keywords: ['invoice', 'bill', 'gst invoice', 'freelance', 'pdf'],
    html: H.card(H.grid(H.text('from', 'Your name / business', ''), H.text('fgst', 'Your GSTIN (optional)', '', { upper: true, max: 15 }), H.text('to', 'Bill to (client name)', ''), H.text('inv', 'Invoice number', 'INV-001'), H.text('date', 'Invoice date', new Date().toISOString().slice(0, 10), { type: 'date' }), H.num('gst', 'GST %', 0, { min: 0, max: 40, step: 0.01 }), H.area('items', 'Items, one per line: description | quantity | rate', 'Website design | 1 | 15000\nHosting (12 months) | 1 | 3000', 5, { mono: true }), H.area('notes', 'Notes / payment details (optional)', '', 3)), '<div class="btns">' + H.btn('go', 'Create invoice PDF') + '</div>') + H.out('out'),
    faq: [['Is this a valid tax invoice?', 'It contains the usual fields, but a GST tax invoice has specific legal requirements. Check with your accountant if you are registered for GST.'], ['Why English letters only?', 'The PDF uses a standard font that supports English letters and numbers. Write names in English.']],
    init() {
      const out = FF.$('out'), btn = FF.$('go');
      btn.onclick = FF.guard(btn, out, async () => {
        const v = id => FF.$(id).value.trim(); if (!v('from') || !v('to')) { out.innerHTML = FF.msg('err', 'Enter your name and the client name.'); return; }
        const rows = []; for (const ln of v('items').split('\n').filter(l => l.trim())) { const p = ln.split('|').map(s => s.trim()); const q = parseFloat(p[1]), r = parseFloat(p[2]); if (p.length < 3 || !(q > 0) || !(r >= 0)) { out.innerHTML = FF.msg('err', 'Line "' + FF.esc(ln) + '" should look like: description | quantity | rate'); return; } rows.push([p[0], q, r]); }
        if (!rows.length) { out.innerHTML = FF.msg('err', 'Add at least one item.'); return; } if (rows.length > 25) { out.innerHTML = FF.msg('err', 'Please keep to 25 items.'); return; }
        if (![v('from'), v('to'), v('inv'), v('notes'), v('fgst'), v('items')].every(ascii)) { out.innerHTML = FF.msg('err', 'Please type in English letters. Other scripts are not supported in the PDF.'); return; }
        const { L, d, f, b } = await pdfDoc(), p = d.addPage([595.28, 841.89]), W = 595.28, g = FF.nn('gst'); let y = 790; const T = (s, x, o) => p.drawText(String(s), Object.assign({ x, y, size: 10, font: f, color: L.rgb(.1, .1, .1) }, o)), R = (s, xr, o) => { o = o || {}; const fn = o.font || f, sz = o.size || 10; T(s, xr - fn.widthOfTextAtSize(String(s), sz), o); };
        T('INVOICE', 40, { size: 24, font: b }); R('No: ' + v('inv'), 555, { font: b }); y -= 16; R('Date: ' + v('date'), 555); y -= 30;
        T('From', 40, { font: b, size: 9, color: L.rgb(.4, .4, .4) }); T('Bill to', 320, { font: b, size: 9, color: L.rgb(.4, .4, .4) }); y -= 15; T(v('from'), 40, { font: b, size: 12 }); T(v('to'), 320, { font: b, size: 12 }); y -= 14; if (v('fgst')) T('GSTIN: ' + v('fgst').toUpperCase(), 40); y -= 30;
        p.drawRectangle({ x: 40, y: y - 6, width: 515, height: 22, color: L.rgb(.93, .94, .96) }); T('Description', 46, { font: b }); R('Qty', 360, { font: b }); R('Rate', 450, { font: b }); R('Amount', 550, { font: b }); y -= 24; let sub = 0;
        rows.forEach(([desc, q, r]) => { const amt = q * r; sub += amt; const lines = wrapText(f, desc, 10, 270); lines.forEach((l, i) => { T(l, 46); if (i === 0) { R(q, 360); R(r.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 450); R(amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 550); } y -= 14; }); y -= 4; if (y < 140) y = 140; });
        p.drawLine({ start: { x: 40, y: y + 4 }, end: { x: 555, y: y + 4 }, thickness: .6, color: L.rgb(.7, .7, .7) }); y -= 16; R('Subtotal', 450); R(rs(sub), 550); y -= 15; const gt = sub * g / 100; if (g) { R('GST @ ' + g + '%', 450); R(rs(gt), 550); y -= 15; } R('Total', 450, { font: b, size: 12 }); R(rs(sub + gt), 550, { font: b, size: 12 }); y -= 18; T('Amount in words: Rupees ' + words(Math.round(sub + gt)) + ' only', 40, { size: 9 }); y -= 28;
        if (v('notes')) { T('Notes', 40, { font: b, size: 9, color: L.rgb(.4, .4, .4) }); y -= 14; wrapText(f, v('notes'), 10, 500).forEach(l => { T(l, 40); y -= 13; }); }
        const blob = new Blob([await d.save()], { type: 'application/pdf' }); out.innerHTML = FF.row('Total', rs(sub + gt)) + FF.row('File size', FF.kb(blob.size)); FF.dl(out, blob, 'invoice-' + FF.base(v('inv')) + '.pdf', 'Download PDF');
      });
    }
  });
})();
