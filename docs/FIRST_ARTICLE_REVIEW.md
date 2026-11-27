# Ensimmäisen blogiartikkelin katselmointi

**Artikkeli** · Treenivihko, Excel vai treenisovellus? Kokeile kahden treenin testiä.

**Osoite** · `/blog/treenivihko-excel-vai-treenisovellus/`

**Alkuperä** · Aihe tuli toisesta Growthin AI-tutkimuspilotista ja
lähde tarkistettiin toimituksellisesti. Codex kirjoitti ja viimeisteli
luonnoksen. Tämä toimitus ei todenna Growthin WriterAdapterin käyttöä.

**Riskiluokka** · Matala. Sisältö opastaa vertaamaan kirjausvälineitä.
Mallimerkinnässä on vain täytettävät kentät, ja Google Play -linkki
viittaa GymTrackerin listaukseen ilman ominaisuus- tai versioväitteitä.

**Kuvitusehdotus** · Oma valokuva tai kuvitus, jossa ovat saman pöydän
päällä tyhjä ruutuvihko, taulukkopohja ja puhelin, jonka näkymä on
neutraali ja tunnukseton. Kuvassa ei tarvita henkilöitä tai kilpailijoiden
materiaaleja. Alt-teksti on *Ruutuvihko, taulukko ja puhelin valmiina
saman treenimerkinnän kokeiluun*. Luonnoksen kuva on valinnainen ja
`image` on tyhjä. Tarkista käyttöoikeus ennen kuvan lisäämistä.

Sisältöpaketti on `content/drafts/`-hakemistossa. Paikallinen esikatselu
rakennetaan ajamalla `node tools/build.mjs --preview --drafts` ja
tarjoamalla `dist` paikallisesti. Luonnos näkyy esikatselun blogilistassa
ilman julkaisu- tai päivityspäivän esitystä, canonicalia, indeksointia,
BlogPosting-dataa tai mittausta. Normaali build jättää sen pois.
Julkaisuhetkellä hyväksytty paketti siirretään `content/articles/`-hakemistoon,
tila vaihdetaan arvoon `published` ja asetetaan oikea julkaisupäivä.

## Mittausvalmius #10

| Mittari | Lähde ja rajaus |
|---|---|
| Artikkelin sivukäynnit | GoatCounter, tarkka artikkelireitti. Uusi blogiartikkeli saa seurantaskriptin vain erikseen hyväksytyllä `--article-metrics`-tuotantobuildilla. |
| Play-linkin klikkaukset | GoatCounter-tapahtuma `outbound/play/blog/treenivihko-excel-vai-treenisovellus/`. Lasketaan artikkelin CTA-klikkaukset. |
| Google-hakunäyttökerrat ja hakuklikkaukset | Search Consolen domain-resurssi `gymtracker.fi`, Performance/Pages, täsmällinen canonical-URL ja Web-haku. Tarkista indeksointi ensin. Tarkastele viikoittain ja vertaa 28 päivän jaksolla. |
| Myöhempi liikenne Play-asennuksiin | Hyväksynnän jälkeen harkitaan artikkelikohtaista `utm_source=gymtrackerfi`- ja `utm_campaign=blog_treenivihko`-tunnistetta. Tarkista Play Consolesta UTM-suodattimilla listauskävijät ja store listing acquisitions koontitasolla. Pienet määrät voivat näkyä Other-ryhmässä. |

Klikkaus, listauskäynti ja Playn ilmoittama hankinta ovat eri mittareita.
GoatCounter-havainnot voivat puuttua estojen ja selainten rajoitusten vuoksi.
Raportoi raakaluvut sekä ajanjakso. Puuttuva GSC- tai Play-data merkitään
saatavuustiedoksi. Mittauskokeilu tarvitsee oman käyttöönoton ja yhden
valvotun päästä päähän -tarkistuksen ennen tulosten käyttämistä.

`--article-metrics` toimii vain julkaistuilla artikkeleilla, eikä se ole
käytössä nykyisessä GitHub Actions -julkaisussa. Esikatselu ja mittauslippu
ovat keskenään poissulkevia. Google Play -linkki käyttää nykyistä listausosoitetta.

[Lähteet artikkelin paketissa](../content/drafts/treenivihko-excel-vai-treenisovellus.json) ·
[GoatCounterin tapahtumat](https://www.goatcounter.com/help/events) ·
[Search Console Performance](https://support.google.com/webmasters/answer/7576553) ·
[Play Consolen hankintaraportit](https://support.google.com/googleplay/android-developer/answer/9859173).
