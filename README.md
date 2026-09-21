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
| `cape-rilievo.js` | quello che va in pagina: motore + il dato delle due piante dentro |
| `sorgente.js` | lo stesso file senza le piante (`__MILANO__`, `__PARIGI__`): e' qui che si lavora |
| `superficie.png` | la quota del surfista inciso: nero = superficie, bianco = fondo del solco |
| `superficie.py` | la rigenera dal disegno a tratto |
| `milano.js.txt` `parigi.js.txt` | il dato delle piante: `[classe, fascia, percorso]` |
| `milano.svg` `parigi.svg` | le stesse piante come SVG, solo per guardarle |
| `rasterizza.py` + `assi.py` | **la catena vera**: da un SVG di mappa alle strade tracciabili |

## Da una mappa nuova alle strade

Le piante vengono dai due SVG caricati nella repo. Sono forme PIENE (ogni
strada e' un poligono sottile), e una forma piena non si puo' tracciare: si
riduce prima all'asse.

```
python3 rasterizza.py   # rende i due SVG a 1800px
python3 assi.py         # scheletro -> strade -> .js.txt
```

`assi.py` assottiglia la forma fino alla linea di mezzo, incatena i pixel in
strade continue, misura il calibro di ognuna con una trasformata di distanza
(e' cosi' che escono le tre classi: vie, assi, principali) e le ordina per
distanza dal centro in ventidue fasce. Quelle fasce sono l'ordine con cui la
pagina le disegnera'.

**Per cambiare una citta'**: carica il nuovo SVG, aggiungilo a `FILE` in
`rasterizza.py`, rigenera, e sostituisci `__MILANO__` / `__PARIGI__` in
`sorgente.js` col contenuto dei `.js.txt`.

**Per rigenerare il file in pagina** dopo aver toccato `sorgente.js` o le
piante: sostituisci `__MILANO__` e `__PARIGI__` col contenuto dei due
`.js.txt`. Sono due `replace`, niente build.

## Tre lavori, tre condizioni diverse

1. **Pianta le due mappe.** Sempre: telefono compreso, senza WebGL, con le
   animazioni ridotte. E' la prima cosa che il file fa, prima di qualunque
   controllo. Se un domani qualcuno sposta i controlli piu' su, su telefono
   restano due scritte in mezzo al bianco.
2. **Le disegna.** La prima volta che la sezione entra nello schermo ogni
   singola strada viene tracciata da un capo all'altro, dal centro verso il
   bordo. Niente compare in dissolvenza. Dalla seconda volta in poi non si
   ridisegna: resta solo la dissolvenza della mappa intera (classe
   `is-dentro`).
3. **Fa entrare i testi e la barra.** Ogni riga di "From / Milan" e delle
   coordinate sale da dietro una fessura, come le tendine del resto del
   sito, e insieme a loro rientra dall'alto la barra di navigazione — che
   si era ritirata poco prima, mentre lo schermo era gia' bianco.
   **Font, corpo e colore dei testi non sono scritti da nessuna parte qui**:
   si impostano nel Designer sulle classi `cape-rilievo-nome` e
   `cape-rilievo-coord`, e quello che c'e' li' vale.
4. **Accende il bassorilievo.** Solo da 992px in su, con un puntatore vero
   e con WebGL.

## Le tre luci

Una e' il puntatore. Le altre due sono automatiche: girano sulla stessa
ellisse, mezzo giro l'una dall'altra, nello stesso verso, e partono dai due
bordi opposti. Servono perche' senza, chi arriva sulla sezione vede un
rettangolo vuoto e tira dritto. Si spengono appena il mouse arriva sopra il
disegno e tornano appena se ne va.

## Il bassorilievo: due cose diverse

Il rilievo e' inciso, non gonfiato: nel file c'e' la quota dei solchi e
basta. Il senso di tridimensionalita' viene da altro, e sono DUE cose che
lavorano insieme:

1. **la luce che segue il mouse** — dice che la superficie ha delle pareti;
2. **la lastra che si inclina** (`INCLINA`) — dice che e' un oggetto
   appoggiato li', non un disegno stampato. Sono sei gradi scarsi, e si
   sentono solo in movimento.

L'inclinazione sta sul canvas, non sulla tela che lo contiene: la tela
serve a misurare dov'e' il puntatore, e una cosa che si inclina cambia
misura a ogni fotogramma — la luce finirebbe per inseguire se stessa.

## Le manopole

In cima a `sorgente.js`, una per riga. Quelle che si toccano davvero:

- `INCLINA` — di quanti gradi la lastra segue il mouse;
- `FORZA` — quanto sono ripide le pareti del solco;
- `RAGGIO` — fin dove arriva la luce;
- `DIFFUSA` e `LUCIDA` — quanto e' marcato il rilievo;
- `AUTO_FORZA` — quanto contano le due luci che girano da sole.

`FONDO` e' il colore della sezione: **1.0 = bianco**, 0.957 se un domani
torna il grigio #f4f4f4. Non e' un dettaglio estetico, e' il conto che
trasforma la luce in trasparenza: su bianco puro sopra non c'e' niente,
quindi le luci non possono schiarire e restano solo le ombre. E' per
questo che `DIFFUSA` e `LUCIDA` qui sono piu' alte che su un grigio: meta'
dell'effetto non e' disponibile e va recuperata sull'altra meta'.

## Il montaggio

La sezione non arriva scorrendo: e' un binario alto due schermate e mezzo
con dentro un pannello alto uno schermo che si INCOLLA. Il binario parte
56vh prima della fine della sezione dei pixel, cioe' dentro al suo bianco
finale (quella resta bianca e ferma dall'88% del suo binario in poi, che
sono i suoi ultimi 60vh). Il pannello resta invisibile finche' non si
incolla davvero, e nell'istante in cui si incolla sotto c'e' bianco pieno e
lui e' bianco uguale: il passaggio non si vede, e le mappe si disegnano li'.

Le due misure stanno nel CSS: `--rilievo-anticipo` e `--rilievo-sosta`.

## Le piante

Sono dipinte su tela, non disegnate nella pagina. Il perche' e' scritto in
cima a `sorgente.js`: animare qualche migliaio di strade in SVG portava la
pagina da 16 a 166 millisecondi per fotogramma. Su tela si dipinge solo il
pezzo nuovo e il costo non dipende piu' da quanto e' grande la mappa.

Il bordo non e' tagliato: una maschera radiale le spegne verso fuori, e
Parigi sborda apposta sotto il pannello e va a finire sulla sezione dopo,
dissolvendosi.

**I due .avif** in questa repo sono le anteprime con filigrana da cui sono
stati ricavati gli SVG: non sono usate da niente e non vanno pubblicate.
