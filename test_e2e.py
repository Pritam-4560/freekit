import os, sys, json
from playwright.sync_api import sync_playwright

ROOT = '/home/claude/fitfile'
FX = ROOT + '/fx'
NM = '/home/claude/libs/node_modules'
MAP = {
    'pdf-lib.min.js': NM + '/pdf-lib/dist/pdf-lib.min.js',
    'pdf.min.js': NM + '/pdfjs-dist/build/pdf.min.js',
    'pdf.worker.min.js': NM + '/pdfjs-dist/build/pdf.worker.min.js',
    'qrcode.min.js': NM + '/qrcode-generator/qrcode.js',
    'heic2any.min.js': NM + '/heic2any/dist/heic2any.min.js',
}
results = []
def check(name, cond, info=''):
    results.append((name, bool(cond), info))
    print(('PASS ' if cond else 'FAIL ') + name + (' | ' + str(info) if info else ''))

def route(r):
    fn = r.request.url.split('/')[-1]
    if fn in MAP:
        r.fulfill(path=MAP[fn], content_type='application/javascript')
    else:
        r.abort()

def out_text(page, id):
    return page.inner_text('#' + id)

def run(p, viewport, label, mobile=False):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport=viewport, accept_downloads=True, is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.route('https://cdnjs.cloudflare.com/**', route)
    page.route('https://cdn.jsdelivr.net/**', route)
    page.goto('file://' + ROOT + '/index.html')
    page.screenshot(path=f'{ROOT}/shot-{label}-home.png', full_page=True)

    def dl(btn_scope):
        with page.expect_download(timeout=60000) as d:
            page.click(btn_scope + ' button.go:has-text("Download")')
        path = d.value.path(); return d.value.suggested_filename, os.path.getsize(path), path

    # ---- Fit image: big jpg to 20-50KB
    page.goto('file://' + ROOT + '/index.html#fit-image')
    page.click('#fi-go'); check(label+' fit: no file message', 'Choose an image' in out_text(page, 'fi-out'))
    page.set_input_files('#fi-drop input', FX + '/big.jpg')
    page.click('#fi-presets button:has-text("20–50 KB")')
    page.click('#fi-go'); page.wait_for_selector('#fi-out button.go', timeout=60000)
    name, size, _ = dl('#fi-out')
    check(label+' fit: 12MB noisy jpg -> 20-50KB', 20*1024 <= size <= 50*1024, f'{name} {size/1024:.1f}KB')
    # exact pixels square
    page.click('#fi-presets button:has-text("600×600")')
    page.click('#fi-go'); page.wait_for_selector('#fi-out button.go', timeout=60000)
    t = out_text(page, 'fi-out'); name, size, path = dl('#fi-out')
    check(label+' fit: 600x600 <=240KB', '600 × 600' in t and size <= 240*1024, f'{size/1024:.1f}KB')
    # transparent png -> jpg white bg, min too high
    page.set_input_files('#fi-drop input', FX + '/tiny.png')
    page.fill('#fi-min', '10'); page.fill('#fi-max', '20'); page.fill('#fi-w', ''); page.fill('#fi-h', '')
    page.click('#fi-go'); page.wait_for_selector('#fi-out button.go', timeout=60000)
    check(label+' fit: tiny image warns below min', 'below your 10 KB minimum' in out_text(page, 'fi-out'))
    # min >= max validation
    page.fill('#fi-min', '60'); page.fill('#fi-max', '50'); page.click('#fi-go')
    check(label+' fit: min>=max validation', 'Min size must be smaller' in out_text(page, 'fi-out'))
    # impossible: png fixed big dims tiny limit
    page.set_input_files('#fi-drop input', FX + '/big.jpg')
    page.fill('#fi-min', ''); page.fill('#fi-max', '1'); page.fill('#fi-w', '3000'); page.fill('#fi-h', '3000'); page.select_option('#fi-fmt', 'png')
    page.click('#fi-go'); page.wait_for_function("document.querySelector('#fi-out').innerText.includes('Could not') || document.querySelector('#fi-out button')", timeout=120000)
    check(label+' fit: impossible target gives clear error', 'Could not get under 1 KB' in out_text(page, 'fi-out'))
    page.select_option('#fi-fmt', 'jpeg'); page.fill('#fi-w', ''); page.fill('#fi-h', '')
    # broken image file
    page.set_input_files('#fi-drop input', {'name': 'fake.jpg', 'mimeType': 'image/jpeg', 'buffer': b'garbage'})
    page.fill('#fi-max', '50'); page.click('#fi-go'); page.wait_for_function("document.querySelector('#fi-out .msg.err')", timeout=20000)
    check(label+' fit: corrupt image error', 'could not be opened' in out_text(page, 'fi-out'))
    # wrong type rejected
    page.set_input_files('#fi-drop input', FX + '/one.pdf')
    check(label+' fit: pdf rejected on image tool', page.inner_text('#toast') != '' )

    # ---- Image to PDF (2 images incl landscape) then compress
    page.goto('file://' + ROOT + '/index.html#img2pdf')
    page.set_input_files('#ip-drop input', [FX + '/big.jpg', FX + '/land.jpg'])
    page.click('#ip-list li:nth-child(2) button[data-a=up]')
    check(label+' img2pdf: reorder works', page.inner_text('#ip-list li:first-child span') == 'land.jpg')
    page.click('#ip-go'); page.wait_for_selector('#ip-out button.go', timeout=120000)
    name, size, bigpdf = dl('#ip-out'); import shutil; shutil.copy(bigpdf, FX+'/photos.pdf'); bigpdf = FX+'/photos.pdf'; check(label+' img2pdf: 2-page PDF', 'Pages' in out_text(page, 'ip-out') and size > 10000, f'{size/1024:.0f}KB')
    page.fill('#ip-max', '300'); page.click('#ip-go'); page.wait_for_selector('#ip-out button.go', timeout=120000)
    name, size, _ = dl('#ip-out'); check(label+' img2pdf: under 300KB limit', size <= 300*1024 or 'smallest' in out_text(page,'ip-out'), f'{size/1024:.0f}KB')

    page.goto('file://' + ROOT + '/index.html#compress-pdf')
    page.set_input_files('#cp-drop input', bigpdf)
    page.fill('#cp-max', '200'); page.click('#cp-go'); page.wait_for_selector('#cp-out button.go, #cp-out .msg.err', timeout=240000)
    t = out_text(page, 'cp-out')
    if 'Download' in t:
        name, size, _ = dl('#cp-out'); check(label+' compress: under 200KB', size <= 200*1024, f'{size/1024:.0f}KB')
    else: check(label+' compress: under 200KB', False, t)
    page.set_input_files('#cp-drop input', FX + '/three.pdf'); page.fill('#cp-max', '500'); page.click('#cp-go'); page.wait_for_selector('#cp-out .msg', timeout=10000); page.wait_for_timeout(300)
    check(label+' compress: already-small message', 'already' in out_text(page, 'cp-out'))
    page.set_input_files('#cp-drop input', FX + '/broken.pdf'); page.fill('#cp-max', '1'); page.click('#cp-go')
    page.wait_for_selector('#cp-out .msg.err', timeout=30000)
    check(label+' compress: broken pdf error', 'not a valid PDF' in out_text(page, 'cp-out'), out_text(page,'cp-out'))

    # ---- Merge
    page.goto('file://' + ROOT + '/index.html#merge')
    page.set_input_files('#mg-drop input', FX + '/three.pdf'); page.click('#mg-go')
    check(label+' merge: needs 2 files', 'at least two' in out_text(page, 'mg-out'))
    page.set_input_files('#mg-drop input', FX + '/one.pdf'); page.click('#mg-go'); page.wait_for_selector('#mg-out button.go', timeout=30000)
    check(label+' merge: 4 pages', 'Total pages\n4' in out_text(page, 'mg-out') or '4' in out_text(page, 'mg-out'), out_text(page,'mg-out'))
    page.set_input_files('#mg-drop input', FX + '/broken.pdf'); page.click('#mg-go'); page.wait_for_selector('#mg-out .msg.err', timeout=30000)
    check(label+' merge: names broken file', 'broken.pdf' in out_text(page, 'mg-out'))

    # ---- Split
    page.goto('file://' + ROOT + '/index.html#split')
    page.set_input_files('#sp-drop input', FX + '/three.pdf')
    for txt, exp in [('1-2', '2 of 3'), ('3-', '1 of 3'), ('5', 'outside'), ('abc', 'not a page'), ('2,2,1', '2 of 3')]:
        page.fill('#sp-pages', txt); page.click('#sp-go'); page.wait_for_function("document.querySelector('#sp-out').innerText.length>0", timeout=20000)
        page.wait_for_timeout(300)
        check(label+f' split: "{txt}"', exp in out_text(page, 'sp-out'), out_text(page, 'sp-out')[:80])
    page.select_option('#sp-mode', 'remove'); page.fill('#sp-pages', '1-3'); page.click('#sp-go'); page.wait_for_timeout(500)
    check(label+' split: remove all -> error', 'no pages' in out_text(page, 'sp-out'))

    # ---- QR
    page.goto('file://' + ROOT + '/index.html#qr'); page.wait_for_selector('#qr-out img', timeout=20000)
    check(label+' qr: default renders', True)
    page.fill('#qr-text', 'नमस्ते 👋 unicode'); page.wait_for_timeout(600); check(label+' qr: unicode ok', page.query_selector('#qr-out img') is not None)
    page.fill('#qr-text', 'x' * 5000); page.wait_for_timeout(600); check(label+' qr: too long msg', 'too long' in out_text(page, 'qr-out'))
    page.select_option('#qr-type', 'upi'); page.fill('#qr-upi', 'bad id'); page.wait_for_timeout(600)
    check(label+' qr: invalid UPI warn', 'UPI ID' in out_text(page, 'qr-out'))
    page.fill('#qr-upi', 'pritam@okaxis'); page.wait_for_timeout(600); check(label+' qr: UPI renders', page.query_selector('#qr-out img') is not None)

    # ---- EMI + calculators
    page.goto('file://' + ROOT + '/index.html#emi')
    check(label+' emi: 5L 10.5% 5y = 10,747', '10,747' in out_text(page, 'em-res'), out_text(page,'em-res')[:40])
    page.fill('#em-r', '0'); check(label+' emi: 0% rate', '8,333' in out_text(page, 'em-res'))
    page.fill('#em-n', ''); check(label+' emi: empty tenure msg', 'Enter a loan' in out_text(page, 'em-res'))
    page.select_option('#em-cur', 'USD'); page.fill('#em-n', '5'); page.fill('#em-r', '10.5'); check(label+' emi: USD format', '$' in out_text(page, 'em-res'))
    page.goto('file://' + ROOT + '/index.html#salary-in'); page.fill('#s-gross', '-5000')
    check(label+' salary: negative input safe', 'NaN' not in out_text(page, 's-res'))
    page.goto('file://' + ROOT + '/index.html#gratuity-in'); check(label+' gratuity: 1,21,154', '1,21,154' in out_text(page, 'g-res'))
    page.goto('file://' + ROOT + '/index.html#nonsense'); check(label+' router: unknown hash -> home', page.is_visible('#t-home'))

    page.goto('file://' + ROOT + '/index.html#fit-image'); page.screenshot(path=f'{ROOT}/shot-{label}-fit.png', full_page=True)
    # layout: no horizontal scroll
    sw = page.evaluate('document.documentElement.scrollWidth'); check(label+' layout: no sideways scroll', sw <= viewport['width'], sw)
    check(label+' no JS errors', not errs, errs[:3])
    b.close()

with sync_playwright() as p:
    run(p, {'width': 1366, 'height': 900}, 'pc')
    run(p, {'width': 390, 'height': 844}, 'phone', mobile=True)
fails = [r for r in results if not r[1]]
print(f'\n{len(results)-len(fails)}/{len(results)} passed')
