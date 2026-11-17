const { compute, newRegimeTax, oldRegimeTax } = require('./engine.js');
const assert = require('assert');

// New regime: 12L gross -> taxable 11.25L -> rebate makes tax 0
assert.strictEqual(newRegimeTax(1125000), 0);
// Exactly 12L taxable -> 0
assert.strictEqual(newRegimeTax(1200000), 0);
// 13L gross -> taxable 12.25L -> marginal relief caps at 25,000 (+4% cess = 26,000)
assert.strictEqual(newRegimeTax(1225000), 26000);
// 25L taxable: 20k+40k+60k+80k+100k = 300k up to 20L; 20-24L 25% = 100k; 24-25L 30% = 30k
// total 330000 hmm recompute below
const t = 20000 + 40000 + 60000 + 80000 + 100000 + 30000 + 0; // up to 25L
assert.strictEqual(newRegimeTax(2500000), Math.round(t * 1.04));
// Old regime: 5L taxable -> tax 12,500 -> rebate -> 0
assert.strictEqual(oldRegimeTax(500000), 0);
// Old regime: 10L taxable -> 12,500 + 100,000 = 112,500 (+cess)
assert.strictEqual(oldRegimeTax(1000000), Math.round(112500 * 1.04));
// Full compute sanity: 12L gross, 40% basic, PF on actual basic
const r = compute({ grossAnnual: 1200000, basicPct: 40, pfCapped: false, profTaxAnnual: 2400, other80c: 0, d80: 0, otherDed: 0 });
assert.strictEqual(r.newRegime.tax, 0);
assert.strictEqual(r.pfAnnual, 57600);
assert.strictEqual(r.newRegime.monthly, Math.round((1200000 - 57600 - 2400) / 12));
// Fresher at 3.53 LPA: no tax in either regime
const f = compute({ grossAnnual: 353000, basicPct: 40, pfCapped: true, profTaxAnnual: 0, other80c: 0, d80: 0, otherDed: 0 });
assert.strictEqual(f.newRegime.tax, 0);
assert.strictEqual(f.oldRegime.tax, 0);
console.log('all tests passed');
