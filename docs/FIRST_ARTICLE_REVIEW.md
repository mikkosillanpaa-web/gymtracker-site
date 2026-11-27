# Ensimmäinen blogiartikkeli

**Treenivihko, Excel vai treenisovellus? Kokeile kahden treenin testiä.**
on [julkaistussa sisältöpaketissa](../content/articles/treenivihko-excel-vai-treenisovellus.json).
Aihe tuli Growthin toisesta AI-tutkimuspilotista. Codex tarkasti lähteen
toimituksellisesti ja kirjoitti luonnoksen. Riski on matala. Mallimerkinnässä
on täytettävät kentät. Play-linkki osoittaa listaukseen ilman tuoteväitteitä.

Artikkelissa on oma [SVG-kuvitus](../content/media/treenikirjaus-vertailu.svg).
Puhelin on yleisluontoinen. SVG näkyy artikkelissa ja GymTrackerin PNG
somekortissa. Taulukko ja mallimerkintä ovat valinnaisia kenttiä.
Paikallinen esikatselu syntyy komennolla `node tools/build.mjs --preview`.

## Kävijämittaus

Julkaisuputken `--article-metrics` ja sisältöpaketin `article_metrics: true`
ottavat mittaustoiminnon käyttöön. Mittauspyynnöt voivat lähteä vain tuotanto-
osoitteesta ja kävijän nimenomaisen valinnan jälkeen. Valinnan voi peruuttaa
samalla sivulla. Artikkeli ja Play-linkki toimivat ilman mittausta. Valinta on
voimassa vain kyseisellä sivulatauksella. DNT ja GPC estävät mittauksen.
Esikatselu ja CI:n normaalibuild eivät sisällä artikkelimittausta.

Artikkeli kertoo rekisterinpitäjän, tarkoituksen, valinnaisuuden, tiedot ja
GoatCounterin tietosuojakuvauksen. Sovelluksen oma tietosuojateksti käsittelee
Android- ja Wear-sovelluksia. Mittaus lähettää nykyiseen GoatCounteriin vain
kiinteän reitin tai tapahtuman nimen ja tapahtumamerkinnän. Selain välittää
tavalliset yhteystiedot, kuten IP- ja selainotsakkeet. Mittaus ei lähetä
viittaavaa sivua, URL-parametreja, evästeitä, näyttötietoja, käyttäjätunnuksia
tai treenitietoja. GoatCounter kuvaa tilapäisen käsittelyn ja koontitiedot
omassa tietosuojakuvauksessaan.

| Mittari | Lähde |
|---|---|
| Artikkelin sivukäynnit | GoatCounter, artikkelin osoitepolku, mittauksen sallineet käynnit |
| Play-linkin klikkaukset | GoatCounter, `outbound/play/blog/treenivihko-excel-vai-treenisovellus/` |
| Hakunäyttökerrat ja hakuklikkaukset | Search Console, Web-haku ja artikkelin canonical-osoite |
| Mahdolliset myöhemmät Play-hankinnat | Play Consolen UTM-koosteet, jos kampanjamerkintä otetaan käyttöön |

Klikkaus, Play-listauskäynti ja Playn ilmoittama hankinta ovat eri mittareita.
Kirjaa ajanjakso ja havaintojen kattavuus. Puuttuva havainto merkitään
saatavuustiedoksi. Tuotannon mittaustestin tapahtumat kirjataan yksityiseen
Growth-julkaisutositteeseen.

[GoatCounterin tietosuoja](https://www.goatcounter.com/help/privacy) ·
[GoatCounterin mittausrajapinta](https://www.goatcounter.com/help/pixel) ·
[Traficomin evästeohje](https://www.traficom.fi/sites/default/files/media/file/Ev%C3%A4steohjeistus_palveluntarjoajille.pdf) ·
[Search Console](https://support.google.com/webmasters/answer/7576553) ·
[Play-hankintaraportit](https://support.google.com/googleplay/android-developer/answer/9859173)
