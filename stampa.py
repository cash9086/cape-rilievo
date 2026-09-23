"""Dalla stampa serigrafica alla lastra impressa.

   La catena e' la stessa del surfista, ma il DATO e' di un'altra natura e
   va trattato al contrario. Il surfista era un disegno a TRATTO: linee
   sottili, e il rilievo giusto e' un solco inciso. Questa e' una stampa a
   SAGOME PIENE: masse nere grandi, e il rilievo giusto e' un'IMPRESSIONE —
   la carta schiacciata dove batte l'inchiostro, come una goffratura a
   secco. Quindi l'inchiostro non si scava, si ALZA.

   Nella mappa il valore alto vuol dire "piu' in fondo" (e' cosi' che e'
   fatta superficie.png), quindi l'inchiostro finisce in basso: mappa =
   1 - inchiostro. Sbagliare questo segno non da' errore, da' un risultato
   che sembra giusto e ha le ombre dalla parte sbagliata.

   SMUSSO e' la larghezza del bordo dell'impronta: il fianco della lettera.
   Stretto = carta rigida, spigolo netto. Largo = carta morbida, bordo
   tondo. E' l'unica manopola che cambia davvero l'aria del risultato.

   SOLO LA SCRITTA E I DUE SURFISTI. Il manifesto ha dietro pennellate di
   rullo e un bordo sporco: in rilievo diventano rumore, una carta
   grattata invece di una stampa. pulita() le toglie e lascia le sagome
   piene. Le sagome sono nere piene, le pennellate grigie e sottili: una
   soglia e un'apertura morfologica le separano quasi da sole. Restano due
   eccezioni, scritte a mano qui sotto:
     - la tavola del surfista e' un contorno sottile come una pennellata,
       e l'apertura la cancellerebbe: si recupera a parte, per contatto col
       surfista che la tiene;
     - accanto alla figura seduta la pennellata e' scura quasi quanto lei:
       li' la soglia sale.
   Il file esce ritagliato sul disegno, con un margine: la misura scritta
   in cape-dust.js (lastraDisegno) e' presa sul disegno, non sul file.
"""
import numpy as np, os, sys
from PIL import Image
from scipy import ndimage as ndi
from scipy.ndimage import gaussian_filter

QUI   = os.path.dirname(os.path.abspath(__file__))
SRC   = os.path.join(QUI, 'stampa-src.jpg')
LARGO = 1600

SMUSSO  = 3.2    # larghezza del bordo dell'impronta, in px del file grande
GRANA   = 0.0    # quanta della grana del rullo resta nel rilievo. A zero da
                 # quando il disegno e' pulito: senza grana da conservare, restava
                 # solo un gradino lungo i bordi, e in luce radente ogni lettera
                 # usciva ripassata due volte, come a matita
GRANA_VERA = 0.55  # la stessa, per la versione con la grana della stampa vera:
                   # li' c'e' una trama da conservare, e lo smusso la cancellerebbe
S_GOBBA = 26.0   # quanto e' largo il fianco della cupola, dal bordo verso dentro
PIENO   = 0.2    # pendenza che riempie gli otto bit

MARGINE = 110    # aria attorno al disegno, in px della sorgente: la lastra
                 # deve finire su carta liscia, o il bordo del file si legge
                 # in luce radente come una riga dritta

def disco(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r

def pulita(ink):
    """Le sagome piene (scritta, figura seduta, surfista con la tavola),
       senza le pennellate del fondo ne' il bordo. Coordinate della
       sorgente 1179x1022: se cambi manifesto, questi numeri non valgono."""
    pieno = ink > 0.6
    seduto = np.zeros_like(pieno); seduto[600:900, 380:760] = True
    pieno = np.where(seduto, ink > 0.8, pieno)
    # la scritta e' nero pieno (0.85) stampato SOPRA pennellate grigie scure:
    # a 0.6 le due S finali si fondevano con la pennellata sotto e uscivano
    # deformate. Nella fascia della scritta la soglia sale.
    scritta = np.zeros_like(pieno); scritta[175:470, 55:1120] = True
    pieno = np.where(scritta, ink > 0.76, pieno)

    aperto = ndi.binary_opening(pieno, structure=disco(6))
    lab, n = ndi.label(aperto)
    tieni = np.zeros(n + 1, bool)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        area = (lab[sl] == i).sum()
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        # fra la scritta (sopra 470) e le figure (sotto 610) ci sono solo pennellate
        fascia = sl[0].start > 470 and sl[0].stop < 610
        if area > 1500 and h > 25 and w / h < 3.5 and not fascia:
            tieni[i] = True
    sagome = tieni[lab]

    # i bordi ruvidi delle lettere tornano, le pennellate attaccate no
    m = sagome.copy()
    for _ in range(3):
        m = ndi.binary_dilation(m) & pieno

    # la tavola: il contorno sottile attaccato al surfista
    box = np.zeros_like(pieno); box[552:830, 750:1075] = True
    lf, _ = ndi.label((ink > 0.5) & box)
    ids = np.unique(lf[sagome & box]); ids = ids[ids > 0]
    tavola = np.isin(lf, ids)
    tavola[676:712, 750:808] = False      # l'orizzonte che la attraversa
    m |= tavola

    # i buchini dentro le lettere: in rilievo sarebbero crateri
    buchi = ndi.binary_fill_holes(m) & ~m
    lb, nb = ndi.label(buchi)
    area = ndi.sum(buchi, lb, range(1, nb + 1))
    m |= np.isin(lb, np.where(area < 500)[0] + 1)
    return m

def inchiostro(grana=False):
    im = Image.open(SRC).convert('L')
    ink = 1.0 - np.asarray(im).astype(np.float32) / 255.0
    # il margine puo' uscire dalla sorgente (a sinistra il disegno e' a 61 px
    # dal bordo): fuori e' carta, quindi si aggiunge carta
    m = pulita(ink)
    if grana:
        # la grana della stampa vera: dentro le sagome l'inchiostro com'e' —
        # coi suoi bianchi, i bordi mangiati, la trama del rullo — e fuori
        # niente, come nella versione pulita
        vero = np.clip((ink - 0.06) / 0.88, 0, 1)
        dentro = ndi.binary_dilation(m, structure=disco(2))
        m = np.where(dentro, vero, 0.0)
    m = np.pad(m, MARGINE)
    ys, xs = np.where(m > 0.5)
    x0 = xs.min() - MARGINE; x1 = xs.max() + 1 + MARGINE
    y0 = ys.min() - MARGINE; y1 = ys.max() + 1 + MARGINE
    # quanta parte dell'immagine e' disegno: cape-dust.js misura la lastra
    # sul disegno, non sul margine (lastraDisegno)
    print('disegno %.3f x %.3f dell\'immagine' % ((xs.max() + 1 - xs.min()) / (x1 - x0),
                                               (ys.max() + 1 - ys.min()) / (y1 - y0)))
    m = Image.fromarray(np.clip(m[y0:y1, x0:x1] * 255, 0, 255).astype(np.uint8))
    a = m.resize((LARGO, int(round(LARGO * m.height / m.width))), Image.LANCZOS)
    return np.asarray(a).astype(np.float32) / 255.0

def scrivi(nome, grana=False):
    ink = inchiostro(grana)
    H, W = ink.shape

    # ——— la lastra: l'inchiostro alzato, col suo smusso ———
    alto  = gaussian_filter(ink, SMUSSO, mode='nearest')
    dett  = ink - gaussian_filter(ink, SMUSSO * 3, mode='nearest')
    alto  = np.clip(alto + dett * (GRANA_VERA if grana else GRANA), 0, 1)
    mappa = 1.0 - alto                                  # valore alto = piu' in fondo
    Image.fromarray(np.clip(np.rint(mappa * 255), 0, 255).astype(np.uint8)) \
         .save(os.path.join(QUI, nome + '.png'), optimize=True)

    # ——— la gobba: il volume DENTRO le sagome ———
    # Una cupola in ogni sagoma: sale dal bordo verso l'interno per S_GOBBA
    # pixel e poi resta piana, e fuori vale zero. Prima era la massa sfocata
    # meno una sua sfocatura piu' larga, e quel passa-alto lasciava attorno a
    # ogni figura un anello: finche' la luce era un cerchio attorno al mouse
    # si notava poco, con una luce su tutta la lastra si leggeva come un
    # contorno fantasma. Una cupola fatta con la distanza dal bordo non puo'
    # uscire dalla sagoma, per costruzione.
    dentro = ndi.distance_transform_edt(ink > 0.5)
    massa = np.sin(np.minimum(dentro / S_GOBBA, 1.0) * np.pi / 2)
    massa = gaussian_filter(massa, 1.5, mode='nearest') * 2.0 - 1.0
    w, h = W // 4, H // 4
    p = np.asarray(Image.fromarray(np.clip((massa * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8))
                   .resize((w, h), Image.LANCZOS)).astype(np.float32) / 255.0
    p = gaussian_filter(p, 1.0, mode='nearest')
    gx = (np.roll(p, -1, axis=1) - np.roll(p, 1, axis=1)) * 0.5
    gy = (np.roll(p, -1, axis=0) - np.roll(p, 1, axis=0)) * 0.5
    gx[:, [0, -1]] = 0; gy[[0, -1], :] = 0
    rgb = np.zeros((h, w, 3), np.uint8)
    rgb[..., 0] = np.clip(np.rint((np.clip(gx, -PIENO, PIENO) / PIENO * .5 + .5) * 255), 0, 255)
    rgb[..., 1] = np.clip(np.rint((np.clip(gy, -PIENO, PIENO) / PIENO * .5 + .5) * 255), 0, 255)
    rgb[..., 2] = 128
    Image.fromarray(rgb).save(os.path.join(QUI, nome + '-gobba.png'), optimize=True)

    # ——— la stampa vera, ripulita, per chi la vuole nera e basta ———
    carta = np.clip(1.0 - ink, 0, 1)
    Image.fromarray((carta * 255).astype(np.uint8)) \
         .save(os.path.join(QUI, nome + '-nera.png'), optimize=True)

    print('%-18s %dx%d   lastra %d KB   gobba %d KB   nera %d KB'
          % (nome, W, H,
             os.path.getsize(os.path.join(QUI, nome + '.png')) // 1024,
             os.path.getsize(os.path.join(QUI, nome + '-gobba.png')) // 1024,
             os.path.getsize(os.path.join(QUI, nome + '-nera.png')) // 1024))
    return W, H

if __name__ == '__main__':
    scrivi('stampa')
    scrivi('stampa-grana', grana=True)   # la stessa, con la grana della stampa vera
