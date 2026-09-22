"""I disegni sono forme piene: li rendo grandi, poi ne prendo l'asse.

   Il quadro e' quadrato perche' la tela su cui il motore dipinge lo e'.
   Il ritaglio pero' si fa SUL DISEGNO, non sul centro: una mappa la si
   puo' tagliare dove capita — e' un tessuto, continua oltre il bordo —
   ma un monumento tagliato a meta' si legge come un errore. Quindi si
   cerca il riquadro dell'inchiostro, lo si ritaglia li', e lo si
   impagina in un quadrato con un filo d'aria attorno.
"""
import re, subprocess, os
from PIL import Image

SRC = '/home/user/cape-rilievo/'
FILE = {'milano': 'duomo-di-milano-milan-cathedral-vector-sketch_534606-748.svg',
        'parigi': 'Gemini_Generated_Image_1uvq41uvq41uvq41.svg'}
LARGO   = 2600     # quanto grande lo rendo: piu' grande = piu' tratti sottili sopravvivono
MARGINE = 0.035    # aria attorno al disegno, in frazione del lato

for nome, f in FILE.items():
    t = open(SRC + f).read()
    t = re.sub(r'^<\?xml.*?\?>\s*|<!DOCTYPE[^>]*>\s*', '', t, flags=re.S)
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', t)
    w, h = (float(m.group(1)), float(m.group(2))) if m else (1000.0, 1000.0)
    alto = int(round(LARGO * h / w))
    html = ('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}'
            'svg{display:block;width:%dpx;height:auto}</style>%s' % (LARGO, t))
    open(SRC + nome + '.html', 'w').write(html)
    subprocess.run(['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
        '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--window-size=%d,%d' % (LARGO, alto), '--screenshot=%s%s_grezza.png' % (SRC, nome),
        '--virtual-time-budget=25000', 'file://' + os.path.abspath(SRC + nome + '.html')],
        capture_output=True)

    im = Image.open(SRC + nome + '_grezza.png').convert('L')
    bb = im.point(lambda v: 255 if v < 200 else 0).getbbox()   # il riquadro dell'inchiostro
    if not bb:
        print(nome, 'NESSUN INCHIOSTRO'); continue
    im = im.crop(bb)
    lato = int(round(max(im.width, im.height) * (1 + 2 * MARGINE)))
    quadro = Image.new('L', (lato, lato), 255)
    quadro.paste(im, ((lato - im.width) // 2, (lato - im.height) // 2))
    quadro.save(SRC + nome + '_raster.png')
    print('%-7s reso %dx%d  disegno %dx%d  ->  quadro %d' % (
        nome, LARGO, alto, im.width, im.height, lato))
