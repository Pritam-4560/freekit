/* India income tax engine, FY 2026-27 (new and old regime). Surcharge not modelled. */
(function(g){
// India in-hand salary engine, FY 2026-27 (AY 2027-28). Rules last verified Nov 2026.
// Surcharge (income above 50 lakh) is not modelled.
const CESS = 0.04;

function slabTax(taxable, slabs) {
  // slabs: [[upperLimit, rate], ...] last upperLimit = Infinity
  let tax = 0, lower = 0;
  for (const [upper, rate] of slabs) {
    if (taxable > lower) tax += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

const NEW_SLABS = [
  [400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15],
  [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30],
];
const OLD_SLABS = [[250000, 0], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]];

function newRegimeTax(taxable) {
  taxable = Math.max(0, taxable);
  let tax = slabTax(taxable, NEW_SLABS);
  if (taxable <= 1200000) tax = Math.max(0, tax - Math.min(tax, 60000));
  else tax = Math.min(tax, taxable - 1200000); // marginal relief
  return Math.round(tax * (1 + CESS));
}

function oldRegimeTax(taxable) {
  taxable = Math.max(0, taxable);
  let tax = slabTax(taxable, OLD_SLABS);
  if (taxable <= 500000) tax = Math.max(0, tax - Math.min(tax, 12500));
  return Math.round(tax * (1 + CESS));
}

function compute(i) {
  const gross = i.grossAnnual;
  const basic = gross * (i.basicPct / 100);
  const pfAnnual = i.pfCapped ? Math.min(basic, 15000 * 12) * 0.12 : basic * 0.12;
  const pt = i.profTaxAnnual;

  // New regime: standard deduction 75,000 only (no PF/80C, no professional tax deduction)
  const newTaxable = gross - 75000;
  const newTax = newRegimeTax(newTaxable);

  // Old regime: std 50,000, professional tax, 80C (incl. employee PF, cap 1.5L), 80D, other
  const c80 = Math.min(150000, pfAnnual + i.other80c);
  const oldTaxable = gross - 50000 - pt - c80 - i.d80 - i.otherDed;
  const oldTax = oldRegimeTax(oldTaxable);

  const inhand = (tax) => Math.round((gross - pfAnnual - pt - tax) / 12);
  return {
    pfAnnual: Math.round(pfAnnual),
    newRegime: { taxable: Math.max(0, newTaxable), tax: newTax, monthly: inhand(newTax) },
    oldRegime: { taxable: Math.max(0, oldTaxable), tax: oldTax, monthly: inhand(oldTax) },
    better: newTax <= oldTax ? 'new' : 'old',
  };
}



g.FFTax = { compute: compute, newRegimeTax: newRegimeTax, oldRegimeTax: oldRegimeTax };
})(typeof window !== 'undefined' ? window : globalThis);
