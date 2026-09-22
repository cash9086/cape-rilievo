"""La gobba: il volume che il bassorilievo non ha mai avuto acceso.

   superficie.py calcola DUE cose e ne salva una sola:
     solco = le linee sfumate strette, incise. E' quello che c'e' oggi.
     massa = le stesse linee sfumate LARGHE: dove sono fitte la sfumatura si
             somma e viene una gobba. E' il volume, quello che fa sembrare la
             figura scolpita invece che incisa.
   La riga che la spegne e' A_MASSA = 0.0.

   IL DISEGNO ORIGINALE NON E' NELLA REPO: superficie.py puntava a un file
   temporaneo che non esiste piu'. Non serve. superficie.png E' gia'
   l'inchiostro sfumato a 5.5, quindi risfumarlo a sqrt(S^2 - 5.5^2) da' lo
   stesso campo che si otterrebbe sfumando l'inchiostro a S. Due sfumate
   gaussiane si sommano in quadratura: non e' un'approssimazione.

   DUE SCELTE CHE NON SI DEDUCONO GUARDANDO IL RISULTATO
   1. LARGO 20, NON 38. A 38 (il numero di superficie.py) la sfumatura e'
      cosi' larga che tutto il disegno diventa UNA bolla sola: un cuscino
      sotto la figura, non il corpo della figura. A 20 ogni gruppo di tratti
      si alza per conto suo: l'onda viene a creste tonde, il surfista viene
      un rilievo a se'.
   2. VIA IL PIEDISTALLO (ALTA). Una gobba sfumata finisce da qualche parte,
      e dove finisce ha una pendenza: sullo schermo diventa un alone scuro
      tutto attorno alla figura, che si legge come una macchia. Togliendo
      alla gobba la sua stessa versione molto piu' sfumata resta solo il
      rilievo locale e il campo lontano torna piatto.

   COSA ESCE: gobba.png, un quarto di lato. Dentro non c'e' la QUOTA della
   gobba, c'e' la sua PENDENZA, gia' derivata qui in virgola mobile:
   rosso = pendenza in x, verde = pendenza in y, 128 = pendenza zero.
   Il perche' sta nel docstring di superficie.py: la gobba e' larghissima e
   liscia, a otto bit i suoi gradini sono invisibili sull'altezza ma la luce
   guarda la PENDENZA, e la pendenza di una scala e' una fila di scalini —
   venivano anelli concentrici attorno alla figura. Un campo gia' derivato
   non va derivato a valle, e un campo che non va derivato si puo' tenere
   piccolo: a un quarto di lato pesa venti volte meno e, interpolato, resta
   identico.

   LA CONVENZIONE DEI SEGNI, che e' l'unica cosa che si puo' sbagliare senza
   accorgersene: pendenza in x = (destra - sinistra), in y = (sotto - sopra),
   in coordinate d'immagine. E' la stessa dello shader — li' (hd-hs) e
   (hg-ha) — quindi i due campi si sommano senza girare niente. E si
   SOTTRAE: il solco scende, la gobba sale.
"""
import numpy as np, os
from PIL import Image
from scipy.ndimage import gaussian_filter

QUI = os.path.dirname(os.path.abspath(__file__))

S_SOLCO = 5.5    # la sfumata che superficie.png ha gia' addosso
S_GOBBA = 20.0   # quanto e' larga la gobba
ALTA    = 2.5    # via il piedistallo: quante volte S_GOBBA e' la sfumata da togliere
ESP     = 0.75   # la stessa compressione di superficie.py
SCALA   = 4      # di quanto si rimpicciolisce
PIENO   = 0.030  # pendenza che riempie gli otto bit

solco = np.asarray(Image.open(os.path.join(QUI, 'superficie.png')).convert('L')).astype(np.float32) / 255.0
H, W  = solco.shape

massa = gaussian_filter(solco, (S_GOBBA**2 - S_SOLCO**2) ** 0.5, mode='nearest')
massa = (massa / max(massa.max(), 1e-6)) ** ESP
massa = massa - gaussian_filter(massa, S_GOBBA * ALTA, mode='nearest')

w, h = W // SCALA, H // SCALA
p = np.asarray(Image.fromarray(np.clip((massa * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8))
               .resize((w, h), Image.LANCZOS)).astype(np.float32) / 255.0
p = gaussian_filter(p, 1.0, mode='nearest')          # via la grana degli otto bit

gx = (np.roll(p, -1, axis=1) - np.roll(p, 1, axis=1)) * 0.5
gy = (np.roll(p, -1, axis=0) - np.roll(p, 1, axis=0)) * 0.5
gx[:, [0, -1]] = 0; gy[[0, -1], :] = 0

print('pendenza  max |gx| %.4f   max |gy| %.4f   tosata a %.3f  (%.1f%% dei pixel)'
      % (np.abs(gx).max(), np.abs(gy).max(), PIENO,
         100.0 * np.mean((np.abs(gx) > PIENO) | (np.abs(gy) > PIENO))))

rgb = np.zeros((h, w, 3), np.uint8)
rgb[..., 0] = np.clip(np.rint((np.clip(gx, -PIENO, PIENO) / PIENO * 0.5 + 0.5) * 255), 0, 255)
rgb[..., 1] = np.clip(np.rint((np.clip(gy, -PIENO, PIENO) / PIENO * 0.5 + 0.5) * 255), 0, 255)
rgb[..., 2] = 128
Image.fromarray(rgb).save(os.path.join(QUI, 'gobba.png'), optimize=True)
print('gobba %dx%d  %d KB' % (w, h, os.path.getsize(os.path.join(QUI, 'gobba.png')) // 1024))
