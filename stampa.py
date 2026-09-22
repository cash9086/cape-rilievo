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
"""
import numpy as np, os, sys
from PIL import Image
from scipy.ndimage import gaussian_filter

QUI   = os.path.dirname(os.path.abspath(__file__))
SRC   = os.path.join(QUI, 'stampa-src.jpg')
LARGO = 1600

SMUSSO  = 3.2    # larghezza del bordo dell'impronta, in px del file grande
GRANA   = 0.55   # quanta della grana del rullo resta nel rilievo
S_GOBBA = 26.0   # larghezza della gonfiatura sotto le masse
ALTA    = 2.5    # via il piedistallo (vedi gobba.py)
PIENO   = 0.030  # pendenza che riempie gli otto bit

def inchiostro(box=None):
    im = Image.open(SRC).convert('L')
    if box: im = im.crop(box)
    a = im.resize((LARGO, int(round(LARGO * im.height / im.width))), Image.LANCZOS)
    ink = 1.0 - np.asarray(a).astype(np.float32) / 255.0
    # la carta non e' mai bianca pura in una scansione: si toglie il fondo
    return np.clip((ink - 0.06) / 0.88, 0, 1)

def scrivi(nome, box=None):
    ink = inchiostro(box)
    H, W = ink.shape

    # ——— la lastra: l'inchiostro alzato, col suo smusso ———
    alto  = gaussian_filter(ink, SMUSSO, mode='nearest')
    grana = ink - gaussian_filter(ink, SMUSSO * 3, mode='nearest')
    alto  = np.clip(alto + grana * GRANA, 0, 1)
    mappa = 1.0 - alto                                  # valore alto = piu' in fondo
    Image.fromarray(np.clip(np.rint(mappa * 255), 0, 255).astype(np.uint8)) \
         .save(os.path.join(QUI, nome + '.png'), optimize=True)

    # ——— la gobba: la gonfiatura larga sotto le masse ———
    massa = gaussian_filter(ink, S_GOBBA, mode='nearest')
    massa = (massa / max(massa.max(), 1e-6)) ** 0.75
    massa = massa - gaussian_filter(massa, S_GOBBA * ALTA, mode='nearest')
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

im = Image.open(SRC)
scrivi('stampa')                                                  # tutto: testo + sagome
scrivi('sagome', (0, int(im.height * .43), im.width, im.height))  # solo la fascia bassa
