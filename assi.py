"""Come assi2, ma distingue due cose che non si possono trattare uguale:

   - i NASTRI (i tratti di penna, larghi due pixel): si riducono all'asse,
     come le strade di una mappa;
   - le MACCHIE (i portali del Duomo, le ombre piene): NON si riducono
     all'asse — un rettangolo pieno ridotto alla linea di mezzo diventa
     una X, ed e' esattamente lo scarabocchio che si vedeva. Di quelle si
     prende il CONTORNO, che e' come un disegnatore le avrebbe fatte.

   Il resto — semplificazione, classi per calibro, ordine dal basso in su —
   e' identico.
"""
import math, os, sys
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize, disk
from skimage.measure import find_contours
from scipy.ndimage import distance_transform_edt, binary_dilation

QUI = '/home/user/cape-rilievo/'
LATO_OUT = 1000
FASCE = 22
VICINI = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def polilinee(sk):
    px = {(y,x) for y,x in zip(*np.where(sk))}
    grado = {}
    for (y,x) in px:
        grado[(y,x)] = [(y+dy,x+dx) for dy,dx in VICINI if (y+dy,x+dx) in px]
    usati=set(); strade=[]
    def cammina(p, primo):
        via=[p, primo]; usati.add((p,primo)); usati.add((primo,p))
        corr=primo; prec=p
        while True:
            cand=[q for q in grado[corr] if q!=prec and (corr,q) not in usati]
            if len(grado[corr])!=2 or not cand: break
            q=cand[0]; usati.add((corr,q)); usati.add((q,corr))
            via.append(q); prec, corr = corr, q
        return via
    for p in [p for p in px if len(grado[p])!=2]:
        for q in grado[p]:
            if (p,q) not in usati: strade.append(cammina(p,q))
    for p in px:
        for q in grado[p]:
            if (p,q) not in usati: strade.append(cammina(p,q))
    return strade

def semplifica(pts, eps):
    if len(pts)<3: return pts
    def d(p,a,b):
        (x,y),(x1,y1),(x2,y2)=p,a,b
        dx,dy=x2-x1,y2-y1
        if dx==0 and dy==0: return math.hypot(x-x1,y-y1)
        t=max(0,min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)))
        return math.hypot(x-(x1+t*dx), y-(y1+t*dy))
    dmax,idx=0,0
    for i in range(1,len(pts)-1):
        dd=d(pts[i],pts[0],pts[-1])
        if dd>dmax: dmax,idx=dd,i
    if dmax>eps: return semplifica(pts[:idx+1],eps)[:-1]+semplifica(pts[idx:],eps)
    return [pts[0],pts[-1]]

def lunghezza(p):
    return sum(math.hypot(p[i+1][0]-p[i][0], p[i+1][1]-p[i][1]) for i in range(len(p)-1))

def d_attr(pts):
    out=[]; px=py=None
    for x,y in pts:
        x=int(round(x)); y=int(round(y))
        if px is None: out.append('M%d %d'%(x,y))
        else:
            dx,dy=x-px,y-py
            if dx==0 and dy==0: continue
            out.append('l%d %d'%(dx,dy))
        px,py=x,y
    return ''.join(out).replace(' -','-')

def lavora(nome, soglia_blob=8, eps=0.9, min_lung=3.0, min_contorno=26.0):
    a = np.asarray(Image.open(QUI+nome+'_raster.png').convert('L'))
    pieno = a < 190
    dist = distance_transform_edt(pieno)

    nucleo = dist > soglia_blob
    if nucleo.any():
        macchia = binary_dilation(nucleo, structure=disk(int(soglia_blob)+1)) & pieno
    else:
        macchia = np.zeros_like(pieno)
    nastro = pieno & ~macchia

    W = pieno.shape[1]
    k = LATO_OUT / W

    # ——— i nastri: asse
    sk = skeletonize(nastro)
    fuori=[]
    for via in polilinee(sk):
        if len(via) < 3: continue
        v=sorted(dist[y,x] for (y,x) in via); sp=v[len(v)//2]
        pts = semplifica([(x*k, y*k) for (y,x) in via], eps)
        if lunghezza(pts) < min_lung: continue
        fuori.append((pts, sp))

    # ——— le macchie: contorno
    contorni=[]
    for c in find_contours(macchia.astype(float), 0.5):
        pts = semplifica([(x*k, y*k) for (y,x) in c], eps)
        if lunghezza(pts) < min_contorno: continue
        contorni.append(pts)

    fuori.sort(key=lambda t: (t[1], lunghezza(t[0])))
    n = len(fuori)
    gruppi = {'v': [t[0] for t in fuori[:int(n*0.74)]],
              'a': [t[0] for t in fuori[int(n*0.74):int(n*0.93)]] + contorni,
              'p': [t[0] for t in fuori[int(n*0.93):]]}

    quota = lambda p: sum(q[1] for q in p)/len(p)
    voci=[]; tot=0
    for cls in ('v','a','p'):
        linee = sorted(gruppi[cls], key=quota, reverse=True)
        if not linee: continue
        per = max(1, math.ceil(len(linee)/FASCE))
        for f in range(FASCE):
            fetta = linee[f*per:(f+1)*per]
            if not fetta: continue
            voci.append('["%s",%d,"%s"]'%(cls, f, ''.join(d_attr(l) for l in fetta)))
            tot += len(fetta)
    dato='['+','.join(voci)+']'
    open(QUI+nome+'.js.txt','w').write(dato)
    print('%-7s tratti %5d  (nastri v %d a %d p %d | contorni %d)  dato %6d car'%(
        nome, tot, len(gruppi['v']), len(gruppi['a'])-len(contorni), len(gruppi['p']),
        len(contorni), len(dato)))

# La soglia e' diversa apposta. Il Duomo ha portali e finestre di nero
# pieno larghi decine di pixel: a 8 si staccano tutti. La torre e' quasi
# tutta traliccio sottile, e a 8 le si contornavano anche i nodi del
# traliccio — venivano delle bollicine. A 17 le resta contornata solo
# l'ombra a terra, che e' l'unica macchia vera che ha.
lavora('milano', soglia_blob=8,  eps=0.9, min_lung=3.0)
lavora('parigi', soglia_blob=17, eps=0.9, min_lung=3.0)
