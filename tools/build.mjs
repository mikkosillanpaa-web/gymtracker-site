import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://gymtracker.fi';
const play = 'https://play.google.com/store/apps/details?id=fi.donturexdev.gymtracker';
const translations = {
  fi: { blog: 'GymTrackerin blogi', home: 'GymTracker.fi', skip: 'Siirry sisältöön',
    intro: 'Käytännön vinkkejä treenipäiväkirjan pitämiseen ja GymTrackerin käyttöön.',
    empty: 'Artikkeleita ei ole vielä julkaistu.', source: 'Lähteet', related: 'Lue lisää',
    fixture: 'Testiartikkeli · vain esikatseluun', updated: 'Päivitetty', missing: 'Sivua ei löydy' },
  en: { blog: 'GymTracker blog', home: 'GymTracker.fi', skip: 'Skip to content',
    intro: 'Practical tips for keeping a workout log and using GymTracker.',
    empty: 'No articles have been published yet.', source: 'Sources', related: 'Read more',
    fixture: 'Test article · preview only', updated: 'Updated', missing: 'Page not found' },
};

function escape(value) {
  return String(value).replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

const fields = ['content_id', 'version', 'status', 'language', 'market', 'slug', 'title',
  'description', 'category', 'published', 'updated', 'image', 'sections', 'links', 'sources', 'cta'];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const idPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const assetDirs = new Set(['changes', 'downloads', 'images', 'ohje', 'privacy']);
const publicExtensions = /\.(?:html|css|js|webp|png|jpe?g|svg|ico|txt)$/i;

function plain(value, limit) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= limit;
}

function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
}

function allowedLink(value, internal) {
  if (!plain(value, 2048) || /[\s\\\u0000-\u001f]/.test(value)) return false;
  try {
    const url = new URL(value, origin);
    if (!internal || !value.startsWith('/') || value.startsWith('//')) {
      return value.startsWith('https://') && url.protocol === 'https:' && !url.username && !url.password;
    }
    return url.origin === origin && !value.includes('/../') && !value.includes('/./');
  } catch {
    return false;
  }
}

function validateLink(link, internal) {
  return link && Object.keys(link).length === 2 && plain(link.label, 160) &&
    allowedLink(link.url, internal);
}

export function validateArticle(article, status, file) {
  if (!article || typeof article !== 'object' || Array.isArray(article)) throw Error(file + ': expected an object');
  const issue = message => { throw Error(file + ': ' + message); };
  if (Object.keys(article).some(key => !fields.includes(key))) issue('unknown or private field');
  if (article.status !== status) issue('article directory and status disagree');
  if (!plain(article.content_id, 80) || !idPattern.test(article.content_id) ||
      !Number.isSafeInteger(article.version) || article.version < 1) issue('invalid content identity');
  if (!Object.hasOwn(translations, article.language) || typeof article.market !== 'string' ||
      !/^[A-Z]{2}$/.test(article.market) || !plain(article.slug, 90) ||
      !slugPattern.test(article.slug) || Object.hasOwn(translations, article.slug)) issue('invalid language, market or slug');
  if (!plain(article.title, 115) || !plain(article.description, 165) || !plain(article.category, 60) ||
      !plain(article.cta, 90)) issue('invalid title, description, category or CTA');
  if (!date(article.published) || !date(article.updated) || article.updated < article.published) issue('invalid date');
  if (!Array.isArray(article.sections) || !article.sections.length || article.sections.length > 40 ||
      !article.sections.every(section => section && Object.keys(section).length === 2 &&
        plain(section.heading, 140) && Array.isArray(section.paragraphs) && section.paragraphs.length &&
        section.paragraphs.every(paragraph => plain(paragraph, 6000)))) issue('invalid body');
  if (!Array.isArray(article.links) || !article.links.every(link => validateLink(link, true)) ||
      !Array.isArray(article.sources) || !article.sources.length ||
      !article.sources.every(link => validateLink(link, false))) issue('invalid links or missing sources');
  if (article.image !== null && (!article.image || Object.keys(article.image).length !== 2 ||
      !plain(article.image.alt, 240) || typeof article.image.path !== 'string' ||
      !/^\/(?:images|ohje\/assets|blog\/media)\/[a-z0-9][a-z0-9._/-]*\.(?:webp|png|jpe?g)$/i.test(article.image.path) ||
      new URL(article.image.path, origin).pathname !== article.image.path)) issue('invalid image or alt text');
  return article;
}

function languagePath(language) {
  return language === 'fi' ? '/blog/' : '/blog/' + language + '/';
}
function articlePath(article) {
  return languagePath(article.language) + article.slug + '/';
}

async function readArticles(directory, status) {
  const names = await readdir(directory);
  return Promise.all(names.filter(name => name.endsWith('.json')).sort().map(async name =>
    validateArticle(JSON.parse(await readFile(join(directory, name), 'utf8')), status, name)));
}

function makeLayout({ language, title, description, path, body, preview, alternates = [], image, data }) {
  const copy = translations[language];
  const url = path && origin + path;
  const alternateLinks = alternates.length > 1 ? alternates.map(([lang, route]) =>
    '<link rel="alternate" hreflang="' + lang + '" href="' + origin + route + '">').join('\n') : '';
  const socialImage = image ?? '/images/ic_GymApp.png';
  const jsonLd = data ? '<script type="application/ld+json">' +
    JSON.stringify(data).replaceAll('<', '\\u003c') + '</script>' : '';
  return '<!doctype html>\n<html lang="' + language + '"><head><meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + escape(title) + '</title>\n' +
    '<meta name="description" content="' + escape(description) + '">\n' +
    (preview || !url ? '<meta name="robots" content="noindex, nofollow">\n' : '') +
    (url ? '<link rel="canonical" href="' + url + '">\n' : '') + alternateLinks + '\n' +
    '<meta property="og:type" content="' + (data ? 'article' : 'website') + '">\n' +
    '<meta property="og:title" content="' + escape(title) + '"><meta property="og:description" content="' +
    escape(description) + '">\n' +
    (url ? '<meta property="og:url" content="' + url + '">\n' : '') +
    '<meta property="og:image" content="' + origin + escape(socialImage) + '">\n' +
    '<link rel="icon" href="/ohje/assets/icon.webp"><link rel="stylesheet" href="/blog/style.css">' +
    jsonLd + '</head><body>\n<a class="skip" href="#content">' + copy.skip + '</a>' +
    '<header><nav class="wrap"><a class="brand" href="/"><img src="/ohje/assets/icon.webp" width="34" height="34" alt="">' +
    copy.home + '</a><a href="' + languagePath(language) + '">' + copy.blog + '</a>' +
    alternates.filter(([lang]) => lang !== language).map(([lang, route]) =>
      ' <a href="' + route + '" lang="' + lang + '">' + (lang === 'fi' ? 'Suomi' : 'English') + '</a>').join('') +
    '</nav></header><main id="content" class="wrap">' + body +
    '</main><footer><div class="wrap">GymTracker · Donturex Development</div></footer></body></html>\n';
}

function dateLabel(value, language) {
  const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' });
  return '<time datetime="' + value + '">' + formatter.format(new Date(value)) + '</time>';
}

function renderList(language, articles, alternateLists, preview) {
  const copy = translations[language];
  const cards = articles.map(article =>
    '<li class="card"><p class="meta">' + escape(article.category) + ' · ' + dateLabel(article.published, language) +
    '</p><h2><a href="' + articlePath(article) + '">' + escape(article.title) + '</a></h2><p>' +
    escape(article.description) + '</p>' + (article.status === 'fixture' ? '<p class="fixture">' + copy.fixture + '</p>' : '') + '</li>');
  return makeLayout({ language, title: copy.blog, description: copy.intro, path: languagePath(language),
    preview, alternates: alternateLists, body: '<h1>' + copy.blog + '</h1><p class="lead">' + copy.intro +
      '</p>' + (cards.length ? '<ul class="cards">' + cards.join('') + '</ul>' : '<p>' + copy.empty + '</p>') });
}

function linkList(title, links) {
  if (!links.length) return '';
  return '<section><h2>' + title + '</h2><ul>' + links.map(link => '<li><a href="' +
    escape(link.url) + '">' + escape(link.label) + '</a></li>').join('') + '</ul></section>';
}

function renderArticle(article, alternates, preview) {
  const language = article.language;
  const copy = translations[language];
  const sections = article.sections.map(section => '<section><h2>' + escape(section.heading) +
    '</h2>' + section.paragraphs.map(p => '<p>' + escape(p) + '</p>').join('') + '</section>').join('');
  const figure = article.image ? '<figure><img src="' + escape(article.image.path) + '" alt="' +
    escape(article.image.alt) + '" decoding="async"></figure>' : '';
  const dates = dateLabel(article.published, language) + (article.updated === article.published ? '' :
    ' · ' + copy.updated + ' ' + dateLabel(article.updated, language));
  const path = articlePath(article);
  const data = article.status === 'published' ? {
    '@context': 'https://schema.org', '@type': 'BlogPosting', mainEntityOfPage: origin + path,
    headline: article.title, description: article.description, inLanguage: language,
    datePublished: article.published, dateModified: article.updated,
    ...(article.image ? { image: origin + article.image.path } : {}),
    publisher: { '@type': 'Organization', name: 'Donturex Development' },
  } : undefined;
  return makeLayout({ language, title: article.title + ' · GymTracker', description: article.description,
    path: article.status === 'fixture' ? null : path, preview, alternates, image: article.image?.path, data,
    body: '<article class="prose">' + (article.status === 'fixture' ? '<p class="fixture">' + copy.fixture + '</p>' : '') +
      '<p class="meta">' + escape(article.category) + ' · ' + dates + '</p><h1>' + escape(article.title) +
      '</h1><p class="lead">' + escape(article.description) + '</p>' + figure + sections +
      linkList(copy.related, article.links) + linkList(copy.source, article.sources) +
      '<p><a class="cta" href="' + play + '">' + escape(article.cta) + '</a></p></article>' });
}

async function output(out, path, content) {
  const relative = path.startsWith('/') ? path.slice(1) : path;
  const file = join(out, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
  await mkdir(resolve(file, '..'), { recursive: true });
  await writeFile(file, content);
}

function checkUnique(articles) {
  const routes = new Set();
  const versions = new Set();
  for (const article of articles) {
    const route = articlePath(article);
    const key = article.content_id + ':' + article.language;
    if (routes.has(route) || versions.has(key)) throw Error('Duplicate article URL or content ID/language: ' + route);
    routes.add(route);
    versions.add(key);
  }
}

export async function build({ source = root, out = join(root, 'dist'), preview = false, fixtures = false } = {}) {
  if (fixtures && !preview) throw Error('Test articles require preview mode');
  const published = await readArticles(join(source, 'content/articles'), 'published');
  const samples = fixtures ? await readArticles(join(source, 'content/fixtures'), 'fixture') : [];
  const articles = [...published, ...samples].sort((a, b) => b.published.localeCompare(a.published));
  checkUnique(articles);

  // Validate packages before replacing output. Only explicit public directories are copied.
  for (const article of articles) {
    if (article.image) {
      const image = article.image.path.startsWith('/blog/media/') ?
        join(source, 'content/media', article.image.path.slice('/blog/media/'.length)) :
        join(source, article.image.path.slice(1));
      await readFile(image);
    }
  }
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const assetFilter = async path => {
    const { lstat } = await import('node:fs/promises');
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw Error('Symlink in public assets: ' + path);
    return stat.isDirectory() || publicExtensions.test(path);
  };
  await cp(join(source, 'index.html'), join(out, 'index.html'));
  for (const directory of assetDirs) {
    await cp(join(source, directory), join(out, directory), { recursive: true, filter: assetFilter });
  }
  const media = join(source, 'content/media');
  try {
    await cp(media, join(out, 'blog/media'), { recursive: true, filter: assetFilter });
  } catch (error) {
    if (error.code !== 'ENOENT' || error.path !== media) throw error;
  }
  await mkdir(join(out, 'blog'), { recursive: true });
  await cp(join(source, 'content/style.css'), join(out, 'blog/style.css'));
  const languages = ['fi', ...Object.keys(translations).filter(l => l !== 'fi' && articles.some(a => a.language === l))];
  const lists = languages.map(language => [language, languagePath(language)]);
  for (const language of languages) {
    await output(out, languagePath(language), renderList(language, articles.filter(a => a.language === language), lists, preview));
  }
  for (const article of articles) {
    const equivalents = article.status === 'fixture' ? [] : published
      .filter(a => a.content_id === article.content_id).map(a => [a.language, articlePath(a)]);
    await output(out, articlePath(article), renderArticle(article, equivalents, preview));
  }
  await output(out, '/404.html', makeLayout({ language: 'fi', title: 'Sivua ei löydy · GymTracker',
    description: 'GymTrackerin sivua ei löydy.', body: '<h1>Sivua ei löydy</h1><p><a href="/">GymTracker.fi:n etusivu</a></p>',
    preview: true }));
  const routes = ['/', '/ohje/', '/changes/', '/privacy/gymtracker-data-deletion',
    '/privacy/GymTracker_Privacy_Policy_EN.txt', ...lists.map(([, route]) => route),
    ...published.map(articlePath)];
  await output(out, '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes.filter(route => !preview || !route.startsWith('/blog/') || route === '/blog/' ||
      published.some(a => languagePath(a.language) === route || articlePath(a) === route))
      .map(route => {
        const article = published.find(a => articlePath(a) === route);
        return '  <url><loc>' + origin + escape(route) + '</loc>' +
          (article ? '<lastmod>' + article.updated + '</lastmod>' : '') + '</url>';
      }).join('\n') + '\n</urlset>\n');
  await output(out, '/robots.txt', 'User-agent: *\nAllow: /\n' + (preview ? '' : 'Sitemap: ' + origin + '/sitemap.xml\n'));
  const headers = '/*\n  X-Content-Type-Options: nosniff\n' +
    (preview ? '  X-Robots-Tag: noindex, nofollow\n' : '') +
    'https://:worker.:account.workers.dev/*\n  X-Robots-Tag: noindex\n' +
    '/downloads/*\n  X-Robots-Tag: noindex\n';
  await output(out, '/_headers', headers);
  await output(out, '/_redirects', '/downloads/GymTracker.apk ' + play + ' 302\n');
  if (preview) {
    // Avoid contaminating the live site’s existing analytics with review hits.
    for (const file of ['index.html', 'changes/index.html', 'ohje/index.html', 'privacy/gymtracker-data-deletion.html']) {
      const path = join(out, file);
      const html = await readFile(path, 'utf8');
      await writeFile(path, html.replace(/<script\s+data-goatcounter=[\s\S]*?<\/script>/gi, '')
        .replace('</head>', '<meta name="robots" content="noindex, nofollow"></head>'));
    }
  }
  return { published: published.length, fixtures: samples.length, routes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--preview', '--fixtures'].includes(arg))) throw Error('Unknown build flag');
  console.log(await build({ preview: args.includes('--preview'), fixtures: args.includes('--fixtures') }));
}
