"""Le mappe sono forme piene: le rendo grandi, poi ne prendo l'asse.

   Il quadro e' quadrato: le mappe rettangolari vengono ritagliate al
   centro, perche' e' li' che sta la citta' e perche' i bordi li mangia
   comunque la maschera.
"""
import re, subprocess, os
from PIL import Image

SRC='/home/user/cape-rilievo/'
FILE={'milano':'98667565-map-of-the-city-of-milan-capital-of-lombardy-italy.svg',
      'parigi':'vector-mappa-della-citta-di-parigi-in-bianco-e-nero-pw351m.svg'}
LARGO=2600      # quanto grande lo rendo: piu' grande = piu' strade sottili sopravvivono

for nome,f in FILE.items():
    t=open(SRC+f).read()
    t=re.sub(r'^<\?xml.*?\?>\s*|<!DOCTYPE[^>]*>\s*','',t,flags=re.S)
    m=re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', t)
    w,h=(float(m.group(1)), float(m.group(2))) if m else (1000.0,1000.0)
    alto=int(round(LARGO*h/w))
    html=('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}'
          'svg{display:block;width:%dpx;height:auto}</style>%s'%(LARGO,t))
    open(nome+'.html','w').write(html)
    subprocess.run(['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
        '--headless','--disable-gpu','--no-sandbox','--hide-scrollbars',
        '--window-size=%d,%d'%(LARGO,alto),'--screenshot=%s_grezza.png'%nome,
        '--virtual-time-budget=15000','file://'+os.path.abspath(nome+'.html')],
        capture_output=True)
    im=Image.open(nome+'_grezza.png').convert('L')
    lato=min(im.width, im.height)
    x=(im.width-lato)//2; y=(im.height-lato)//2
    im.crop((x,y,x+lato,y+lato)).save(nome+'_raster.png')
    print('%-7s reso %dx%d -> quadro %d'%(nome, im.width, im.height, lato))
