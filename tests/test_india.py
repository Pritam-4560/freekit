from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8766/'
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp,accept_downloads=True); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        def T(s,q=''): pg.goto(B+'tools/'+s+'/'+q); pg.wait_for_timeout(300); return pg.inner_text('#res')
        t=T('gratuity-calculator'); assert '1,15,385' in t,t
        t=T('gratuity-calculator','?y=3'); assert 'at least 5 years' in t
        t=T('hra-exemption-calculator','?r=12000'); assert '1,08,000' in t,t
        t=T('gstin-validator','?g=27AAPFU0939F1ZV'); assert 'checksum are valid' in t and 'Maharashtra' in t,t
        t=T('gstin-validator','?g=27AAPFU0939F1ZX'); assert 'typo' in t,t
        t=T('gstin-validator','?g=27AAPFU0939F1'); assert 'exactly 15' in t,t
        t=T('gstin-validator','?g=99ZZZZZ0000Z1ZZ'); print(name,t.split('\n')[0])
        t=T('pan-validator','?p=ABCPE1234F'); assert 'Individual' in t,t
        t=T('pan-validator','?p=ABCXE1234F'); assert 'not a valid holder' in t,t
        t=T('in-hand-salary-calculator','?gross=1200000'); assert 'New regime' in t and 'Old regime' in t; print(name,t.replace('\n',' | ')[:150])
        t=T('in-hand-salary-calculator','?gross=0'); assert 'Enter your annual salary' in t
        # rent receipt
        pg.goto(B+'tools/rent-receipt-generator/'); pg.fill('#tenant','Pritam Das'); pg.fill('#landlord','R Kumar'); pg.fill('#addr','Plot 12, Saheed Nagar, Bhubaneswar'); pg.fill('#cnt','3'); pg.click('#go'); pg.wait_for_timeout(1500)
        with pg.expect_download() as d: pg.click('#out button.go')
        import pypdf; r=pypdf.PdfReader(d.value.path()); assert len(r.pages)==3,len(r.pages); tx=r.pages[0].extract_text(); assert 'Pritam Das' in tx and 'Fifteen Thousand' in tx and 'April' in tx,tx
        pg.fill('#tenant','प्रीतम'); pg.click('#go'); pg.wait_for_timeout(500); assert 'English letters' in pg.inner_text('#out')
        # invoice
        pg.goto(B+'tools/invoice-generator/'); pg.fill('#from','Pritam'); pg.fill('#to','ACME Pvt Ltd'); pg.fill('#gst','18'); pg.click('#go'); pg.wait_for_timeout(1500)
        assert 'Rs. 21,240.00' in pg.inner_text('#out'),pg.inner_text('#out')
        with pg.expect_download() as d2: pg.click('#out button.go')
        import pypdf as P2; tx2=P2.PdfReader(d2.value.path()).pages[0].extract_text(); assert 'ACME Pvt Ltd' in tx2 and '21,240.00' in tx2 and 'Twenty One Thousand Two Hundred Forty' in tx2,tx2
        pg.fill('#items','bad line'); pg.click('#go'); pg.wait_for_timeout(300); assert 'should look like' in pg.inner_text('#out')
        for s in ['in-hand-salary-calculator','rent-receipt-generator','invoice-generator','gstin-validator']:
            pg.goto(B+'tools/'+s+'/'); assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth'),(s,'overflow')
        assert not errs,errs; print(name,'ok')
    br.close()
