import { strict as assert } from 'node:assert';
import { access, cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { build, validateArticle } from './build.mjs';

const source = new URL('../', import.meta.url);
const fixture = JSON.parse(await readFile(new URL('content/fixtures/treenimerkinta.json', source), 'utf8'));
const fixturePath = 'blog/harjoitusmerkinta/index.html';
const play = 'https://play.google.com/store/apps/details?id=fi.donturexdev.gymtracker';

async function checkPlayDistribution(out) {
  const entries = await readdir(out, { recursive: true });
  assert.ok(!entries.some(entry => /\.apk$/i.test(entry)), 'APK files must stay out of the build');
  assert.equal(await readFile(join(out, '_redirects'), 'utf8'), `/downloads/GymTracker.apk ${play} 302\n`);
  assert.doesNotMatch(await readFile(join(out, 'sitemap.xml'), 'utf8'), /GymTracker\.apk/i);

  for (const entry of entries.filter(entry => entry.endsWith('.html'))) {
    const html = await readFile(join(out, entry), 'utf8');
    assert.doesNotMatch(html, /\bhref=["'][^"']*\.apk(?:[?#][^"']*)?["']/i, entry);
  }
  assert.match(await readFile(join(out, 'index.html'), 'utf8'),
    /href="https:\/\/play\.google\.com\/store\/apps\/details\?id=fi\.donturexdev\.gymtracker(?:["&])/);
}

async function localFile(root, from, url) {
  const target = new URL(url, new URL(from, 'https://gymtracker.fi'));
  if (target.origin !== 'https://gymtracker.fi') return;
  const path = decodeURIComponent(target.pathname).slice(1);
  const candidates = path.endsWith('/') || path === '' ? [path + 'index.html'] :
    [path, path + '/index.html', path + '.html'];
  for (const candidate of candidates) {
    try {
      const body = await readFile(join(root, candidate));
      if (target.hash && candidate.endsWith('.html')) {
        assert.ok(body.toString().includes('id="' + decodeURIComponent(target.hash.slice(1)) + '"'), from + ' → ' + url);
      }
      return;
    } catch (error) {
      if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
    }
  }
  assert.fail(from + ' → ' + url);
}

async function checkHtml(root, file, route) {
  const html = await readFile(join(root, file), 'utf8');
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, file);
  assert.match(html, /<html lang="[a-z-]+"/i, file);
  assert.match(html, /<title>[^<]+<\/title>/i, file);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, file);
  const staticHtml = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>');
  for (const [tag] of staticHtml.matchAll(/<img\b[^>]*>/gi)) assert.match(tag, /\balt="/, file);
  for (const [,url] of staticHtml.matchAll(/<(?:a|img|script|link)\b[^>]*?\b(?:href|src)="([^"]+)"/gi)) {
    if (url === '#') continue;
    await localFile(root, route, url);
  }
  return html;
}

test('production build preserves critical routes, excludes fixtures and lists live canonical URLs', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'gymtracker-site-qa-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const out = join(folder, 'dist');
  const result = await build({ out });
  assert.equal(result.fixtures, 0);
  await assert.rejects(access(join(out, fixturePath)), { code: 'ENOENT' });
  await assert.rejects(access(join(out, 'ohje/generate.py')), { code: 'ENOENT' });
  await localFile(out, '/changes/', 'workout-en.jpg');
  const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf8');
  assert.match(await readFile(join(out, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/gymtracker\.fi\/sitemap\.xml/);
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname);
  assert.deepEqual(routes, result.routes);
  assert.equal(new Set(routes).size, routes.length);
  for (const route of routes) {
    await localFile(out, '/', route);
    if (route.endsWith('.txt')) continue;
    const file = route.endsWith('/') ? route.slice(1) + 'index.html' : route.slice(1) + '.html';
    const html = await checkHtml(out, file, route);
    assert.ok(html.includes('rel="canonical" href="https://gymtracker.fi' + route + '"'));
  }
  await checkPlayDistribution(out);
  assert.equal(await readFile(join(out, 'downloads/help.txt'), 'utf8'),
    await readFile(new URL('downloads/help.txt', source), 'utf8'));
  assert.match(await readFile(join(out, '404.html'), 'utf8'), /name="robots" content="noindex/);
  assert.ok(!sitemap.includes('harjoitusmerkinta'));
  assert.match(await readFile(join(out, 'privacy/gymtracker-data-deletion.html'), 'utf8'),
    /href="GymTracker_Privacy_Policy_EN.txt"/);
});

test('preview renders the labeled fixture, stops tracking and keeps the fixture out of discovery', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'gymtracker-site-qa-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const out = join(folder, 'dist');
  await assert.rejects(build({ out, fixtures: true }), /requires|require preview/);
  await build({ out, preview: true, fixtures: true });
  await checkPlayDistribution(out);
  assert.match(await readFile(join(out, 'blog/index.html'), 'utf8'), /harjoitusmerkinta/);
  const html = await checkHtml(out, fixturePath, '/blog/harjoitusmerkinta/');
  assert.match(html, /Testiartikkeli · vain esikatseluun/);
  assert.match(html, /meta name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json|goatcounter/);
  assert.doesNotMatch(await readFile(join(out, 'sitemap.xml'), 'utf8'), /harjoitusmerkinta/);
  assert.doesNotMatch(await readFile(join(out, 'robots.txt'), 'utf8'), /Sitemap/);
  assert.match(await readFile(join(out, '_headers'), 'utf8'), /^\/\*\n[^\n]+\n  X-Robots-Tag: noindex/);
  assert.doesNotMatch(await readFile(join(out, 'index.html'), 'utf8'), /data-goatcounter/);
});

test('published translations share an ID, link reciprocally and generate safe structured data', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'gymtracker-site-qa-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const clone = join(folder, 'source');
  await cp(source, clone, { recursive: true, filter: path => !/(?:^|[/\\])(?:\.git|dist|node_modules|\.wrangler)$/.test(path) });
  const article = { ...fixture, content_id:'published-test', status:'published', slug:'artikkeli', article_metrics:true,
    updated:'2026-11-28', title:'Treenipäiväkirja <esimerkki>' };
  const en = { ...article, language:'en', market:'GB', slug:'workout-log', title:'Workout log', article_metrics:false };
  await writeFile(join(clone,'content/articles/fi.json'), JSON.stringify(article));
  await writeFile(join(clone,'content/articles/en.json'), JSON.stringify(en));
  const out = join(folder, 'dist');
  await build({ source: clone, out });
  const fiHtml = await checkHtml(out,'blog/artikkeli/index.html','/blog/artikkeli/');
  const enHtml = await checkHtml(out,'blog/en/workout-log/index.html','/blog/en/workout-log/');
  assert.doesNotMatch(fiHtml, /goatcounter/);
  assert.match(fiHtml, /hreflang="en" href="https:\/\/gymtracker\.fi\/blog\/en\/workout-log\/"/);
  assert.match(enHtml, /hreflang="fi" href="https:\/\/gymtracker\.fi\/blog\/artikkeli\/"/);
  assert.match(fiHtml, /Treenipäiväkirja &lt;esimerkki&gt;/);
  const data = JSON.parse(fiHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(data['@type'], 'BlogPosting');
  assert.equal(data.dateModified, '2026-11-28');
  assert.match(await readFile(join(out, 'sitemap.xml'), 'utf8'), /blog\/en\/workout-log\/<\/loc><lastmod>2026-11-28/);
  const metrics = join(folder, 'metrics');
  await build({ source: clone, out: metrics, articleMetrics: true });
  const instrumented = await checkHtml(metrics, 'blog/artikkeli/index.html', '/blog/artikkeli/');
  assert.ok(instrumented.includes('data-article-metrics="/blog/artikkeli/" hidden'));
  assert.match(instrumented, /data-play-cta/);
  assert.ok(instrumented.includes('src="/blog/article-metrics.js"'));
  assert.doesNotMatch(await readFile(join(metrics, 'blog/index.html'), 'utf8'), /article-metrics/);
  assert.doesNotMatch(await readFile(join(metrics, 'blog/en/workout-log/index.html'), 'utf8'), /article-metrics/);
  await writeFile(join(clone,'content/articles/duplicate.json'), JSON.stringify({ ...article, slug:'other' }));
  await assert.rejects(build({ source: clone, out }), /Duplicate article/);
});

test('artifact validation rejects private fields, unsafe links, invalid dates, slugs and image metadata', () => {
  const invalid = [
    { audit: 'private' }, { slug: '../test' }, { updated: '2026-02-30' }, { version: 0 }, { status: 'published' },
    { sources: [{ label:'External', url:'javascript:alert(1)' }] },
    { links: [{ label:'Internal', url:'//other.example/' }] },
    { image: { path:'/images/../downloads/file.png', alt:'Image' } },
    { image: { path:'/images/ic_GymApp.png', alt:'' } },
    { article_metrics: 'true' },
    { sections: [{ heading:'Example', paragraphs:['Text'], example: ['not a string'] }] },
    { sections: [{ heading:'Example', paragraphs:['Text'],
      table:{ caption:'Compare', columns:['Option','Value'], rows:[['Option']] } }] },
  ];
  for (const patch of invalid) assert.throws(() => validateArticle({...fixture,...patch},'fixture','test'));
});

test('first published article appears once, preserves CTA and excludes drafts or measurement from previews', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'gymtracker-blog-qa-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const route = '/blog/treenivihko-excel-vai-treenisovellus/';
  const file = route.slice(1) + 'index.html';
  await assert.rejects(build({ out: folder, drafts: true }), /Draft articles require preview/);
  await assert.rejects(build({ out: folder, preview: true, articleMetrics: true }), /metrics require production/);
  const production = join(folder, 'production');
  await build({ out: production, articleMetrics: true });
  const html = await checkHtml(production, file, route);
  assert.ok(html.includes('<title>Treenivihko, Excel vai sovellus? | GymTracker</title>'));
  assert.ok(html.includes('href="https://gymtracker.fi' + route + '"'));
  assert.ok(html.includes('<caption>Kolme tapaa kirjata treeni</caption>'));
  assert.ok(html.includes('<th scope="row">Paperivihko</th>'));
  assert.ok(html.includes('<pre class="example"><code>Päivä ____ | Liike ____'));
  assert.ok(html.indexOf('href="' + play + '"') < html.indexOf('https://www.sisulift.app/'));
  assert.ok(html.includes('treenikirjaus-vertailu.svg'));
  assert.ok(html.includes('data-article-metrics="' + route + '" hidden'));
  assert.doesNotMatch(html, /noindex|Luonnos|Testiartikkeli/);
  const data = JSON.parse(html.split('<script type="application/ld+json">')[1].split('</script>')[0]);
  assert.equal(data['@type'], 'BlogPosting');
  assert.equal(data.mainEntityOfPage, 'https://gymtracker.fi' + route);
  assert.match(data.datePublished, /^\d{4}-\d\d-\d\d$/);
  assert.equal((await readFile(join(production,'sitemap.xml'), 'utf8')).split(route).length, 2);
  assert.ok((await readFile(join(production,'index.html'), 'utf8')).includes('href="blog/" lang="fi">Blogi'));
  assert.ok((await readFile(join(production,'blog/index.html'), 'utf8')).includes(route));
  await assert.rejects(access(join(production, fixturePath)), { code: 'ENOENT' });
  const preview = join(folder, 'preview');
  await build({ out: preview, preview: true, fixtures: true, drafts: true });
  const previewHtml = await checkHtml(preview, file, route);
  assert.match(previewHtml, /noindex, nofollow/);
  assert.doesNotMatch(previewHtml, /data-article-metrics|data-play-cta|article-metrics.js/);
  await assert.rejects(access(join(preview,'blog/article-metrics.js')), { code: 'ENOENT' });
});

test('analytics sends a limited view and CTA only while explicit consent is active on the live origin', async () => {
  const code = await readFile(new URL('content/article-metrics.js', source), 'utf8');
  const route = '/blog/artikkeli/';
  function client(origin, navigator = {}, pathname = route) {
    const requests = [];
    const button = { dataset: { allow:'Allow', stop:'Stop' }, attributes:{} };
    const play = {};
    for (const node of [button, play]) node.addEventListener = (name, listener) => { node[name] = listener; };
    button.setAttribute = (name, value) => { button.attributes[name] = value; };
    const panel = { hidden:true, dataset: { articleMetrics: route }, querySelector: () => button };
    runInNewContext(code, { URL, navigator, location:{ origin, pathname, search:'?private=test' },
      document:{ querySelector: selector => selector === '[data-article-metrics]' ? panel : play },
      fetch: (url, options) => { requests.push([url, {...options}]); return Promise.resolve(); } });
    return { requests, button, play, panel };
  }
  const { requests, button, play, panel } = client('https://gymtracker.fi');
  assert.equal(panel.hidden, false);
  play.click();
  assert.equal(requests.length, 0);
  button.click();
  assert.equal(button.attributes['aria-pressed'], 'true');
  play.click();
  button.click();
  play.click();
  assert.equal(button.attributes['aria-pressed'], 'false');
  button.click();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(([url]) => Object.fromEntries(url.searchParams)),
    [{ p:route }, { p:'outbound/play' + route, e:'true' }]);
  for (const [url, params] of requests) {
    assert.equal(url.origin + url.pathname, 'https://gymtracker.goatcounter.com/count');
    assert.equal(params.credentials, 'omit');
    assert.equal(params.referrerPolicy, 'no-referrer');
    assert.equal(params.keepalive, true);
  }
  for (const blocked of [client('http://localhost'), client('https://gymtracker.fi', { doNotTrack:'1' }),
    client('https://gymtracker.fi', { globalPrivacyControl:true }), client('https://gymtracker.fi', {}, '/blog/other/')]) {
    assert.equal(blocked.panel.hidden, true);
    assert.equal(blocked.button.click, undefined);
    assert.equal(blocked.requests.length, 0);
  }
});
