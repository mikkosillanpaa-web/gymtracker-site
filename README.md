# GymTracker.fi

Staattinen sivusto julkaistaan tällä hetkellä GitHub Pagesin main-haarasta.
Cloudflare Workers Static Assets on hyväksytty hostingin tavoite. Tämä haara on
katselmointia ja esikatselua varten. Varsinainen domainvaihto hyväksytään erikseen.

## Build ja QA

Node.js 22. Asennettavia sovellusriippuvuuksia ei ole.

```sh
node --test tools/site.test.mjs
node tools/build.mjs
node tools/build.mjs --preview --fixtures
```

Build kokoaa staattiset tiedostot dist-hakemistoon. Normaali build lukee
julkaisukelpoiset paketit content/articles-hakemistosta. Testiartikkeli sijaitsee
content/fixtures-hakemistossa ja edellyttää molempia preview-valintoja.
Preview-build asettaa noindex-headerin ja jättää kävijäseurannan pois. Käytä
Cloudflaren workers.dev-esikatselua tai rajattua Cloudflare Accessia. Varmista
vastausheaderit ennen linkin jakamista. Preview-URL:eja tai testireittiä ei
lisätä sitemap-tiedostoon.

## Artikkelipaketti

JSON on julkiseksi tarkoitettu siirtomuoto. Malli löytyy preview-fixturesta.
Sisältö kuvaillaan otsikko-/kappalelohkoina. Käytä vakaita content_id-tunnuksia,
kielikohtaista slugia, versionumeroa, markkinaa, kuvapolkua ja alt-tekstiä,
julkaisu- ja päivityspäiviä sekä lähdeviitteitä. Kohdista CTA GymTrackerin
Google Play -listaukseen. Suomenkieliset sivut ovat /blog/slug/ ja
englanninkieliset /blog/en/slug/. Vain oikeilla rinnakkaissivuilla on vastavuoroinen hreflang.

Kun päivität artikkelia, säilytä sen tunniste ja slug, korota versiota ja muuta
päivityspäivää. Päivitetty sivu ja sitemap generoidaan samassa buildissa.
Kustomoidut kuvat tulevat content/media-hakemistosta. Sallitut julkiset
tiedostot kopioidaan /blog/media/-polkuun. Fact ID:t, hyväksynnät ja auditointi
jäävät yksityiseen Growth-repoon. Site-build hylkää sopimuksen ulkopuoliset kentät;
Growthin pitää tarkistaa faktat ja hyväksyntä ennen julkisen paketin muodostamista.

## Julkaisun valvonta

Kasvumoottori valmistelee rajatun artikkelipaketin, tarkistettava sisältö
tallennetaan PR:ään. Site QA ajaa testit ja buildin ilman julkaisuoikeuksia.
Katselmoi PR:n täsmällinen sisältöversio, testit ja Cloudflare-preview.
Kun tuotantosiirto on hyväksytty ja toteutettu, hyväksytty site-mainin päivitys
julkaistaan Cloudflareen. Valvo URL:ien, canonicalien, assettien ja sitemapin
vastauksia deployn jälkeen. Cloudflare-deploy on erillinen vaihe CI-testeistä.

Nykyisen suoran APK:n URL on /downloads/GymTracker.apk. Tiedoston manifestissa
on versio 1.0 / versionCode 1. Tarkistus tehtiin lukemalla pakettitiedot ilman
asennusta. Latauspolku säilytetään, eikä sitä nosteta blogin CTA:ksi.
