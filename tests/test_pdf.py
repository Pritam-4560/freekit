from playwright.sync_api import sync_playwright
import re,zipfile,io
B='http://127.0.0.1:8766/'; FX='/home/claude/fitfile/fx/'
def pick(pg,fxs):
    with pg.expect_file_chooser() as fc: pg.click('#d')
    fc.value.set_files([FX+f for f in fxs] if isinstance(fxs,list) else FX+fxs); pg.wait_for_timeout(300)
def dlbytes(pg):
    with pg.expect_download() as d: pg.click('#out button.go')
    return open(d.value.path(),'rb').read()
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp,accept_downloads=True,has_touch=(name=='phone')); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(B+'tools/merge-pdf/'); pick(pg,['one.pdf','three.pdf']); pg.click('#go'); pg.wait_for_timeout(2500)
        assert 'Totalpages4' in pg.inner_text('#out').replace('\n','').replace(' ',''),pg.inner_text('#out')
        assert dlbytes(pg)[:5]==b'%PDF-'
        pg.goto(B+'tools/merge-pdf/'); pick(pg,['one.pdf','broken.pdf']); pg.click('#go'); pg.wait_for_timeout(1500); assert 'broken.pdf' in pg.inner_text('#out'),pg.inner_text('#out')
        pg.goto(B+'tools/split-pdf/'); pick(pg,'three.pdf'); pg.fill('#pages','2-3'); pg.click('#go'); pg.wait_for_timeout(1500); assert '2 of 3' in pg.inner_text('#out')
        pg.fill('#pages','9'); pg.click('#go'); pg.wait_for_timeout(800); assert 'outside' in pg.inner_text('#out')
        pg.goto(B+'tools/remove-pdf-pages/'); pick(pg,'three.pdf'); pg.fill('#pages','1'); pg.click('#go'); pg.wait_for_timeout(1500); assert '2 of 3' in pg.inner_text('#out')
        for s,ex in [('rotate-pdf','Pages rotated'),('add-page-numbers-to-pdf','Pages numbered'),('pdf-watermark','File size')]:
            pg.goto(B+'tools/'+s+'/'); pick(pg,'three.pdf'); pg.click('#go'); pg.wait_for_timeout(1500); assert ex in pg.inner_text('#out'),(s,pg.inner_text('#out'))
        pg.goto(B+'tools/compress-pdf/'); pick(pg,'photos.pdf'); pg.fill('#max','300'); pg.click('#go'); pg.wait_for_timeout(15000)
        print(name,'compress:',pg.inner_text('#out').replace('\n',' | ')[:110])
        pg.goto(B+'tools/compress-pdf/'); pick(pg,'broken.pdf'); pg.click('#go'); pg.wait_for_timeout(1000); assert 'not a valid PDF' in pg.inner_text('#out'),pg.inner_text('#out')
        pg.click('#pre [data-i="1"]'); assert pg.input_value('#max')=='200'
        pg.goto(B+'tools/image-to-pdf/'); pick(pg,['big.jpg','land.jpg']); pg.click('#go'); pg.wait_for_timeout(4000); assert 'Pages' in pg.inner_text('#out'); assert dlbytes(pg)[:5]==b'%PDF-'
        pg.goto(B+'tools/pdf-to-jpg/'); pick(pg,'three.pdf'); pg.click('#go'); pg.wait_for_timeout(5000)
        z=zipfile.ZipFile(io.BytesIO(dlbytes(pg))); assert len(z.namelist())==3 and z.testzip() is None,z.namelist(); assert z.read(z.namelist()[0])[:2]==b'\xff\xd8'
        pg.goto(B+'tools/pdf-to-text/'); pick(pg,'three.pdf'); pg.click('#go'); pg.wait_for_timeout(2500); print(name,'text:',pg.inner_text('#out').replace('\n',' | ')[:100])
        assert not errs,errs
        for s in ['merge-pdf','compress-pdf','image-to-pdf']:
            pg.goto(B+'tools/'+s+'/'); assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth'),(s,'overflow')
        print(name,'ok')
    br.close()
