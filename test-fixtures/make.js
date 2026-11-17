const { PDFDocument, StandardFonts, rgb } = require('/home/claude/libs/node_modules/pdf-lib');
const fs = require('fs');
(async () => {
  // text pdf 3 pages
  let d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) { const p = d.addPage([595, 842]); p.drawText('Page ' + i + ' hello', { x: 50, y: 750, size: 30, font: f }); }
  fs.writeFileSync('three.pdf', await d.save());
  d = await PDFDocument.create(); d.addPage([612, 792]).drawText('Second doc', { x: 50, y: 700, size: 24, font: await d.embedFont(StandardFonts.Helvetica) });
  fs.writeFileSync('one.pdf', await d.save());
  fs.writeFileSync('broken.pdf', 'not a pdf at all');
})();
