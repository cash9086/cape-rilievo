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

   LE DUE PIANTE
   -------------
   Milano e Parigi non stanno nel Designer: le pianta qui dentro questo
   file, appena la pagina e' montata. Sono due disegni vettoriali scritti
   per esteso (contorni comunali veri, cerchie e acque disegnate) e non
   due immagini: cosi' prendono il colore dal foglio di stile invece di
   averlo cotto dentro, e cambiando --rilievo-ink cambiano anche loro.

   Questo pezzo gira SEMPRE — anche su telefono, anche senza WebGL, anche
   con le animazioni ridotte. E' l'unica parte del file che non si puo'
   spegnere: senza, la sezione su un telefono resterebbe due scritte in
   mezzo al grigio.

   DOVE NON GIRA (solo la luce, non le piante)
   -------------
   Sotto i 992px, senza un puntatore vero, con "riduci animazioni" acceso o
   senza WebGL il bassorilievo non parte. Restano le due citta' con le
   coordinate e le due piante, che e' esattamente il disegno voluto: senza
   mouse non c'e' nessuna luce da muovere, e un rilievo che non si puo'
   scoprire e' solo peso scaricato per niente.
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

  /* ——— le due piante ——————————————————————————————————————————————
     Vanno messe per prime nella sezione e prima di qualunque controllo:
     sono l'unica cosa che deve esserci sempre. Se ci sono gia' (lo script
     e' stato caricato due volte, oppure un domani le sposti in un Embed)
     non si tocca niente. */

  var MILANO = '<svg class="cape-rilievo-mappa is-milano" viewBox="0 0 1000 898" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><clipPath id="cr-milano"><path d="M580 2l12 6l30 44l28-4l19-8l71 4l20 30l50 21l100 10l8-5l16 20l24-2l1-4l5 39l9 22l27 9l-2 11l-17 9l-9-1l4-22l-17 0l-31 9l-2 20l8 131l-8 15l-2 30l26-2l23 24l2 36l-27 66l5 15l-1 81l-13 17l-67 51l-28 28l38 27l-49 33l-28 5l-32-2l-6-5l-22 14l-7 25l1 20l-8 16l-21-3l-7 3l-29 26l-3 11l-16 19l-18 7l-7-10l0-26l-4-1l-12 10l-21 1l-38-37l-18-33l-47 0l4-34l-7-25l-12-23l-43-12l-34 6l6 11l-19 7l-8-11l-3-29l-17-47l-22-46l-44-73l-19-9l-16 16l-18 2l-16-21l-35-14l-36 0l-7 9l10 76l-26 29l-15 1l-65-37l3-17l-4-15l-29-6l-11-19l22-12l1-8l-7-23l-5-11l-9-6l-9-27l1-6l11 0l120 29l14-77l-7-21l-40-54l-40-76l-12-43l28 3l29-4l8-5l13 2l35 49l24-7l9 4l11-29l29-23l0-13l-17-60l8-30l-11-31l26-20l1 5l-9 12l0 14l24 26l64 16l25-4l1-13l36-4l39 16l42 3l30-79l44-14l39 6l5-4z"/></clipPath></defs><path class="cape-rilievo-terra" d="M580 2l12 6l30 44l28-4l19-8l71 4l20 30l50 21l100 10l8-5l16 20l24-2l1-4l5 39l9 22l27 9l-2 11l-17 9l-9-1l4-22l-17 0l-31 9l-2 20l8 131l-8 15l-2 30l26-2l23 24l2 36l-27 66l5 15l-1 81l-13 17l-67 51l-28 28l38 27l-49 33l-28 5l-32-2l-6-5l-22 14l-7 25l1 20l-8 16l-21-3l-7 3l-29 26l-3 11l-16 19l-18 7l-7-10l0-26l-4-1l-12 10l-21 1l-38-37l-18-33l-47 0l4-34l-7-25l-12-23l-43-12l-34 6l6 11l-19 7l-8-11l-3-29l-17-47l-22-46l-44-73l-19-9l-16 16l-18 2l-16-21l-35-14l-36 0l-7 9l10 76l-26 29l-15 1l-65-37l3-17l-4-15l-29-6l-11-19l22-12l1-8l-7-23l-5-11l-9-6l-9-27l1-6l11 0l120 29l14-77l-7-21l-40-54l-40-76l-12-43l28 3l29-4l8-5l13 2l35 49l24-7l9 4l11-29l29-23l0-13l-17-60l8-30l-11-31l26-20l1 5l-9 12l0 14l24 26l64 16l25-4l1-13l36-4l39 16l42 3l30-79l44-14l39 6l5-4z"/><g clip-path="url(#cr-milano)"><path class="cape-rilievo-vie" stroke-width="2.2" d="M675 426l0-4l-1-4l-1-5l-1-4l-2-3l-2-4l-3-4l-3-3l-3-3l-3-3l-4-2l-4-3l-4-2l-4-1l-5-1l-4-1l-5-1l-4 0l-5 0l-5 1l-4 1l-5 1l-4 1l-4 2l-4 3l-4 2l-3 3l-3 3l-3 3l-3 4l-2 4l-2 3l-1 4l-1 5l-1 4l0 4l0 4l1 4l1 4l1 4l2 4l2 4l3 3l3 4l3 3l3 3l4 2l4 2l4 2l4 2l5 1l4 1l5 1l5 0l4 0l5-1l4-1l5-1l4-2l4-2l4-2l4-2l3-3l3-3l3-4l3-3l2-4l2-4l1-4l1-4l1-4l0-4zM730 413l0-9l-2-8l-2-8l-2-8l-4-8l-4-7l-5-7l-6-7l-6-6l-7-5l-7-5l-8-5l-8-4l-9-3l-9-2l-9-2l-9-1l-9-1l-10 1l-9 1l-9 2l-9 2l-8 3l-8 4l-8 5l-8 5l-6 5l-7 6l-5 7l-5 7l-5 7l-3 8l-3 8l-2 8l-1 8l-1 9l1 8l1 8l2 8l3 8l3 8l5 7l5 7l5 7l7 6l6 6l8 5l8 4l8 4l8 3l9 3l9 2l9 1l10 0l9 0l9-1l9-2l9-3l9-3l8-4l8-4l7-5l7-6l6-6l6-7l5-7l4-7l4-8l2-8l2-8l2-8l0-8zM816 402l0-14l-2-15l-4-14l-5-13l-6-13l-8-13l-9-12l-10-11l-11-11l-13-9l-13-9l-14-8l-15-6l-15-6l-16-4l-16-3l-17-2l-16-1l-17 1l-16 2l-17 3l-15 4l-16 6l-15 6l-14 8l-13 9l-12 9l-11 11l-10 11l-9 12l-8 13l-6 13l-5 13l-4 14l-2 15l-1 14l1 14l2 14l4 14l5 14l6 13l8 13l9 12l10 11l11 10l12 10l13 9l14 7l15 7l16 5l15 5l17 3l16 2l17 0l16 0l17-2l16-3l16-5l15-5l15-7l14-7l13-9l13-10l11-10l10-11l9-12l8-13l6-13l5-14l4-14l2-14l0-14zM626 431l102-480M626 431l250-357M626 431l385-205M626 431l429 75M626 431l280 334M626 431l68 485M626 431l-480 102M626 431l-410-149M626 431l-347-347M626 431l-168-461M626 431l426-91M626 431l377 218M626 431l184 395M626 431l-436-16M626 431l-370-231M626 431l-260-416M626 431l199-448M626 431l324-292"/><path class="cape-rilievo-acque" stroke-width="3.4" d="M561 504l-20 7l-26 11l-27 15l-32 15l-39 15l-42 15l-43 22l-34 18M561 504l-2 24l-3 36l-10 49l-11 54l-10 60l-6 60l-4 55M847 16l13 139l29 120l18 121l17 120l-35 121M320 95l29 120l22 121l12 120l39 102"/></g></svg>';

  var PARIGI = '<svg class="cape-rilievo-mappa is-parigi" viewBox="0 0 1000 529" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><clipPath id="cr-parigi"><path d="M828 372l39 4l4-23l11 1l0-9l24 1l5 6l59 14l12 8l18 28l-3 17l-13 13l-5 25l5 9l-3 13l-16 35l-9 7l-23 1l-14-5l-50-2l0-5l-11-4l-23-24l-12-3l-26 0l-14-4l-22-1l-14-9l-11-13l-10-6l-35 13l-50 30l-3 5l-73 34l-26 1l-17-16l-21 15l-62-5l2-8l-164-55l-54-33l-25 29l-22 0l-1-23l12-9l-12-10l-18 5l-31-6l-14-24l-2-26l5-15l-7-1l-34-13l-13-14l-61-22l1-18l15-54l15-23l38-21l18-25l38 15l2-1l13-38l77 15l10-4l4-26l19-23l24-18l15-2l52-38l43-22l9-8l263-7l21 6l18 16l11 24l6 55l5 11l16 15l22 8l12 25l6 32l-1 48l11 84l-3 25l-14 66l5 5l16-3l19-10l-10-35l1-12l8-6l11 16l12 2z"/></clipPath></defs><path class="cape-rilievo-terra" d="M828 372l39 4l4-23l11 1l0-9l24 1l5 6l59 14l12 8l18 28l-3 17l-13 13l-5 25l5 9l-3 13l-16 35l-9 7l-23 1l-14-5l-50-2l0-5l-11-4l-23-24l-12-3l-26 0l-14-4l-22-1l-14-9l-11-13l-10-6l-35 13l-50 30l-3 5l-73 34l-26 1l-17-16l-21 15l-62-5l2-8l-164-55l-54-33l-25 29l-22 0l-1-23l12-9l-12-10l-18 5l-31-6l-14-24l-2-26l5-15l-7-1l-34-13l-13-14l-61-22l1-18l15-54l15-23l38-21l18-25l38 15l2-1l13-38l77 15l10-4l4-26l19-23l24-18l15-2l52-38l43-22l9-8l263-7l21 6l18 16l11 24l6 55l5 11l16 15l22 8l12 25l6 32l-1 48l11 84l-3 25l-14 66l5 5l16-3l19-10l-10-35l1-12l8-6l11 16l12 2z"/><g clip-path="url(#cr-parigi)"><path class="cape-rilievo-vie" stroke-width="2.2" d="M288 173l0-69M288 173l35-60M288 173l61-34M288 173l70 0M288 173l61 35M288 173l35 61M288 173l0 70M288 173l-34 61M288 173l-60 35M288 173l-69 0M288 173l-60-34M288 173l-34-60M699 330l11-61M699 330l54-30M699 330l56 23M699 330l16 59M699 330l-36 49M699 330l-61 3M699 330l-41-46M569 212l18-49M569 212l52-9M569 212l34 41M569 212l-18 50M569 212l-52 9M569 212l-34-40M590 300l30-43M590 300l53 5M590 300l22 48M590 300l-30 43M590 300l-52-4M590 300l-22-48M441 419l14-54M441 419l53-15M441 419l39 39M441 419l-15 54M441 419l-54 14M441 419l-40-40M535 435l23-50M535 435l54-13M535 435l44 35M535 435l0 56M535 435l-43 36M535 435l-55-11M535 435l-25-49M288 173l49 24l58 27M395 224l32 16l35 15M462 255l50 16l45 9M396 249l35 28l41 21l49 14l32 2M492 80l37 37l-8 80l-21 74l-16 43l-45 104M439 197l45-8l45 14l40 9M288 173l61-1l70 6l53 13M569 212l37 59l-16 29M419 80l24 37l29 43l49 37M382 369l20-37l29-49M415 117l69 18l53 16l57 9M341 344l61 19l70 18l65 10l65-10M288 154l-28 43l-8 49M699 330l-32-47l-20-55l16-31M535 435l-31-41l-12-50l29-36M441 419l-26-38l-13-49"/><path class="cape-rilievo-acque" stroke-width="4.5" d="M783 424l-75-13l-51-16l-67-26l-33-28l-16-24l-20-19l-25-15l-24-9l-27-11l-31-12l-28-15l-37-8l-40 8l-29 19l-28 28l-25 31l-24 37l-8 30l-25 24M602 49l-24 68l-13 80l17 43l8 61"/></g></svg>';

  if(!sezione.querySelector('.cape-rilievo-mappa')){
    var culla = document.createElement('div');
    culla.innerHTML = MILANO + PARIGI;
    var primo = sezione.firstChild;
    while(culla.firstChild) sezione.insertBefore(culla.firstChild, primo);
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
    scrivo: [['.cape-rilievo-mappa', '.cape-rilievo', 'le piante di Milano e Parigi, piantate dal codice'],
             ['.cape-rilievo-tela',  '.cape-rilievo', 'la tela in cui il bassorilievo viene disegnato']],
    leggo:  [['cape-rilievo', '.cape-rilievo', 'la sezione: senza di lei il file non fa niente']]
  });
})();
