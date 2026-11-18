/* PDF tools. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH;
  const faqPdf = [['Is my PDF uploaded?', 'No. PDFs are processed in your browser and never leave your device.'], ['Can it open password-protected PDFs?', 'No. Remove the password in the app that made the file, then try again.']];
  const errMsg = e => e && e.name === 'PasswordException' ? 'This PDF is password-protected. Remove the password first.' : e && e.code === 'locked' ? FF.esc(e.fname) + ' is password-protected. Remove the password first.' : e && e.code === 'bad' ? FF.esc(e.fname || 'This file') + ' is not a valid PDF or may be damaged.' : e && e.code === 'big' ? 'This PDF has over 300 pages, which is too many for a browser. Split it first.' : e && e.userMsg ? e.userMsg : null;
  const openLib = async f => { // pdf-lib document
    if (!(await FF.looksPdf(f))) throw { code: 'bad', fname: f.name };
    const L = await FF.lib('pdflib');
    try { return await L.PDFDocument.load(await f.arrayBuffer()); } catch (e) { throw { code: /encrypt/i.test(e.message) ? 'locked' : 'bad', fname: f.name }; }
  };
  const openJs = async f => { if (!(await FF.looksPdf(f))) throw { code: 'bad', fname: f.name }; const j = await FF.lib('pdfjs'); return j.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false }).promise; };
  const pdfBlob = async d => new Blob([await d.save()], { type: 'application/pdf' });
  const run = (btn, out, fn) => FF.guard(btn, out, async () => { try { await fn(); } catch (e) { const m = errMsg(e); if (m) out.innerHTML = FF.msg('err', m); else throw e; } });

  // single-PDF tool scaffold
  const pdfTool = (def, o) => FF.tool(Object.assign({ cat: 'pdf', faq: faqPdf }, def, {
    html: H.card(H.drop('d', 'Tap to choose a PDF', H.PDF_ACCEPT, false, 'or drag and drop here'), H.files('nm'), o.fields ? '<div style="margin-top:14px">' + o.fields + '</div>' : '', '<div class="btns">' + H.btn('go', o.button) + '</div>') + H.out('out'),
    init(root) {
      let file = null; const out = FF.$('out'), btn = FF.$('go');
      FF.drop('d', { accept: FF.isPdf, onFiles: f => { file = f[0]; out.innerHTML = ''; FF.list(FF.$('nm'), f, { onChange: () => { file = null; } }); } });
      if (o.setup) o.setup(root);
      btn.onclick = run(btn, out, async () => { if (!file) { out.innerHTML = FF.msg('err', 'Choose a PDF first.'); return; } out.innerHTML = FF.msg('ok', 'Working…'); await o.process(file, out); });
    }
  }));
  const done = (out, file, blob, suffix, rows) => { out.innerHTML = (rows || '') + FF.row('File size', FF.kb(blob.size)); FF.dl(out, blob, FF.base(file.name) + suffix + '.pdf', 'Download PDF'); };

  /* ---- compress ---- */
  const CP = [100, 200, 500, 1024, 2048, 5120];
  pdfTool({
    slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️', short: 'Shrink a PDF under a size limit like 200 KB.',
    title: 'Compress PDF to 100 KB, 200 KB, 1 MB: Free & Private', desc: 'Reduce a PDF to a target size like 100 KB, 500 KB or 2 MB for forms and email. Free, no watermark, nothing uploaded.',
    h1: 'Compress PDF', keywords: ['compress', 'reduce', 'shrink', 'pdf', 'kb', 'mb', 'size'],
    howto: ['Choose your PDF.', 'Pick a limit like "Under 500 KB" or type your own.', 'Tap Compress and download.'],
    about: '<p>This tool redraws each page as an image at lower quality until the file fits your limit, so text becomes part of the picture. That gives the smallest files, but text can no longer be selected. Use it for forms and uploads where size matters most.</p>',
    faq: faqPdf.concat([['Why can I not select text after compressing?', 'To reach small sizes, pages are saved as images. If you need selectable text, use a higher size limit or keep the original.']])
  }, {
    button: 'Compress PDF', fields: H.chips('pre', CP.map(k => 'Under ' + (k >= 1024 ? k / 1024 + ' MB' : k + ' KB'))) + H.grid(H.num('max', 'Max size (KB)', 500, { min: 1 }), H.chk('gray', 'Black and white (smaller)', false)),
    setup() { FF.chips('pre', i => { FF.$('max').value = CP[i]; }); },
    async process(file, out) {
      if (!(await FF.looksPdf(file))) throw { code: 'bad', fname: file.name };
      const max = FF.n('max') * 1024; if (!max) { out.innerHTML = FF.msg('err', 'Enter a max size in KB.'); return; }
      if (file.size <= max && !FF.$('gray').checked) { out.innerHTML = FF.msg('ok', 'Your PDF is already ' + FF.kb(file.size) + ', under the limit. No change needed.'); return; }
      const doc = await openJs(file); if (doc.numPages > 300) throw { code: 'big' }; const L = await FF.lib('pdflib');
      out.innerHTML = FF.msg('ok', 'Opening PDF…') + '<div class="progress"><i></i></div>';
      const steps = [[2, .8], [1.6, .7], [1.3, .6], [1.1, .5], [1, .4], [.85, .32], [.7, .26], [.55, .2], [.45, .15], [.35, .1]]; let best = null, last = null;
      for (let si = 0; si < steps.length; si++) {
        const [sc, q] = steps[si]; out.querySelector('.msg').textContent = 'Trying quality level ' + (si + 1) + ' of ' + steps.length + '…';
        const pdf = await L.PDFDocument.create();
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i), v1 = page.getViewport({ scale: 1 }); let s = sc; if (v1.width * v1.height * s * s > FF.MAX_PIX) s = Math.sqrt(FF.MAX_PIX / (v1.width * v1.height));
          const vp = page.getViewport({ scale: s }), cv = FF.canvas(Math.max(1, Math.floor(vp.width)), Math.max(1, Math.floor(vp.height))), cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
          await page.render({ canvasContext: cx, viewport: vp }).promise;
          if (FF.$('gray').checked) { cx.globalCompositeOperation = 'saturation'; cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height); cx.globalCompositeOperation = 'source-over'; }
          const jpg = await pdf.embedJpg(await (await FF.encode(cv, 'jpeg', q)).arrayBuffer()); pdf.addPage([v1.width, v1.height]).drawImage(jpg, { x: 0, y: 0, width: v1.width, height: v1.height });
          page.cleanup(); cv.width = cv.height = 0; out.querySelector('.progress i').style.width = ((si + i / doc.numPages) / steps.length * 100) + '%'; await FF.tick();
        }
        last = await pdfBlob(pdf); if (last.size <= max) { best = last; break; }
      }
      if (!best) out.innerHTML = FF.msg('err', 'Could not get under ' + FF.kb(max) + '. Smallest was ' + FF.kb(last.size) + ' (' + doc.numPages + ' pages). Try a higher limit, black and white, or remove pages first.');
      else done(out, file, best, '-compressed', FF.row('Original', FF.kb(file.size)) + FF.row('Pages', doc.numPages) + (best.size > file.size ? FF.msg('warn', 'The result is larger than your original. Your original already fits better.') : ''));
      doc.destroy();
    }
  });

  /* ---- merge ---- */
  FF.tool({
    slug: 'merge-pdf', name: 'Merge PDF', cat: 'pdf', icon: '➕', short: 'Join several PDFs into one, in your order.',
    title: 'Merge PDF: Combine PDF Files Online, Free', desc: 'Combine multiple PDF files into one document. Reorder before merging. Free, no watermark, nothing uploaded.',
    h1: 'Merge PDF', keywords: ['merge', 'combine', 'join', 'pdf'], faq: faqPdf,
    howto: ['Choose two or more PDFs.', 'Use the arrows to put them in order.', 'Tap Merge and download.'],
    html: H.card(H.drop('d', 'Tap to choose PDFs', H.PDF_ACCEPT, true, 'select several, or drag and drop'), H.files('nm'), '<div class="btns">' + H.btn('go', 'Merge PDFs') + '</div>') + H.out('out'),
    init() {
      const files = [], out = FF.$('out'), btn = FF.$('go');
      FF.drop('d', { accept: FF.isPdf, multiple: true, onFiles: f => { files.push(...f); out.innerHTML = ''; FF.list(FF.$('nm'), files, { reorder: true }); } });
      btn.onclick = run(btn, out, async () => {
        if (files.length < 2) { out.innerHTML = FF.msg('err', 'Choose at least two PDFs.'); return; } out.innerHTML = FF.msg('ok', 'Merging…');
        const L = await FF.lib('pdflib'), pdf = await L.PDFDocument.create();
        for (const f of files) { const src = await openLib(f); (await pdf.copyPages(src, src.getPageIndices())).forEach(p => pdf.addPage(p)); await FF.tick(); }
        const blob = await pdfBlob(pdf); out.innerHTML = FF.row('Files', files.length) + FF.row('Total pages', pdf.getPageCount()) + FF.row('File size', FF.kb(blob.size)); FF.dl(out, blob, 'merged.pdf', 'Download merged PDF');
      });
    }
  });

  /* ---- split / extract / remove ---- */
  const parseRanges = (text, total) => {
    const set = new Set(), parts = text.split(/[,;\s]+/).filter(Boolean); if (!parts.length) throw { userMsg: 'Enter page numbers, like 1-3, 5.' };
    for (const p of parts) {
      const m = p.match(/^(\d+)(?:-(\d*))?$/); if (!m) throw { userMsg: '"' + FF.esc(p) + '" is not a page number or range.' };
      let a = +m[1], b = m[2] === undefined ? a : (m[2] === '' ? total : +m[2]); if (a > b) [a, b] = [b, a];
      if (a < 1 || b > total) throw { userMsg: 'This PDF has ' + total + ' page' + (total > 1 ? 's' : '') + '. "' + FF.esc(p) + '" is outside that.' };
      for (let i = a; i <= b; i++) set.add(i);
    }
    return [...set].sort((x, y) => x - y);
  };
  pdfTool({
    slug: 'split-pdf', name: 'Split PDF / Extract Pages', icon: '✂️', short: 'Keep only the pages you pick.',
    title: 'Split PDF: Extract Pages Online, Free', desc: 'Extract pages or ranges like 1-3, 5 from a PDF into a new file. Free, private, nothing uploaded.',
    h1: 'Split PDF / Extract Pages', keywords: ['split', 'extract', 'pages', 'pdf', 'cut'],
    howto: ['Choose your PDF.', 'Type the pages you want, like 1-3, 5, 8-.', 'Tap Extract and download.']
  }, {
    button: 'Extract pages', fields: H.text('pages', 'Pages to keep', '', { ph: 'e.g. 1-3, 5, 8-' }),
    async process(file, out) { const src = await openLib(file), total = src.getPageCount(), pages = parseRanges(FF.$('pages').value, total), L = await FF.lib('pdflib'), pdf = await L.PDFDocument.create(); (await pdf.copyPages(src, pages.map(p => p - 1))).forEach(p => pdf.addPage(p)); done(out, file, await pdfBlob(pdf), '-pages', FF.row('Pages in new PDF', pages.length + ' of ' + total)); }
  });
  pdfTool({
    slug: 'remove-pdf-pages', name: 'Remove Pages from PDF', icon: '🗑️', short: 'Delete unwanted pages from a PDF.',
    title: 'Remove Pages from PDF Online, Free', desc: 'Delete pages from a PDF by number or range, like 2, 4-6. Free, private, nothing uploaded.',
    h1: 'Remove Pages from PDF', keywords: ['delete', 'remove', 'pages', 'pdf'],
    howto: ['Choose your PDF.', 'Type the pages to delete, like 2, 4-6.', 'Tap Remove and download.']
  }, {
    button: 'Remove pages', fields: H.text('pages', 'Pages to delete', '', { ph: 'e.g. 2, 4-6' }),
    async process(file, out) { const src = await openLib(file), total = src.getPageCount(), rm = new Set(parseRanges(FF.$('pages').value, total)), keep = []; for (let i = 1; i <= total; i++) if (!rm.has(i)) keep.push(i - 1); if (!keep.length) throw { userMsg: 'That would delete every page.' }; const L = await FF.lib('pdflib'), pdf = await L.PDFDocument.create(); (await pdf.copyPages(src, keep)).forEach(p => pdf.addPage(p)); done(out, file, await pdfBlob(pdf), '-edited', FF.row('Pages left', keep.length + ' of ' + total)); }
  });

  /* ---- images to PDF ---- */
  const imgToPdf = (slug, name, kw, titleBit) => FF.tool({
    slug, name, cat: 'pdf', icon: '🖼️', short: 'Turn photos into one PDF, with optional size limit.',
    title: titleBit + ' to PDF: Combine Images into One PDF, Free', desc: 'Convert ' + titleBit + ' images to a single PDF. Pick page size, reorder, and set a max file size. Free and private.',
    h1: name, keywords: kw.concat(['image to pdf', 'photo', 'pdf', 'convert']), faq: faqPdf.concat([['Can I limit the PDF size?', 'Yes. Set a max size in KB and the tool lowers image quality until it fits.']]),
    html: H.card(H.drop('d', 'Tap to choose images', H.IMG_ACCEPT, true, 'select several, or drag and drop, or paste'), H.files('nm'), H.grid(H.sel('page', 'Page size', [['a4', 'A4'], ['letter', 'Letter'], ['fit', 'Same size as image']], 'a4'), H.num('max', 'Max PDF size (KB) optional', '', { min: 1 })), '<div class="btns">' + H.btn('go', 'Create PDF') + '</div>') + H.out('out'),
    init() {
      const files = [], out = FF.$('out'), btn = FF.$('go');
      FF.drop('d', { accept: FF.isImg, multiple: true, paste: true, onFiles: f => { files.push(...f); out.innerHTML = ''; FF.list(FF.$('nm'), files, { reorder: true }); } });
      const SIZES = { a4: [595.28, 841.89], letter: [612, 792] };
      btn.onclick = run(btn, out, async () => {
        if (!files.length) { out.innerHTML = FF.msg('err', 'Choose at least one image.'); return; }
        const max = FF.n('max') * 1024, kind = FF.$('page').value, L = await FF.lib('pdflib'); out.innerHTML = FF.msg('ok', 'Making PDF…') + '<div class="progress"><i></i></div>';
        const tries = max ? [[.85, 2480], [.7, 2000], [.6, 1600], [.5, 1300], [.4, 1000], [.3, 800], [.22, 600]] : [[.85, 2480]]; let blob;
        for (const [q, cap] of tries) {
          const pdf = await L.PDFDocument.create();
          for (let i = 0; i < files.length; i++) {
            let img; try { img = await FF.decode(files[i]); } catch (e) { throw { userMsg: FF.esc(files[i].name) + ' could not be opened as an image. Remove it and try again.' }; }
            let [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight); const s = Math.min(1, cap / Math.max(w, h)); w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
            const jpg = await pdf.embedJpg(await (await FF.encode(FF.draw(img, w, h, 'stretch', true), 'jpeg', q)).arrayBuffer());
            if (kind === 'fit') { const pw = w * 72 / 150, ph = h * 72 / 150; pdf.addPage([pw, ph]).drawImage(jpg, { x: 0, y: 0, width: pw, height: ph }); }
            else { let [pw, ph] = SIZES[kind]; if (w > h) [pw, ph] = [ph, pw]; const m = 24, k = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h), dw = w * k, dh = h * k; pdf.addPage([pw, ph]).drawImage(jpg, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh }); }
            out.querySelector('.progress i').style.width = ((i + 1) / files.length * 100) + '%'; await FF.tick();
          }
          blob = await pdfBlob(pdf); if (!max || blob.size <= max) break;
        }
        out.innerHTML = (max && blob.size > max ? FF.msg('warn', 'Could not get under ' + FF.kb(max) + '. This is the smallest version. Try fewer images.') : '') + FF.row('Pages', files.length) + FF.row('File size', FF.kb(blob.size)); FF.dl(out, blob, FF.base(files[0].name) + '.pdf', 'Download PDF');
      });
    }
  });
  imgToPdf('image-to-pdf', 'Image to PDF', [], 'Image');
  imgToPdf('jpg-to-pdf', 'JPG to PDF', ['jpg', 'jpeg', 'png'], 'JPG');

  /* ---- PDF to images ---- */
  pdfTool({
    slug: 'pdf-to-jpg', name: 'PDF to JPG', icon: '🖼️', short: 'Turn every PDF page into a JPG image.',
    title: 'PDF to JPG: Convert PDF Pages to Images, Free', desc: 'Convert each page of a PDF to a JPG or PNG image and download them all as a ZIP. Free, private, nothing uploaded.',
    h1: 'PDF to JPG', keywords: ['pdf to jpg', 'pdf to png', 'pdf to image', 'convert'],
    howto: ['Choose your PDF.', 'Pick the quality.', 'Tap Convert and download the ZIP, or single images.']
  }, {
    button: 'Convert to images', fields: H.grid(H.sel('fmt', 'Image format', [['jpeg', 'JPG'], ['png', 'PNG']], 'jpeg'), H.sel('sc', 'Quality', [[1.5, 'Good (150 DPI)'], [2.08, 'High (200 DPI)'], [1, 'Small (72 DPI)']], 1.5)),
    async process(file, out) {
      const doc = await openJs(file); if (doc.numPages > 100) throw { userMsg: 'This PDF has more than 100 pages. Split it first so your browser does not run out of memory.' };
      out.innerHTML = FF.msg('ok', 'Converting…') + '<div class="progress"><i></i></div>'; const t = FF.$('fmt').value, parts = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i), v1 = page.getViewport({ scale: 1 }); let s = +FF.$('sc').value; if (v1.width * v1.height * s * s > FF.MAX_PIX) s = Math.sqrt(FF.MAX_PIX / (v1.width * v1.height));
        const vp = page.getViewport({ scale: s }), cv = FF.canvas(Math.floor(vp.width), Math.floor(vp.height)), cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); await page.render({ canvasContext: cx, viewport: vp }).promise;
        parts.push({ name: FF.base(file.name) + '-page-' + String(i).padStart(2, '0') + '.' + FF.ext(t), blob: await FF.encode(cv, t, 0.9) }); cv.width = cv.height = 0; page.cleanup(); out.querySelector('.progress i').style.width = (i / doc.numPages * 100) + '%'; await FF.tick();
      }
      out.innerHTML = FF.row('Pages', parts.length) + FF.row('Total size', FF.kb(parts.reduce((a, p) => a + p.blob.size, 0)));
      if (parts.length > 1) FF.dl(out, await FF.zip(parts), FF.base(file.name) + '-images.zip', 'Download all as ZIP');
      parts.slice(0, 30).forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.style.margin = '4px 6px 0 0'; b.textContent = '⬇ ' + p.name.slice(-12); b.onclick = () => FF.save(p.blob, p.name); out.appendChild(b); });
      doc.destroy();
    }
  });

  /* ---- rotate ---- */
  pdfTool({
    slug: 'rotate-pdf', name: 'Rotate PDF', icon: '🔄', short: 'Rotate all or some pages of a PDF.',
    title: 'Rotate PDF Pages Online, Free', desc: 'Rotate all pages or chosen pages of a PDF by 90, 180 or 270 degrees. Free, private, nothing uploaded.',
    h1: 'Rotate PDF', keywords: ['rotate', 'pdf', 'turn', 'landscape', 'portrait']
  }, {
    button: 'Rotate PDF', fields: H.grid(H.sel('deg', 'Rotate', [[90, '90° clockwise'], [180, '180°'], [270, '90° counter-clockwise']], 90), H.text('pages', 'Pages (blank = all)', '', { ph: 'e.g. 2-4' })),
    async process(file, out) { const d = await openLib(file), total = d.getPageCount(), txt = FF.$('pages').value.trim(), sel = txt ? parseRanges(txt, total) : d.getPageIndices().map(i => i + 1), L = await FF.lib('pdflib'), deg = +FF.$('deg').value; sel.forEach(n => { const p = d.getPage(n - 1); p.setRotation(L.degrees((p.getRotation().angle + deg) % 360)); }); done(out, file, await pdfBlob(d), '-rotated', FF.row('Pages rotated', sel.length + ' of ' + total)); }
  });

  /* ---- page numbers ---- */
  pdfTool({
    slug: 'add-page-numbers-to-pdf', name: 'Add Page Numbers to PDF', icon: '🔢', short: 'Number every page of a PDF.',
    title: 'Add Page Numbers to PDF Online, Free', desc: 'Add page numbers to a PDF with position, start number and format options. Free, private, nothing uploaded.',
    h1: 'Add Page Numbers to PDF', keywords: ['page numbers', 'number', 'pdf', 'footer']
  }, {
    button: 'Add numbers', fields: H.grid(H.sel('pos', 'Position', [['bc', 'Bottom centre'], ['br', 'Bottom right'], ['bl', 'Bottom left'], ['tc', 'Top centre'], ['tr', 'Top right']], 'bc'), H.sel('fmt', 'Format', [['n', '1, 2, 3'], ['of', 'Page 1 of 10'], ['dash', '- 1 -']], 'n'), H.num('start', 'Start at', 1, { int: true }), H.num('size', 'Font size', 11, { min: 6, max: 40 })),
    async process(file, out) {
      const d = await openLib(file), L = await FF.lib('pdflib'), font = await d.embedFont(L.StandardFonts.Helvetica), pages = d.getPages(), start = Math.round(FF.n('start')) || 1, size = FF.n('size') || 11, pos = FF.$('pos').value, f = FF.$('fmt').value;
      pages.forEach((p, i) => { const n = start + i, t = f === 'of' ? 'Page ' + n + ' of ' + (start + pages.length - 1) : f === 'dash' ? '- ' + n + ' -' : String(n), tw = font.widthOfTextAtSize(t, size), { width: w, height: h } = p.getSize(), m = 28, x = pos[1] === 'c' ? (w - tw) / 2 : pos[1] === 'r' ? w - tw - m : m, y = pos[0] === 'b' ? m - 6 : h - m; p.drawText(t, { x, y, size, font, color: L.rgb(.2, .2, .2) }); });
      done(out, file, await pdfBlob(d), '-numbered', FF.row('Pages numbered', pages.length));
    }
  });

  /* ---- watermark ---- */
  pdfTool({
    slug: 'pdf-watermark', name: 'Add Watermark to PDF', icon: '💧', short: 'Stamp text across every page.',
    title: 'Add Text Watermark to PDF Online, Free', desc: 'Add a diagonal text watermark such as CONFIDENTIAL or DRAFT to every PDF page. Free, private, nothing uploaded.',
    h1: 'Add Watermark to PDF', keywords: ['watermark', 'pdf', 'confidential', 'draft', 'stamp']
  }, {
    button: 'Add watermark', fields: H.grid(H.text('txt', 'Watermark text (English letters)', 'CONFIDENTIAL', { max: 40 }), H.range('op', 'Opacity %', 25, 5, 80, 5)),
    async process(file, out) {
      const t = FF.$('txt').value.trim(); if (!t) throw { userMsg: 'Enter the watermark text.' }; if (/[^\x20-\x7E]/.test(t)) throw { userMsg: 'Watermark supports English letters, numbers and symbols only.' };
      const d = await openLib(file), L = await FF.lib('pdflib'), font = await d.embedFont(L.StandardFonts.HelveticaBold), op = FF.n('op') / 100;
      d.getPages().forEach(p => { const { width: w, height: h } = p.getSize(), size = Math.min(w * 0.9 / font.widthOfTextAtSize(t, 1) * 0.8, 90), tw = font.widthOfTextAtSize(t, size), a = Math.atan2(h, w); p.drawText(t, { x: w / 2 - Math.cos(a) * tw / 2 + Math.sin(a) * size / 3, y: h / 2 - Math.sin(a) * tw / 2 - Math.cos(a) * size / 3, size, font, color: L.rgb(.5, .5, .5), opacity: op, rotate: L.degrees(a * 180 / Math.PI) }); });
      done(out, file, await pdfBlob(d), '-watermarked');
    }
  });

  /* ---- PDF to text ---- */
  pdfTool({
    slug: 'pdf-to-text', name: 'PDF to Text', icon: '📝', short: 'Copy the text out of a PDF.',
    title: 'PDF to Text Converter: Extract Text from PDF', desc: 'Extract the text from a PDF and copy or download it as a .txt file. Free and private. Works on PDFs with real text, not scans.',
    h1: 'PDF to Text', keywords: ['pdf to text', 'extract text', 'copy text', 'txt'],
    faq: faqPdf.concat([['Why is the result empty?', 'Scanned PDFs are pictures of text, so there is no text to extract. This tool needs PDFs created digitally.']])
  }, {
    button: 'Extract text', fields: '',
    async process(file, out) {
      const doc = await openJs(file); if (doc.numPages > 300) throw { code: 'big' }; let all = [];
      for (let i = 1; i <= doc.numPages; i++) { const tc = await (await doc.getPage(i)).getTextContent(); let line = '', y = null; const lines = []; tc.items.forEach(it => { if (y !== null && Math.abs(it.transform[5] - y) > 2) { lines.push(line); line = ''; } line += it.str + (it.hasEOL ? '' : ''); y = it.transform[5]; }); lines.push(line); all.push('--- Page ' + i + ' ---\n' + lines.join('\n')); }
      const text = all.join('\n\n'); doc.destroy();
      if (text.replace(/--- Page \d+ ---|\s/g, '') === '') { out.innerHTML = FF.msg('err', 'No text found. This PDF may be a scan (a picture of text).'); return; }
      out.innerHTML = FF.row('Pages', all.length) + FF.row('Characters', text.length.toLocaleString()) + '<textarea id="tx" class="mono" rows="10" readonly></textarea><div class="btns"><button type="button" id="cpy">Copy text</button></div>'; FF.$('tx').value = text; FF.$('cpy').onclick = () => FF.copy(text); FF.dl(out, new Blob([text], { type: 'text/plain' }), FF.base(file.name) + '.txt', 'Download .txt');
    }
  });
})();
