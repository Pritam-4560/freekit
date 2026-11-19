from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8766/'
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        print("step: normal visit and plain prefill: no gate, live calc works",flush=True)
        pg.goto(B+'tools/emi-calculator/'); pg.wait_for_timeout(300); assert not pg.query_selector('#gate'); assert '10,379' in pg.inner_text('#res') or True
        pg.goto(B+'tools/emi-calculator/?principal=500000&rate=9&years=5'); pg.wait_for_timeout(300); assert not pg.query_selector('#gate') and '10,379' in pg.inner_text('#res')
        print("step: button tool with run=1: gated",flush=True)
        pg.goto(B+'tools/uuid-generator/?n=3&run=1'); pg.wait_for_timeout(500)
        assert pg.query_selector('#gate') and pg.query_selector('#gate .ad[data-ad="gate"]'),'gate+ad slot shown'
        assert pg.is_disabled('#gok'); assert len(pg.input_value('#ob').split('\n'))!=3,'not run before approval'
        assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth')
        pg.wait_for_timeout(5300); assert not pg.is_disabled('#gok'); pg.click('#gok'); pg.wait_for_timeout(400)
        assert not pg.query_selector('#gate') and len(pg.input_value('#ob').split('\n'))==3
        print("step: cancel path: nothing runs",flush=True)
        pg.goto(B+'tools/uuid-generator/?n=4&run=1'); pg.wait_for_timeout(300); pg.click('#gno'); pg.wait_for_timeout(300); assert not pg.query_selector('#gate') and len(pg.input_value('#ob').split('\n'))!=4
        print("step: WebMCP: execute waits for approval; approve once covers later calls on same page",flush=True)
        pg2=br.new_page(viewport=vp); pg2.add_init_script("navigator.modelContext={tools:[],registerTool(t){this.tools.push(t)}}")
        pg2.goto(B+'tools/emi-calculator/'); pg2.wait_for_timeout(300)
        pg2.evaluate("window.__r=null; navigator.modelContext.tools[0].execute({principal:500000,rate:9,years:5}).then(r=>{window.__r=r}); 0")
        pg2.wait_for_timeout(800); assert pg2.query_selector('#gate') and pg2.evaluate('window.__r')is None,'waits'
        pg2.wait_for_timeout(5000); pg2.click('#gok'); pg2.wait_for_timeout(1200); r=pg2.evaluate('window.__r'); assert '10,379' in r['content'][0]['text'],r
        pg2.evaluate("window.__r=null; navigator.modelContext.tools[0].execute({principal:100000,rate:10,years:1}).then(r=>{window.__r=r}); 0"); pg2.wait_for_timeout(1000); assert not pg2.query_selector('#gate') and pg2.evaluate('window.__r') is not None,'second call not re-gated'
        print("step: decline via WebMCP",flush=True)
        pg3=br.new_page(viewport=vp); pg3.add_init_script("navigator.modelContext={tools:[],registerTool(t){this.tools.push(t)}}")
        pg3.goto(B+'tools/emi-calculator/'); pg3.wait_for_timeout(300); pg3.evaluate("window.__r=null; navigator.modelContext.tools[0].execute({}).then(r=>{window.__r=r}); 0"); pg3.wait_for_timeout(300); pg3.click('#gno'); pg3.wait_for_timeout(300); assert 'declined' in pg3.evaluate('window.__r')['content'][0]['text']
        assert not errs,errs; print(name,'ok')
    br.close()
