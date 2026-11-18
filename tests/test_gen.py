from playwright.sync_api import sync_playwright
import io
B='http://127.0.0.1:8766/'; FX='/home/claude/fitfile/fx/'
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp,accept_downloads=True); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(B+'tools/qr-code-generator/'); pg.fill('#text','https://pritam.dev/hello'); pg.wait_for_timeout(800)
        with pg.expect_download() as d: pg.click('#dp')
        png=d.value.path()
        # decode generated QR with jsQR in a second page
        pg2=br.new_page(); pg2.goto(B+'tools/qr-code-reader/')
        with pg2.expect_file_chooser() as fc: pg2.click('#d')
        fc.value.set_files(png); pg2.wait_for_timeout(1500); t=pg2.inner_text('#out'); assert 'https://pritam.dev/hello' in t,t
        # UPI + wifi + svg
        pg.select_option('#type','upi'); pg.fill('#upi','bad id'); pg.wait_for_timeout(500); assert "doesn't look like a UPI" in pg.inner_text('#out')
        pg.fill('#upi','pritam@okaxis'); pg.fill('#upa','250'); pg.wait_for_timeout(700)
        with pg.expect_download() as d: pg.click('#dp')
        pg2.goto(B+'tools/qr-code-reader/')
        with pg2.expect_file_chooser() as fc: pg2.click('#d')
        fc.value.set_files(d.value.path()); pg2.wait_for_timeout(1500); t=pg2.inner_text('#out'); assert 'upi://pay?pa=pritam%40okaxis&am=250.00&cu=INR' in t,t
        with pg.expect_download() as d: pg.click('#ds')
        s=open(d.value.path()).read(); assert s.startswith('<svg') and '<path' in s
        pg2.goto(B+'tools/qr-code-reader/')
        with pg2.expect_file_chooser() as fc: pg2.click('#d')
        fc.value.set_files(FX+'land.jpg'); pg2.wait_for_timeout(1500); assert 'No QR code found' in pg2.inner_text('#out')
        # barcode
        pg.goto(B+'tools/barcode-generator/'); pg.wait_for_timeout(600); assert pg.query_selector('#out img.prev')
        pg.select_option('#fmt','EAN13'); pg.fill('#val','123'); pg.wait_for_timeout(500); assert 'does not fit' in pg.inner_text('#out')
        pg.fill('#val','5901234123457'); pg.wait_for_timeout(500); assert pg.query_selector('#out img.prev')
        # random
        pg.goto(B+'tools/random-number-generator/'); pg.fill('#min','1'); pg.fill('#max','5'); pg.fill('#cnt','5'); pg.click('#go'); nums=sorted(int(x) for x in pg.inner_text('#out .big').split(', ')); assert nums==[1,2,3,4,5],nums
        pg.fill('#cnt','6'); pg.click('#go'); assert 'only has 5' in pg.inner_text('#out')
        pg.goto(B+'tools/coin-flip-and-dice/'); pg.click('#flip'); assert pg.inner_text('#show') in ('Heads','Tails'); pg.click('#go'); assert '=' in pg.inner_text('#show')
        pg.goto(B+'tools/random-name-picker/'); pg.click('#go'); assert pg.inner_text('#out .big') in 'Asha Ravi Meera Kiran John'
        pg.select_option('#mode','teams'); pg.fill('#n','2'); pg.click('#go'); assert 'Team 2' in pg.inner_text('#out')
        pg.goto(B+'tools/online-stopwatch/'); pg.click('#go'); pg.wait_for_timeout(1200); pg.click('#lap'); pg.click('#go'); v=pg.inner_text('#t'); assert v.startswith('0:01'),v
        pg.goto(B+'tools/countdown-timer/'); pg.fill('#m','0'); pg.fill('#s','2'); pg.click('#go'); pg.wait_for_timeout(2600); assert 'Time is up' in pg.inner_text('#msg')
        pg.goto(B+'tools/online-notepad/'); pg.fill('#pad','hello notes'); pg.wait_for_timeout(200); pg.reload(); assert pg.input_value('#pad')=='hello notes'; assert '2 words' in pg.inner_text('#stat')
        for s in ['qr-code-generator','barcode-generator','online-notepad','countdown-timer']:
            pg.goto(B+'tools/'+s+'/'); assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth'),(s,'overflow')
        assert not errs,errs; print(name,'ok')
    br.close()
