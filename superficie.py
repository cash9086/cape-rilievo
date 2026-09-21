"""Dal disegno a tratto alla superficie del bassorilievo.

   DUE COSE INSIEME
     massa = il disegno sfumato largo: dove le linee sono fitte (il corpo
             del surfista, la cresta dell'onda) la sfumatura si somma e
             viene una gobba. E' il volume: quello che nel video fa
             sembrare la figura scolpita invece che incisa.
     solco = le stesse linee sfumate strette, incise SOPRA la gobba.

   COSA FINISCE NEL FILE, E PERCHE' COSI'
     rosso        la quota del solco. Ha dettaglio fine, si comprime bene,
                  e la sua pendenza e' ripida: otto bit bastano.
     verde, blu   la PENDENZA della gobba, gia' derivata qui.

   La gobba non si salva come quota, e non e' un vezzo. E' larghissima e
   liscia: a otto bit i suoi gradini valgono un duecentocinquantesimo,
   invisibili sull'altezza — ma la luce non guarda l'altezza, guarda la
   pendenza, e la pendenza di una scala e' una fila di scalini. Sullo
   schermo venivano anelli concentrici attorno alla figura. Derivandola
   QUI, in virgola mobile, nel file ci va gia' la pendenza: liscia, e senza
   niente da derivare a valle.

   Per lo stesso motivo le sfumature si fanno in virgola mobile e non
   passando da un'immagine a otto bit: una sfumatura arrotondata a otto bit
   ha un disturbo di un livello, e quel disturbo derivato torna a essere
   grana — oltre a far pesare il file il triplo, perche' il rumore non si
   comprime.
"""
import numpy as np, os
from PIL import Image
from scipy.ndimage import gaussian_filter, grey_dilation

SRC='/tmp/claude-0/-home-user-skills/1d89a9ac-84a2-550d-bc87-04b03ec139d5/images/1.png'
OUT='/tmp/claude-0/-home-user-skills/1d89a9ac-84a2-550d-bc87-04b03ec139d5/scratchpad/rilievo/'
W=1600
S_MASSA, A_MASSA = 38.0, 0.95
S_SOLCO, SP_SOLCO = 5.5, 7

def inchiostro():
    im=Image.open(SRC).convert('L')
    a=np.asarray(im); ys,xs=np.where(a<200); m=14
    box=(max(0,xs.min()-m),max(0,ys.min()-m),min(im.width,xs.max()+1+m),min(im.height,ys.max()+1+m))
    c=im.crop(box)
    g=c.resize((W,int(round(W*c.height/c.width))), Image.LANCZOS)
    ink=1.0-np.asarray(g).astype(np.float32)/255.0
    return np.clip((ink-0.12)/0.7,0,1)

ink=inchiostro()
massa=gaussian_filter(ink, S_MASSA, mode='nearest')
massa=(massa/max(massa.max(),1e-6))**0.75
solco=gaussian_filter(grey_dilation(ink, size=(SP_SOLCO,SP_SOLCO)), S_SOLCO, mode='nearest')
solco=solco/max(solco.max(),1e-6)

# ——— due file, e c'e' un motivo ———
# superficie.png tiene il SOLCO: dettaglio fine, serve grande.
# gobba.png tiene la PENDENZA della gobba: e' un campo liscissimo, e
# soprattutto e' gia' derivato, quindi a valle non va derivato piu'. Un
# campo che non va derivato si puo' tenere piccolo: a un quarto di lato
# pesa venti volte meno e, interpolato, resta identico.
Image.fromarray(np.clip(np.rint(solco*255),0,255).astype(np.uint8)).save(OUT+'superficie.png', optimize=True)

mdy,mdx=np.gradient(-A_MASSA*massa)
s=float(np.percentile(np.abs(np.concatenate([mdx.ravel(),mdy.ravel()])),99.9))
Wg=W//4
gx=np.asarray(Image.fromarray(np.clip(mdx/s,-1,1).astype(np.float32), 'F').resize((Wg,int(Wg*ink.shape[0]/W)), Image.LANCZOS))
gy=np.asarray(Image.fromarray(np.clip(mdy/s,-1,1).astype(np.float32), 'F').resize((Wg,int(Wg*ink.shape[0]/W)), Image.LANCZOS))
G=np.clip(np.rint((gx*0.5+0.5)*255),0,255).astype(np.uint8)
B=np.clip(np.rint((gy*0.5+0.5)*255),0,255).astype(np.uint8)
Image.fromarray(np.stack([G,B,np.full_like(G,128)],-1)).save(OUT+'gobba.png', optimize=True)
print('superficie %dx%d  %d KB   gobba %dx%d  %d KB   scala pendenza %.5f'%(
    W, ink.shape[0], os.path.getsize(OUT+'superficie.png')//1024,
    Wg, G.shape[0], os.path.getsize(OUT+'gobba.png')//1024, s))

def illumina(nome, luce=(0.42,0.34), alt=0.30, raggio=0.62, forza=7.0, massa_f=1.0,
             diffusa=0.30, lucida=0.20, durezza=28.0, fondo=1.0, W2=1100):
    src=Image.open(OUT+'superficie.png'); H=int(W2*src.height/src.width)
    h=np.asarray(src.resize((W2,H), Image.LANCZOS)).astype(np.float32)/255.0
    g=np.asarray(Image.open(OUT+'gobba.png').resize((W2,H), Image.BILINEAR)).astype(np.float32)/255.0
    dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*forza + (g[:,:,0]*2-1)*massa_f
    dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*forza + (g[:,:,1]*2-1)*massa_f
    nx,ny,nz=dx,dy,np.ones_like(h)
    n=np.sqrt(nx*nx+ny*ny+nz*nz); nx,ny,nz=nx/n,ny/n,nz/n
    yy,xx=np.mgrid[0:H,0:W2].astype(np.float32); xx/=W2; yy/=W2
    asp=H/W2
    lx,ly=luce[0]-xx, luce[1]*asp-yy
    lz=np.full_like(xx,alt)
    L=np.sqrt(lx*lx+ly*ly+lz*lz); lx,ly,lz=lx/L,ly/L,lz/L
    hx,hy,hz=lx,ly,lz+1.0
    hl=np.sqrt(hx*hx+hy*hy+hz*hz); hx,hy,hz=hx/hl,hy/hl,hz/hl
    diff=(nx*lx+ny*ly+nz*lz)-lz
    spec=np.power(np.clip(nx*hx+ny*hy+nz*hz,0,1),durezza)-np.power(np.clip(hz,0,1),durezza)
    d=np.sqrt((xx-luce[0])**2+(yy-luce[1]*asp)**2)
    t=np.clip(1-d/raggio,0,1); att=t*t*(3-2*t)
    delta=(diff*diffusa+spec*lucida)*att
    col=np.clip(fondo+np.minimum(delta,0),0,1)
    Image.fromarray((col*255).astype(np.uint8)).save(OUT+nome+'.png')
    print('%-14s min %3d'%(nome,int(col.min()*255)))
    return col

if __name__=='__main__':
    for mf in (0.7, 1.1, 1.6):
        illumina('prev_m%d'%int(mf*10), massa_f=mf)
