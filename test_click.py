import sys, os, http.server, threading, functools
from playwright.sync_api import sync_playwright

TARGET = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
ROOT = '/home/claude/fitfile'; FX = ROOT + '/fx'; NM = '/home/claude/libs/node_modules'
MAP = {'pdf-lib.min.js': NM + '/pdf-lib/dist/pdf-lib.min.js', 'pdf.min.js': NM + '/pdfjs-dist/build/pdf.min.js',
       'pdf.worker.min.js': NM + '/pdfjs-dist/build/pdf.worker.min.js', 'qrcode.min.js': NM + '/qrcode-generator/qrcode.js'}
def route(r):
    fn = r.request.url.split('/')[-1]
    r.fulfill(path=MAP[fn], content_type='application/javascript') if fn in MAP else r.abort()

# serve over http with a sandboxed-iframe wrapper (like the artifact viewer)
open(ROOT + '/frame.html', 'w').write('<!DOCTYPE html><iframe id="f" src="/%s" sandbox="allow-scripts allow-same-origin allow-downloads" style="width:390px;height:844px;border:0"></iframe>' % TARGET)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()

TOOLS = [('fit-image', 'fi-drop', FX + '/land.jpg', 'fi-name'), ('compress-pdf', 'cp-drop', FX + '/three.pdf', 'cp-name'),
         ('img2pdf', 'ip-drop', FX + '/land.jpg', 'ip-list'), ('merge', 'mg-drop', FX + '/three.pdf', 'mg-list'), ('split', 'sp-drop', FX + '/three.pdf', 'sp-name')]
ok = fail = 0
def check(name, cond):
    global ok, fail
    print(('PASS ' if cond else 'FAIL ') + name); ok += cond; fail += (not cond)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for label, vp, mobile, framed in [('pc', {'width': 1366, 'height': 900}, False, False),
                                      ('phone-tap', {'width': 390, 'height': 844}, True, False),
                                      ('sandboxed-frame', {'width': 420, 'height': 900}, False, True)]:
        ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile)
        page = ctx.new_page(); page.route('https://cdnjs.cloudflare.com/**', route)
        for tool, drop, f, listid in TOOLS:
            if framed:
                page.goto('http://127.0.0.1:8765/frame.html'); fr = page.frame_locator('#f')
                page.evaluate("t => document.getElementById('f').contentWindow.location.hash = t", tool); page.wait_for_timeout(200)
                target = fr.locator('#' + drop)
            else:
                page.goto(f'http://127.0.0.1:8765/{TARGET}#{tool}'); target = page.locator('#' + drop)
            try:
                with page.expect_file_chooser(timeout=3000) as fc:
                    target.tap() if mobile else target.click()
                fc.value.set_files(f)
                lst = (fr if framed else page).locator('#' + listid)
                lst.locator('li').first.wait_for(timeout=3000)
                check(f'{label}: {tool} click opens picker and loads file', True)
            except Exception as e:
                check(f'{label}: {tool} click opens picker and loads file', False)
        ctx.close()
    b.close()
srv.shutdown()
print(f'{ok}/{ok+fail} passed')
