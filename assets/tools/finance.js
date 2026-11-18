/* Money calculators. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH;
  // helper: a calculator whose result re-renders on every input
  const calc = (def, compute) => FF.tool(Object.assign({ cat: 'finance' }, def, {
    html: H.card(def.fields) + H.out('res'),
    init(root) {
      const out = FF.$('res');
      FF.live(root, () => { try { out.innerHTML = compute(); } catch (e) { out.innerHTML = FF.msg('err', e.userMsg || 'Please check the numbers you entered.'); } });
    }
  }));
  const bad = m => { throw Object.assign(new Error(m), { userMsg: m }); };
  const big = (label, v) => '<div class="opt best"><div class="tag">' + label + '</div><div class="big">' + v + '</div></div>';

  const emiOf = (P, r, n) => { const i = r / 1200; return i === 0 ? P / n : P * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1); };
  calc({
    slug: 'emi-calculator', name: 'EMI Calculator', icon: '🏦', short: 'Monthly EMI, total interest and payoff for any loan.',
    title: 'EMI Calculator: Home, Car & Personal Loan EMI', desc: 'Free EMI calculator. Enter loan amount, interest rate and tenure to see monthly EMI, total interest and total payment.',
    h1: 'EMI Calculator', keywords: ['loan', 'home loan', 'car loan', 'emi', 'interest'],
    fields: H.grid(H.num('principal', 'Loan amount (₹)', 500000, { min: 0 }), H.num('rate', 'Interest rate (% per year)', 9, { min: 0, step: 0.01 }), H.num('years', 'Tenure (years)', 5, { min: 0, step: 0.1 }), H.sel('unit', 'Tenure unit', [['y', 'Years'], ['m', 'Months']], 'y')),
    faq: [['How is EMI calculated?', 'EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), where P is the loan amount, r is the monthly rate (annual rate ÷ 12 ÷ 100) and n is the number of months.'], ['Does this include processing fees?', 'No. It shows principal and interest only. Banks may add processing fees, insurance and taxes.']]
  }, () => {
    const P = FF.nn('principal'), r = FF.nn('rate'), t = FF.nn('years'), n = Math.round(FF.$('unit').value === 'y' ? t * 12 : t);
    if (!P || !n) bad('Enter a loan amount and a tenure.'); if (n > 1200) bad('Tenure is too long.');
    const e = emiOf(P, r, n), tot = e * n;
    return big('Monthly EMI', FF.inr(e)) + FF.row('Total interest', FF.inr(tot - P)) + FF.row('Total payment', FF.inr(tot)) + FF.row('Number of EMIs', n);
  });

  calc({
    slug: 'sip-calculator', name: 'SIP Calculator', icon: '📈', short: 'Future value of a monthly SIP at an expected return.',
    title: 'SIP Calculator: Mutual Fund SIP Returns', desc: 'Free SIP calculator. See how much a monthly investment can grow to at your expected annual return. Estimate only, returns are not guaranteed.',
    h1: 'SIP Calculator', keywords: ['mutual fund', 'invest', 'sip', 'returns'],
    fields: H.grid(H.num('amt', 'Monthly investment (₹)', 5000, { min: 0 }), H.num('rate', 'Expected return (% per year)', 12, { min: 0, step: 0.1 }), H.num('years', 'Period (years)', 10, { min: 0, step: 0.5 })),
    faq: [['Are SIP returns guaranteed?', 'No. Market-linked returns vary. This shows what happens if the return you enter is earned every year.'], ['Which formula is used?', 'FV = P × ((1+i)^n − 1) ÷ i × (1+i), with i the monthly rate and payments at the start of each month.']]
  }, () => {
    const P = FF.nn('amt'), r = FF.nn('rate'), n = Math.round(FF.nn('years') * 12), i = r / 1200;
    if (!P || !n) bad('Enter a monthly amount and a period.'); if (n > 1200) bad('Period is too long.');
    const fv = i === 0 ? P * n : P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i), inv = P * n;
    return big('Estimated value', FF.inr(fv)) + FF.row('You invest', FF.inr(inv)) + FF.row('Estimated gain', FF.inr(fv - inv)) + FF.msg('warn', 'Estimate only. Actual returns will differ.');
  });

  calc({
    slug: 'compound-interest-calculator', name: 'Compound Interest Calculator', icon: '🧮', short: 'Growth of a lump sum with compounding.',
    title: 'Compound Interest Calculator', desc: 'Free compound interest calculator. Enter principal, rate, time and compounding frequency to see the final amount and interest earned.',
    h1: 'Compound Interest Calculator', keywords: ['interest', 'compounding', 'growth'],
    fields: H.grid(H.num('p', 'Principal (₹)', 100000, { min: 0 }), H.num('rate', 'Rate (% per year)', 8, { min: 0, step: 0.01 }), H.num('years', 'Time (years)', 5, { min: 0, step: 0.1 }), H.sel('freq', 'Compounded', [[1, 'Yearly'], [2, 'Half-yearly'], [4, 'Quarterly'], [12, 'Monthly'], [365, 'Daily']], 4)),
    faq: [['What is the formula?', 'A = P × (1 + r/n)^(n×t), where n is how many times interest compounds per year.']]
  }, () => {
    const P = FF.nn('p'), r = FF.nn('rate') / 100, t = FF.nn('years'), n = +FF.$('freq').value;
    if (!P || !t) bad('Enter a principal and a time period.');
    const A = P * Math.pow(1 + r / n, n * t);
    return big('Final amount', FF.inr(A)) + FF.row('Interest earned', FF.inr(A - P)) + FF.row('Principal', FF.inr(P));
  });

  calc({
    slug: 'simple-interest-calculator', name: 'Simple Interest Calculator', icon: '➗', short: 'Interest = P × R × T ÷ 100.',
    title: 'Simple Interest Calculator', desc: 'Free simple interest calculator. Enter principal, rate and time to get the interest and total amount.',
    h1: 'Simple Interest Calculator', keywords: ['interest', 'si'],
    fields: H.grid(H.num('p', 'Principal (₹)', 100000, { min: 0 }), H.num('rate', 'Rate (% per year)', 8, { min: 0, step: 0.01 }), H.num('years', 'Time (years)', 3, { min: 0, step: 0.1 })),
    faq: [['What is the formula?', 'Simple interest = P × R × T ÷ 100, with time in years.']]
  }, () => {
    const P = FF.nn('p'), R = FF.nn('rate'), T = FF.nn('years'); if (!P || !T) bad('Enter a principal and a time period.');
    const si = P * R * T / 100; return big('Simple interest', FF.inr(si)) + FF.row('Total amount', FF.inr(P + si));
  });

  calc({
    slug: 'fd-calculator', name: 'FD Calculator', icon: '🏧', short: 'Fixed deposit maturity amount.',
    title: 'FD Calculator: Fixed Deposit Maturity Amount', desc: 'Free fixed deposit calculator. See the maturity amount and interest for your FD with quarterly compounding, the usual bank practice.',
    h1: 'FD Calculator', keywords: ['fixed deposit', 'fd', 'bank', 'maturity'],
    fields: H.grid(H.num('p', 'Deposit (₹)', 100000, { min: 0 }), H.num('rate', 'Interest rate (% per year)', 7, { min: 0, step: 0.01 }), H.num('years', 'Tenure (years)', 3, { min: 0, step: 0.1 }), H.sel('freq', 'Interest compounded', [[4, 'Quarterly'], [12, 'Monthly'], [2, 'Half-yearly'], [1, 'Yearly']], 4)),
    faq: [['Is FD interest taxable?', 'Yes, interest is added to your income and taxed at your slab. Banks may deduct TDS above a limit. This tool does not compute tax.']]
  }, () => {
    const P = FF.nn('p'), r = FF.nn('rate') / 100, t = FF.nn('years'), n = +FF.$('freq').value; if (!P || !t) bad('Enter a deposit and a tenure.');
    const A = P * Math.pow(1 + r / n, n * t); return big('Maturity amount', FF.inr(A)) + FF.row('Interest earned', FF.inr(A - P));
  });

  calc({
    slug: 'cagr-calculator', name: 'CAGR Calculator', icon: '📊', short: 'Compound annual growth rate between two values.',
    title: 'CAGR Calculator', desc: 'Free CAGR calculator. Find the compound annual growth rate from a starting value, ending value and number of years.',
    h1: 'CAGR Calculator', keywords: ['growth rate', 'investment', 'cagr'],
    fields: H.grid(H.num('s', 'Starting value', 100000, { min: 0 }), H.num('e', 'Ending value', 200000, { min: 0 }), H.num('years', 'Years', 5, { min: 0, step: 0.1 })),
    faq: [['What is the CAGR formula?', 'CAGR = (Ending ÷ Starting)^(1 ÷ years) − 1.']]
  }, () => {
    const s = FF.nn('s'), e = FF.nn('e'), t = FF.nn('years'); if (!s || !t) bad('Starting value and years must be above zero.');
    return big('CAGR', FF.fmt((Math.pow(e / s, 1 / t) - 1) * 100, 2) + '%') + FF.row('Total growth', FF.fmt((e / s - 1) * 100, 2) + '%');
  });

  FF.tool({
    slug: 'gst-calculator', name: 'GST Calculator', cat: 'finance', icon: '🧾', short: 'Add or remove GST, with the current India slabs.',
    title: 'GST Calculator India: Add or Remove GST', desc: 'Free GST calculator for India. Add GST to a price or find the price before GST. Slabs 5%, 18%, 40% and special 3% rate.',
    h1: 'GST Calculator', keywords: ['gst', 'tax', 'india', 'cgst', 'sgst', 'igst'],
    html: H.card(H.grid(H.num('amt', 'Amount (₹)', 1000, { min: 0 }), H.num('rate', 'GST rate (%)', 18, { min: 0, step: 0.01 }), H.sel('mode', 'What is the amount?', [['ex', 'Price without GST (add GST)'], ['in', 'Price with GST (remove GST)']], 'ex')), '<label style="margin-top:12px">Quick rates</label>', H.chips('chips', ['0%', '3%', '5%', '18%', '40%'])) + H.out('res'),
    faq: [['What are the GST rates now?', 'Most goods and services are at 5% or 18%, with 40% on a few sin and luxury items, 3% on gold and 0.25% on rough diamonds, effective 22 September 2025. Check the GST portal for your item.'], ['What is CGST and SGST?', 'For sales within one state, GST splits equally into CGST (Centre) and SGST (State). For sales between states it is charged as IGST.']],
    init(root) {
      const out = FF.$('res'), rates = [0, 3, 5, 18, 40];
      const run = () => {
        const a = FF.nn('amt'), r = FF.nn('rate'); if (!a) { out.innerHTML = FF.msg('err', 'Enter an amount.'); return; }
        const ex = FF.$('mode').value === 'ex', base = ex ? a : a / (1 + r / 100), gst = base * r / 100;
        out.innerHTML = big(ex ? 'Total with GST' : 'Price without GST', FF.money(ex ? base + gst : base, 'INR', 2)) + FF.row('GST amount', FF.money(gst, 'INR', 2)) + FF.row('CGST + SGST (each)', FF.money(gst / 2, 'INR', 2)) + FF.row('IGST', FF.money(gst, 'INR', 2)) + FF.row(ex ? 'Price without GST' : 'Price with GST', FF.money(ex ? base : base + gst, 'INR', 2));
      };
      FF.live(root, run);
      FF.chips('chips', i => { FF.$('rate').value = rates[i]; run(); });
    }
  });

  calc({
    slug: 'percentage-calculator', name: 'Percentage Calculator', icon: '％', short: 'X% of Y, what percent, and percent change.',
    title: 'Percentage Calculator', desc: 'Free percentage calculator. Find X percent of a number, what percent one number is of another, and percentage increase or decrease.',
    h1: 'Percentage Calculator', keywords: ['percent', 'percentage', 'increase', 'decrease'],
    fields: H.grid(H.num('a', 'A', 20), H.num('b', 'B', 150)),
    faq: [['How do I find the percent change?', '(New − Old) ÷ Old × 100. A positive result is an increase and a negative one is a decrease.']]
  }, () => {
    const a = FF.n('a'), b = FF.n('b');
    return FF.row(a + '% of ' + b + ' is', '<b>' + FF.fmt(a / 100 * b) + '</b>') + FF.row(a + ' is what % of ' + b, b ? FF.fmt(a / b * 100) + '%' : '–') + FF.row('Change from ' + a + ' to ' + b, a ? FF.fmt((b - a) / Math.abs(a) * 100) + '%' : '–') + FF.row(a + ' increased by ' + b + '%', FF.fmt(a * (1 + b / 100))) + FF.row(a + ' decreased by ' + b + '%', FF.fmt(a * (1 - b / 100)));
  });

  calc({
    slug: 'discount-calculator', name: 'Discount Calculator', icon: '🏷️', short: 'Final price after a percentage discount.',
    title: 'Discount Calculator: Sale Price After Discount', desc: 'Free discount calculator. Enter the original price and discount percent to see the sale price and how much you save.',
    h1: 'Discount Calculator', keywords: ['sale', 'offer', 'discount', 'price'],
    fields: H.grid(H.num('price', 'Original price (₹)', 2000, { min: 0 }), H.num('off', 'Discount (%)', 25, { min: 0, max: 100, step: 0.1 }), H.num('off2', 'Extra discount (%) optional', 0, { min: 0, max: 100, step: 0.1 })),
    faq: [['How are two discounts applied?', 'One after the other. 20% then 10% is not 30%: the second applies to the already reduced price.']]
  }, () => {
    const p = FF.nn('price'), d1 = Math.min(100, FF.nn('off')), d2 = Math.min(100, FF.nn('off2')); if (!p) bad('Enter a price.');
    const f = p * (1 - d1 / 100) * (1 - d2 / 100);
    return big('You pay', FF.money(f, 'INR', 2)) + FF.row('You save', FF.money(p - f, 'INR', 2)) + FF.row('Effective discount', FF.fmt((1 - f / p) * 100, 2) + '%');
  });

  calc({
    slug: 'tip-calculator', name: 'Tip & Bill Split Calculator', icon: '🍽️', short: 'Tip and split a bill between people.',
    title: 'Tip Calculator & Bill Splitter', desc: 'Free tip calculator and bill splitter. Add a tip percentage and divide the total between any number of people.',
    h1: 'Tip & Bill Split Calculator', keywords: ['tip', 'split', 'bill', 'restaurant'],
    fields: H.grid(H.num('bill', 'Bill amount (₹)', 1500, { min: 0 }), H.num('tip', 'Tip (%)', 10, { min: 0, step: 0.5 }), H.num('ppl', 'People', 3, { min: 1, int: true })),
    faq: [['How much should I tip?', 'It varies by place. In India 5 to 10% is common where service charge is not already added. Check your bill first.']]
  }, () => {
    const b = FF.nn('bill'), t = FF.nn('tip'), p = Math.max(1, Math.floor(FF.n('ppl'))); if (!b) bad('Enter the bill amount.');
    const tip = b * t / 100, tot = b + tip;
    return big('Each person pays', FF.money(tot / p, 'INR', 2)) + FF.row('Tip', FF.money(tip, 'INR', 2)) + FF.row('Total', FF.money(tot, 'INR', 2));
  });
})();
