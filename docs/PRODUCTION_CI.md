# GymTracker.fi:n vaihtoehtoinen tuotantojulkaisu

GitHub Actionsin `Site production` on vaihtoehto Cloudflare Workers Buildsille.
Se käynnistyy `main`-pushista tai manuaalisesti `main`-haarasta. Työ jää
ohitetuksi, kunnes repoasetus `CLOUDFLARE_DEPLOY_MODE=github-actions` on käytössä.
PR:ien `Site QA` toimii omalla lukuoikeudella. Se ei käytä tuotantosalaisuuksia.

## Käyttöönotto omistajan päätöksellä

1. Varmista, ettei tuotanto-Workerille ole aktiivista Workers Builds -julkaisua.
   Jos suora integraatio otetaan käyttöön myöhemmin, poista ensin
   GitHubin `CLOUDFLARE_DEPLOY_MODE`-valinta ja odota mahdollisen ajon päättymistä.
2. Luo GitHubin `production`-ympäristö ja rajoita julkaisuhaara `main`-haaraan.
   Aseta tilin tunniste ympäristön muuttujaan `CLOUDFLARE_ACCOUNT_ID`.
   Tallenna salaisuus `CLOUDFLARE_API_TOKEN` tähän ympäristöön vasta hyväksynnän jälkeen.
   Käytä Cloudflaren Worker-kohtaista **API token for external CI/CD** -toimintoa
   tai vastaavaa käytettävissä olevaa `Individual Workers Editor` -rajausta
   vain `gymtracker-site`-Workerille. DNS-, Route- ja muiden Workerien oikeudet
   eivät kuulu tähän työnkulkuun.
3. Aseta repomuuttuja `CLOUDFLARE_DEPLOY_MODE=github-actions`. Ensimmäisen
   manuaalisen ajon voi käynnistää `main`-haarasta. Varmista, että työn yhteenvedossa
   näkyvät aiempi versio, GitHub-commit ja aktiivinen Cloudflare-versio.
4. Tarkista etänä etusivu, blogi, ohje, robots.txt, sitemap, www-ohjaus, vanhan
   APK-reitin 302 ja testiartikkelin 404 ennen valmiiksi merkitsemistä.

QA tarkistaa oppaan sekä normaalin tuotantobuildin ennen kuin julkaisuvaihe
saa Cloudflare-tunnuksen. Wrangler toimii `--strict`-tilassa. Varmennus
yhdistää commitin Wrangler-kuittiin ja Cloudflaren 100 prosentin versioon.
Tietoja ei tulosteta Cloudflaren virhevastausten rungoista.

## Palautus

Poista ensin `CLOUDFLARE_DEPLOY_MODE`, jotta automaatio ei syrjäytä palautusta.
Valitse Cloudflare Deployments -näkymästä työn yhteenvedon edellinen
versiotunniste. Palauta se 100 prosenttiin, tarkista ydinosoitteet ja kirjaa
tilanne Growthin #15:een. Korjaa mahdollinen regressio GitHub-PR:ssä ennen
uudelleenaktivointia.

[GitHub Actions ja Wrangler](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) ·
[Worker-kohtaiset oikeudet](https://developers.cloudflare.com/workers/authorization/workers/) ·
[Deployment API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/).
