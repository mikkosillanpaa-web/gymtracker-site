(() => {
  const section = document.querySelector('[data-article-metrics]');
  if (!section || location.origin !== 'https://gymtracker.fi' ||
      location.pathname !== section.dataset.articleMetrics || navigator.globalPrivacyControl === true ||
      navigator.doNotTrack === '1') return;

  const button = section.querySelector('button');
  const play = document.querySelector('[data-play-cta]');
  const path = section.dataset.articleMetrics;
  let allowed = false;
  let countedView = false;

  function count(name, event) {
    const url = new URL('https://gymtracker.goatcounter.com/count');
    url.searchParams.set('p', name);
    if (event) url.searchParams.set('e', 'true');
    // A separate request for each event. No source URL, cookies, or screen data.
    fetch(url, { mode: 'no-cors', credentials: 'omit', keepalive: true,
      cache: 'no-store', referrerPolicy: 'no-referrer' }).catch(() => {});
  }

  button.addEventListener('click', () => {
    allowed = !allowed;
    button.setAttribute('aria-pressed', String(allowed));
    button.textContent = allowed ? button.dataset.stop : button.dataset.allow;
    if (allowed && !countedView) {
      countedView = true;
      count(path, false);
    }
  });
  play.addEventListener('click', () => {
    if (allowed) count('outbound/play' + path, true);
  });
  section.hidden = false;
})();
