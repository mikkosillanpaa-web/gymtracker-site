import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { access, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { build, validateArticle } from './build.mjs';

const source = new URL('../', import.meta.url);
const fixture = JSON.parse(await readFile(new URL('content/fixtures/treenimerkinta.json', source), 'utf8'));
const fixturePath = 'blog/harjoitusmerkinta/index.html';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

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
  assert.equal(sha256(await readFile(join(out, 'downloads/GymTracker.apk'))),
    sha256(await readFile(new URL('downloads/GymTracker.apk', source))));
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
  const article = { ...fixture, content_id:'published-test', status:'published', slug:'artikkeli',
    updated:'2026-11-28', title:'Treenipäiväkirja <esimerkki>' };
  const en = { ...article, language:'en', market:'GB', slug:'workout-log', title:'Workout log' };
  await writeFile(join(clone,'content/articles/fi.json'), JSON.stringify(article));
  await writeFile(join(clone,'content/articles/en.json'), JSON.stringify(en));
  const out = join(folder, 'dist');
  await build({ source: clone, out });
  const fiHtml = await checkHtml(out,'blog/artikkeli/index.html','/blog/artikkeli/');
  const enHtml = await checkHtml(out,'blog/en/workout-log/index.html','/blog/en/workout-log/');
  assert.match(fiHtml, /hreflang="en" href="https:\/\/gymtracker\.fi\/blog\/en\/workout-log\/"/);
  assert.match(enHtml, /hreflang="fi" href="https:\/\/gymtracker\.fi\/blog\/artikkeli\/"/);
  assert.match(fiHtml, /Treenipäiväkirja &lt;esimerkki&gt;/);
  const data = JSON.parse(fiHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(data['@type'], 'BlogPosting');
  assert.equal(data.dateModified, '2026-11-28');
  assert.match(await readFile(join(out, 'sitemap.xml'), 'utf8'), /blog\/en\/workout-log\/<\/loc><lastmod>2026-11-28/);
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
  ];
  for (const patch of invalid) assert.throws(() => validateArticle({...fixture,...patch},'fixture','test'));
});
