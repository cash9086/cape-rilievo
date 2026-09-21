"""Due piante nello stile del riferimento: bianco, strade nere, quadro pieno.

   COME SONO FATTE
   Le strade non nascono da una tassellatura (li' gli incroci sono a Y e
   non vengono strade, vengono briciole): nascono come strade. Due
   famiglie di linee lunghe e continue, piegate da un campo di rumore
   dolce, piu' i pezzi veri della citta' — a Milano le cerchie e le
   radiali, a Parigi la Senna, i boulevard e le piazze a stella.

   Verso il bordo le strade si diradano fino a sparire: la mappa si
   dissolve invece di finire con un taglio.

   Ogni strada esce ordinata per distanza dal centro e raggruppata in
   fasce: e' l'ordine con cui verra' disegnata in pagina, dal centro in
   fuori, una riga per volta.
"""
import math, random
import numpy as np

OUT = '/tmp/claude-0/-home-user-skills/1d89a9ac-84a2-550d-bc87-04b03ec139d5/scratchpad/mappe/'
LATO  = 1000
FASCE = 22
C     = LATO/2

# ── proiezione ───────────────────────────────────────────────────────────
def fabbrica_proiezione(lat0, lon0, mezzo_km):
    k = (LATO/2)/mezzo_km
    def P(lat, lon):
        x=(lon-lon0)*111.320*math.cos(math.radians(lat0))
        y=-(lat-lat0)*110.574
        return (C + x*k, C + y*k)
    return P

def vai(lat0, lon0, b, km):
    b=math.radians(b)
    return (lat0+km*math.cos(b)/110.574, lon0+km*math.sin(b)/(111.320*math.cos(math.radians(lat0))))

# ── attrezzi ─────────────────────────────────────────────────────────────
def raggio_medio(pts):
    return sum(math.hypot(p[0]-C, p[1]-C) for p in pts)/len(pts)

def taglia(pts, margine=30):
    """tiene solo i pezzi dentro al quadro: una strada che esce e rientra
       diventa due strade, non una linea che attraversa il vuoto"""
    fuori=[]; corr=[]
    for p in pts:
        if -margine <= p[0] <= LATO+margine and -margine <= p[1] <= LATO+margine:
            corr.append(p)
        else:
            if len(corr)>1: fuori.append(corr)
            corr=[]
    if len(corr)>1: fuori.append(corr)
    return fuori

def semplifica(pts, eps=0.8):
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

def dirada(strade, rnd, pieno=0.26, vuoto=0.78, forza=0.97):
    fuori=[]
    for s in strade:
        d=raggio_medio(s)/(LATO/2)
        if d>vuoto+0.14: continue
        if d>pieno:
            t=min(1.0,(d-pieno)/(vuoto-pieno))
            if rnd.random() < t*t*forza: continue
        fuori.append(s)
    return fuori

# ── il campo che piega le strade ─────────────────────────────────────────
def piega(x, y, amp, f, fase):
    dx = amp*(math.sin(y*f+fase) + 0.55*math.sin(y*f*2.2+fase*1.6) + 0.3*math.sin(x*f*0.7+fase*2.1))
    dy = amp*(math.sin(x*f*1.1+fase*0.7) + 0.55*math.sin(x*f*1.9+fase) + 0.3*math.sin(y*f*0.6+fase*1.3))
    return x+dx, y+dy

def griglia_piegata(rnd, angolo, passo, amp, f, densita=1.0, salto=0.0):
    """una famiglia di strade quasi parallele, piegate dal campo"""
    a=math.radians(angolo); ca,sa=math.cos(a),math.sin(a)
    fase=rnd.uniform(0,6.28)
    strade=[]
    diag=LATO*0.78
    u=-diag
    while u<diag:
        u+=passo*rnd.uniform(0.72,1.34)
        if rnd.random()>densita: continue
        v0=-diag; v1=diag
        if salto>0 and rnd.random()<salto:      # non tutte attraversano tutto
            v0=rnd.uniform(-diag,diag*0.2); v1=v0+rnd.uniform(0.25,0.85)*diag
        pts=[]; v=v0
        while v<v1:
            x=C+u*ca - v*sa; y=C+u*sa + v*ca
            pts.append(piega(x,y,amp,f,fase))
            v+=16
        for pezzo in taglia(pts):
            strade.append(semplifica(pezzo))
    return strade

def quartiere(rnd, cx, cy, raggio, angolo, passo, amp, f):
    """Un pezzo di citta' con una sua orientazione. Le strade vere non
       attraversano la citta' da parte a parte: cambiano verso di
       quartiere in quartiere, e il disegno d'insieme nasce da come i
       quartieri si incastrano."""
    a=math.radians(angolo); ca,sa=math.cos(a),math.sin(a)
    fase=rnd.uniform(0,6.28)
    strade=[]
    for famiglia in (0,1):
        aa = a + (math.pi/2 if famiglia else 0)
        ca,sa = math.cos(aa), math.sin(aa)
        u=-raggio
        while u<raggio:
            u += passo*rnd.uniform(0.7,1.4)
            mezzo=math.sqrt(max(0.0, raggio*raggio-u*u))
            if mezzo<passo: continue
            v0=-mezzo*rnd.uniform(0.75,1.0); v1=mezzo*rnd.uniform(0.75,1.0)
            pts=[]; v=v0
            while v<v1:
                x=cx+u*(-sa)+v*ca; y=cy+u*ca+v*sa
                pts.append(piega(x,y,amp,f,fase))
                v+=14
            for pezzo in taglia(pts):
                if len(pezzo)>1: strade.append(semplifica(pezzo))
    return strade

def connettori(strade, rnd, quanti, lung=26):
    """viuzze corte che chiudono gli isolati: senza, la trama sembra
       pettinata in una direzione sola"""
    fuori=[]
    for _ in range(quanti):
        s=rnd.choice(strade)
        if len(s)<2: continue
        i=rnd.randrange(len(s)-1)
        (x1,y1),(x2,y2)=s[i],s[i+1]
        dx,dy=x2-x1,y2-y1; n=math.hypot(dx,dy) or 1
        nx,ny=-dy/n,dx/n
        L=lung*rnd.uniform(0.6,1.8)*(1 if rnd.random()<0.5 else -1)
        t=rnd.random()
        px,py=x1+dx*t, y1+dy*t
        fuori.append([(px,py),(px+nx*L, py+ny*L)])
    return fuori

# ── scrittura ────────────────────────────────────────────────────────────
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

def lunghezza(pts):
    return sum(math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]) for i in range(len(pts)-1))

def scrivi(nome, gruppi):
    """Esce due volte: il dato per la pagina (che disegna su tela) e un SVG
       di servizio, per guardare la mappa senza aprire il sito."""
    voci=[]; corpi=[]; tot=0
    sigla={'cape-rilievo-vie':'v','cape-rilievo-assi':'a',
           'cape-rilievo-principali':'p','cape-rilievo-acque':'q'}
    for classe, linee in gruppi:
        linee=[l for l in linee if len(l)>1]
        if not linee: continue
        linee.sort(key=raggio_medio)
        per=max(1, math.ceil(len(linee)/FASCE))
        for f in range(FASCE):
            fetta=linee[f*per:(f+1)*per]
            if not fetta: continue
            d=''.join(d_attr(l) for l in fetta)
            voci.append('["%s",%d,"%s"]'%(sigla[classe],f,d))
            corpi.append('<path class="%s" data-f="%d" data-l="%d" d="%s"/>'
                         %(classe,f,round(sum(lunghezza(l) for l in fetta))+2,d))
            tot+=len(fetta)
    dati='[' + ','.join(voci) + ']'
    open(OUT+nome+'.js.txt','w').write(dati)
    svg=('<svg class="cape-rilievo-mappa is-%s" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
         '<g class="cape-rilievo-rete">%s</g></svg>')%(nome,LATO,LATO,''.join(corpi))
    open(OUT+nome+'.svg','w').write(svg)
    print('%-7s strade %5d  fasce %3d  dato %6d car'%(nome,tot,len(corpi),len(dati)))

# ══════════════════════ MILANO: radiocentrica ══════════════════════
def milano():
    rnd=random.Random(21)
    LAT,LON,MEZZO=45.4642,9.1900,7.0
    P=fabbrica_proiezione(LAT,LON,MEZZO)
    k=(LATO/2)/MEZZO
    fine=[]; assi=[]; principali=[]

    # anelli: fitti al centro, sempre piu' radi verso fuori, spezzati in archi
    r=0.13
    while r<8.2:
        for _ in range(2 if r>1.4 else 2):
            a0=rnd.uniform(0,2*math.pi)
            span=rnd.uniform(0.5,2.0)*math.pi if r>1.0 else rnd.uniform(1.0,2.0)*math.pi
            n=max(6,int(span*r*9))
            f1=rnd.uniform(0,6.28)
            pts=[]
            for i in range(n+1):
                a=a0+span*i/n
                rr=r*(1+0.055*math.sin(3*a+f1)+0.025*math.sin(7*a+f1*2))
                pts.append((C+rr*k*math.cos(a), C+rr*k*math.sin(a)))
            for pezzo in taglia(pts): fine.append(semplifica(pezzo))
        r += 0.075+0.045*r

    # radiali: tante, di lunghezza varia, con l'angolo che ondeggia
    for i in range(260):
        a=rnd.uniform(0,2*math.pi)
        r0=rnd.uniform(0.22,5.2); r1=min(8.6, r0+rnd.uniform(0.9,5.5))
        n=max(4,int((r1-r0)*7))
        f1=rnd.uniform(0,6.28)
        pts=[]
        for j in range(n+1):
            rr=r0+(r1-r0)*j/n
            aa=a+0.045*math.sin(rr*1.5+f1)
            pts.append((C+rr*k*math.cos(aa), C+rr*k*math.sin(aa)))
        for pezzo in taglia(pts): fine.append(semplifica(pezzo))

    fine += connettori(fine, rnd, 1600, lung=13)
    fine = dirada(fine, rnd, pieno=0.52, vuoto=1.06, forza=0.97)

    # la struttura vera
    for cc,km in [((45.4650,9.1890),0.95),((45.4672,9.1895),1.95),((45.4690,9.1900),3.45)]:
        n=140
        f1=rnd.uniform(0,6.28)
        anello=[]
        for i in range(n+1):
            a=2*math.pi*i/n
            rr=km*(1+0.045*math.sin(3*a+f1))
            anello.append((cc[0]+rr*math.cos(a)/110.574, cc[1]+rr*math.sin(a)/(111.320*math.cos(math.radians(cc[0])))))
        assi.append([P(*q) for q in anello])
    for b,km in [(12,9),(35,8.5),(62,8),(100,8),(140,8.5),(172,9),(198,9),(225,9),(258,9),(290,8),(315,9),(340,9)]:
        principali.append([P(*vai(LAT,LON,b+rnd.uniform(-1.5,1.5),t)) for t in np.linspace(0.4,km,12)])
    acque=[[P(*q) for q in [(45.4520,9.1748),(45.4508,9.1700),(45.4490,9.1640),(45.4466,9.1575),(45.4440,9.1500),(45.4416,9.1410),(45.4390,9.1310),(45.4355,9.1210),(45.4325,9.1130)]],
           [P(*q) for q in [(45.4520,9.1748),(45.4480,9.1742),(45.4420,9.1735),(45.4340,9.1712),(45.4250,9.1686),(45.4150,9.1664),(45.4050,9.1648)]],
           [P(*q) for q in [(45.5330,9.2420),(45.5100,9.2450),(45.4900,9.2520),(45.4700,9.2560),(45.4500,9.2600),(45.4300,9.2520)]],
           [P(*q) for q in [(45.5200,9.1180),(45.5000,9.1250),(45.4800,9.1300),(45.4600,9.1330),(45.4430,9.1420)]]]
    acque=[x for q in acque for x in taglia(q)]
    scrivi('milano',[('cape-rilievo-vie',fine),('cape-rilievo-assi',assi),
                     ('cape-rilievo-principali',principali),('cape-rilievo-acque',acque)])

# ══════════════════════ PARIGI: griglie a settori ══════════════════════
def parigi():
    rnd=random.Random(5)
    LAT,LON,MEZZO=48.8566,2.3450,5.5
    P=fabbrica_proiezione(LAT,LON,MEZZO)
    fine=[]; assi=[]; principali=[]
    # i quartieri: uno grande al centro e una corona attorno, ognuno con
    # la sua orientazione e la sua grana
    quartieri=[(C, C, 210, rnd.uniform(0,180), 15, 7, 0.016)]
    for i in range(16):
        a=2*math.pi*i/16 + rnd.uniform(-0.16,0.16)
        d=rnd.uniform(200,400)
        quartieri.append((C+d*math.cos(a), C+d*math.sin(a), rnd.uniform(110,190),
                          rnd.uniform(0,180), rnd.uniform(14,21), rnd.uniform(5,9), 0.016))
    for i in range(10):
        a=rnd.uniform(0,2*math.pi); d=rnd.uniform(380,520)
        quartieri.append((C+d*math.cos(a), C+d*math.sin(a), rnd.uniform(80,150),
                          rnd.uniform(0,180), rnd.uniform(18,26), rnd.uniform(5,8), 0.014))
    for q in quartieri:
        fine += quartiere(rnd, *q)
    fine += connettori(fine, rnd, 1800, lung=14)
    fine = dirada(fine, rnd, pieno=0.50, vuoto=1.04, forza=0.97)

    STELLE=[((48.8738,2.2950),12,1.7),((48.8484,2.3958),7,1.4),((48.8675,2.3640),6,1.3),
            ((48.8532,2.3691),7,1.3),((48.8339,2.3324),6,1.3),((48.8312,2.3555),7,1.3),
            ((48.8656,2.3212),5,1.1),((48.8620,2.2870),5,1.2),((48.8823,2.3400),6,1.2)]
    for cc,n,km in STELLE:
        for i in range(n):
            linea=[P(*cc), P(*vai(cc[0],cc[1],360*i/n+rnd.uniform(-4,4),km))]
            (principali if i%4==0 else assi).append(linea)
    principali += [[P(*q) for q in [(48.8738,2.2950),(48.8700,2.3070),(48.8656,2.3212),(48.8630,2.3290),(48.8606,2.3376),(48.8580,2.3500),(48.8565,2.3610)]],
                   [P(*q) for q in [(48.8890,2.3450),(48.8830,2.3540),(48.8700,2.3520),(48.8580,2.3470),(48.8510,2.3430),(48.8340,2.3320)]]]
    n=160; f1=rnd.uniform(0,6.28); per=[]
    for i in range(n+1):
        a=2*math.pi*i/n
        rr=4.75*(1+0.035*math.sin(3*a+f1))
        per.append((48.8566+rr*0.87*math.sin(a)/110.574, 2.3480+rr*math.cos(a)/(111.320*math.cos(math.radians(48.8566)))))
    assi.append([P(*q) for q in per])
    senna=[(48.8330,2.4165),(48.8352,2.3980),(48.8378,2.3855),(48.8420,2.3690),(48.8465,2.3610),
           (48.8505,2.3570),(48.8535,2.3520),(48.8560,2.3460),(48.8575,2.3400),(48.8592,2.3335),
           (48.8612,2.3258),(48.8637,2.3190),(48.8650,2.3100),(48.8637,2.3000),(48.8605,2.2930),
           (48.8560,2.2860),(48.8510,2.2800),(48.8450,2.2740),(48.8400,2.2720),(48.8362,2.2660)]
    canal=[(48.8940,2.3720),(48.8830,2.3660),(48.8700,2.3630),(48.8630,2.3670),(48.8530,2.3690)]
    acque=[x for q in ([P(*p) for p in senna],[P(*p) for p in canal]) for x in taglia(q)]
    scrivi('parigi',[('cape-rilievo-vie',fine),('cape-rilievo-assi',assi),
                     ('cape-rilievo-principali',principali),('cape-rilievo-acque',acque)])

milano(); parigi()
