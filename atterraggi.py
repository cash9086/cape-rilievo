"""I punti dove i diamanti si posano.

   Uno per diamante, pescato sull'inchiostro del manifesto: dove c'e' piu'
   nero ne cadono di piu', dove c'e' carta non ne cade nessuno. Poi si
   ordinano DAL BASSO IN SU, perche' una cosa si alza da terra: l'ordine e'
   la sequenza con cui atterreranno, e il rilievo comparira' nello stesso
   ordine.

   NON ESCE UNA LISTA, ESCE UN'IMMAGINE. Una lista di venticinquemila
   coppie in JSON sono centinaia di kilobyte da leggere e poi da passare
   alla scheda video. Una texture la scheda ce l'ha gia' in mano: il vertex
   shader guarda il texel numero i e trova il punto numero i. Sedici bit per
   coordinata (due byte, RG per la x e BA per la y), perche' a otto bit i
   punti si accavallerebbero su una griglia di 256 e si vedrebbe.
"""
import numpy as np, os
from PIL import Image

QUI  = os.path.dirname(os.path.abspath(__file__))
LATO = 160                      # 160 x 160 = 25.600 diamanti
N    = LATO * LATO

ink = 1.0 - np.asarray(Image.open(QUI + '/stampa-src.jpg').convert('L')
                       .resize((800, 0) if False else (800, 693), Image.LANCZOS)
                      ).astype(np.float64) / 255.0
ink = np.clip((ink - 0.10) / 0.85, 0, 1) ** 1.25      # via il fondo della scansione
H, W = ink.shape

pesi = ink.ravel()
pesi = pesi / pesi.sum()
rng  = np.random.default_rng(7)
scelti = rng.choice(W * H, size=N, replace=True, p=pesi)

y, x = np.divmod(scelti, W)
# mezzo pixel di sbandamento: se no i punti stanno sulla griglia dell'immagine
x = (x + rng.random(N)) / W
y = (y + rng.random(N)) / H

ordine = np.argsort(-y)          # dal basso in su: y grande = in basso
x, y = x[ordine], y[ordine]

xi = np.clip(np.rint(x * 65535), 0, 65535).astype(np.uint32)
yi = np.clip(np.rint(y * 65535), 0, 65535).astype(np.uint32)
rgba = np.zeros((LATO, LATO, 4), np.uint8)
rgba[..., 0] = (xi >> 8).reshape(LATO, LATO)
rgba[..., 1] = (xi & 255).reshape(LATO, LATO)
rgba[..., 2] = (yi >> 8).reshape(LATO, LATO)
rgba[..., 3] = (yi & 255).reshape(LATO, LATO)

# PNG senza perdita e senza premoltiplicare: l'alfa qui non e' trasparenza,
# e' meta' di una coordinata. Va letto con UNPACK_PREMULTIPLY_ALPHA spento.
Image.fromarray(rgba, 'RGBA').save(QUI + '/atterraggi.png', optimize=True)
print('atterraggi %dx%d  %d diamanti  %d KB'
      % (LATO, LATO, N, os.path.getsize(QUI + '/atterraggi.png') // 1024))
print('coperta  x %.3f-%.3f   y %.3f-%.3f' % (x.min(), x.max(), y.min(), y.max()))
