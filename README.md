# cape-rilievo

La sezione delle due citta' di **The Cape Studio**: fondo bianco, i nomi di
Milano e Parigi agli angoli con le loro coordinate, i due monumenti — il
Duomo e la Tour Eiffel — disegnati a penna, e in mezzo un bassorilievo
inciso che si vede solo dove batte la luce.

Nel Designer di Webflow stanno solo la sezione e le due citta'. Tutto il
resto e' qui.

> Fino al 2026-09-21 qui c'erano le **piante stradali** delle due citta'.
> Venivano male — Milano usciva rada e a frammenti — e sono state
> sostituite dai due monumenti. Il motore non e' cambiato: disegna
> polilinee, e non gli importa se sono strade o tratti di penna. Sono
> cambiati il dato e l'ordine con cui esce (vedi sotto). Il vocabolario
> del codice dice ancora "strade": e' rimasto quello, apposta, per non
> riscrivere un file che funziona.

## I file

| file | cos'e' |
|---|---|
| `cape-rilievo.js` | quello che va in pagina: motore + il dato delle due piante dentro |
| `sorgente.js` | lo stesso file senza le piante (`__MILANO__`, `__PARIGI__`): e' qui che si lavora |
| `superficie.png` | la quota del surfista inciso: nero = superficie, bianco = fondo del solco |
| `superficie.py` | la rigenera dal disegno a tratto |
| `milano.js.txt` `parigi.js.txt` | il dato dei due disegni: `[classe, fascia, percorso]` |
| `milano.svg` `parigi.svg` | gli stessi disegni come SVG, solo per guardarli |
| `rasterizza.py` + `assi.py` | **la catena vera**: da un SVG a penna ai tratti tracciabili |
| `duomo-...-748.svg` `Gemini_...-1uvq41.svg` | i due disegni sorgente |

## Da un disegno nuovo ai tratti

I due disegni vengono dagli SVG caricati nella repo. Sono forme PIENE (ogni
tratto di penna e' un poligono sottile), e una forma piena non si puo'
tracciare: si riduce prima all'asse.

```
python3 rasterizza.py   # rende i due SVG a 2600px e li impagina nel quadro
python3 assi.py         # asse + contorni -> .js.txt
```

`rasterizza.py` ritaglia **sul disegno, non sul centro**: cerca il riquadro
dell'inchiostro e lo impagina in un quadrato con un filo d'aria. Una mappa la
si puo' tagliare dove capita, un monumento tagliato a meta' si legge come un
errore.

`assi.py` fa due cose diverse su due cose diverse:

- i **nastri** (i tratti di penna, larghi due pixel) li assottiglia fino alla
  linea di mezzo e li incatena in polilinee continue;
- le **macchie** (i portali del Duomo, l'ombra sotto la torre) NON le
  assottiglia: di quelle prende il **contorno**. Un rettangolo pieno ridotto
  alla linea di mezzo diventa una X — e quello era lo scarabocchio che si
  vedeva al primo tentativo. La soglia che separa le due cose e'
  `soglia_blob`, ed e' diversa per i due disegni: 8 per il Duomo, che ha
  decine di portali pieni, 17 per la torre, che e' quasi tutta traliccio
  sottile e a 8 si riempiva di bollicine.

Poi misura il calibro di ogni tratto con una trasformata di distanza (e' cosi'
che escono le tre classi: `v`, `a`, `p`) e li ordina **dal basso in su** in
ventidue fasce. Quelle fasce sono l'ordine con cui la pagina li disegnera':
un monumento si alza da terra, non si allarga dal centro come una citta'.

**Per cambiare un disegno**: carica il nuovo SVG, mettilo in `FILE` in
`rasterizza.py`, rigenera, e sostituisci `__MILANO__` / `__PARIGI__` in
`sorgente.js` col contenuto dei `.js.txt`. Serve `pillow`, `numpy`, `scipy`
e `scikit-image`.

**Per rigenerare il file in pagina** dopo aver toccato `sorgente.js` o le
piante: sostituisci `__MILANO__` e `__PARIGI__` col contenuto dei due
`.js.txt`. Sono due `replace`, niente build.

## Tre lavori, tre condizioni diverse

1. **Pianta i due disegni.** Sempre: telefono compreso, senza WebGL, con le
   animazioni ridotte. E' la prima cosa che il file fa, prima di qualunque
   controllo. Se un domani qualcuno sposta i controlli piu' su, su telefono
   restano due scritte in mezzo al bianco.
2. **Li disegna.** La prima volta che la sezione entra nello schermo ogni
   singolo tratto viene tracciato da un capo all'altro, **dal basso in su**:
   prima quel che sta a terra, poi si sale fino alla punta. Niente compare in
   dissolvenza. Dalla seconda volta in poi non si ridisegna: resta solo la
   dissolvenza del disegno intero (classe `is-dentro`).
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

## I due disegni

Sono dipinti su tela, non disegnati nella pagina. Il perche' e' scritto in
cima a `sorgente.js`: animare qualche migliaio di tratti in SVG portava la
pagina da 16 a 166 millisecondi per fotogramma. Su tela si dipinge solo il
pezzo nuovo e il costo non dipende piu' da quanto e' grande il disegno.

**Stanno interi dentro il pannello, e non si tagliano.** Era diverso con le
mappe: quelle sbordavano apposta dai bordi, con una maschera radiale che le
spegneva verso fuori, perche' una citta' e' un tessuto che continua oltre il
bordo. Un monumento no: se lo tagli sembra sbagliato. Quindi la maschera va
via e le misure si scelgono perche' ci stiano dentro tutti e due.

**I vecchi file delle mappe** (`98667565-...milan...svg`,
`77243933-...paris...svg`, `vector-mappa-...-pw351m.svg` e i due `.avif`)
sono rimasti nella repo ma non li usa piu' niente: erano le sorgenti delle
piante stradali. Non vanno pubblicati.
