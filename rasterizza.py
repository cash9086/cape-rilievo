"""Le tue mappe sono forme piene: le rendo grandi, poi ne prendo l'asse."""
import re, subprocess, sys, os
SRC='/home/user/cape-rilievo/'
FILE={'milano':'98667565-map-of-the-city-of-milan-capital-of-lombardy-italy.svg',
      'parigi':'77243933-map-of-the-city-of-paris-france.svg'}
LATO=1800
for nome,f in FILE.items():
    t=open(SRC+f).read()
    t=re.sub(r'^<\?xml.*?\?>\s*|<!DOCTYPE[^>]*>\s*','',t,flags=re.S)
    html=('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}'
          'svg{display:block;width:%dpx;height:auto}</style>%s'%(LATO,t))
    open(nome+'.html','w').write(html)
    subprocess.run(['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
        '--headless','--disable-gpu','--no-sandbox','--hide-scrollbars',
        '--window-size=%d,%d'%(LATO,LATO),'--screenshot=%s_raster.png'%nome,
        '--virtual-time-budget=8000','file://'+os.path.abspath(nome+'.html')],
        capture_output=True)
    print(nome, 'reso')
