from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8766/'
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp,tz in [('pc',{'width':1280,'height':800},'Asia/Kolkata'),('phone',{'width':390,'height':780},'America/Los_Angeles')]:
        ctx=br.new_context(viewport=vp,timezone_id=tz); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        def T(s,q='',sel='#res'): pg.goto(B+'tools/'+s+'/'+q); pg.wait_for_timeout(350); return pg.inner_text(sel).replace('\n',' | ')
        def A(s,q,*need):
            t=T(s,q); [ (_ for _ in ()).throw(AssertionError((s,q,n,t))) for n in need if n not in t ]; return t
        A('bmi-calculator','','22.5','Normal weight'); A('bmi-calculator','?h=0','Enter your weight and height')
        A('age-calculator','?dob=2000-01-01&on=2026-11-18','26 years, 10 months, 17 days')
        A('age-calculator','?dob=2000-02-29&on=2026-02-28','25 years, 11 months, 30 days')
        A('age-calculator','?dob=2030-01-01&on=2026-01-01','after')
        A('days-between-dates','?a=2026-01-01&b=2026-01-31','30')
        A('add-days-to-date','?d=2026-01-31&n=30&un=d','2 March 2026'); A('add-days-to-date','?d=2026-01-31&n=1&un=m','28 February 2026')
        A('cgpa-to-percentage','','77.9')
        A('length-converter','?v=1&a=mi&b=km','1.609344'); A('area-converter','?v=1&a=acre&b=sqft','43,560'); A('area-converter','?v=1&a=cent&b=sqft','435.6'); A('temperature-converter','','37.78'); A('temperature-converter','?v=-300&a=c','absolute zero')
        A('weight-converter','?v=1&a=kg&b=lb','2.20462'); A('data-size-converter','?v=1&a=2&base=1024','1,024')
        A('number-to-words','','Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Fifty Paise Only')
        A('number-to-words','?n=1000000&sys=intl&rs=0','One Million'); A('number-to-words','?n=abc','digits only')
        A('roman-numeral-converter','','MMXXVI'); A('roman-numeral-converter','?v=XIV','14'); A('roman-numeral-converter','?v=IIII','not a correctly written')
        A('number-base-converter','','FF','11111111'); A('number-base-converter','?v=zz&b=10','not a valid')
        A('color-converter','?t=%23fff','#FFFFFF'); A('color-converter','?t=rgb(36,84,230)','#2454E6'); A('color-converter','?t=hsl(0,100%25,50%25)','#FF0000')
        A('unix-timestamp-converter','?ts=1767225600','2026-01-01T00:00:00.000Z'); A('unix-timestamp-converter','?ts=1767225600000','2026-01-01T00:00:00.000Z')
        t=T('time-zone-converter','?dt=2026-11-18T10:00&from=Asia/Kolkata'); assert 'New York | Tue 17 Nov, 23:30' in t.replace('\xa0',' ') or '23:30' in t, t
        assert 'London | Wed 18 Nov, 04:30' in t.replace('\xa0',' ') or '04:30' in t,t
        t=T('time-zone-converter','?dt=2026-07-01T10:00&from=Asia/Kolkata'); assert '00:30' in t and 'Wed 1 Jul' in t, t  # NY EDT = UTC-4 -> 00:30
        for s in ['length-converter','time-zone-converter','number-to-words','age-calculator']:
            pg.goto(B+'tools/'+s+'/'); assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth'),(s,'overflow')
        assert not errs,errs; print(name,'ok')
    br.close()
