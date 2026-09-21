"""Forme piene -> asse della strada -> polilinee ordinate dal centro.

   Lo scheletro morfologico riduce ogni strada piena alla sua linea di
   mezzo: da li' si seguono i pixel e si ricavano strade vere, che si
   possono tracciare da un capo all'altro.
"""
import math, json
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize

LATO_OUT = 1000
FASCE = 22

def scheletro(png, soglia=128):
    a = np.asarray(Image.open(png).convert('L'))
    b = a < soglia
    return skeletonize(b), b

VICINI = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def polilinee(sk):
    """cammina sui pixel dello scheletro e li incatena in strade"""
    H,W = sk.shape
    px = {(y,x) for y,x in zip(*np.where(sk))}
    grado = {}
    for (y,x) in px:
        n=[(y+dy,x+dx) for dy,dx in VICINI if (y+dy,x+dx) in px]
        grado[(y,x)]=n
    usati=set()
    strade=[]

    def cammina(p, primo):
        via=[p, primo]; usati.add((p,primo)); usati.add((primo,p))
        corr=primo; prec=p
        while True:
            cand=[q for q in grado[corr] if q!=prec and (corr,q) not in usati]
            if len(grado[corr])!=2 or not cand: break
            q=cand[0]
            usati.add((corr,q)); usati.add((q,corr))
            via.append(q); prec, corr = corr, q
        return via

    # prima dai nodi (estremi e incroci), poi quel che resta (anelli chiusi)
    nodi=[p for p in px if len(grado[p])!=2]
    for p in nodi:
        for q in grado[p]:
            if (p,q) in usati: continue
            strade.append(cammina(p,q))
    for p in px:
        for q in grado[p]:
            if (p,q) in usati: continue
            strade.append(cammina(p,q))
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

def calibri(pieno):
    """per ogni pixel, quanto dista dal bordo della forma piena: e' meta'
       della larghezza della strada in quel punto"""
    from scipy.ndimage import distance_transform_edt
    return distance_transform_edt(pieno)

def spessore(dist, via):
    """il calibro della strada: la mediana lungo tutto il suo percorso,
       non un punto solo — un punto solo cade spesso su un incrocio e
       misura l'incrocio invece della strada"""
    v=[dist[y,x] for (y,x) in via]
    v.sort()
    return v[len(v)//2]

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

def lavora(nome, eps=1.1, min_lung=6):
    sk, pieno = scheletro(nome+'_raster.png')
    dist = calibri(pieno)
    vie = polilinee(sk)
    H,W = sk.shape
    k = LATO_OUT / W
    fuori=[]
    for via in vie:
        if len(via) < 3: continue
        sp = spessore(dist, via)
        pts = [(x*k, y*k) for (y,x) in via]
        pts = semplifica(pts, eps)
        if lunghezza(pts) < min_lung: continue
        fuori.append((pts, sp))
    # Classe per RANGO, non per soglia. In una mappa a linee i calibri sono
    # quasi tutti uguali (uno o due pixel): con una soglia finiscono tutte
    # nello stesso gruppo e la gerarchia sparisce. Ordinando per calibro e
    # poi per lunghezza, le arterie restano in cima comunque.
    fuori.sort(key=lambda t: (t[1], lunghezza(t[0])))
    n = len(fuori)
    gruppi = {'v': [t[0] for t in fuori[:int(n*0.74)]],
              'a': [t[0] for t in fuori[int(n*0.74):int(n*0.93)]],
              'p': [t[0] for t in fuori[int(n*0.93):]]}
    q1 = fuori[int(n*0.74)][1] if n else 0
    q2 = fuori[int(n*0.93)][1] if n else 0
    C = LATO_OUT/2
    raggio = lambda p: sum(math.hypot(q[0]-C, q[1]-C) for q in p)/len(p)
    voci=[]; tot=0
    for cls in ('v','a','p'):
        linee = sorted(gruppi[cls], key=raggio)
        if not linee: continue
        per = max(1, math.ceil(len(linee)/FASCE))
        for f in range(FASCE):
            fetta = linee[f*per:(f+1)*per]
            if not fetta: continue
            voci.append('["%s",%d,"%s"]'%(cls, f, ''.join(d_attr(l) for l in fetta)))
            tot += len(fetta)
    dato='['+','.join(voci)+']'
    open(nome+'.js.txt','w').write(dato)
    print('%-7s strade %5d  (v %d  a %d  p %d)  calibri %.1f/%.1f  dato %6d car'%(
        nome, tot, len(gruppi['v']), len(gruppi['a']), len(gruppi['p']), q1, q2, len(dato)))

lavora('milano')
lavora('parigi')
