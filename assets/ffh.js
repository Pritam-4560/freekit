/* Tiny HTML helpers shared by the page builder (Node) and the browser. No DOM access here. */
(function (g) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const at = o => Object.keys(o || {}).filter(k => o[k] !== undefined && o[k] !== false).map(k => ' ' + k + (o[k] === true ? '' : '="' + esc(o[k]) + '"')).join('');
  const wrap = (opt, inner) => '<div' + (opt && opt.full ? ' class="full"' : '') + '>' + inner + '</div>';
  const H = {
    esc,
    num: (id, label, val, opt = {}) => wrap(opt, '<label for="' + id + '">' + label + '</label><input id="' + id + '" type="number" inputmode="' + (opt.int ? 'numeric' : 'decimal') + '"' + at({ value: val, min: opt.min, max: opt.max, step: opt.step, placeholder: opt.ph }) + '>'),
    text: (id, label, val, opt = {}) => wrap(opt, '<label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (opt.type || 'text') + '"' + at({ value: val, placeholder: opt.ph, autocapitalize: opt.upper ? 'characters' : 'off', autocomplete: 'off', maxlength: opt.max, class: opt.mono ? 'mono' : undefined }) + '>'),
    sel: (id, label, options, val, opt = {}) => wrap(opt, '<label for="' + id + '">' + label + '</label><select id="' + id + '">' +
      options.map(o => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>'),
    area: (id, label, val, rows, opt = {}) => wrap(Object.assign({ full: true }, opt), (label ? '<label for="' + id + '">' + label + '</label>' : '') + '<textarea id="' + id + '" rows="' + (rows || 5) + '"' + at({ placeholder: opt.ph, spellcheck: opt.spell ? true : 'false', class: opt.mono ? 'mono' : undefined }) + '>' + esc(val || '') + '</textarea>'),
    chk: (id, label, checked, opt = {}) => wrap(opt, '<label class="chk"><input id="' + id + '" type="checkbox"' + (checked ? ' checked' : '') + '> ' + label + '</label>'),
    range: (id, label, val, min, max, step, opt = {}) => wrap(opt, '<label for="' + id + '">' + label + ' <b id="' + id + '-v"></b></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '">'),
    drop: (id, title, accept, multiple, hint) => '<label class="drop" id="' + id + '"><input type="file" accept="' + esc(accept) + '"' + (multiple ? ' multiple' : '') + '><b>' + title + '</b><small>' + (hint || 'or drag and drop here') + '</small></label>',
    files: id => '<ul class="files" id="' + id + '"></ul>',
    out: id => '<div class="out" id="' + id + '" aria-live="polite"></div>',
    btn: (id, label, cls) => '<button class="go' + (cls ? ' ' + cls : '') + '" id="' + id + '" type="button">' + label + '</button>',
    chips: (id, items) => '<div class="chips" id="' + id + '">' + items.map((t, i) => '<button type="button" class="chip" data-i="' + i + '">' + esc(Array.isArray(t) ? t[0] : t) + '</button>').join('') + '</div>',
    grid: (...p) => '<div class="grid">' + p.join('') + '</div>',
    grid3: (...p) => '<div class="grid g3">' + p.join('') + '</div>',
    card: (...p) => '<div class="card">' + p.join('') + '</div>',
    lab: (t, inner) => '<div><label>' + t + '</label>' + inner + '</div>',
    img: ['image/*,.heic,.heif', 'JPG, PNG, WebP, GIF, BMP, HEIC'],
    IMG_ACCEPT: 'image/*,.heic,.heif',
    PDF_ACCEPT: 'application/pdf,.pdf'
  };
  g.FFH = H;
})(typeof window !== 'undefined' ? window : globalThis);
