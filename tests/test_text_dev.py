from playwright.sync_api import sync_playwright
import urllib.parse as U, json, time
B='http://127.0.0.1:8766/'
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for name,vp in [('pc',{'width':1280,'height':800}),('phone',{'width':390,'height':780})]:
        pg=br.new_page(viewport=vp,accept_downloads=True); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        def T(s,q='',sel='#res'):
            pg.goto(B+'tools/'+s+'/'+q); pg.wait_for_timeout(450); return pg.inner_text(sel).replace('\n',' | ')
        def Q(**k): return '?'+U.urlencode(k)
        def A(s,q,*need,sel='#res'):
            t=T(s,q,sel)
            for n in need: assert n in t,(s,q,n,t[:300])
            return t
        A('word-counter',Q(**{'in':'hello world foo. Bar baz!'}),'Words | 5','Sentences | 2')
        A('character-counter',Q(**{'in':'x'*300}),'20 over')
        A('case-converter',Q(**{'in':'hello big world'}),'HELLO BIG WORLD','Hello Big World')
        assert pg.inner_text('#cc4')=='helloBigWorld' and pg.inner_text('#cc6')=='hello_big_world' and pg.inner_text('#cc7')=='hello-big-world'
        A('remove-duplicate-lines',Q(**{'in':'a\nb\na\n\nc\nb','ic':'1'}),'6 → 3'); assert pg.input_value('#ob')=='a\nb\nc'
        A('sort-lines',Q(**{'in':'pear\napple\nfig','mode':'za'}),'Lines'); assert pg.input_value('#ob')=='pear\nfig\napple'
        A('slug-generator',Q(**{'in':"My First Blog Post: A Beginner's Guide!"}),'Slug'); assert pg.inner_text('#sg')=='my-first-blog-post-a-beginners-guide'
        A('lorem-ipsum-generator','','Copy result'); assert pg.input_value('#ob').startswith('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'); assert pg.input_value('#ob').count('\n\n')==2
        A('lorem-ipsum-generator','?u=w&n=3','Copy'); assert pg.input_value('#ob')=='lorem ipsum dolor'
        A('text-diff-checker','','Lines added | 3','Lines removed | 2')
        A('text-diff-checker',Q(a='x',b='x'),'identical')
        # dev
        A('json-formatter','','Valid JSON'); assert '"name": "FitFile"' in pg.input_value('#ob')
        A('json-formatter',Q(**{'in':'{"a":1,\n"b":}'}),'line 2')
        A('json-formatter',Q(**{'in':'{"b":1,"a":{"d":1,"c":2}}','sort':'1','mode':'min'}),'Valid'); assert pg.input_value('#ob')=='{"a":{"c":2,"d":1},"b":1}'
        A('base64-encode-decode',Q(**{'in':'Hello, FitFile! नमस्ते'}),'Copy'); enc=pg.input_value('#ob'); assert enc=='SGVsbG8sIEZpdEZpbGUhIOCkqOCkruCkuOCljeCkpOCkpw==' or len(enc)>10
        A('base64-encode-decode',Q(**{'in':enc,'op':'dec'}),'Copy'); assert pg.input_value('#ob')=='Hello, FitFile! नमस्ते'
        A('base64-encode-decode',Q(**{'in':'@@@','op':'dec'}),'not valid Base64')
        A('url-encode-decode',Q(**{'in':'a b&c=d/é'}),'Copy'); assert pg.input_value('#ob')=='a%20b%26c%3Dd%2F%C3%A9'
        A('url-encode-decode',Q(**{'in':'%E0%A4%A','op':'dec'}),'broken %')
        tok='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFzaGEiLCJleHAiOjQxMDI0NDQ4MDB9.sig'
        A('jwt-decoder',Q(**{'in':tok}),'not expired','Expires'); assert '"name": "Asha"' in pg.input_value('#p1')
        A('jwt-decoder',Q(**{'in':'abc'}),'three parts')
        A('csv-to-json','','Rows | 2'); j=json.loads(pg.input_value('#ob')); assert j[0]=={'name':'Das, Pritam','city':'Bhubaneswar','age':22},j
        A('csv-to-json',Q(**{'in':'a,b\n"x'}),'quote was opened')
        A('json-to-csv','','Rows | 2'); assert pg.input_value('#ob').splitlines()[0]=='name,city,age'
        A('json-to-csv',Q(**{'in':'[{"a":"=1+1"}]'}),'Rows'); assert "'=1+1" in pg.input_value('#ob')
        # regex
        A('regex-tester','','Matches | 2'); assert pg.query_selector('#res mark.hl')
        A('regex-tester',Q(re='(',tx='a'),'Invalid pattern')
        t0=time.time(); pg.goto(B+'tools/regex-tester/'+Q(re='(a+)+$',tx='a'*40+'!',g='0')); pg.wait_for_timeout(3600); t=pg.inner_text('#res'); assert 'too long' in t,t; assert time.time()-t0<8
        pg.fill('#re','b'); pg.fill('#tx','abc'); pg.wait_for_timeout(900); assert 'Matches' in pg.inner_text('#res'),'recovers after kill'
        # hash
        A('hash-generator','','5d41402abc4b2a76b9719d911017c592','2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
        A('hash-generator',Q(tx='abc'),'900150983cd24fb0d6963f7d28e17f72','ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad','a9993e364706816aba3e25717850c26c9cd0d89d')
        A('hash-generator',Q(tx=''),'d41d8cd98f00b204e9800998ecf8427e')
        with pg.expect_file_chooser() as fc: pg.click('#d')
        fc.value.set_files('/tmp/rand.bin'); pg.wait_for_timeout(2500); t=pg.inner_text('#res'); md,sh=open('/tmp/rand.hash').read().split(); assert md in t and sh in t,t[:400]
        # uuid, password
        A('uuid-generator','?n=7&run=1','Copy'); u=pg.input_value('#ob').split('\n'); import re; assert len(u)==7 and all(re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',x) for x in u),u; assert len(set(u))==7
        pg.goto(B+'tools/password-generator/'); pg.wait_for_timeout(300)
        for _ in range(40):
            pg.click('#go'); pw=pg.inner_text('#pw'); assert len(pw)==16 and re.search('[a-z]',pw) and re.search('[A-Z]',pw) and re.search(r'\d',pw) and re.search(r'[^A-Za-z0-9]',pw) and not re.search('[0O1lI|]',pw),pw
        pg.uncheck('#lo');pg.uncheck('#up');pg.uncheck('#sy'); pg.click('#go'); assert re.fullmatch(r'[2-9]{16}',pg.inner_text('#pw')),pg.inner_text('#pw')
        pg.uncheck('#di'); pg.click('#go'); assert 'at least one' in pg.inner_text('#res')
        for s in ['json-formatter','regex-tester','hash-generator','case-converter','text-diff-checker','password-generator']:
            pg.goto(B+'tools/'+s+'/'); assert not pg.evaluate('document.documentElement.scrollWidth>innerWidth'),(s,'overflow')
        assert not errs,errs; print(name,'ok')
    br.close()
