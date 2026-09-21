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
| `superficie.png` | la mappa delle profondita' del surfista: nero = superficie, bianco = fondo del solco |
| `milano.js.txt` `parigi.js.txt` | il dato delle piante: `[classe, fascia, percorso]` |
| `milano.svg` `parigi.svg` | le stesse piante come SVG, solo per guardarle |
| `citta.py` | le rigenera tutte e due |

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

Sono dipinte su tela, non disegnate nella pagina. Il perche' e' scritto in
cima a `sorgente.js`: animare qualche migliaio di strade in SVG portava la
pagina da 16 a 166 millisecondi per fotogramma. Su tela si dipinge solo il
pezzo nuovo e il costo non dipende piu' da quanto e' grande la mappa.

**Le strade sono disegnate, non rilevate.** Milano e' radiocentrica per
costruzione (cerchie e radiali, con i Navigli, il Lambro e l'Olona al
posto giusto), Parigi e' un mosaico di quartieri ognuno con la sua
orientazione, piu' la Senna, il canale Saint-Martin, i boulevard e le
piazze a stella. Verso il bordo le strade si diradano fino a sparire: la
mappa si dissolve invece di finire con un taglio.

Non e' cartografia: serve a far leggere "citta'", non a dire dove si gira
a destra. Per avere le strade vere servirebbero dati OpenStreetMap, che da
qui non sono raggiungibili.

**I due .avif** in questa repo sono le anteprime con filigrana da cui e'
partita la richiesta: non sono usate da niente e non vanno pubblicate.
