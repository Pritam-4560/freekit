from playwright.sync_api import sync_playwright
import os,re
B='http://127.0.0.1:8766/'; FX='/home/claude/fitfile/fx/'
def go(pg,slug,fx,setup=None,expect=None,btn='#go',wait=2500):
    pg.goto(B+'tools/'+slug+'/'); 
    with pg.expect_file_chooser() as fc: pg.click('#d')
    fc.value.set_files(FX+fx); pg.wait_for_timeout(200)
    if setup: setup(pg)
    pg.click(btn); pg.wait_for_timeout(wait)
    t=pg.inner_text('#out'); 
    if expect: assert re.search(expect,t,re.S),(slug,t)
    return t
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp,has_touch=(name=='phone')); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        t=go(pg,'resize-image-to-kb','big.jpg',lambda g:g.fill('#max','50'),r'Result'); 
        sz=pg.evaluate("fetch(document.querySelector('img.prev').src).then(r=>r.blob()).then(b=>b.size)"); assert sz<=50*1024,sz; print(name,'kb',sz)
        go(pg,'resize-image-to-kb','tiny.png',lambda g:(g.fill('#max','100'),g.fill('#min','90')),r'below your')
        go(pg,'compress-image','big.jpg',None,r'Result')
        go(pg,'resize-image','land.jpg',lambda g:g.fill('#w','200'),r'200')
        go(pg,'convert-image','trans.png',None,r'Result')
        go(pg,'heic-to-jpg','land.jpg',None,r'Result')
        go(pg,'rotate-flip-image','land.jpg',None,r'Result')
        go(pg,'remove-image-metadata','big.jpg',None,r'metadata removed|Metadata removed')
        go(pg,'add-watermark-to-image','land.jpg',None,r'Result')
        t=go(pg,'image-to-base64','tiny.png',None,r'characters'); assert 'data:image' in pg.input_value('#b64')
        go(pg,'passport-photo-maker','land.jpg',None,r'photos on one sheet')
        go(pg,'signature-cleaner','land.jpg',None,r'Result|No signature')
        pg.goto(B+'tools/image-color-picker/')
        with pg.expect_file_chooser() as fc: pg.click('#d')
        fc.value.set_files(FX+'land.jpg'); pg.wait_for_timeout(500); pg.click('#cv'); pg.wait_for_timeout(200); assert '#' in pg.inner_text('#out')
        pg.goto(B+'tools/resize-image/'); pg.click('#go'); pg.wait_for_timeout(200); assert 'Choose an image' in pg.inner_text('#out')
        for s in ['resize-image-to-kb','passport-photo-maker','image-to-base64']:
            pg.goto(B+'tools/'+s+'/'); assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth'),(name,s,'overflow')
        assert not errs,errs; print(name,'ok')
    br.close()
