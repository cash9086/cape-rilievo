/* ==========================================================================
   cape-rilievo - la sezione delle due citta'
   --------------------------------------------------------------------------
   Questo file fa TRE cose, e conviene tenerle distinte in testa perche'
   hanno condizioni diverse:

     1. PIANTA LE DUE MAPPE dentro la sezione. Sempre: telefono compreso,
        anche senza WebGL, anche con le animazioni ridotte.
     2. LE FA COMPARIRE. La prima volta che la sezione entra nello schermo
        si disegnano dal centro verso fuori; dalla seconda in poi e' solo
        una dissolvenza. Anche questo sempre, tranne con "riduci
        animazioni" acceso: li' sono gia' aperte e basta.
     3. ACCENDE IL BASSORILIEVO. Solo da 992px in su, con un puntatore
        vero e con WebGL. Su un telefono non parte: senza mouse non c'e'
        nessuna luce da muovere, e un rilievo che non si puo' scoprire e'
        solo peso scaricato per niente.

   IL BASSORILIEVO, COM'E' FATTO
   ----------------------------
   La sezione ha un fondo piatto. Dentro non c'e' nessun disegno da
   mostrare: c'e' una SUPERFICIE, e il surfista e' scavato dentro. Finche'
   la luce cade dritta non si vede niente, perche' una superficie piatta e
   una incisa, illuminate di fronte, rimandano la stessa quantita' di luce.
   Appena la luce arriva di taglio, ogni parete del solco si gira verso di
   lei o le volta le spalle, e il disegno esce dal niente.

   Per ogni pixel si guarda quanto e' profondo il solco appena a destra, a
   sinistra, sopra e sotto (quattro letture della mappa), da li' si ricava
   l'inclinazione della superficie, la si confronta con la direzione della
   luce, e si SOTTRAE la risposta che darebbe un piano perfettamente
   liscio. E' quest'ultimo passo che tiene invisibile tutto il resto: sul
   piano il conto fa esattamente zero, e zero luce disegnata vuol dire
   pixel trasparente.

   LE TRE LUCI
   -----------
   Una e' il puntatore. Le altre due sono automatiche: partono dai due
   bordi opposti della tela e girano nello stesso verso, lente, come se
   qualcuno passasse il mouse avanti e indietro. Servono perche' senza,
   uno che arriva sulla sezione vede un rettangolo vuoto e tira dritto.
   Appena entri col mouse si spengono e comanda il puntatore; appena esci
   si riaccendono.

   IL FONDO BIANCO
   ---------------
   Su #fff il rilievo puo' solo fare ombra: sopra il bianco non c'e'
   niente, quindi le luci non hanno dove schiarire. Il conto lo sa
   (guarda `sopra` nello shader) e le butta via invece di sbiancare tutto.
   E' per questo che DIFFUSA e LUCIDA qui sono piu' alte che su un grigio:
   meta' dell'effetto non e' disponibile e va recuperata sull'altra meta'.
   Se un domani il fondo torna grigio, abbassale e rimetti FONDO.

   LA MAPPA DELLE PROFONDITA'
   --------------------------
   superficie.png sta accanto a questo file nella stessa repo, e
   l'indirizzo se lo ricava da solo: cambiando lo SHA nel tag <script>
   l'immagine segue. E' una scala di grigi: nero = superficie, bianco =
   fondo del solco.
   ========================================================================== */
(function(){
  'use strict';

  /* ----- le manopole del rilievo ---------------------------------------
     Sono tutte qui. Il resto del file non ha numeri suoi.                */

  var FORZA     = 6.0;   /* quanto sono ripide le pareti del solco        */
  var DIFFUSA   = 0.30;  /* quanto scurisce la luce radente               */
  var LUCIDA    = 0.20;  /* il riflesso: quanto e' lucido il gesso        */
  var DUREZZA   = 28.0;  /* quanto e' stretto quel riflesso               */
  var ALTEZZA   = 0.30;  /* a che quota sta la lampadina (1 = una tela)   */
  var RAGGIO    = 0.55;  /* fin dove arriva la luce (1 = una tela)        */
  var FONDO     = 1.0;   /* il fondo della sezione: 1 = bianco, .957 = f4 */
  var ACCENDE   = 0.16;  /* quanto e' rapido l'accendersi della luce      */
  var SPEGNE    = 0.07;  /* ...e lo spegnersi                             */

  /* ----- le manopole delle due luci automatiche ------------------------ */

  var AUTO_FORZA = 1.0;  /* quanto valgono rispetto al puntatore          */
  var AUTO_GIRO  = 16.0; /* secondi per un giro intero                    */
  var AUTO_RAGGI = 0.46; /* quanto largo girano: piu' stretto = passano
                            piu' vicino al disegno e si vede di piu'      */

  /* ----- il resto ------------------------------------------------------ */

  var MIN_LARGO = 992;   /* sotto: niente rilievo                         */
  var DISEGNO   = 1700;  /* durata della comparsa delle mappe, in ms      */
  var RIPIEGO   = 'https://cdn.jsdelivr.net/gh/cash9086/cape-rilievo@main/';

  var sezione = document.querySelector('.cape-rilievo');
  if(!sezione) return;

  var ridotto = false;
  try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  /* ══ 1. le due piante ══════════════════════════════════════════════════
     Vanno messe per prime e prima di qualunque controllo: sono l'unica
     cosa che deve esserci sempre. Se ci sono gia' (script caricato due
     volte, oppure un domani le sposti in un Embed) non si tocca niente. */

  var MILANO = '__MILANO__';

  var PARIGI = '__PARIGI__';

  if(!sezione.querySelector('.cape-rilievo-mappa')){
    var culla = document.createElement('div');
    culla.innerHTML = MILANO + PARIGI;
    var primo = sezione.firstChild;
    while(culla.firstChild) sezione.insertBefore(culla.firstChild, primo);
  }

  /* ══ 2. la comparsa ════════════════════════════════════════════════════
     La prima volta che la sezione entra nello schermo le mappe si aprono
     dal centro, una frazione di secondo l'una dopo l'altra. Da li' in poi
     resta solo la dissolvenza: e' un effetto d'ingresso, non un giocattolo
     che si ripete ogni volta che si scorre su e giu'.

     Le classi le mette il codice ma il movimento lo fa il CSS, che lo fa
     girare sul compositore e non sul filo principale: mentre le mappe si
     aprono, lo scroll resta liscio. */

  var aperta = false;

  function mostra(){
    if(!aperta){
      aperta = true;
      if(ridotto){ sezione.classList.add('is-aperta', 'is-dentro'); return; }
      sezione.classList.add('is-disegno');
      /* una lettura forzata: senza, il browser accorpa lo stato iniziale
         e quello finale nello stesso fotogramma e la transizione non parte */
      void sezione.offsetWidth;
      sezione.classList.add('is-aperta', 'is-dentro');
      setTimeout(function(){ sezione.classList.remove('is-disegno'); }, DISEGNO + 400);
      return;
    }
    sezione.classList.add('is-dentro');
  }

  function nascondi(){ sezione.classList.remove('is-dentro'); }

  /* ══ 3. il bassorilievo ════════════════════════════════════════════════ */

  function puoi(){
    if(window.innerWidth < MIN_LARGO) return false;
    if(ridotto) return false;
    try{ if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return false; }catch(e){}
    return true;
  }

  var acceso = 0, mira = 0, vivo = false, girando = false, sporco = true;
  var motore = null;

  function guarda(){
    try{
      new IntersectionObserver(function(es){
        vivo = es[0].isIntersecting;
        if(vivo){ mostra(); if(motore) motore.sveglia(); }
        else { nascondi(); if(motore) motore.spegni(); }
      }, { rootMargin: '0px', threshold: 0.12 }).observe(sezione);
    }catch(e){ vivo = true; mostra(); }
  }

  if(!puoi()){ guarda(); return; }

  /* la tela non sta nel Designer: nasce qui, e solo adesso, cioe' solo
     quando l'effetto parte davvero */
  var tela = sezione.querySelector('.cape-rilievo-tela');
  if(!tela){
    tela = document.createElement('div');
    tela.className = 'cape-rilievo-tela';
    sezione.appendChild(tela);
  }

  var base = RIPIEGO;
  try{
    var me = document.currentScript && document.currentScript.src;
    if(me) base = me.replace(/[^\/]*$/, '');
  }catch(e){}

  var cv = document.createElement('canvas');
  cv.className = 'cape-rilievo-canvas';
  var gl = null;
  try{
    gl = cv.getContext('webgl', { alpha:true, premultipliedAlpha:true,
                                  antialias:false, depth:false, stencil:false });
  }catch(e){}
  if(!gl){ guarda(); return; }

  var VERT =
    'attribute vec2 p;varying vec2 uv;' +
    'void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';

  var FRAG =
    'precision highp float;varying vec2 uv;uniform sampler2D mappa;' +
    'uniform vec2 texel;uniform vec3 luceA,luceB,luceC;' +
    'uniform float aspetto,forza,diffusa,lucida,durezza,altezza,raggio,fondo;' +
    /* Tre uniform separate e non un array di tre: un array di vec3 si
       carica in un colpo solo, ma va indicizzato nello shader e alcuni
       driver lo trattano male. Qui non c'e' niente da interpretare. */
    'float luce(vec3 n,vec2 pos,vec3 l){' +
      'if(l.z<=0.0) return 0.0;' +
      'vec3 v=vec3(l.xy-pos,altezza);' +
      'float dist=length(v.xy);' +
      'vec3 L=normalize(v);' +
      'vec3 H=normalize(L+vec3(0.0,0.0,1.0));' +
      'float diff=dot(n,L)-L.z;' +
      'float spec=pow(max(dot(n,H),0.0),durezza)-pow(max(H.z,0.0),durezza);' +
      'float t=clamp(1.0-dist/raggio,0.0,1.0);' +
      'return (diff*diffusa+spec*lucida)*(t*t*(3.0-2.0*t))*l.z;' +
    '}' +
    'void main(){' +
      'float hs=texture2D(mappa,uv-vec2(texel.x,0.0)).r;' +
      'float hd=texture2D(mappa,uv+vec2(texel.x,0.0)).r;' +
      'float hg=texture2D(mappa,uv-vec2(0.0,texel.y)).r;' +
      'float ha=texture2D(mappa,uv+vec2(0.0,texel.y)).r;' +
      'vec3 n=normalize(vec3((hd-hs)*forza,(hg-ha)*forza,1.0));' +
      'vec2 pos=vec2(uv.x,(1.0-uv.y)*aspetto);' +
      'float d=luce(n,pos,luceA)+luce(n,pos,luceB)+luce(n,pos,luceC);' +
      'float su=step(0.0,d);' +
      'float sopra=1.0-fondo;' +
      'float aSu=(d/max(sopra,0.002))*step(0.002,sopra);' +
      'float aGiu=-d/max(fondo,0.002);' +
      'float a=clamp(mix(aGiu,aSu,su),0.0,1.0);' +
      'gl_FragColor=vec4(vec3(su*a),a);' +
    '}';

  function compila(tipo, sorgente){
    var s = gl.createShader(tipo);
    gl.shaderSource(s, sorgente);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  var vs = compila(gl.VERTEX_SHADER, VERT), fs = compila(gl.FRAGMENT_SHADER, FRAG);
  if(!vs || !fs){ guarda(); return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ guarda(); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(ap);
  gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['mappa','texel','aspetto','forza','diffusa','lucida','durezza','altezza','raggio','fondo',
   'luceA','luceB','luceC']
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

  var pronta = false, aspetto = 0.65;
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
    sveglia();
  };
  img.src = base + 'superficie.png';

  var largo = 0, alto = 0;

  function misura(){
    var r = tela.getBoundingClientRect();
    if(!r.width || !r.height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var L = Math.round(r.width * dpr), A = Math.round(r.height * dpr);
    if(L === largo && A === alto) return;
    largo = L; alto = A;
    cv.width = L; cv.height = A;
    gl.viewport(0, 0, L, A);
    aspetto = r.height / r.width;
    gl.uniform1f(U.aspetto, aspetto);
    sporco = true;
  }

  /* ----- le luci -------------------------------------------------------
     Tre, in fila: due automatiche e il puntatore. Ognuna e' x, y e quanto
     vale; a zero lo shader la salta. Le due automatiche stanno sulla
     stessa ellisse, mezzo giro l'una dall'altra, e girano nello stesso
     verso: partono dai due bordi opposti e si rincorrono senza mai
     incrociarsi.                                                          */

  var luci = new Float32Array(9);
  var lx = 0.5, ly = 0.3, sulMouse = 0, angolo = 0, t0 = 0;

  function luciAggiorna(dt){
    var giro = AUTO_FORZA * (1 - sulMouse) * acceso;
    angolo += dt * 2 * Math.PI / AUTO_GIRO;
    var cx = 0.5, cy = aspetto / 2;
    var rx = AUTO_RAGGI, ry = aspetto * AUTO_RAGGI;
    luci[0] = cx + Math.cos(angolo + Math.PI) * rx;
    luci[1] = cy + Math.sin(angolo + Math.PI) * ry;
    luci[2] = giro;
    luci[3] = cx + Math.cos(angolo) * rx;
    luci[4] = cy + Math.sin(angolo) * ry;
    luci[5] = giro;
    luci[6] = lx;
    luci[7] = ly;
    luci[8] = sulMouse * acceso;
  }

  function disegna(){
    if(!pronta) return;
    gl.uniform3f(U.luceA, luci[0], luci[1], luci[2]);
    gl.uniform3f(U.luceB, luci[3], luci[4], luci[5]);
    gl.uniform3f(U.luceC, luci[6], luci[7], luci[8]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(acceso > 0.002) gl.drawArrays(gl.TRIANGLES, 0, 3);
    sporco = false;
  }

  /* Il ciclo gira finche' c'e' qualcosa da muovere: le due luci
     automatiche si muovono sempre, quindi mentre la sezione e' sullo
     schermo gira. Appena la sezione esce, si ferma del tutto: niente
     fotogrammi disegnati per nessuno. */
  function giro(ora){
    var dt = t0 ? Math.min((ora - t0) / 1000, 0.05) : 0.016;
    t0 = ora;
    var passo = mira > acceso ? ACCENDE : SPEGNE;
    acceso += (mira - acceso) * passo;
    if(Math.abs(mira - acceso) < 0.002) acceso = mira;
    sulMouse += ((dentroMouse ? 1 : 0) - sulMouse) * 0.12;
    luciAggiorna(dt);
    disegna();
    if(acceso === 0 && mira === 0){ girando = false; t0 = 0; return; }
    requestAnimationFrame(giro);
  }

  function sveglia(){
    if(!pronta || !vivo) return;
    mira = 1;                      /* prima stava dentro al blocco qui sotto:
                                      uscendo e rientrando mentre la luce si
                                      stava ancora spegnendo, il ciclo era
                                      ancora in piedi, si usciva subito e la
                                      mira restava a zero. Da li' non si
                                      riaccendeva piu' niente. */
    if(girando) return;
    girando = true; t0 = 0;
    requestAnimationFrame(giro);
  }

  var dentroMouse = false;

  motore = {
    sveglia: function(){ misura(); sveglia(); },
    spegni:  function(){ mira = 0; dentroMouse = false; }
  };

  sezione.addEventListener('pointermove', function(e){
    var r = tela.getBoundingClientRect();
    if(!r.width) return;
    lx = (e.clientX - r.left) / r.width;
    ly = (e.clientY - r.top)  / r.width;
    /* "sopra la sagoma" con un margine: appena fuori dalla tela comanda
       ancora il puntatore, piu' in la' tornano le due luci automatiche.
       Senza questo margine, chi muove il mouse ai bordi della sezione
       vedrebbe sparire tutto: le automatiche spente perche' c'e' il
       mouse, e il mouse troppo lontano per illuminare qualcosa. */
    dentroMouse = (lx > -0.3 && lx < 1.3 && ly > -0.3 * aspetto && ly < 1.3 * aspetto);
    sveglia();
  }, { passive:true });

  sezione.addEventListener('pointerleave', function(){ dentroMouse = false; }, { passive:true });
  window.addEventListener('blur', function(){ dentroMouse = false; });

  var rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(misura, 150);
  }, { passive:true });

  guarda();

  window.capePatti && capePatti.dichiara('rilievo delle citta', {
    scrivo: [['.cape-rilievo-mappa', '.cape-rilievo', 'le piante di Milano e Parigi, piantate dal codice'],
             ['is-aperta',  '.cape-rilievo', 'le mappe si sono disegnate: da qui in poi solo dissolvenza'],
             ['is-disegno', '.cape-rilievo', 'sta girando la comparsa dal centro, una volta sola'],
             ['is-dentro',  '.cape-rilievo', 'la sezione e\' sullo schermo: mappe visibili'],
             ['.cape-rilievo-tela', '.cape-rilievo', 'la tela in cui il bassorilievo viene disegnato']],
    leggo:  [['cape-rilievo', '.cape-rilievo', 'la sezione: senza di lei il file non fa niente']]
  });
})();
