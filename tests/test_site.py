import json,re,os,glob,xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
R='/home/claude/freekit-india/'; B='http://127.0.0.1:8766/'
api=json.load(open(R+'api.json'))['tools']; print('tools',len(api))
# static checks
titles={};descs={};bad=[]
for f in glob.glob(R+'tools/*/index.html')+[R+'index.html',R+'about.html',R+'privacy.html',R+'contact.html',R+'for-ai.html']:
    h=open(f).read(); d=os.path.dirname(f)
    t=re.search(r'<title>(.*?)</title>',h).group(1); titles.setdefault(t,[]).append(f)
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>',h,re.S): json.loads(m)
    assert h.count('<h1>')==1,f
    for href in re.findall(r'(?:href|src)="([^"#?]+)',h):
        if href.startswith(('http','data:','mailto')): continue
        p=os.path.normpath(os.path.join(d,href)); 
        if not os.path.exists(p) and not os.path.exists(os.path.join(p,'index.html')): bad.append((f,href))
dups={t:v for t,v in titles.items() if len(v)>1}; assert not dups,dups; assert not bad,bad[:5]
sm=ET.parse(R+'sitemap.xml').getroot(); n=len(sm); assert n==len(api)+4,n; print('sitemap urls',n)
fieldids=[t['slug'] for t in api if not t['fields'] and not t['needsFile']]; print('tools with no fields:',fieldids)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=br.new_context(viewport={'width':390,'height':780}); pg=ctx.new_page(); issues=[]
    pg.on('pageerror',lambda e:issues.append(('js',pg.url,str(e)))); pg.on('console',lambda m: m.type=='error' and 'favicon' not in m.text and 'mtalk' not in m.text and issues.append(('console',pg.url,m.text)))
    pg.on('requestfailed',lambda r: ('127.0.0.1' in r.url) and issues.append(('reqfail',r.url)))
    for t in api:
        pg.goto(t['url'].replace('https://pritam-4560.github.io/freekit/',B)); pg.wait_for_timeout(120)
        if pg.evaluate('document.documentElement.scrollWidth>innerWidth'): issues.append(('overflow',t['slug']))
        if not pg.query_selector('#tool') or not pg.query_selector('.ad[data-ad="middle"]'): issues.append(('structure',t['slug']))
    pg.goto(B); assert pg.eval_on_selector_all('.tile','e=>e.length')==len(api); assert pg.query_selector('.ad[data-ad="top"]')
    pg.goto(B+'nope.html'); 
    print('issues:',issues[:10],'count',len(issues))
    br.close()
assert not issues
print('SITE OK')
