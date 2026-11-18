# FitFile

Free browser tools (86 and counting): image resizing to KB, PDF compress/merge/split, calculators, India tax and GST tools, converters, text and developer tools. Everything runs in the visitor's browser. Nothing is uploaded.

Live: https://pritam-4560.github.io/freekit/

## How it works

- `assets/tools/*.js` define the tools (`FF.tool({...})`). Each tool gets its own static page for Google.
- `node build.js` generates `tools/<slug>/index.html`, the home page, `sitemap.xml`, `robots.txt`, `404.html`, `llms.txt`, `llms-full.txt`, `api.json`, about/privacy/contact/for-ai pages.
- Edit `site.config.json` for the site name and URL, then run `node build.js` and commit the generated files.
- Libraries are vendored in `vendor/` (no CDN).

## Ads (do this only when you are allowed to)

Ad slots show as dashed "Advertisement" boxes. To turn on Google AdSense, fill `adsenseClient` and `adSlots` in `site.config.json`, set `showAdPlaceholders` to false and rebuild. AdSense needs an approved account and a custom domain is strongly recommended. Check your employer's policy on outside income before enabling ads.

## For AI agents

- `llms.txt`, `llms-full.txt` and `api.json` list every tool, its URL and its field ids.
- Open `/tools/<slug>/?fieldId=value&run=1` to pre-fill and run. Results are text inside `#tool .out`.
- Browsers with WebMCP (`navigator.modelContext`) get each tool registered automatically.
- Please do not generate artificial ad impressions. See `/for-ai.html`.

## Tests

Tests use Playwright with system Chrome, run against `python3 -m http.server 8766` in this folder. Fixtures: `node test-fixtures/make.js`.
`tests/test_site.py` checks every page, link, sitemap and structured data. Tax engine tests: `node test.js`.

Rates and rules (GST slabs, income tax FY 2026-27) were last verified in November 2026. Re-check them when they change.
