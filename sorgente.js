/* ==========================================================================
   cape-rilievo - la sezione delle due citta'
   --------------------------------------------------------------------------
   Questo file fa TRE cose, e conviene tenerle distinte in testa perche'
   hanno condizioni diverse:

     1. PIANTA LE DUE MAPPE dentro la sezione. Sempre: telefono compreso,
        anche senza WebGL, anche con le animazioni ridotte.
     2. LE DISEGNA. La prima volta che la sezione entra nello schermo ogni
        singola strada viene tracciata da un capo all'altro, dal centro
        verso il bordo. Nessuna riga compare in dissolvenza. Dalla seconda
        volta in poi non si ridisegna: resta solo la dissolvenza della
        mappa intera. Anche questo sempre, tranne con "riduci animazioni"
        acceso: li' le mappe sono gia' li' e basta.
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

  var FORZA     = 10.0;  /* quanto sono ripide le pareti del solco        */
  var MASSA     = 1.15;  /* quanto si alza il corpo della figura: e' questo
                            che la fa scolpita invece che incisa          */
  var DIFFUSA   = 0.30;  /* quanto scurisce la luce radente               */
  var LUCIDA    = 0.20;  /* il riflesso: quanto e' lucido il gesso        */
  var DUREZZA   = 28.0;  /* quanto e' stretto quel riflesso               */
  var ALTEZZA   = 0.30;  /* a che quota sta la lampadina (1 = una tela)   */
  var RAGGIO    = 0.55;  /* fin dove arriva la luce (1 = una tela)        */
  var FONDO     = 1.0;   /* il fondo della sezione: 1 = bianco, .957 = f4 */
  var ACCENDE   = 0.16;  /* quanto e' rapido l'accendersi della luce      */
  var SPEGNE    = 0.07;  /* ...e lo spegnersi                             */

  /* ----- le manopole delle due luci automatiche ------------------------ */

  var AUTO_FORZA = 0.15; /* quanto valgono rispetto al puntatore. Bassissimo
                            apposta: devono far capire che li' sotto c'e'
                            qualcosa, non mostrare il disegno             */
  var AUTO_GIRO  = 16.0; /* secondi per un giro intero                    */
  var AUTO_RAGGI = 0.46; /* quanto largo girano: piu' stretto = passano
                            piu' vicino al disegno e si vede di piu'      */

  /* ----- il resto ------------------------------------------------------ */

  var MIN_LARGO = 992;   /* sotto: niente rilievo                         */
  var DISEGNO   = 1700;  /* durata della comparsa delle mappe, in ms      */
  var RIPIEGO   = 'https://cdn.jsdelivr.net/gh/cash9086/cape-rilievo@main/';

  var sezione = document.querySelector('.cape-rilievo');
  if(!sezione) return;

  /* ——— il pannello incollato ———
     La sezione e' un binario alto due schermate e mezzo; quello che si vede
     e' un pannello alto uno schermo che resta fermo mentre la pagina scorre.
     Il pannello lo crea questo file e ci sposta dentro quello che c'era: nel
     Designer non cambia niente, restano la sezione e le due citta'. */
  var pannello = sezione.querySelector('.cape-rilievo-stick');
  if(!pannello){
    pannello = document.createElement('div');
    pannello.className = 'cape-rilievo-stick';
    while(sezione.firstChild) pannello.appendChild(sezione.firstChild);
    sezione.appendChild(pannello);
  }

  var ridotto = false;
  try{ ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  /* ══ 1. le due piante ══════════════════════════════════════════════════
     Non sono immagini e non sono disegni SVG: sono due TELE DIPINTE dal
     codice, strada per strada.

     PERCHE' COSI'
     Le strade sono qualche migliaio. Se fossero disegni veri nella pagina
     e li animassi, il browser dovrebbe ridisegnarli TUTTI a ogni
     fotogramma: misurato, la pagina passava da 16 a 166 millisecondi per
     fotogramma, cioe' da liscia a scatti. Su una tela dipinta invece
     quello che e' gia' tracciato resta li': a ogni fotogramma si dipinge
     solo il pezzo nuovo, e il costo non dipende piu' da quanto e' grande
     la mappa.

     IL DATO
     Ogni voce e' [classe, fascia, percorso]. La classe dice il peso del
     tratto (v = vie, a = assi, p = principali, q = acque), la fascia dice
     quanto e' lontana dal centro — le mappe escono gia' ordinate cosi' —
     e il percorso e' scritto come un path SVG ridotto all'osso: M sposta,
     l tira una riga, tutto a numeri interi.                              */

  var MAPPE = {
    milano: __MILANO__,
    parigi: __PARIGI__
  };

  /* spessore del tratto (in unita' della mappa, che e' larga 1000) e
     quanto e' chiaro. Le vie minori sono volutamente pallide: sono il
     tessuto, non il disegno. */
  var TRATTI = { v:[1.15,0.55], a:[2.1,1.0], p:[3.2,1.0], q:[4.2,0.78] };

  var DISEGNO_FASCIA = 820;  /* quanto ci mette UNA fascia, in ms         */
  var DISEGNO_SFASA  = 92;   /* ritardo tra una fascia e la successiva    */

  function polilinee(d){
    /* "M12 34l5-6l-3 2M..." -> liste di coordinate.
       Attenzione allo spazio: quando il secondo numero e' negativo lo
       spazio non c'e', perche' il segno meno basta gia' a separarli. E'
       sintassi giusta e fa risparmiare qualche migliaio di caratteri, ma
       un lettore che si aspetta sempre lo spazio legge NaN e non disegna
       piu' niente. */
    var re = /([Ml])(-?\d+) ?(-?\d+)/g, m, linee = [], corr = null, x = 0, y = 0;
    while((m = re.exec(d))){
      var a = +m[2], b = +m[3];
      if(m[1] === 'M'){ x = a; y = b; corr = [x, y]; linee.push(corr); }
      else if(corr){ x += a; y += b; corr.push(x, y); }
    }
    return linee;
  }

  function lunghezza(L){
    var s = 0;
    for(var k = 0; k + 3 < L.length; k += 2)
      s += Math.sqrt((L[k+2]-L[k])*(L[k+2]-L[k]) + (L[k+3]-L[k+1])*(L[k+3]-L[k+1]));
    return s;
  }

  /* Una fascia di strade che si sa dipingere un pezzo per volta: tiene il
     segno di dove era arrivata, e quando le si chiede di avanzare dipinge
     SOLO il tratto nuovo. */
  function fascia(voce){
    var linee = polilinee(voce[2]);
    var tot = 0;
    for(var k = 0; k < linee.length; k++) tot += lunghezza(linee[k]);
    return {
      classe: voce[0], indice: voce[1], linee: linee, totale: tot,
      i: 0, j: 0, resto: 0, dipinto: 0,
      fatto: function(){ return this.dipinto; },
      segna: function(q){ this.dipinto = q; },
      finita: function(){ return this.i >= this.linee.length; },
      azzera: function(){ this.i = 0; this.j = 0; this.resto = 0; this.dipinto = 0; },
      avanza: function(ctx, quanto){
        if(this.finita()) return;
        ctx.beginPath();
        while(quanto > 0 && this.i < this.linee.length){
          var L = this.linee[this.i];
          if(this.j * 2 + 3 >= L.length){ this.i++; this.j = 0; this.resto = 0; continue; }
          var x1 = L[this.j*2], y1 = L[this.j*2+1], x2 = L[this.j*2+2], y2 = L[this.j*2+3];
          var seg = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
          if(seg < 0.0001){ this.j++; this.resto = 0; continue; }
          var manca = seg - this.resto;
          var t0 = this.resto / seg;
          if(manca <= quanto){
            ctx.moveTo(x1 + (x2-x1)*t0, y1 + (y2-y1)*t0);
            ctx.lineTo(x2, y2);
            quanto -= manca; this.j++; this.resto = 0;
          } else {
            var t1 = (this.resto + quanto) / seg;
            ctx.moveTo(x1 + (x2-x1)*t0, y1 + (y2-y1)*t0);
            ctx.lineTo(x1 + (x2-x1)*t1, y1 + (y2-y1)*t1);
            this.resto += quanto; quanto = 0;
          }
        }
        ctx.stroke();
      },
      tutta: function(ctx){
        ctx.beginPath();
        for(var a = 0; a < this.linee.length; a++){
          var L = this.linee[a];
          ctx.moveTo(L[0], L[1]);
          for(var b = 2; b + 1 < L.length; b += 2) ctx.lineTo(L[b], L[b+1]);
        }
        ctx.stroke();
        this.i = this.linee.length;
        this.dipinto = this.totale;
      }
    };
  }

  function pianta(nome){
    var cv = document.createElement('canvas');
    cv.className = 'cape-rilievo-mappa is-' + nome;
    cv.setAttribute('aria-hidden', 'true');
    var m = {
      nodo: cv, ctx: cv.getContext('2d'), scala: 0, lato: 0,
      fasce: MAPPE[nome].map(fascia)
    };
    m.stile = function(f){
      var t = TRATTI[f.classe] || TRATTI.v;
      this.ctx.lineWidth = t[0];
      /* le vie minori prendono il loro pallore dal CSS (--rilievo-strade):
         e' la manopola con cui si decide quanto le piante pesano rispetto
         al bassorilievo, ed e' giusto che stia dove stanno le altre */
      this.ctx.globalAlpha = (f.classe === 'v') ? pallore : t[1];
      this.ctx.strokeStyle = inchiostro;
    };
    m.misura = function(){
      var r = this.nodo.getBoundingClientRect();
      if(!r.width) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var lato = Math.round(r.width * dpr);
      if(lato === this.lato) return false;
      this.lato = lato;
      this.nodo.width = lato; this.nodo.height = lato;
      this.scala = lato / 1000;
      this.ctx.setTransform(this.scala, 0, 0, this.scala, 0, 0);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      return true;
    };
    m.ridisegna = function(){
      this.ctx.save();
      this.ctx.setTransform(1,0,0,1,0,0);
      this.ctx.clearRect(0, 0, this.lato, this.lato);
      this.ctx.restore();
      for(var k = 0; k < this.fasce.length; k++){
        this.fasce[k].azzera();
        this.stile(this.fasce[k]);
        this.fasce[k].tutta(this.ctx);
      }
    };
    return m;
  }

  var inchiostro = '#141416', pallore = TRATTI.v[1];
  try{
    var stile = getComputedStyle(sezione);
    var letto = stile.getPropertyValue('--rilievo-ink');
    if(letto && letto.trim()) inchiostro = letto.trim();
    var pal = parseFloat(stile.getPropertyValue('--rilievo-strade'));
    if(pal > 0 && pal <= 1) pallore = pal;
  }catch(e){}

  var piante = [];
  if(!pannello.querySelector('.cape-rilievo-mappa')){
    piante = [pianta('milano'), pianta('parigi')];
    var primo = pannello.firstChild;
    for(var q = 0; q < piante.length; q++) pannello.insertBefore(piante[q].nodo, primo);
  }

  /* ══ 2. il disegno ═════════════════════════════════════════════════════
     La prima volta che la sezione entra nello schermo, ogni singola strada
     viene tracciata da un capo all'altro. Si parte dalle strade del centro
     e si arriva a quelle del bordo: le fasce partono una dopo l'altra,
     sfasate, e dentro ogni fascia le strade escono in fila.

     Niente compare in dissolvenza. La dissolvenza c'e' solo dalla seconda
     volta in poi, quando la mappa e' gia' disegnata e la sezione rientra
     nello schermo: li' non si ridisegna niente, e' un ingresso, non un
     giocattolo che riparte ogni volta che si scorre.                      */

  var aperta = false, dipingendo = false, t_disegno = 0;

  function disegna_subito(){
    for(var k = 0; k < piante.length; k++){ piante[k].misura(); piante[k].ridisegna(); }
  }

  function passo_disegno(ora){
    if(!t_disegno) t_disegno = ora;
    var trascorso = ora - t_disegno, resta = false, k, f, m, quota;
    for(k = 0; k < piante.length; k++){
      m = piante[k];
      for(var i = 0; i < m.fasce.length; i++){
        f = m.fasce[i];
        if(f.finita()) continue;
        var da = f.indice * DISEGNO_SFASA;
        if(trascorso < da){ resta = true; continue; }
        quota = f.totale * Math.min(1, (ora - t_disegno - da) / DISEGNO_FASCIA);
        m.stile(f);
        f.avanza(m.ctx, Math.max(0, quota - f.fatto()));
        f.segna(quota);
        if(!f.finita()) resta = true;
      }
    }
    if(resta) requestAnimationFrame(passo_disegno);
    else dipingendo = false;
  }

  function mostra(){
    if(!aperta){
      aperta = true;
      var pronto = true;
      for(var k = 0; k < piante.length; k++) if(!piante[k].misura() && !piante[k].lato) pronto = false;
      if(!pronto){ setTimeout(mostra_forza, 60); }
      else if(ridotto){ disegna_subito(); }
      else { dipingendo = true; t_disegno = 0; requestAnimationFrame(passo_disegno); }
    }
    sezione.classList.add('is-dentro');
  }

  function mostra_forza(){
    for(var k = 0; k < piante.length; k++) piante[k].misura();
    if(ridotto) disegna_subito();
    else { dipingendo = true; t_disegno = 0; requestAnimationFrame(passo_disegno); }
  }


  var rM = null;
  window.addEventListener('resize', function(){
    clearTimeout(rM);
    rM = setTimeout(function(){
      var cambiato = false;
      for(var k = 0; k < piante.length; k++) if(piante[k].misura()) cambiato = true;
      if(cambiato && aperta && !dipingendo) disegna_subito();
    }, 200);
  }, { passive:true });

  /* ══ 3. il bassorilievo ════════════════════════════════════════════════ */

  function puoi(){
    if(window.innerWidth < MIN_LARGO) return false;
    if(ridotto) return false;
    try{ if(!matchMedia('(hover: hover) and (pointer: fine)').matches) return false; }catch(e){}
    return true;
  }

  var acceso = 0, mira = 0, vivo = true, girando = false, sporco = true;
  var motore = null;

  /* ——— quando comincia ———
     Non appena la sezione entra nello schermo: allora il pannello starebbe
     ancora salendo dal basso, e il disegno partirebbe mentre la sezione
     arriva. Comincia quando il pannello SI INCOLLA, cioe' quando il bordo
     alto del binario tocca il bordo alto dello schermo. In quell'istante
     sotto c'e' il bianco pieno della sezione dei pixel: la sezione non
     arriva, e' gia' li', e le mappe si disegnano sopra quel bianco. */

  var incollata = false, inCoda = false;

  function controllaAggancio(){
    inCoda = false;
    var r = sezione.getBoundingClientRect();

    /* Visibile da quando il bordo alto del binario supera il bordo alto
       dello schermo, e poi PER SEMPRE finche' non si risale sopra. Non
       "finche' e' incollata": scorrendo in giu' il pannello si sgancia e
       se ne va su insieme alla pagina, e deve andarsene scorrendo, non
       sparire di colpo. */
    var ora = (r.top <= 0);
    if(ora !== incollata){
      incollata = ora;
      sezione.classList.toggle('is-incollata', ora);
      if(ora) mostra();
    }

    /* Il rilievo invece costa, e gira solo mentre la sezione si vede. */
    var suSchermo = ora && r.bottom > 0 && r.top < window.innerHeight;
    if(motore){
      if(suSchermo) motore.sveglia();
      else motore.spegni();
    }
  }

  function guarda(){
    window.addEventListener('scroll', function(){
      if(inCoda) return;
      inCoda = true;
      requestAnimationFrame(controllaAggancio);
    }, { passive:true });
    window.addEventListener('resize', function(){ requestAnimationFrame(controllaAggancio); }, { passive:true });
    controllaAggancio();
  }

  if(!puoi()){ guarda(); return; }

  /* la tela non sta nel Designer: nasce qui, e solo adesso, cioe' solo
     quando l'effetto parte davvero */
  var tela = pannello.querySelector('.cape-rilievo-tela');
  if(!tela){
    tela = document.createElement('div');
    tela.className = 'cape-rilievo-tela';
    pannello.appendChild(tela);
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
    'uniform vec2 texel;uniform vec3 luceA,luceB,luceC;uniform sampler2D gobba;' +
    'uniform float aspetto,forza,massa,diffusa,lucida,durezza,altezza,raggio,fondo;' +
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
      /* la pendenza e' la somma di due cose: il solco, che si ricava dalle
         quattro letture qui sopra, e la gobba, che nel suo file e' GIA'
         derivata e quindi si legge e basta */
      'vec2 g=(texture2D(gobba,uv).rg*2.0-1.0)*massa;' +
      'vec3 n=normalize(vec3((hd-hs)*forza+g.x,(hg-ha)*forza+g.y,1.0));' +
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
  ['mappa','gobba','texel','aspetto','forza','massa','diffusa','lucida','durezza','altezza','raggio','fondo',
   'luceA','luceB','luceC']
    .forEach(function(n){ U[n] = gl.getUniformLocation(prog, n); });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);
  gl.uniform1f(U.forza, FORZA);
  gl.uniform1f(U.massa, MASSA);
  gl.uniform1f(U.diffusa, DIFFUSA);
  gl.uniform1f(U.lucida, LUCIDA);
  gl.uniform1f(U.durezza, DUREZZA);
  gl.uniform1f(U.altezza, ALTEZZA);
  gl.uniform1f(U.raggio, RAGGIO);
  gl.uniform1f(U.fondo, FONDO);

  var pronta = false, aspetto = 0.65, caricate = 0;

  function texture(unita, img, filtro){
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unita);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /* Due file: il solco, grande perche' ha dettaglio fine, e la gobba, che
     e' un quarto di lato perche' e' gia' derivata — un campo che nessuno
     deve piu' derivare si puo' tenere piccolo senza perdere niente. */
  function arrivata(){
    if(++caricate < 2) return;
    pronta = true;
    tela.appendChild(cv);
    misura();
    sveglia();
  }

  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function(){
    texture(0, img, gl.LINEAR);
    gl.uniform1i(U.mappa, 0);
    gl.uniform2f(U.texel, 1 / img.naturalWidth, 1 / img.naturalHeight);
    arrivata();
  };

  var img2 = new Image();
  img2.crossOrigin = 'anonymous';
  img2.onload = function(){
    texture(1, img2, gl.LINEAR);
    gl.uniform1i(U.gobba, 1);
    arrivata();
  };

  img.src  = base + 'superficie.png';
  img2.src = base + 'gobba.png';

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

  pannello.addEventListener('pointermove', function(e){
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

  pannello.addEventListener('pointerleave', function(){ dentroMouse = false; }, { passive:true });
  window.addEventListener('blur', function(){ dentroMouse = false; });

  var rT = null;
  window.addEventListener('resize', function(){
    clearTimeout(rT);
    rT = setTimeout(misura, 150);
  }, { passive:true });

  guarda();

  window.capePatti && capePatti.dichiara('rilievo delle citta', {
    scrivo: [['.cape-rilievo-mappa', '.cape-rilievo', 'le due tele su cui vengono dipinte le piante'],
             ['is-dentro',  '.cape-rilievo', 'la sezione e\' sullo schermo: mappe visibili'],
             ['.cape-rilievo-tela', '.cape-rilievo', 'la tela in cui il bassorilievo viene disegnato']],
    leggo:  [['cape-rilievo', '.cape-rilievo', 'la sezione: senza di lei il file non fa niente']]
  });
})();
