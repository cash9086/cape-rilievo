# cape-rilievo

Le due immagini della **stampa goffrata a secco** che compare dentro la sezione
dust di **The Cape Studio**, e gli script che le generano. Il codice che le
disegna non e' qui: sta in `cape-dust.js`, nella repo `transition`.

> **2026-09-22 — due giri di ripensamenti, e il secondo ha vinto.**
>
> Prima questa era una sezione a se' (`.cape-rilievo`): due nomi di citta' e un
> surfista inciso. Aveva due soggetti giganti e una pagina ne regge uno; e
> quel disegno era uno schizzo a tratto, che ingrandito resta uno schizzo.
>
> Poi e' diventata `cape-radura.js`: una seconda tela WebGL appoggiata sopra
> quella della dust, che ci dipingeva sopra un cerchio bianco col bordo
> sfrangiato e ci faceva atterrare dentro 147.000 diamanti suoi. **Anche
> quella era sbagliata**, per due ragioni che valgono piu' di qualunque
> taratura:
>
> 1. **due motori non vanno mai d'accordo.** Due tele, due contesti, due
>    letture del progresso, due miscele diverse: ogni cosa da tenere allineata
>    a mano e' una cosa che di li' a poco non lo sara' piu'.
> 2. **il bianco lo facevano gia' i diamanti della dust.** A due terzi della
>    sua corsa il campo ha il centro saturo di bianco — perche' li' le
>    particelle si sono addossate — e i bordi neri, perche' li' si sono
>    diradate. Dipingerci sopra un cerchio era una seconda cosa che faceva lo
>    stesso lavoro, e vinceva la peggiore: un cerchio dipinto ha un bordo, e
>    qualunque bordo si disegni e' peggio di quello.
>
> Adesso e' **tutto dentro cape-dust.js**, un motore solo. `cape-radura.js` e i
> suoi punti d'atterraggio sono stati cancellati: stanno nella storia di git,
> al commit `cade712`.

> **2026-09-22, sera — il raduno se ne va anche lui.** I pixel che si
> radunavano al centro erano un secondo movimento sopra l'espansione, e si
> vedeva; e il bianco che facevano era granuloso, pieno di buchi neri. Adesso
> nessun pixel cambia strada.

## Come funziona adesso

Nessun diamante cambia strada. Al centro dello schermo c'e' un **campo di
luce** senza bordo, che cala con la distanza come un bagliore e nel tempo
cresce di intensita': i diamanti prendono la luce che gli arriva, si
accendono e si gonfiano, e dove e' tanta saturano in bianco pieno, con un
alone attorno. Il bianco non si allarga come una forma: si accende.

Dentro quel bianco la stampa e' **scavata** nella carta: la parete dalla parte
della luce getta un'ombra sul fondo, e il fondo e' un filo piu' scuro, quindi
le sagome si leggono piene e non come un disegno a linee. Si scava a
pressione (prima appena accennata, poi piu' profonda), si legge sempre tutta
per una luce radente che gira piano, e il mouse ci aggiunge la sua luce e la
inclina di qualche grado. Alla fine la luce satura lo schermo e la lastra
torna piatta.

Mentre succede, l'espansione non si ferma: rallenta. Tutte le manopole stanno
in cima a `cape-dust.js`, sotto `lento*`, `luce*`, `pieno*` e `lastra*`.

## I file

| file | cos'e' |
|---|---|
| `stampa.png` | la quota della goffratura. Valore alto = piu' in fondo |
| `stampa-gobba.png` | la PENDENZA del volume, gia' derivata, a un quarto di lato |
| `stampa-nera.png` | la stampa piatta, se un domani serve senza rilievo |
| `stampa-grana*.png` | le stesse tre, con la grana della stampa vera dentro le sagome. Non in pagina: in pagina c'e' la versione pulita |
| `stampa-src.jpg` | il manifesto sorgente |
| `stampa.py` | pulisce il manifesto e rigenera le tre immagini |
| `cape-rilievo.js` | il vecchio: due nomi e il surfista. Non piu' caricato |
| `gobba.py` | il volume del vecchio surfista, da `superficie.png` |

`cape-dust.js` punta a queste immagini con un indirizzo jsDelivr **pinnato a
uno SHA** (`I.lastraBase`): a `@main` jsDelivr le tiene in cache fino a una
settimana e si finisce a guardare una versione vecchia senza capire perche'.
Se le rigeneri, aggiorna quello SHA la' dentro.

## Cambiare il manifesto

```
python3 stampa.py     # goffratura, gobba e stampa piatta
```
Serve `pillow`, `numpy`, `scipy`. Se cambi il file sorgente, cambia `SRC`.

Si incide **solo la scritta e i due surfisti**: `pulita()` toglie le
pennellate del fondo e il bordo sporco, che in rilievo diventano rumore. Lo fa
con una soglia e un'apertura morfologica, piu' due eccezioni scritte con le
coordinate della sorgente (la tavola da surf, la pennellata accanto alla
figura seduta): **con un manifesto nuovo quelle coordinate non valgono piu'**.

Il file esce ritagliato sul disegno, con un margine. Lo script stampa quanta
parte dell'immagine e' disegno (`disegno 0.827 x 0.761`): se rigeneri, ricopia
quei due numeri in `lastraDisegno` dentro `cape-dust.js`, e anche il formato
in `lastraFormato`. La misura a schermo della lastra, e del bianco attorno, si
prende sul disegno.

## Le due cose che non si deducono leggendo il codice

**1. Il segno del rilievo e' al contrario di un'incisione.** Un disegno a
TRATTO si scava, e il rilievo giusto e' un solco. Questa e' una stampa a SAGOME
PIENE, e il rilievo giusto e' un'IMPRESSIONE: la carta schiacciata dove batte
l'inchiostro. L'inchiostro non si scava, si ALZA — `mappa = 1 - inchiostro`.
Sbagliare questo segno non da' errore: da' un risultato che sembra giusto e ha
le ombre dalla parte sbagliata.

**2. Sul bianco pieno la luce puo' solo fare OMBRA.** Sopra il bianco non c'e'
niente da schiarire. Non e' una rinuncia: e' anche quello che toglie il
rettangolo — dipingendo anche il bianco si vedrebbe il riquadro della lastra
stampato sulla pagina. (Era il bug del 22 settembre: gli angoli stavano a 242
invece che a 255, e quel velo da tredici punti steso su tutta la lastra si
leggeva come un bordo.)

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
