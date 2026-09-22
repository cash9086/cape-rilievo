# cape-rilievo

La seconda meta' della sezione dust di **The Cape Studio**: una stampa
serigrafica goffrata a secco che si compone dentro il cielo di diamanti,
mentre il campo si ferma, e che si dissolve quando il campo riparte e il
bianco vince.

> **2026-09-22 — la sezione e' cambiata di natura.** Prima era una sezione a
> se' (`.cape-rilievo`) con due nomi di citta' e un surfista inciso. Adesso e'
> `cape-radura.js`, e vive DENTRO al pannello incollato della dust, sullo
> stesso binario. Il vecchio `cape-rilievo.js` resta nella repo ma non lo
> carica piu' nessuno.
>
> **Perche'.** La sezione aveva due soggetti giganti — due nomi da 200 px e un
> disegno alto un metro — e una pagina ne regge uno. E quel disegno era uno
> schizzo a tratto: ingrandito restava uno schizzo. La stampa serigrafica ha
> il testo DENTRO l'inchiostro, quindi tipografia e immagine sono un oggetto
> solo e il problema smette di esistere.

## La cosa da capire prima di tutte: il bianco non lo dipinge nessuno

A due terzi della sua corsa il campo della dust e' gia' esattamente quello che
serve — **il centro saturo di bianco** perche' li' le particelle si sono
addossate, **i bordi ancora neri** perche' li' si sono diradate.

Un primo tentativo ci dipingeva sopra un cerchio bianco col bordo sfrangiato
da un rumore. Era brutto, e non per come era tarato: perche' erano **due cose
che facevano lo stesso lavoro**, e vinceva la peggiore. Un cerchio dipinto ha
un bordo, e qualunque bordo si disegni e' peggio di quello che fanno le
particelle diradandosi.

Quindi non c'e' nessuna radura da disegnare. C'e' una **pausa**, che sta in
`cape-dust.js`: il progresso della dust si pianta in quello stato per un
quarto del binario — le particelle restano dove sono e continuano a
scintillare — e dentro quella pausa entra la lastra.

## I quattro tempi

| sul binario | cosa succede |
|---|---|
| 0 → 0.55 | la dust fa il suo: la foto si sbriciola, il campo si allarga e si accende |
| **0.55 → 0.78** | **la sosta**: il progresso della dust si pianta a 0.66 del suo spettacolo |
| 0.53 → 0.70 | i diamanti convergono sull'inchiostro e si posano; la lastra si compone dal basso |
| 0.70 → 0.80 | la lastra resta intera: e' li' che la luce del puntatore la taglia |
| 0.78 → 1 | il campo riparte, si allarga, il bianco chiude. La lastra si dissolve (0.80 → 0.90) |

I numeri della lastra stanno in cima a `cape-radura.js`, quelli della sosta in
`cape-dust.js`. **Vanno tenuti d'accordo**: la lastra deve stare dentro alla
pausa, se no si compone mentre il cielo si sta ancora allargando.

## I file

| file | cos'e' |
|---|---|
| `cape-radura.js` | **quello che gira**: i diamanti che si posano e la lastra goffrata |
| `cape-rilievo.js` | il vecchio: due nomi e il surfista inciso. Non piu' caricato |
| `stampa.png` | la quota della goffratura. Valore alto = piu' in fondo |
| `stampa-gobba.png` | la PENDENZA del volume, gia' derivata, a un quarto di lato |
| `stampa-nera.png` | la stampa piatta: e' quella che si vede sotto i 992 px |
| `atterraggi.png` | 147.456 punti d'arrivo, due righe per diamante, sedici bit a coordinata |
| `stampa-src.jpg` | il manifesto sorgente |
| `stampa.py` | rigenera goffratura + gobba + stampa piatta dal manifesto |
| `atterraggi.py` | rigenera i punti d'arrivo |
| `gobba.py` | il volume del vecchio surfista, da `superficie.png` |

## Cambiare il manifesto

```
python3 stampa.py       # goffratura, gobba e stampa piatta
python3 atterraggi.py   # i punti dove cadono i diamanti
```
Serve `pillow`, `numpy`, `scipy`. Poi si committa e si aggiorna lo SHA nel tag
`<script>`: le immagini seguono da sole, perche' `cape-radura.js` ricava il
proprio indirizzo da `document.currentScript`. Se cambi il file sorgente,
cambia `SRC` in tutti e due gli script.

## Le tre cose che non si deducono leggendo il codice

**1. Il segno del rilievo e' al contrario del surfista.** Quello era un
disegno a TRATTO, e il rilievo giusto per un tratto e' un solco inciso. Questa
e' una stampa a SAGOME PIENE, e il rilievo giusto e' un'IMPRESSIONE: la carta
schiacciata dove batte l'inchiostro. Quindi l'inchiostro non si scava, si
ALZA — `mappa = 1 - inchiostro`. Sbagliare questo segno non da' errore: da' un
risultato che sembra giusto e ha le ombre dalla parte sbagliata.

**2. Sul bianco pieno la luce puo' solo fare OMBRA.** Sopra il bianco non c'e'
niente da schiarire. Non e' una rinuncia: e' anche quello che toglie il
rettangolo — dipingendo anche il bianco si vedrebbe il riquadro della lastra
stampato sulla pagina. (Era il bug del 22 settembre: gli angoli stavano a 242
invece che a 255, e quel velo da tredici punti steso su tutta la lastra si
leggeva come un bordo.)

**3. I diamanti della radura sono ADDITIVI, come quelli della dust.** La loro
luce si deve sommare: e' addossandosi che fanno il bianco. La lastra invece si
disegna con "sopra" e l'alfa premoltiplicata, perche' lei deve scurire. Due
miscele diverse nello stesso fotogramma, una per ciascun disegno.

## L'innesto con la dust

`cape-dust.js` ha guadagnato quattro parametri, e a `coda: 0` si comporta
esattamente come prima:

- **`coda`** — dice che l'ultimo tratto del binario non e' suo.
- **`sostaDa` / `sostaA` / `sostaQuota`** — dove il progresso si pianta, dove
  riparte, e a che punto del proprio spettacolo. `sostaQuota: 0.66` e' **il
  numero da tarare**: e' "quanto e' avanti il campo quando si ferma", cioe'
  quanto grande e' la macchia bianca al centro.

La sua tendina bianca finale resta accesa: e' lei che chiude, come ha sempre
fatto. La barra in alto invece rientra col progresso del binario INTERO e non
piu' col suo: dentro alla sosta non deve esserci, perche' li' c'e' una pagina
stampata e non un sito. L'interfaccia torna quando arriva lo studio-hero.

Il binario passa da **600vh a 820vh** (480 a 660 su telefono): e' il conto che
tiene la prima parte della dust a velocita' quasi identica e lascia due
schermate scarse di pausa.

## Sotto i 992 px

Non parte niente: niente WebGL, e soprattutto nessun puntatore da seguire, e
una goffratura che non si puo' scoprire e' solo peso scaricato per niente. Al
suo posto `stampa-nera.png`, che compare e sparisce nella stessa finestra. Il
bianco sotto ce l'ha gia' messo la dust.

---

## Il vecchio: il surfista inciso

> Quello che segue riguarda `cape-rilievo.js`, che non gira piu'. Resta
> scritto perche' il motore del rilievo e' lo stesso, e perche' la catena da
> un disegno ai tratti tracciabili puo' servire ancora.

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
| `milano.svg` `parigi.svg` | gli stessi disegni come SVG, solo per guardarli (col pallore `.85` del CSS) |
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
