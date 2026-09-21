/* ==========================================================================
   cape-rilievo — il bassorilievo che esiste solo dove passa la luce
   --------------------------------------------------------------------------
   La sezione ha un fondo grigio piatto. Dentro non c'e' nessun disegno da
   mostrare: c'e' una SUPERFICIE, e il disegno e' scavato dentro. Finche' la
   luce cade dritta non si vede niente, perche' una superficie piatta e una
   superficie incisa, illuminate di fronte, rimandano la stessa quantita' di
   luce. Appena la luce arriva di taglio, ogni parete del solco si gira verso
   di lei o le volta le spalle: una si schiarisce, l'altra si scurisce, e il
   disegno esce dal niente.

   La lampadina e' il puntatore. Quindi il disegno non "compare": viene
   scoperto, un pezzo per volta, e quando il mouse esce dalla sezione torna
   tutto liscio.

   COSA GIRA DAVVERO
   -----------------
   Un solo rettangolo, una sola passata di shader. Per ogni pixel:
     1. si guarda quanto e' profondo il solco appena a destra, a sinistra,
        sopra e sotto (quattro letture della mappa);
     2. da quelle quattro quote si ricava l'inclinazione della superficie;
     3. la si confronta con la direzione della luce;
     4. si sottrae la risposta che darebbe un piano perfettamente liscio.

   Il punto 4 e' quello che rende l'effetto invisibile dove non c'e' niente
   inciso: sul piano il conto fa esattamente zero, e zero luce disegnata vuol
   dire pixel trasparente. Per questo la tela non ha un colore di fondo suo e
   non deve conoscere quello della sezione: aggiunge bianco dove la luce
   batte, nero dove c'e' ombra, e nient'altro. Se un domani cambi il grigio
   della sezione, il rilievo ci si appoggia sopra senza che qui dentro si
   tocchi una riga.

   LA MAPPA
   --------
   superficie.png sta accanto a questo file nella stessa repo, e l'indirizzo
   se lo ricava da solo (da document.currentScript): cambiando lo SHA nel
   tag <script>, l'immagine segue. E' una scala di grigi: nero = superficie,
   bianco = fondo del solco.

   DOVE NON GIRA
   -------------
   Sotto i 992px, senza un puntatore vero, con "riduci animazioni" acceso o
   senza WebGL: non parte proprio. La sezione resta quella che si vede nel
   Designer — le due citta' con le coordinate e le due piante. Su un telefono
   e' quello che deve succedere: senza mouse non c'e' nessuna luce da muovere.
   ========================================================================== */
(function(){
  'use strict';

  /* ——— le manopole ————————————————————————————————————————————————
     Sono tutte qui. Il resto del file non ha numeri suoi.                */

  var FORZA    = 6.0;    /* quanto sono ripide le pareti del solco          */
  var DIFFUSA  = 0.17;   /* quanto schiarisce e scurisce la luce radente    */
  var LUCIDA   = 0.13;   /* il riflesso: quanto e' lucido il gesso          */
  var DUREZZA  = 28.0;   /* quanto e' stretto quel riflesso                 */
  var ALTEZZA  = 0.30;   /* a che quota sta la lampadina (1 = una tela)     */
  var RAGGIO   = 0.50;   /* fin dove arriva la luce (1 = una tela)          */
  var ACCENDE  = 0.16;   /* quanto e' rapido l'accendersi della luce        */
  var SPEGNE   = 0.07;   /* ...e lo spegnersi quando il mouse se ne va      */
  var FONDO    = 0.957;  /* il grigio della sezione (#f4f4f4): serve a
                            convertire la luce in trasparenza               */
  var MIN_LARGO= 992;    /* sotto questa larghezza non parte                */

  var RIPIEGO  = 'https://cdn.jsdelivr.net/gh/cash9086/cape-rilievo@main/';

  /* ——— si parte solo se ha senso ——————————————————————————————————— */

  var sezione = document.querySelector('.cape-rilievo');
  if(!sezione) return;

  /* La tela non sta nel Designer: se non c'e', se la fa da sola. Un div
     vuoto in mezzo alla struttura e' una cosa che si cancella per sbaglio
     e che nella tela del Designer non si capisce cosa sia; qui invece
     nasce solo quando serve davvero, cioe' quando l'effetto parte. */
  var tela = sezione.querySelector('.cape-rilievo-tela');
  if(!tela){
    tela = document.createElement('div');
    tela.className = 'cape-rilievo-tela';
    sezione.appendChild(tela);
  }

  function puoi(){
    if(window.innerWidth < MIN_LARGO) return false;
    try{
      if(matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
    }catch(e){}
    return true;
  }
  if(!puoi()) return;

  /* L'indirizzo della mappa: accanto a questo file, stesso commit. */
  var base = RIPIEGO;
  try{
    var me = document.currentScript && document.currentScript.src;
    if(me) base = me.replace(/[^\/]*$/, '');
  }catch(e){}

  /* ——— la tela ———————————————————————————————————————————————————— */

  var cv = document.createElement('canvas');
  cv.className = 'cape-rilievo-canvas';
  var gl = null;
  try{
    gl = cv.getContext('webgl', { alpha:true, premultipliedAlpha:true,
                                  antialias:false, depth:false, stencil:false });
  }catch(e){}
  if(!gl) return;

  var VERT =
    'attribute vec2 p;varying vec2 uv;' +
    'void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';

  var FRAG =
    'precision highp float;varying vec2 uv;uniform sampler2D mappa;' +
    'uniform vec2 texel,luce;uniform float aspetto,forza,diffusa,lucida,durezza,altezza,raggio,acceso,fondo;' +
    'void main(){' +
      'float hs=texture2D(mappa,uv-vec2(texel.x,0.0)).r;' +
      'float hd=texture2D(mappa,uv+vec2(texel.x,0.0)).r;' +
      'float hg=texture2D(mappa,uv-vec2(0.0,texel.y)).r;' +
      'float ha=texture2D(mappa,uv+vec2(0.0,texel.y)).r;' +
      'vec3 n=normalize(vec3((hd-hs)*forza,(hg-ha)*forza,1.0));' +
      'vec2 pos=vec2(uv.x,(1.0-uv.y)*aspetto);' +
      'vec3 raggioL=vec3(luce-pos,altezza);' +
      'float dist=length(raggioL.xy);' +
      'vec3 L=normalize(raggioL);' +
      'vec3 H=normalize(L+vec3(0.0,0.0,1.0));' +
      'float diff=dot(n,L)-L.z;' +
      'float spec=pow(max(dot(n,H),0.0),durezza)-pow(max(H.z,0.0),durezza);' +
      'float t=clamp(1.0-dist/raggio,0.0,1.0);' +
      'float att=t*t*(3.0-2.0*t)*acceso;' +
      'float d=(diff*diffusa+spec*lucida)*att;' +
      'float su=step(0.0,d);' +
      'float a=clamp(mix(-d/fondo,d/(1.0-fondo),su),0.0,1.0);' +
      'gl_FragColor=vec4(vec3(su*a),a);' +
    '}';

  function compila(tipo, sorgente){
    var s = gl.createShader(tipo);
    gl.shaderSource(s, sorgente);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  var vs = compila(gl.VERTEX_SHADER, VERT), fs = compila(gl.FRAGMENT_SHADER, FRAG);
  if(!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(ap);
  gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['mappa','texel','luce','aspetto','forza','diffusa','lucida','durezza','altezza','raggio','acceso','fondo']
    .forEach(function(n){ U[n] = gl.getUniformLocation(prog, n); });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);

  gl.uniform1f(U.forza, FORZA);
  gl.uniform1f(U.diffusa, DIFFUSA);
  gl.uniform1f(U.lucida, LUCIDA);
  gl.uniform1f(U.durezza, DUREZZA);
  gl.uniform1f(U.altezza, ALTEZZA);
  gl.uniform1f(U.raggio, RAGGIO);
  gl.uniform1f(U.fondo, FONDO);

  /* ——— la mappa delle profondita' ——————————————————————————————— */

  var pronta = false;
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function(){
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.mappa, 0);
    gl.uniform2f(U.texel, 1 / img.naturalWidth, 1 / img.naturalHeight);
    pronta = true;
    tela.appendChild(cv);
    misura();
  };
  img.src = base + 'superficie.png';

  /* ——— misure ————————————————————————————————————————————————————— */

  var largo = 0, alto = 0, dpr = 1;

  function misura(){
    var r = tela.getBoundingClientRect();
    if(!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var L = Math.round(r.width * dpr), A = Math.round(r.height * dpr);
    if(L === largo && A === alto) return;
    largo = L; alto = A;
    cv.width = L; cv.height = A;
    gl.viewport(0, 0, L, A);
    gl.uniform1f(U.aspetto, r.height / r.width);
    disegna();
  }

  /* ——— la luce ———————————————————————————————————————————————————— */

  var lx = 0.5, ly = 0.3, acceso = 0, mira = 0, vivo = false, girando = false, sporco = true;

  function disegna(){
    if(!pronta) return;
    gl.uniform2f(U.luce, lx, ly);
    gl.uniform1f(U.acceso, acceso);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(acceso > 0.002) gl.drawArrays(gl.TRIANGLES, 0, 3);
    sporco = false;
  }

  /* Il ciclo non gira sempre: si ferma da solo quando la luce ha finito di
     accendersi o di spegnersi e il mouse sta fermo. Fermo vuol dire zero
     lavoro per la scheda video, non un fotogramma vuoto sessanta volte al
     secondo. Lo risveglia il primo movimento del mouse. */
  function giro(){
    var passo = mira > acceso ? ACCENDE : SPEGNE;
    acceso += (mira - acceso) * passo;
    if(Math.abs(mira - acceso) < 0.002) acceso = mira;
    disegna();
    if(acceso !== mira || sporco){ requestAnimationFrame(giro); return; }
    girando = false;
  }

  function sveglia(){
    if(girando || !pronta) return;
    girando = true;
    requestAnimationFrame(giro);
  }

  sezione.addEventListener('pointermove', function(e){
    if(!vivo) return;
    var r = tela.getBoundingClientRect();
    if(!r.width) return;
    lx = (e.clientX - r.left) / r.width;
    ly = (e.clientY - r.top)  / r.width;
    mira = 1; sporco = true;
    sveglia();
  }, { passive:true });

  function spegni(){ mira = 0; sporco = true; sveglia(); }
  sezione.addEventListener('pointerleave', spegni, { passive:true });
  window.addEventListener('blur', spegni);

  /* ——— dorme quando la sezione non si vede ————————————————————————— */

  try{
    new IntersectionObserver(function(es){
      vivo = es[0].isIntersecting;
      if(vivo) misura();
      else spegni();
    }, { rootMargin:'20% 0px' }).observe(sezione);
  }catch(e){ vivo = true; }

  var rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(misura, 150);
  }, { passive:true });

  window.capePatti && capePatti.dichiara('rilievo delle citta', {
    leggo: [['.cape-rilievo-tela', '.cape-rilievo-tela', 'la tela in cui il bassorilievo viene disegnato']]
  });
})();
