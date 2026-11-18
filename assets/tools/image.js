/* Image tools. Top-level code must not touch the DOM (build.js evaluates this in Node). */
(function () {
  const H = FFH, TYPES = [['jpeg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']];
  const faqImg = [['Is my photo uploaded?', 'No. The image is processed in your browser and never leaves your device.'], ['Does it work with HEIC photos from iPhone?', 'Yes, HEIC and HEIF files are converted in your browser first. If one fails, set iPhone Camera to Most Compatible or share the photo as JPG.']];

  // One image in, one result out. opts: {id, fields, process(img, file, ui) -> {blob, ext, notes[]}}
  const imgTool = (def, o) => FF.tool(Object.assign({ cat: 'image', faq: faqImg }, def, {
    html: H.card(H.drop('d', 'Tap to choose an image', H.IMG_ACCEPT, false, 'or drag and drop, or paste'), H.files('nm'), o.fields ? '<div style="margin-top:14px">' + o.fields + '</div>' : '', '<div class="btns">' + H.btn('go', o.button || 'Create') + '</div>') + H.out('out'),
    init(root) {
      let file = null; const out = FF.$('out'), btn = FF.$('go');
      FF.drop('d', { accept: FF.isImg, paste: true, onFiles: f => { file = f[0]; out.innerHTML = ''; FF.list(FF.$('nm'), f, { onChange: () => { file = null; } }); if (o.onFile) o.onFile(file); } });
      if (o.setup) o.setup(root);
      btn.onclick = FF.guard(btn, out, async () => {
        if (!file) { out.innerHTML = FF.msg('err', 'Choose an image first.'); return; }
        out.innerHTML = FF.msg('ok', 'Working…');
        let img; try { img = await FF.decode(file); } catch (e) { throw /hei/i.test(file.name) ? { userMsg: 'This HEIC photo could not be opened here. Set iPhone Camera to Most Compatible, or share it as JPG.' } : { userMsg: 'This file could not be opened as an image. It may be damaged or unsupported.' }; }
        if (!img.naturalWidth) throw { userMsg: 'This image is empty.' };
        const r = await o.process(img, file);
        if (r.error) { out.innerHTML = FF.msg('err', r.error); return; }
        if (r.custom) return;
        const name = FF.base(file.name) + (r.suffix || '') + '.' + r.ext;
        out.innerHTML = (r.notes || []).map(n => FF.msg(n[0], n[1])).join('') + FF.row('Original', FF.kb(file.size) + ' · ' + img.naturalWidth + '×' + img.naturalHeight) + FF.row('Result', '<span style="color:var(--ok)">' + FF.kb(r.blob.size) + '</span>' + (r.w ? ' · ' + r.w + '×' + r.h : '')) +
          (r.noPreview ? '' : '<img class="prev" alt="Result preview" src="' + URL.createObjectURL(r.blob) + '">');
        FF.dl(out, r.blob, name, 'Download ' + r.ext.toUpperCase());
      });
    }
  }));

  /* fit an image to a size range (ported from the tested FitFile engine) */
  async function fit(img, file, o) {
    const iw = img.naturalWidth, ih = img.naturalHeight; let w = o.w, h = o.h; const fixed = !!(w && h);
    if (w && !h) h = Math.round(ih * w / iw); if (h && !w) w = Math.round(iw * h / ih);
    if (!w) [w, h] = FF.safeDims(iw, ih); else [w, h] = [Math.min(w, FF.MAX_SIDE), Math.min(h, FF.MAX_SIDE)];
    const max = o.max * 1024, min = (o.min || 0) * 1024, type = o.fmt, opaque = type === 'jpeg', mode = fixed ? o.mode : 'stretch';
    const same = file.type === 'image/' + type;
    if (!o.w && !o.h && same && file.size <= max && file.size >= min && iw * ih <= FF.MAX_PIX) return { blob: file, w: iw, h: ih, same: true };
    let smallest = null;
    for (let pass = 0; pass < 12; pass++) {
      const cv = FF.draw(img, w, h, mode, opaque); let floor;
      if (type === 'png') { const b = await FF.encode(cv, 'png'); if (b.size <= max) return { blob: b, w, h, under: b.size < min }; floor = b; }
      else {
        const top = await FF.encode(cv, type, 1); if (top.size <= max) return { blob: top, w, h, under: top.size < min };
        floor = await FF.encode(cv, type, 0.05);
        if (floor.size <= max) { let lo = 0.05, hi = 1, best = floor; for (let i = 0; i < 8; i++) { const q = (lo + hi) / 2, b = await FF.encode(cv, type, q); if (b.size <= max) { best = b; lo = q; } else hi = q; } return { blob: best, w, h, under: best.size < min }; }
      }
      smallest = floor; if (fixed || w <= 16 || h <= 16) break;
      const k = Math.min(0.9, Math.max(0.3, Math.sqrt(max / floor.size) * 0.9)); w = Math.max(1, Math.round(w * k)); h = Math.round(Math.max(1, h * k)); await FF.tick();
    }
    return { fail: true, smallest };
  }
  const fitResult = (r, o, file) => {
    if (r.fail) return { error: 'Could not get under ' + o.max + ' KB' + (o.w && o.h ? ' at ' + o.w + '×' + o.h + ' px' : '') + (r.smallest ? ' (smallest was ' + FF.kb(r.smallest.size) + ')' : '') + '. Try a higher limit, smaller pixel size, or JPG/WebP instead of PNG.' };
    const ext = r.same ? ((file.name.split('.').pop() || FF.ext(o.fmt)).toLowerCase()) : FF.ext(o.fmt), notes = [];
    if (r.same) notes.push(['ok', 'Your file already fits, so it was not changed.']);
    if (r.under) notes.push(['warn', 'Best result is ' + FF.kb(r.blob.size) + ', below your ' + o.min + ' KB minimum. Simple images compress very small. Try a larger width and height.']);
    return { blob: r.blob, ext, w: r.w, h: r.h, notes, suffix: r.same ? '' : '-' + Math.round(r.blob.size / 1024) + 'kb' };
  };

  const PRESETS = [['Under 20 KB', { max: 20 }], ['Under 50 KB', { max: 50 }], ['Under 100 KB', { max: 100 }], ['Under 200 KB', { max: 200 }], ['Under 500 KB', { max: 500 }], ['Under 1 MB', { max: 1024 }], ['Under 2 MB', { max: 2048 }]];
  imgTool({
    slug: 'resize-image-to-kb', name: 'Resize Image to KB', icon: '🖼️', short: 'Make a photo smaller than a size limit, like 50 KB.',
    title: 'Resize Image to KB: Reduce Photo Size Online, Free', desc: 'Reduce a JPG or PNG to an exact size limit like 20 KB, 50 KB or 200 KB for forms and uploads. Free, private, nothing uploaded.',
    h1: 'Resize Image to KB', keywords: ['reduce', 'kb', 'compress', 'photo', 'form', 'upload', 'size', 'jpg', 'png'],
    howto: ['Choose your photo.', 'Pick a limit like "Under 100 KB", or type your own. Add a minimum if the form needs one.', 'Optionally set a width and height in pixels.', 'Tap Create, then download.'],
    about: '<p>Many application forms and portals reject photos that are too large or too small. This tool shrinks the file to fit inside your limit while keeping it as sharp as possible, by lowering quality first and pixels only when needed. Set both a minimum and a maximum if the form asks for a range such as 20 to 50 KB.</p>',
    faq: faqImg.concat([['Why is my result smaller than my minimum?', 'Simple images, like a plain signature, compress to very small files. Enter a larger width and height so there are more pixels to keep.']])
  }, {
    button: 'Create image', fields: H.chips('pre', PRESETS) + H.grid3(H.num('max', 'Max size (KB)', 100, { min: 1 }), H.num('min', 'Min size (KB) optional', '', { min: 0 }), H.sel('fmt', 'Format', TYPES, 'jpeg')) + H.grid3(H.num('w', 'Width px (optional)', '', { min: 1, int: true }), H.num('h', 'Height px (optional)', '', { min: 1, int: true }), H.sel('mode', 'If both set', [['cover', 'Crop to fill'], ['contain', 'Fit with white edges'], ['stretch', 'Stretch']], 'cover')),
    setup() { FF.chips('pre', i => { FF.$('max').value = PRESETS[i][1].max; }); },
    async process(img, file) {
      const o = { max: FF.n('max'), min: FF.n('min'), w: Math.round(FF.n('w')), h: Math.round(FF.n('h')), mode: FF.$('mode').value, fmt: FF.$('fmt').value };
      if (!o.max) return { error: 'Enter a max size in KB.' }; if (o.min && o.min >= o.max) return { error: 'Min size must be smaller than max size.' };
      return fitResult(await fit(img, file, o), o, file);
    }
  });

  imgTool({
    slug: 'compress-image', name: 'Compress Image', icon: '🗜️', short: 'Shrink JPG, PNG or WebP with a quality slider.',
    title: 'Compress Image Online: Reduce JPG, PNG & WebP Size', desc: 'Compress photos without visible quality loss. Pick quality, see the saved size, download. Free and private, files never uploaded.',
    h1: 'Compress Image', keywords: ['compress', 'optimise', 'optimize', 'smaller', 'quality'],
    faq: faqImg.concat([['What quality should I pick?', '70 to 80 is usually a good balance: much smaller with little visible change.']])
  }, {
    button: 'Compress', fields: H.grid(H.range('q', 'Quality', 75, 10, 100, 1), H.sel('fmt', 'Format', [['same', 'Same as original'], ['jpeg', 'JPG'], ['webp', 'WebP']], 'same')),
    async process(img, file) {
      const q = FF.n('q') / 100; let t = FF.$('fmt').value; if (t === 'same') t = file.type === 'image/webp' ? 'webp' : 'jpeg';
      const [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight), b = await FF.encode(FF.draw(img, w, h, 'stretch', t === 'jpeg'), t, q);
      const notes = b.size >= file.size ? [['warn', 'The result is not smaller than your original. Try a lower quality.']] : [];
      return { blob: b, ext: FF.ext(t), w, h, notes, suffix: '-compressed' };
    }
  });

  imgTool({
    slug: 'resize-image', name: 'Resize Image', icon: '📐', short: 'Change width and height in pixels or percent.',
    title: 'Resize Image Online: Change Pixels or Percent', desc: 'Resize any photo to exact pixels or a percentage. Keep the aspect ratio or set your own size. Free and private.',
    h1: 'Resize Image', keywords: ['resize', 'pixels', 'dimensions', 'width', 'height', 'scale'],
    faq: faqImg
  }, {
    button: 'Resize', fields: H.grid(H.sel('by', 'Resize by', [['px', 'Pixels'], ['pct', 'Percent']], 'px'), H.sel('fmt', 'Format', TYPES, 'jpeg'), H.num('w', 'Width px', '', { min: 1, int: true }), H.num('h', 'Height px', '', { min: 1, int: true }), H.num('pct', 'Percent (if by percent)', 50, { min: 1, max: 400 }), H.chk('lock', 'Keep aspect ratio', true)),
    async process(img) {
      const iw = img.naturalWidth, ih = img.naturalHeight; let w, h;
      if (FF.$('by').value === 'pct') { const k = FF.n('pct') / 100; if (!k) return { error: 'Enter a percent.' }; w = Math.round(iw * k); h = Math.round(ih * k); }
      else { w = Math.round(FF.n('w')); h = Math.round(FF.n('h')); if (!w && !h) return { error: 'Enter a width or a height.' }; if (FF.$('lock').checked || !w || !h) { if (w && (!h || FF.$('lock').checked)) h = Math.round(ih * w / iw); else w = Math.round(iw * h / ih); } }
      if (w > FF.MAX_SIDE || h > FF.MAX_SIDE || w * h > FF.MAX_PIX) return { error: 'That size is too large for a browser. Keep it under 8192 px per side and 16 megapixels.' };
      const t = FF.$('fmt').value, b = await FF.encode(FF.draw(img, Math.max(1, w), Math.max(1, h), 'stretch', t === 'jpeg'), t, 0.92);
      return { blob: b, ext: FF.ext(t), w, h, suffix: '-' + w + 'x' + h };
    }
  });

  imgTool({
    slug: 'convert-image', name: 'Convert Image Format', icon: '🔁', short: 'Convert between JPG, PNG and WebP.',
    title: 'Image Converter: JPG, PNG, WebP, HEIC to Any Format', desc: 'Convert images between JPG, PNG and WebP, including HEIC from iPhone. Free, private, runs in your browser.',
    h1: 'Image Converter', keywords: ['convert', 'png to jpg', 'jpg to png', 'webp', 'heic', 'format'],
    faq: faqImg.concat([['Why does PNG to JPG add a white background?', 'JPG cannot store transparency, so transparent areas are filled with white.']])
  }, {
    button: 'Convert', fields: H.grid(H.sel('fmt', 'Convert to', TYPES, 'jpeg'), H.range('q', 'Quality (JPG/WebP)', 92, 40, 100, 1)),
    async process(img) { const t = FF.$('fmt').value, [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight), b = await FF.encode(FF.draw(img, w, h, 'stretch', t === 'jpeg'), t, FF.n('q') / 100); return { blob: b, ext: FF.ext(t), w, h }; }
  });

  imgTool({
    slug: 'heic-to-jpg', name: 'HEIC to JPG', icon: '📱', short: 'Convert iPhone HEIC photos to JPG.',
    title: 'HEIC to JPG Converter: Free & Private', desc: 'Convert iPhone HEIC and HEIF photos to JPG in your browser. Nothing is uploaded.',
    h1: 'HEIC to JPG Converter', keywords: ['heic', 'heif', 'iphone', 'jpg', 'convert'],
    faq: faqImg
  }, {
    button: 'Convert to JPG', fields: H.range('q', 'Quality', 92, 50, 100, 1),
    async process(img) { const [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight), b = await FF.encode(FF.draw(img, w, h, 'stretch', true), 'jpeg', FF.n('q') / 100); return { blob: b, ext: 'jpg', w, h }; }
  });

  imgTool({
    slug: 'rotate-flip-image', name: 'Rotate & Flip Image', icon: '🔄', short: 'Rotate 90° or flip an image.',
    title: 'Rotate and Flip Image Online', desc: 'Rotate a photo by 90, 180 or 270 degrees or flip it horizontally or vertically. Free and private.',
    h1: 'Rotate & Flip Image', keywords: ['rotate', 'flip', 'mirror', 'turn'],
    faq: faqImg
  }, {
    button: 'Apply', fields: H.grid(H.sel('rot', 'Rotate', [[0, 'No rotation'], [90, '90° clockwise'], [180, '180°'], [270, '90° counter-clockwise']], 90), H.sel('flip', 'Flip', [['none', 'None'], ['h', 'Horizontal'], ['v', 'Vertical']], 'none')),
    async process(img, file) {
      const r = +FF.$('rot').value, sw = r === 90 || r === 270, [iw, ih] = FF.safeDims(img.naturalWidth, img.naturalHeight), W = sw ? ih : iw, Hh = sw ? iw : ih, cv = FF.canvas(W, Hh), cx = cv.getContext('2d');
      cx.translate(W / 2, Hh / 2); cx.rotate(r * Math.PI / 180); const f = FF.$('flip').value; cx.scale(f === 'h' ? -1 : 1, f === 'v' ? -1 : 1); cx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
      const t = file.type === 'image/png' ? 'png' : 'jpeg', opaque = t === 'jpeg';
      if (opaque) { const c2 = FF.canvas(W, Hh), x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, W, Hh); x2.drawImage(cv, 0, 0); return { blob: await FF.encode(c2, t, 0.95), ext: FF.ext(t), w: W, h: Hh, suffix: '-rotated' }; }
      return { blob: await FF.encode(cv, t), ext: 'png', w: W, h: Hh, suffix: '-rotated' };
    }
  });

  imgTool({
    slug: 'remove-image-metadata', name: 'Remove Photo Metadata (EXIF)', icon: '🕵️', short: 'Strip location and camera data from a photo.',
    title: 'Remove EXIF Metadata from Photos: Strip Location Data', desc: 'Remove GPS location, camera model and other hidden EXIF data from a photo before sharing. Free and private.',
    h1: 'Remove Photo Metadata', keywords: ['exif', 'metadata', 'gps', 'location', 'privacy'],
    faq: faqImg.concat([['How does it remove the data?', 'The photo is redrawn onto a blank canvas and saved again. Only the pixels are kept, so hidden EXIF and GPS data are left behind.']])
  }, {
    button: 'Clean photo', fields: H.sel('fmt', 'Save as', TYPES, 'jpeg'),
    async process(img) { const t = FF.$('fmt').value, [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight), b = await FF.encode(FF.draw(img, w, h, 'stretch', t === 'jpeg'), t, 0.95); return { blob: b, ext: FF.ext(t), w, h, suffix: '-clean', notes: [['ok', 'Metadata removed. Only the picture remains.']] }; }
  });

  imgTool({
    slug: 'add-watermark-to-image', name: 'Add Watermark to Image', icon: '💧', short: 'Put your own text watermark on a photo.',
    title: 'Add Text Watermark to Image Online', desc: 'Add your own text watermark to a photo with size, opacity and position controls. Free and private.',
    h1: 'Add Watermark to Image', keywords: ['watermark', 'text', 'logo', 'protect'],
    faq: faqImg
  }, {
    button: 'Add watermark', fields: H.grid(H.text('txt', 'Watermark text', '© Your name', { max: 80 }), H.sel('pos', 'Position', [['br', 'Bottom right'], ['bl', 'Bottom left'], ['c', 'Center'], ['tile', 'Repeat across image']], 'br'), H.range('sz', 'Size (% of width)', 6, 2, 20, 1), H.range('op', 'Opacity %', 55, 10, 100, 5), H.text('col', 'Colour', '#ffffff', { type: 'color' })),
    async process(img) {
      const t = FF.$('txt').value; if (!t.trim()) return { error: 'Enter the watermark text.' };
      const [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight), cv = FF.draw(img, w, h, 'stretch', true), cx = cv.getContext('2d'), fs = Math.max(10, Math.round(w * FF.n('sz') / 100));
      cx.font = '700 ' + fs + 'px sans-serif'; cx.globalAlpha = FF.n('op') / 100; cx.fillStyle = FF.$('col').value; cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = fs / 8; cx.textBaseline = 'middle'; const p = FF.$('pos').value, tw = cx.measureText(t).width, m = fs * .6;
      if (p === 'tile') { cx.save(); cx.rotate(-Math.PI / 6); for (let y = -h; y < h * 2; y += fs * 3.2) for (let x = -w; x < w * 2; x += tw + fs * 2) cx.fillText(t, x, y); cx.restore(); }
      else { const x = p === 'c' ? (w - tw) / 2 : p === 'bl' ? m : w - tw - m, y = p === 'c' ? h / 2 : h - fs; cx.fillText(t, x, y); }
      return { blob: await FF.encode(cv, 'jpeg', 0.93), ext: 'jpg', w, h, suffix: '-watermarked' };
    }
  });

  imgTool({
    slug: 'image-to-base64', name: 'Image to Base64', icon: '🔣', short: 'Turn an image into a Base64 data URL.',
    title: 'Image to Base64 Converter', desc: 'Convert an image to a Base64 string or data URL to embed in HTML, CSS or JSON. Free and private.',
    h1: 'Image to Base64', keywords: ['base64', 'data url', 'encode', 'embed'],
    faq: faqImg
  }, {
    button: 'Get Base64', fields: '',
    async process(img, file) {
      const url = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(file); });
      const out = FF.$('out'); out.innerHTML = FF.row('Length', url.length.toLocaleString() + ' characters') + '<textarea id="b64" class="mono" rows="6" readonly></textarea><div class="btns"><button type="button" id="cp1">Copy data URL</button><button type="button" class="ghost" id="cp2">Copy Base64 only</button></div>'; FF.$('b64').value = url; FF.$('cp1').onclick = () => FF.copy(url); FF.$('cp2').onclick = () => FF.copy(url.split(',')[1] || '');
      return { custom: true };
    }
  });

  const PASSPORT = [['India passport 35×45 mm', 35, 45], ['US passport 2×2 in', 51, 51], ['UK/EU 35×45 mm', 35, 45], ['Stamp 25×35 mm', 25, 35], ['Custom', 0, 0]];
  imgTool({
    slug: 'passport-photo-maker', name: 'Passport Photo Maker', icon: '🪪', short: 'Crop a photo to passport size and print sheet.',
    title: 'Passport Size Photo Maker: Crop & Print Sheet', desc: 'Crop a photo to passport or ID size at 300 DPI and make a printable A4 sheet with many copies. Free and private. Check your exact rules.',
    h1: 'Passport Photo Maker', keywords: ['passport', 'photo', 'id', 'visa', 'print', 'size'],
    faq: faqImg.concat([['Will this be accepted?', 'Sizes differ by country and form, so check the official rules. Your face should be centred and the background plain. This tool crops and sizes your photo but cannot check those rules.']])
  }, {
    button: 'Make photo', fields: H.grid(H.sel('pre', 'Size', PASSPORT.map((p, i) => [i, p[0]]), 0), H.sel('outmode', 'Output', [['single', 'Single photo'], ['sheet', 'A4 print sheet'], ['sheet4', '4×6 inch print sheet']], 'sheet'), H.num('mw', 'Width mm (custom)', 35, { min: 10, max: 200 }), H.num('mh', 'Height mm (custom)', 45, { min: 10, max: 200 }), H.range('zoom', 'Zoom', 100, 100, 250, 5), H.range('ox', 'Move left / right', 0, -50, 50, 1), H.range('oy', 'Move up / down', 0, -50, 50, 1)),
    async process(img) {
      const p = PASSPORT[+FF.$('pre').value]; let mw = p[1] || FF.n('mw'), mh = p[2] || FF.n('mh'); if (!mw || !mh) return { error: 'Enter a width and height.' };
      const dpi = 300, pw = Math.round(mw / 25.4 * dpi), ph = Math.round(mh / 25.4 * dpi), z = FF.n('zoom') / 100, iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(pw / iw, ph / ih) * z, dw = iw * s, dh = ih * s;
      const one = FF.canvas(pw, ph), c1 = one.getContext('2d'); c1.fillStyle = '#fff'; c1.fillRect(0, 0, pw, ph); c1.imageSmoothingQuality = 'high'; c1.drawImage(img, (pw - dw) / 2 + FF.n('ox') / 100 * dw, (ph - dh) / 2 + FF.n('oy') / 100 * dh, dw, dh);
      const mode = FF.$('outmode').value; if (mode === 'single') return { blob: await FF.encode(one, 'jpeg', 0.95), ext: 'jpg', w: pw, h: ph, suffix: '-passport' };
      const SW = mode === 'sheet' ? 2480 : 1200, SH = mode === 'sheet' ? 3508 : 1800, sheet = FF.canvas(SW, SH), cx = sheet.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, SW, SH);
      const gap = 24, cols = Math.max(1, Math.floor((SW - gap) / (pw + gap))), rows = Math.max(1, Math.floor((SH - gap) / (ph + gap))), ox = (SW - (cols * pw + (cols - 1) * gap)) / 2, oy = (SH - (rows * ph + (rows - 1) * gap)) / 2;
      if (pw > SW || ph > SH) return { error: 'That photo size is larger than the print sheet.' };
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = ox + c * (pw + gap), y = oy + r * (ph + gap); cx.drawImage(one, x, y); cx.strokeStyle = '#bbb'; cx.lineWidth = 2; cx.strokeRect(x, y, pw, ph); }
      return { blob: await FF.encode(sheet, 'jpeg', 0.95), ext: 'jpg', w: SW, h: SH, suffix: '-sheet', notes: [['ok', cols * rows + ' photos on one sheet. Print at 100% scale (no "fit to page").']] };
    }
  });

  imgTool({
    slug: 'signature-cleaner', name: 'Signature Cleaner', icon: '✍️', short: 'Make a photo of your signature transparent.',
    title: 'Signature Background Remover: Transparent Signature PNG', desc: 'Turn a photo of your signature on paper into a clean transparent PNG, or a crisp black on white image for forms. Free and private.',
    h1: 'Signature Background Remover', keywords: ['signature', 'background', 'transparent', 'sign', 'png'],
    faq: faqImg.concat([['Tips for a clean result?', 'Sign with a dark pen on plain white paper in good light, and crop close to the signature before uploading.']])
  }, {
    button: 'Clean signature', fields: H.grid(H.range('th', 'Paper sensitivity', 60, 10, 90, 1), H.sel('mode', 'Result', [['transparent', 'Transparent PNG'], ['bw', 'Black on white (JPG)']], 'transparent')),
    async process(img) {
      const [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight), cv = FF.draw(img, w, h, 'stretch', true), cx = cv.getContext('2d'), d = cx.getImageData(0, 0, w, h), px = d.data, th = FF.n('th') / 100;
      let mn = 255, mx = 0; for (let i = 0; i < px.length; i += 4) { const l = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114; if (l < mn) mn = l; if (l > mx) mx = l; }
      const cut = mn + (mx - mn) * th, bw = FF.$('mode').value === 'bw';
      let ink = 0; for (let i = 0; i < px.length; i += 4) { const l = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114, a = Math.max(0, Math.min(1, (cut - l) / Math.max(1, cut - mn))); if (a > 0.05) ink++; px[i] = px[i + 1] = px[i + 2] = bw ? (a > 0.4 ? 0 : 255) : 0; px[i + 3] = bw ? 255 : Math.round(a * 255); }
      if (ink < 20) return { error: 'No signature found. Use dark ink on light paper, or lower "Paper sensitivity".' };
      cx.putImageData(d, 0, 0); return bw ? { blob: await FF.encode(cv, 'jpeg', 0.95), ext: 'jpg', w, h, suffix: '-signature' } : { blob: await FF.encode(cv, 'png'), ext: 'png', w, h, suffix: '-signature' };
    }
  });

  FF.tool({
    slug: 'image-color-picker', name: 'Image Colour Picker', cat: 'image', icon: '🎨', short: 'Click a photo to get its HEX and RGB colour.',
    title: 'Image Color Picker: Get HEX & RGB from a Photo', desc: 'Pick any colour from an image and copy its HEX, RGB and HSL values. Free and private.',
    h1: 'Image Colour Picker', keywords: ['color picker', 'colour', 'hex', 'rgb', 'eyedropper'], faq: faqImg,
    html: H.card(H.drop('d', 'Tap to choose an image', H.IMG_ACCEPT, false, 'or drag and drop, or paste'), '<canvas id="cv" class="prev" style="display:none;cursor:crosshair;touch-action:none"></canvas><p class="sub" id="hint" style="display:none">Tap or click the picture to pick a colour.</p>') + H.out('out'),
    init() {
      const cv = FF.$('cv'), out = FF.$('out'), cx = cv.getContext('2d', { willReadFrequently: true });
      FF.drop('d', { accept: FF.isImg, paste: true, onFiles: async f => { try { const img = await FF.decode(f[0]), [w, h] = FF.safeDims(img.naturalWidth, img.naturalHeight); cv.width = w; cv.height = h; cx.drawImage(img, 0, 0, w, h); cv.style.display = 'block'; FF.$('hint').style.display = ''; out.innerHTML = ''; } catch (e) { out.innerHTML = FF.msg('err', 'This file could not be opened as an image.'); } } });
      const pick = e => { const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) * cv.width / r.width), y = Math.floor((e.clientY - r.top) * cv.height / r.height), [R, G, B] = cx.getImageData(Math.max(0, Math.min(cv.width - 1, x)), Math.max(0, Math.min(cv.height - 1, y)), 1, 1).data;
        const hex = '#' + [R, G, B].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(), r1 = R / 255, g1 = G / 255, b1 = B / 255, mx = Math.max(r1, g1, b1), mn = Math.min(r1, g1, b1), l = (mx + mn) / 2, dl = mx - mn;
        let hh = 0, s = 0; if (dl) { s = dl / (1 - Math.abs(2 * l - 1)); hh = mx === r1 ? ((g1 - b1) / dl) % 6 : mx === g1 ? (b1 - r1) / dl + 2 : (r1 - g1) / dl + 4; hh = Math.round((hh * 60 + 360) % 360); }
        out.innerHTML = '<span class="sw" style="background:' + hex + '"></span>' + FF.row('HEX', hex) + FF.row('RGB', 'rgb(' + R + ', ' + G + ', ' + B + ')') + FF.row('HSL', 'hsl(' + hh + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)') + '<div class="btns"><button type="button" id="ch">Copy HEX</button></div>'; FF.$('ch').onclick = () => FF.copy(hex); };
      cv.addEventListener('click', pick);
    }
  });
})();
