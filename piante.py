"""Piante invertite: fondo bianco, strade nere.

   Struttura VERA: confini comunali (dati aperti), cerchie e radiali di
   Milano, Senna, canale Saint-Martin, boulevard e piazze a stella di
   Parigi, Navigli, Lambro, Olona.
   Trama FINE: isolati generati (tassellatura di Voronoi con densita' che
   cala verso la periferia). Non e' cartografia rilevata: e' un tessuto
   che legge come citta'.
"""
import json, math, random
import numpy as np
from scipy.spatial import Voronoi

S = '/tmp/claude-0/-home-user-skills/1d89a9ac-84a2-550d-bc87-04b03ec139d5/scratchpad/'
OUT = S + 'mappe/'
KY = 110574.0
kx = lambda lat: 111320.0 * math.cos(math.radians(lat))

# ── geometria di servizio ────────────────────────────────────────────────
def dp(pts, eps):
    if len(pts) < 3: return pts
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
    if dmax>eps: return dp(pts[:idx+1],eps)[:-1]+dp(pts[idx:],eps)
    return [pts[0],pts[-1]]

def anello_grande(geom):
    polys=[geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates']
    return max((r for p in polys for r in p), key=len)

def dentro(poly, x, y):
    c=False; n=len(poly); j=n-1
    for i in range(n):
        xi,yi=poly[i]; xj,yj=poly[j]
        if (yi>y)!=(yj>y) and x < (xj-xi)*(y-yi)/(yj-yi+1e-12)+xi: c=not c
        j=i
    return c

def vai(lat0,lon0,b,km):
    b=math.radians(b)
    return (lat0+km*math.cos(b)/110.574, lon0+km*math.sin(b)/(111.320*math.cos(math.radians(lat0))))

def anello(c, km, n=64, rug=0.0, sch=1.0, rnd=None):
    out=[]; f1=rnd.uniform(0,6.28) if rnd else 0; f2=rnd.uniform(0,6.28) if rnd else 0
    for i in range(n+1):
        t=2*math.pi*i/n
        r=km*(1+rug*(0.6*math.sin(3*t+f1)+0.4*math.sin(5*t+f2)))
        out.append((c[0]+r*math.cos(t)/110.574,
                    c[1]+r*sch*math.sin(t)/(111.320*math.cos(math.radians(c[0])))))
    return out

def compatta(q, chiudi=False):
    out=[]; px=py=None
    for x,y in q:
        x=int(round(x)); y=int(round(y))
        if px is None: out.append('M%d %d'%(x,y))
        else:
            dx,dy=x-px,y-py
            if dx==0 and dy==0: continue
            out.append('l%d %d'%(dx,dy))
        px,py=x,y
    s=''.join(out).replace(' -','-')
    return (s+'z') if chiudi else s

# ── gli isolati ──────────────────────────────────────────────────────────
def isolati(poly_xy, centro_xy, n, rnd, esponente=1.5, lato_min=0.0, vuoti=()):
    """Voronoi su punti sparsi in tutto il poligono, un po' piu' fitti al
       centro: i bordi delle celle sono le strade. Viene irregolare perche'
       lo e' per costruzione, non perche' ci aggiungo rumore sopra.
       `vuoti` sono le ellissi da lasciare libere: i parchi."""
    xs=[p[0] for p in poly_xy]; ys=[p[1] for p in poly_xy]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    R=max(x1-x0,y1-y0)/2
    pts=[]; tentativi=0
    while len(pts)<n and tentativi<n*80:
        tentativi+=1
        x=rnd.uniform(x0,x1); y=rnd.uniform(y0,y1)
        if not dentro(poly_xy,x,y): continue
        d=math.hypot(x-centro_xy[0],y-centro_xy[1])/R
        if rnd.random() > (1.0 - 0.55*min(d,1.0)**esponente): continue
        salta=False
        for (cx,cy,rx,ry) in vuoti:
            if ((x-cx)/rx)**2 + ((y-cy)/ry)**2 < 1.0: salta=True; break
        if salta: continue
        pts.append((x,y))
    if len(pts)<8: return []
    v=Voronoi(np.array(pts))
    segmenti=[]
    for (a,b) in v.ridge_vertices:
        if a<0 or b<0: continue
        pa=v.vertices[a]; pb=v.vertices[b]
        if not (dentro(poly_xy,pa[0],pa[1]) and dentro(poly_xy,pb[0],pb[1])): continue
        if math.hypot(pb[0]-pa[0],pb[1]-pa[1])<lato_min: continue
        segmenti.append([(pa[0],pa[1]),(pb[0],pb[1])])
    return segmenti

# ── scrittura ────────────────────────────────────────────────────────────
def scrivi(nome, geom, main, acque, isol_n, isol_centro, isol_poly=None,
           larghezza=1000, semp_m=45, esponente=1.5, seme=1, vuoti=()):
    rnd=random.Random(seme)
    ring=anello_grande(geom)
    lat0=sum(p[1] for p in ring)/len(ring)
    K=kx(lat0)
    P=lambda lon,lat:(lon*K, -lat*KY)
    terra=dp([P(lon,lat) for lon,lat in ring], semp_m)
    xs=[p[0] for p in terra]; ys=[p[1] for p in terra]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    k=larghezza/(x1-x0); alt=round((y1-y0)*k)
    T=lambda p:((p[0]-x0)*k,(p[1]-y0)*k)
    TT=lambda lat,lon: T(P(lon,lat))
    d_terra=compatta([T(p) for p in terra], True)

    poly = [P(lon,lat) for lat,lon in isol_poly] if isol_poly else [P(lon,lat) for lon,lat in ring]
    vuoti_xy=[(P(lon,lat)[0],P(lon,lat)[1],
               rx*1000*K/111320.0, ry*1000)
              for (lat,lon,rx,ry) in vuoti]
    segs = isolati(poly, P(isol_centro[1], isol_centro[0]), isol_n, rnd, esponente,
                   lato_min=(x1-x0)/larghezza*3.5, vuoti=vuoti_xy)
    d_isol=''.join(compatta([T(a),T(b)]) for a,b in segs)
    d_main=''.join(compatta([TT(*p) for p in pts], ch) for pts,ch in main)
    d_acq =''.join(compatta([TT(*p) for p in pts], ch) for pts,ch in acque)

    svg=('<svg class="cape-rilievo-mappa is-%s" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
         '<defs><clipPath id="cr-%s"><path d="%s"/></clipPath></defs>'
         '<path class="cape-rilievo-terra" d="%s"/>'
         '<g class="cape-rilievo-rete" clip-path="url(#cr-%s)" vector-effect="non-scaling-stroke">'
         '<path class="cape-rilievo-vie" vector-effect="non-scaling-stroke" d="%s"/>'
         '<path class="cape-rilievo-assi" vector-effect="non-scaling-stroke" d="%s"/>'
         '<path class="cape-rilievo-acque" vector-effect="non-scaling-stroke" d="%s"/>'
         '</g></svg>')%(nome,larghezza,alt,nome,d_terra,d_terra,nome,d_isol,d_main,d_acq)
    open(OUT+nome+'.svg','w').write(svg)
    print('%-7s 1000x%-4d  isolati %4d  peso %6d car'%(nome,alt,len(segs),len(svg)))

# ══════════════ MILANO ══════════════
rnd=random.Random(11)
DUOMO=(45.4642,9.1900); DARSENA=(45.4520,9.1748)
main_mi=[]
for c,km,n in [((45.4650,9.1890),0.98,64),((45.4672,9.1895),1.95,72),((45.4690,9.1900),3.50,80)]:
    main_mi.append((anello(c,km,n=n,rug=0.05,rnd=rnd),True))
for b,km in [(12,9),(35,8.5),(62,8),(100,8),(140,8.5),(172,9),(198,9),(225,9),(258,9),(290,8),(315,9),(340,9),(24,9),(48,8),(78,8),(120,8),(155,8),(272,8),(302,8),(328,9)]:
    main_mi.append(([vai(*DUOMO,b,0.55), vai(*DUOMO,b,km)],False))
acque_mi=[([DARSENA,(45.4508,9.1700),(45.4490,9.1640),(45.4466,9.1575),(45.4440,9.1500),(45.4416,9.1410),(45.4390,9.1310),(45.4355,9.1210),(45.4325,9.1130)],False),
          ([DARSENA,(45.4480,9.1742),(45.4420,9.1735),(45.4340,9.1712),(45.4250,9.1686),(45.4150,9.1664),(45.4050,9.1648),(45.3960,9.1640)],False),
          ([(45.5330,9.2420),(45.5100,9.2450),(45.4900,9.2520),(45.4700,9.2560),(45.4500,9.2600),(45.4300,9.2520)],False),
          ([(45.5200,9.1180),(45.5000,9.1250),(45.4800,9.1300),(45.4600,9.1330),(45.4430,9.1420)],False)]
mi=json.load(open(S+'milano.geojson'))
scrivi('milano', mi['geometry'], main_mi, acque_mi, isol_n=1150, isol_centro=DUOMO,
       semp_m=45, esponente=1.6, seme=11)

# ══════════════ PARIGI ══════════════
rnd=random.Random(7)
CENTRO=(48.8566,2.3522)
CITTA=anello(CENTRO,4.9,n=72,rug=0.04,sch=0.86,rnd=rnd)
main_pa=[]
STELLE=[((48.8738,2.2950),12,1.6),((48.8484,2.3958),7,1.3),((48.8675,2.3640),6,1.2),
        ((48.8532,2.3691),7,1.2),((48.8339,2.3324),6,1.2),((48.8312,2.3555),7,1.2),
        ((48.8656,2.3212),5,1.0),((48.8620,2.2870),5,1.1),((48.8823,2.3400),6,1.1)]
for c,n,km in STELLE:
    for i in range(n):
        main_pa.append(([c, vai(*c,360*i/n+rnd.uniform(-4,4),km)],False))
main_pa += [([(48.8738,2.2950),(48.8700,2.3070),(48.8656,2.3212),(48.8630,2.3290),(48.8606,2.3376),(48.8580,2.3500),(48.8565,2.3610)],False),
            ([(48.8615,2.3215),(48.8570,2.3300),(48.8535,2.3400),(48.8512,2.3520),(48.8510,2.3600)],False),
            ([(48.8890,2.3450),(48.8830,2.3540),(48.8700,2.3520),(48.8580,2.3470),(48.8510,2.3430),(48.8340,2.3320)],False),
            ([(48.8700,2.3320),(48.8712,2.3430),(48.8690,2.3540),(48.8675,2.3640)],False),
            (anello(CENTRO,4.78,n=80,rug=0.02,sch=0.87,rnd=rnd),True)]
senna=[(48.8330,2.4165),(48.8352,2.3980),(48.8378,2.3855),(48.8420,2.3690),(48.8465,2.3610),
       (48.8505,2.3570),(48.8535,2.3520),(48.8560,2.3460),(48.8575,2.3400),(48.8592,2.3335),
       (48.8612,2.3258),(48.8637,2.3190),(48.8650,2.3100),(48.8637,2.3000),(48.8605,2.2930),
       (48.8560,2.2860),(48.8510,2.2800),(48.8450,2.2740),(48.8400,2.2720),(48.8362,2.2660)]
canal=[(48.8940,2.3720),(48.8830,2.3660),(48.8700,2.3630),(48.8630,2.3670),(48.8530,2.3690)]
pa=json.load(open(S+'paris.geojson'))
BOSCHI=[(48.8620,2.2470,1.15,1.95),(48.8280,2.4340,1.55,1.30)]
scrivi('parigi', pa['features'][0]['geometry'], main_pa, [(senna,False),(canal,False)],
       isol_n=1000, isol_centro=CENTRO, semp_m=28, esponente=1.7, seme=7, vuoti=BOSCHI)
