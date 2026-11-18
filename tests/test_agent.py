from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8766/'
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(B+'tools/emi-calculator/?principal=500000&rate=9&years=5&run=1'); pg.wait_for_timeout(300)
        t=pg.inner_text('#res'); assert '10,379' in t, t
        ov=pg.evaluate('document.documentElement.scrollWidth>innerWidth'); assert not ov,'overflow'
        pg.goto(B+'tools/gst-calculator/?amt=1000&rate=18&mode=in'); pg.wait_for_timeout(300)
        t=pg.inner_text('#res'); assert '847.46' in t, t
        pg.click('#chips [data-i="2"]'); pg.wait_for_timeout(200); assert pg.input_value('#rate')=='5'
        pg.goto(B+'tools/sip-calculator/?amt=5000&rate=12&years=10&run=1'); pg.wait_for_timeout(300)
        t=pg.inner_text('#res'); print(name,'sip',t.split('\n')[1:3])
        pg.goto(B+'tools/emi-calculator/?principal=&years=0'); pg.wait_for_timeout(300)
        assert 'Enter a loan amount' in pg.inner_text('#res')
        pg.goto(B+'index.html'); pg.fill('#q','gst'); pg.wait_for_timeout(200)
        vis=pg.eval_on_selector_all('.tile:not([hidden])','e=>e.length'); assert vis==1,vis
        assert not errs,errs; print(name,'ok')
    # WebMCP stub
    pg=br.new_page(); pg.add_init_script("navigator.modelContext={tools:[],registerTool(t){this.tools.push(t)}}")
    pg.goto(B+'tools/emi-calculator/'); pg.wait_for_timeout(300)
    r=pg.evaluate("navigator.modelContext.tools[0].execute({principal:500000,rate:9,years:5})")
    print(pg.evaluate("navigator.modelContext.tools[0].name"), r['content'][0]['text'][:60].replace('\n',' | '))
    br.close()
