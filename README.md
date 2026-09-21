# cape-rilievo

La sezione delle due citta' di **The Cape Studio**: fondo grigio piatto, i
nomi di Milano e Parigi agli angoli con le loro coordinate, le piante delle
due citta' che entrano tagliate dai bordi, e in mezzo un bassorilievo che
non si vede — finche' non ci passi sopra col mouse.

Nel Designer di Webflow stanno solo la sezione e le due citta'. Le piante e
la tela del rilievo le mette questo file. Attenzione alla differenza: **le
piante vengono piantate sempre**, anche su un telefono e anche senza WebGL,
mentre la luce parte solo da 992px in su e con un puntatore vero. Se un
domani si spostasse il controllo delle condizioni prima delle piante, su
telefono resterebbero due scritte in mezzo al grigio.

## Cosa c'e' dentro

| file | cos'e' |
|---|---|
| `cape-rilievo.js` | il motore: una passata di WebGL che illumina la superficie incisa |
| `superficie.png` | la mappa delle profondita' del surfista: nero = superficie, bianco = fondo del solco |
| `milano.svg` `parigi.svg` | le due piante in chiaro: dentro `cape-rilievo.js` ci sono queste, riga per riga |

## Come e' agganciato

Nel footer della Home, in PARTE 2, con `defer`:

```html
<script defer src="https://cdn.jsdelivr.net/gh/cash9086/cape-rilievo@SHA/cape-rilievo.js"></script>
```

Lo SHA e' quello del commit, come per tutti gli altri script del sito.
`superficie.png` **non** va indicata da nessuna parte: lo script si ricava
da solo l'indirizzo da cui e' stato caricato e cerca l'immagine accanto a
se'. Cambi SHA e l'immagine segue, sempre della stessa versione del codice.

## Le manopole

Stanno tutte in cima a `cape-rilievo.js`, una per riga, con scritto a cosa
servono. Le due che si toccano davvero:

- `RAGGIO` — fin dove arriva la luce. Piu' piccolo, piu' il disegno si
  scopre un pezzo per volta;
- `DIFFUSA` e `LUCIDA` — quanto e' marcato il rilievo. Nel riferimento sono
  molto bassi: il bello e' che si veda appena.

`FONDO` e' il grigio della sezione (#f4f4f4) e serve al conto che trasforma
la luce in trasparenza: se cambia il grigio nel CSS, va cambiato anche qui.

## Dove NON gira

Sotto i 992px, senza un puntatore vero (telefoni e tablet), con "riduci
animazioni" acceso, o senza WebGL. In tutti questi casi la sezione resta
quella che si vede nel Designer: le due citta' con le coordinate e le due
piante. E' voluto: senza mouse non c'e' nessuna luce da muovere.

## Come e' fatta la mappa delle profondita'

Dal disegno a tratto del surfista: i tratti vengono ingrossati di qualche
pixel, sfumati per arrotondare le pareti, e diventano solchi. Il codice non
legge mai il disegno originale — legge solo le profondita'. Per rifarla con
un altro disegno servono tre righe di Pillow: ingrossa, sfuma, salva in
scala di grigi a 1600px di larghezza.
