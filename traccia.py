"""La lastra che va in pagina: le sagome del manifesto TRACCIATE, e il mare.

   Perche' tracciare. Il manifesto e' un JPG di 1179 px, e le lettere hanno i
   bordi mangiati della serigrafia. Ingrandite e scavate, quelle intaccature
   di uno o due pixel diventano un tremolio lungo ogni bordo che si legge
   come un difetto di risoluzione, non come una stampa. Lisciarle con un
   filtro non serve: arrotonda gli angoli, e la scritta diventa un altro
   font. Qui invece le sagome diventano curve (potrace): i rettilinei tornano
   dritti, gli angoli restano vivi, e si ridisegnano a LARGO pixel — la
   scritta e' la stessa, solo nitida.

   Prima di tracciare si tolgono le intaccature piccole (un'apertura e una
   chiusura di PULISCI pixel). La tavola da surf e' sottile come loro e se ne
   andrebbe: si rimette presa dalla sagoma com'era.

   IL MARE sono le pennellate del manifesto — l'orizzonte, il mare — incise
   leggere (MARE, in frazione della profondita' delle sagome): danno il
   dettaglio dell'immagine vera senza toccare le lettere.

   Esce lastra.png (la quota), lastra-gobba.png, lastra-nera.png. Lo stesso
   ritaglio di stampa.py: lastraDisegno in cape-dust.js non cambia.

       pip install pillow numpy scipy potracer
       python3 traccia.py
"""
import numpy as np, os
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.ndimage import gaussian_filter
import potrace
from stampa import pulita, disco, MARGINE, SRC, QUI

LARGO   = 2400   # la lastra piu' grande a schermo, su uno schermo retina, e' ~1700
SMUSSO  = 2.2    # il fianco dello scavo, in px del file: stretto = spigolo netto
S_GOBBA = 39.0   # come in stampa.py, riscalato su LARGO
PIENO   = 0.2
PULISCI = 4      # le intaccature piu' piccole di cosi' spariscono (px della sorgente)
MARE    = 0.28   # quanto sono profonde le pennellate, rispetto alle sagome

def traccia(mask):
    # potracer traccia il "nero", cioe' i False: gli si passa il negativo
    return potrace.Bitmap(~mask).trace(turdsize=30, alphamax=0.75,
                                       opticurve=True, opttolerance=0.2)

def disegna(path, x0, y0, w, h, ss=3):
    """Riempie le curve a LARGO pixel, pari-dispari (i buchi delle lettere),
       con un sovracampionamento per il bordo antialias."""
    s = LARGO / w
    W, H = int(round(w * s)), int(round(h * s))
    acc = np.zeros((H * ss, W * ss), bool)
    def P(p): return ((p.x - x0) * s * ss, (p.y - y0) * s * ss)
    for curva in path:
        pts = [P(curva.start_point)]
        for seg in curva:
            if seg.is_corner:
                pts.append(P(seg.c)); pts.append(P(seg.end_point))
                continue
            a = np.array(pts[-1]); b = np.array(P(seg.c1))
            c = np.array(P(seg.c2)); d = np.array(P(seg.end_point))
            n = max(4, int(np.hypot(*(d - a)) / 3))
            for t in np.linspace(0, 1, n + 1)[1:]:
                pts.append(tuple((1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t**2*c + t**3*d))
        strato = Image.new('1', (W * ss, H * ss), 0)
        ImageDraw.Draw(strato).polygon(pts, fill=1)
        acc ^= np.asarray(strato, bool)
    a = Image.fromarray((acc * 255).astype(np.uint8)).resize((W, H), Image.BOX)
    return np.asarray(a).astype(np.float32) / 255.0

def scrivi(nome, forme, mare):
    salva = lambda a, f: Image.fromarray(np.clip(np.rint(a * 255), 0, 255).astype(np.uint8)).save(os.path.join(QUI, f), optimize=True)
    alto = np.maximum(gaussian_filter(forme, SMUSSO, mode='nearest'), mare)
    salva(1 - alto, nome + '.png')                       # valore alto = piu' in fondo

    dentro = ndi.distance_transform_edt(forme > 0.5)
    massa = gaussian_filter(np.sin(np.minimum(dentro / S_GOBBA, 1.0) * np.pi / 2), 1.5, mode='nearest')
    H, W = forme.shape; w, h = W // 4, H // 4
    p = np.asarray(Image.fromarray(np.clip(massa * 255, 0, 255).astype(np.uint8))
                   .resize((w, h), Image.LANCZOS)).astype(np.float32) / 255.0
    p = gaussian_filter(p, 1.0, mode='nearest')
    gx = (np.roll(p, -1, 1) - np.roll(p, 1, 1)) * 0.5; gy = (np.roll(p, -1, 0) - np.roll(p, 1, 0)) * 0.5
    gx[:, [0, -1]] = 0; gy[[0, -1], :] = 0
    rgb = np.zeros((h, w, 3), np.uint8)
    rgb[..., 0] = np.clip(np.rint((np.clip(gx, -PIENO, PIENO) / PIENO * .5 + .5) * 255), 0, 255)
    rgb[..., 1] = np.clip(np.rint((np.clip(gy, -PIENO, PIENO) / PIENO * .5 + .5) * 255), 0, 255)
    rgb[..., 2] = 128
    Image.fromarray(rgb).save(os.path.join(QUI, nome + '-gobba.png'), optimize=True)

    salva(1 - np.maximum(forme, mare / MARE * 0.5), nome + '-nera.png')
    print('%-8s %dx%d' % (nome, W, H))

if __name__ == '__main__':
    im = Image.open(SRC).convert('L')
    ink = 1.0 - np.asarray(im).astype(np.float32) / 255.0
    m = pulita(ink)

    # lo stesso ritaglio di stampa.py: il disegno piu' il margine, carta attorno
    ys, xs = np.where(m)
    x0 = xs.min() - MARGINE; x1 = xs.max() + 1 + MARGINE
    y0 = ys.min() - MARGINE; y1 = ys.max() + 1 + MARGINE

    pulito = ndi.binary_closing(ndi.binary_opening(m, structure=disco(PULISCI)), structure=disco(3))
    tavola = np.zeros_like(m); tavola[552:830, 750:1075] = True
    pulito |= m & tavola & ~ndi.binary_opening(m, structure=disco(PULISCI))
    forme = disegna(traccia(pulito), x0, y0, x1 - x0, y1 - y0)

    # il mare: le pennellate dentro la cornice, lontano dalle sagome
    cornice = np.zeros_like(m); cornice[175:900, 70:1140] = True
    fuori = ~ndi.binary_dilation(m, structure=disco(4))
    pen = gaussian_filter(np.clip((ink - 0.25) / 0.6, 0, 1) * fuori * cornice, 0.8)
    pad = np.pad(pen, MARGINE)[y0 + MARGINE:y1 + MARGINE, x0 + MARGINE:x1 + MARGINE]
    pad = np.asarray(Image.fromarray((pad * 255).astype(np.uint8))
                     .resize(forme.shape[::-1], Image.BICUBIC)).astype(np.float32) / 255.0
    scrivi('lastra', forme, gaussian_filter(pad, 1.2) * MARE)
    print('disegno %.3f x %.3f della lastra' % ((xs.max() + 1 - xs.min()) / (x1 - x0),
                                               (ys.max() + 1 - ys.min()) / (y1 - y0)))
