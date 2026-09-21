# cape-rilievo

La sezione delle due citta' di **The Cape Studio**: fondo bianco, i nomi di
Milano e Parigi agli angoli con le loro coordinate, le piante delle due
citta' che entrano tagliate dai bordi, e in mezzo un bassorilievo inciso
che si vede solo dove batte la luce.

Nel Designer di Webflow stanno solo la sezione e le due citta'. Tutto il
resto e' qui.

## I file

| file | cos'e' |
|---|---|
| `cape-rilievo.js` | quello che va in pagina: motore + le due piante scritte dentro |
| `sorgente.js` | lo stesso file senza le piante (`__MILANO__`, `__PARIGI__`): e' qui che si lavora |
| `superficie.png` | la mappa delle profondita' del surfista: nero = superficie, bianco = fondo del solco |
| `milano.svg` `parigi.svg` | le due piante in chiaro, identiche a quelle dentro il .js |
| `piante.py` | le rigenera: confini veri dai dati aperti + trama degli isolati |

**Per rigenerare il file in pagina** dopo aver toccato `sorgente.js` o le
piante: sostituisci `__MILANO__` e `__PARIGI__` col contenuto dei due SVG.
Sono due `replace`, niente build.

## Tre lavori, tre condizioni diverse

1. **Pianta le due mappe.** Sempre: telefono compreso, senza WebGL, con le
   animazioni ridotte. E' la prima cosa che il file fa, prima di qualunque
   controllo. Se un domani qualcuno sposta i controlli piu' su, su telefono
   restano due scritte in mezzo al bianco.
2. **Le fa comparire.** La prima volta che la sezione entra nello schermo
   si disegnano dal centro verso fuori; dalla seconda in poi e' solo una
   dissolvenza. Il movimento lo fa il CSS (classi `is-disegno`,
   `is-aperta`, `is-dentro`), non il JavaScript: gira sul compositore e
   non impunta lo scroll.
3. **Accende il bassorilievo.** Solo da 992px in su, con un puntatore vero
   e con WebGL.

## Le tre luci

Una e' il puntatore. Le altre due sono automatiche: girano sulla stessa
ellisse, mezzo giro l'una dall'altra, nello stesso verso, e partono dai due
bordi opposti. Servono perche' senza, chi arriva sulla sezione vede un
rettangolo vuoto e tira dritto. Si spengono appena il mouse arriva sopra il
disegno e tornano appena se ne va.

## Le manopole

In cima a `sorgente.js`, una per riga. Le due che si toccano davvero:

- `RAGGIO` — fin dove arriva la luce. Piu' piccolo, piu' il disegno si
  scopre un pezzo per volta;
- `DIFFUSA` e `LUCIDA` — quanto e' marcato il rilievo.

`FONDO` e' il colore della sezione: **1.0 = bianco**, 0.957 se un domani
torna il grigio #f4f4f4. Non e' un dettaglio estetico, e' il conto che
trasforma la luce in trasparenza: su bianco puro sopra non c'e' niente,
quindi le luci non possono schiarire e restano solo le ombre. E' per
questo che `DIFFUSA` e `LUCIDA` qui sono piu' alte che su un grigio: meta'
dell'effetto non e' disponibile e va recuperata sull'altra meta'.

## Le piante

Il contorno e' vero: confini comunali da dati aperti (Milano dai comuni
italiani di openpolis, Parigi da france-geojson). Sono vere anche le
cerchie e le radiali di Milano, i Navigli, il Lambro, l'Olona, la Senna, il
canale Saint-Martin, i boulevard e le piazze a stella di Parigi, e i due
boschi lasciati vuoti.

**La trama fine degli isolati e' disegnata, non rilevata**: e' una
tassellatura di Voronoi con densita' che cala verso la periferia. Serve a
far leggere "citta'" da lontano. Non usarla per dire dove si gira a
destra.

Il tratto ha spessore costante (`vector-effect="non-scaling-stroke"`): lo
spessore lo decide il CSS in pixel veri, cosi' le due piante restano
coerenti anche se una e' larga 34vw e l'altra 44vw.
