/*
 * cape-radura — la lastra incisa che si compone dentro il cielo di diamanti.
 *
 * Non e' una sezione a parte: vive DENTRO al pannello incollato della dust,
 * sullo stesso binario, e legge lo stesso progresso.
 *
 * IL BIANCO NON LO DIPINGE NESSUNO, ed e' la cosa da capire prima di tutte.
 * A due terzi della sua corsa il campo della dust e' gia' esattamente quello
 * che serve: il centro saturo di bianco perche' li' le particelle si sono
 * addossate, i bordi ancora neri perche' li' si sono diradate. Un primo
 * tentativo ci dipingeva sopra un cerchio bianco col bordo sfrangiato: due
 * cose che facevano lo stesso lavoro, e vinceva la peggiore — perche' un
 * cerchio dipinto ha un bordo, e qualunque bordo si disegni e' peggio di
 * quello che fanno le particelle diradandosi.
 *
 * Quindi qui dentro non c'e' nessuna radura da disegnare. C'e' una PAUSA —
 * che sta in cape-dust, parametri sostaDa/sostaA/sostaQuota: il progresso
 * della dust si pianta in quello stato per un quarto del binario, le
 * particelle restano dove sono e continuano a scintillare — e dentro quella
 * pausa questo file fa due cose:
 *
 *   1. I DIAMANTI SI POSANO. Ognuno ha un punto d'arrivo pescato
 *      sull'inchiostro della stampa. Convergono, rallentano, e il lampo che
 *      fanno atterrando e' il loro ultimo atto. La loro luce addossata
 *      infittisce il bianco proprio dove sta per comparire la lastra.
 *
 *   2. LA LASTRA SI COMPONE. La stampa goffrata a secco compare NELL'ORDINE
 *      IN CUI I DIAMANTI ATTERRANO — dal basso in su, perche' una cosa si
 *      alza da terra — quindi non arriva: precipita. Mentre si compone e'
 *      girata nello spazio e torna in faccia man mano che si completa.
 *
 * Poi il progresso della dust riparte, il campo si allarga, il bianco vince
 * come ha sempre fatto, e la lastra si dissolve dentro a quel bianco.
 *
 * TUTTO E' UNA FUNZIONE PURA DEL PROGRESSO: niente stato accumulato. Si
 * scorre all'indietro e la scena si ricompone esatta.
 *
 * COSA VUOLE IN PAGINA: niente. Un tag <script> nel footer. Le immagini se
 * le prende da sola dalla repo ricavando l'indirizzo dal proprio <script>:
 * cambiando lo SHA nel tag, seguono anche loro.
 *
 * SOTTO I 992 PX non parte: niente WebGL e soprattutto nessun puntatore da
 * seguire, e una goffratura che non si puo' scoprire e' solo peso scaricato
 * per niente. Al suo posto la stampa piatta in nero, che compare e sparisce
 * nella stessa finestra e su un telefono si legge molto meglio.
 */
(function (global) {
  "use strict";

  /* ——— le manopole ———————————————————————————————————————————————
     Tutte qui, e tutte misurate sul binario INTERO: 0 = la sezione dust
     comincia, 1 = finisce. Vanno tenute d'accordo con la sosta che sta in
     cape-dust (li' e' 0.55 -> 0.78): la lastra deve stare dentro a quella
     pausa, se no si compone mentre il cielo si sta ancora allargando.    */

  var I = {
    pin:   ".cape-dust-pin",
    stick: ".cape-dust-stick",

    posaDa:   0.53,   /* i diamanti cominciano a convergere */
    posaA:    0.70,   /* sono tutti atterrati, la lastra e' intera */
    sostaA:   0.80,   /* fin qui resta intera */
    spentaA:  0.90,   /* qui e' sparita, e il bianco ha vinto */

    sfasa:    0.55,   /* quanta parte della finestra d'atterraggio separa il
                         primo diamante dall'ultimo: e' questo che fa salire
                         la lastra da terra invece di farla apparire */
    liberi:   0.14,   /* quota che non atterra mai e resta a scintillare */

    punto:    1.9,    /* lato del punto in px css: piccoli, come nella dust */
    bokeh:    3.4,    /* di quante volte si allarga uno del tutto fuori fuoco */

    lastra:   78,     /* altezza della lastra in vh */
    giro:     34,     /* di quanti gradi e' girata quando comincia a comporsi */
    massa:    2.6,    /* volume della goffratura */
    ombra:    0.62,   /* quanto scurisce la luce radente */
    lucida:   0.34,   /* il riflesso, che lo tiene solo il solco */
    forza:    6.5,    /* quanto sono ripide le pareti */
    durezza:  28.0,
    altezza:  0.30,
    luceRaggio: 0.85,

    minLargo: 992,
    file: {
      solco:  "stampa.png",
      gobba:  "stampa-gobba.png",
      punti:  "atterraggi.png",
      piatta: "stampa-nera.png"
    },
    ripiego: "https://cdn.jsdelivr.net/gh/cash9086/cape-rilievo@main/"
  };

  /* ====================================================================== */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  var HEAD = "#version 300 es\nprecision highp float;\nprecision highp int;\n";

  /* ——— i diamanti che si posano ————————————————————————————————————
     Tutto da gl_VertexID: il punto d'arrivo da una texture, il resto da dei
     tritatutto.

     GRANDEZZE. La luminosita' segue una legge di potenza: quasi tutti
     fiochi, pochissimi di prima grandezza. Un campo in cui tutti i punti
     pesano uguale si legge come disturbo, non come cielo.

     PROFONDITA'. Ognuno sta a una quota e il piano a fuoco e' uno solo: chi
     ne sta lontano si allarga e si spegne in proporzione — stessa energia,
     piu' area. E' lo stacco fra i pochi nitidi e i molti impastati a fare
     l'ottica da gioielliere. Posandosi torna a fuoco, perche' e' arrivato
     sulla lastra.                                                          */
  var VS_DIA = HEAD + [
    "uniform sampler2D uPunti;",
    "uniform int   uLato;",
    "uniform float uP, uPosaDa, uPosaDur, uSfasa, uLiberi, uTempo, uPunto, uEnne, uBokeh, uSpegni;",
    "uniform vec4  uLastra;",
    "out float vLum, vSfuoco, vScocca;",
    "float trita(float n){ return fract(sin(n * 12.9898) * 43758.5453); }",
    "void main(){",
    "  int i = gl_VertexID;",
    "  ivec2 c = ivec2(i % uLato, i / uLato);",
    "  vec3 a = texelFetch(uPunti, c, 0).rgb;",
    "  vec3 b = texelFetch(uPunti, ivec2(c.x, c.y + uLato), 0).rgb;",
    "  vec2 arrivo = vec2(a.r * 256.0 + a.g, b.r * 256.0 + b.g) * 255.0 / 65535.0;",
    "",
    "  float fi = float(i);",
    "  float h1 = trita(fi * 0.0131 + 0.71), h2 = trita(fi * 0.0177 + 3.13);",
    "  float h3 = trita(fi * 0.0219 + 7.77), h4 = trita(fi * 0.0263 + 11.9);",
    "",
    "  float ang = h1 * 6.2831;",
    "  float ray = pow(h2, 0.62) * 1.15;",
    "  vec2 S = vec2(0.5 + cos(ang) * ray * 0.62, 0.5 + sin(ang) * ray * 0.62);",
    "  float z = h3;",
    "  S += vec2(sin(uTempo * 0.10 + h1 * 6.2831), cos(uTempo * 0.08 + h1 * 6.2831)) * 0.010 * (0.5 + z);",
    "",
    "  vec2 D = uLastra.xy + vec2(arrivo.x, 1.0 - arrivo.y) * uLastra.zw;",
    "",
    "  float rango = fi / uEnne;",
    "  float q = clamp((uP - uPosaDa - rango * uSfasa) / uPosaDur, 0.0, 1.0);",
    "  float libero = step(h4, uLiberi);",
    "  q *= (1.0 - libero);",
    "  float e = 1.0 - pow(1.0 - q, 3.0);",
    "  vec2 P = mix(S, D, e);",
    "",
    "  float grande = pow(h2, 3.2);",
    "  float sf = clamp(abs(z - 0.46) / 0.40, 0.0, 1.0) * (1.0 - e);",
    "  vSfuoco = sf;",
    "  float area = 1.0 + sf * uBokeh;",
    "",
    "  float ritmo = 0.45 + h3 * 1.5;",
    "  float scint = pow(max(0.0, sin(uTempo * ritmo + h1 * 6.2831)), 22.0) * step(h4, 0.30);",
    "  float lampo = exp(-pow((q - 0.93) / 0.05, 2.0)) * (1.0 - libero);",
    "  vScocca = clamp(scint + lampo, 0.0, 1.0);",
    "",
    "  float morte = 1.0 - smoothstep(0.95, 1.0, q);",
    "  float base  = 0.10 + grande * 1.5;",
    "  vLum = (base + vScocca * 1.5) * morte * uSpegni / (area * area);",
    "  gl_PointSize = uPunto * (1.0 + grande * 2.2) * area * (1.0 + vScocca * 3.2);",
    "  gl_Position = vec4(P * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FS_DIA = HEAD + [
    "in float vLum, vSfuoco, vScocca;",
    "out vec4 oCol;",
    "void main(){",
    "  vec2 c = gl_PointCoord * 2.0 - 1.0;",
    "  float r = length(c);",
    "  float cuore = exp(-r * r * 7.5);",
    "  float disco = smoothstep(1.0, 0.72, r) * 0.42;",
    "  float forma = mix(cuore, disco, vSfuoco);",
    "  float croce = (max(0.0, 1.0 - abs(c.x) * 6.0) * exp(-abs(c.y) * 5.0)",
    "               + max(0.0, 1.0 - abs(c.y) * 6.0) * exp(-abs(c.x) * 5.0))",
    "               * vScocca * (1.0 - vSfuoco) * 0.5;",
    "  float a = clamp((forma + croce) * vLum, 0.0, 1.0);",
    "  oCol = vec4(vec3(a), a);",
    "}"
  ].join("\n");

  /* ——— la lastra ————————————————————————————————————————————————————
     La rotazione sta nello shader e non in CSS, perche' il rettangolo dove
     cadono i diamanti va misurato PIATTO: una cosa che ruota cambia misura a
     ogni fotogramma e i diamanti inseguirebbero un bersaglio che si muove. */
  var VS_LASTRA = HEAD + [
    "uniform vec2  uMezzo;",
    "uniform vec2  uCentro;",
    "uniform float uGiroY, uGiroX, uFuga, uZ, uSchermo;",
    "out vec2 vUv;",
    "void main(){",
    "  vec2 q = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));",
    "  vUv = q;",
    "  vec3 p = vec3((q.x - 0.5) * uMezzo.x * 2.0 * uSchermo,",
    "                (q.y - 0.5) * uMezzo.y * 2.0, 0.0);",
    "  float cy = cos(uGiroY), sy = sin(uGiroY);",
    "  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);",
    "  float cx = cos(uGiroX), sx = sin(uGiroX);",
    "  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);",
    "  p.z += uZ;",
    "  float k = uFuga / (uFuga + p.z);",
    "  vec2 s = uCentro + vec2(p.x / uSchermo, p.y) * k;",
    "  gl_Position = vec4(s * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FS_LASTRA = HEAD + [
    "in vec2 vUv;",
    "out vec4 oCol;",
    "uniform sampler2D uMappa, uGobba;",
    "uniform vec2  uTexel;",
    "uniform vec3  uLuceA, uLuceB, uLuceC;",
    "uniform float uAspetto, uForza, uMassa, uDiffusa, uLucida, uDurezza, uAltezza, uRaggio;",
    "uniform float uRivela, uSpegni;",
    "float luce(vec3 n, vec3 np, vec2 pos, vec3 l){",
    "  if (l.z <= 0.0) return 0.0;",
    "  vec3 v = vec3(l.xy - pos, uAltezza);",
    "  float dist = length(v.xy);",
    "  vec3 L = normalize(v);",
    "  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));",
    "  float diff = dot(n, L) - L.z;",
    "  float spec = pow(max(dot(np, H), 0.0), uDurezza) - pow(max(H.z, 0.0), uDurezza);",
    "  float t = clamp(1.0 - dist / uRaggio, 0.0, 1.0);",
    "  return (diff * uDiffusa + spec * uLucida) * (t * t * (3.0 - 2.0 * t)) * l.z;",
    "}",
    "void main(){",
    "  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);",
    "  float hs = texture(uMappa, uv - vec2(uTexel.x, 0.0)).r;",
    "  float hd = texture(uMappa, uv + vec2(uTexel.x, 0.0)).r;",
    "  float hg = texture(uMappa, uv + vec2(0.0, uTexel.y)).r;",
    "  float ha = texture(uMappa, uv - vec2(0.0, uTexel.y)).r;",
    "  vec2 ps = vec2((hd - hs) * uForza, (hg - ha) * uForza);",
    "  vec2 g  = texture(uGobba, uv).rg * 2.0 - 1.0;",
    "  vec2 pos = vec2(uv.x, uv.y * uAspetto);",
    "  vec3 n  = normalize(vec3(ps - g * uMassa, 1.0));",
    "  vec3 np = normalize(vec3(ps, 1.0));",
    "  float d = luce(n, np, pos, uLuceA) + luce(n, np, pos, uLuceB) + luce(n, np, pos, uLuceC);",
    "  float a = clamp(-d, 0.0, 1.0);",
    "  a *= 1.0 - smoothstep(uRivela - 0.10, uRivela + 0.02, 1.0 - uv.y);",
    "  a *= uSpegni;",
    "  oCol = vec4(0.0, 0.0, 0.0, a);",
    "}"
  ].join("\n");

  /* Nel frammento qui sopra due righe valgono una spiegazione.
     `a = clamp(-d, 0, 1)` : sul bianco pieno la luce puo' solo fare OMBRA,
     perche' sopra il bianco non c'e' niente da schiarire. Non e' una
     rinuncia — e' anche quello che toglie il rettangolo: dipingendo anche il
     bianco si vedrebbe il riquadro della lastra stampato sulla pagina.
     Il riflesso lo tiene SOLO il solco (`np`): su una gobba larga un
     riflesso largo sembra plastica bagnata, sulle incisioni sottili sembra
     gesso. E `uRivela` fa comparire la goffratura nell'ordine in cui i
     diamanti si posano, dal basso in su. */

  /* ====================================================================== */

  function compila(gl, tipo, src) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (global.console) console.error("cape-radura:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function programma(gl, vs, fs, nomi) {
    var a = compila(gl, gl.VERTEX_SHADER, vs), b = compila(gl, gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    var p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      if (global.console) console.error("cape-radura:", gl.getProgramInfoLog(p));
      return null;
    }
    var u = {};
    for (var i = 0; i < nomi.length; i++) u[nomi[i]] = gl.getUniformLocation(p, nomi[i]);
    return { id: p, u: u };
  }

  function base() {
    try {
      var me = document.currentScript && document.currentScript.src;
      if (me) return me.replace(/[^\/]*$/, "");
    } catch (e) {}
    return I.ripiego;
  }

  /* ====================================================================== */

  function monta() {
    var pin   = document.querySelector(I.pin);
    var stick = document.querySelector(I.stick);
    if (!pin || !stick) return;

    var DOVE = base();
    var p = 0, tempo = 0, t0 = 0, girando = false, visibile = false;

    function progresso() {
      var r = pin.getBoundingClientRect();
      var corsa = pin.offsetHeight - global.innerHeight;
      return corsa > 0 ? clamp(-r.top / corsa, 0, 1) : (r.top <= 0 ? 1 : 0);
    }

    /* ——— il ripiego: sotto i 992 px, la stampa piatta ———
       Il bianco non serve dipingerlo nemmeno qui: a quel punto del binario
       ce l'ha gia' messo la dust. */
    function ripiego() {
      var im = document.createElement("img");
      im.className = "cape-radura-piatta";
      im.alt = "";
      im.decoding = "async";
      im.src = DOVE + I.file.piatta;
      stick.appendChild(im);

      (function passo() {
        var g = progresso();
        var v = ss(I.posaDa, I.posaA, g) * (1 - ss(I.sostaA, I.spentaA, g));
        im.style.opacity = v.toFixed(3);
        requestAnimationFrame(passo);
      })();
    }

    if (global.innerWidth < I.minLargo) return ripiego();

    var cv = document.createElement("canvas");
    cv.className = "cape-radura-tela";
    cv.setAttribute("aria-hidden", "true");

    var gl = null;
    try {
      gl = cv.getContext("webgl2", {
        alpha: true, premultipliedAlpha: true, antialias: false,
        depth: false, stencil: false, powerPreference: "high-performance"
      });
    } catch (e) {}
    if (!gl) return ripiego();

    var dia = programma(gl, VS_DIA, FS_DIA,
      ["uPunti", "uLato", "uP", "uPosaDa", "uPosaDur", "uSfasa", "uLiberi",
       "uTempo", "uPunto", "uEnne", "uBokeh", "uSpegni", "uLastra"]);
    var lastra = programma(gl, VS_LASTRA, FS_LASTRA,
      ["uMezzo", "uCentro", "uGiroY", "uGiroX", "uFuga", "uZ", "uSchermo",
       "uMappa", "uGobba", "uTexel", "uLuceA", "uLuceB", "uLuceC",
       "uAspetto", "uForza", "uMassa", "uDiffusa", "uLucida", "uDurezza",
       "uAltezza", "uRaggio", "uRivela", "uSpegni"]);
    if (!dia || !lastra) return ripiego();

    stick.appendChild(cv);

    /* In WebGL2 si disegna da gl_VertexID e non serve nessun buffer, ma un
       VAO va legato lo stesso o qualche driver si lamenta. */
    gl.bindVertexArray(gl.createVertexArray());
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    var texPunti = null, texMappa = null, texGobba = null;
    var LATO = 0, ENNE = 0, texW = 0, texH = 0, pronto = false, manca = 3;

    function versa(unita, img, filtro) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unita);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }

    function arrivata() {
      if (--manca) return;
      pronto = true;
      misura();
      sveglia();
    }

    function chiedi(nome, poi) {
      var im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = function () { poi(im); arrivata(); };
      im.onerror = function () { arrivata(); };
      im.src = DOVE + nome;
    }

    /* I punti d'arrivo si leggono col texelFetch, cioe' esatti e senza
       interpolazione: sono coordinate, non colori. Per questo NEAREST. */
    chiedi(I.file.punti, function (im) {
      LATO = im.naturalWidth;
      ENNE = LATO * (im.naturalHeight / 2);
      texPunti = versa(0, im, gl.NEAREST);
    });
    chiedi(I.file.solco, function (im) {
      texW = im.naturalWidth; texH = im.naturalHeight;
      texMappa = versa(1, im, gl.LINEAR);
    });
    chiedi(I.file.gobba, function (im) { texGobba = versa(2, im, gl.LINEAR); });

    var res = [0, 0], dpr = 1, schermo = 1.6, mezzo = [0, 0];

    function misura() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = stick.clientWidth, h = stick.clientHeight;
      if (!w || !h) return;
      var L = Math.round(w * dpr), A = Math.round(h * dpr);
      if (L !== res[0] || A !== res[1]) {
        res[0] = L; res[1] = A;
        cv.width = L; cv.height = A;
      }
      schermo = w / h;
      var altezza = I.lastra / 100;
      mezzo[0] = altezza * (1600 / 1387) / schermo / 2;
      mezzo[1] = altezza / 2;
    }

    var lx = 0.5, ly = 0.3, sulMouse = 0, dentroMouse = false, angolo = 0;

    global.addEventListener("pointermove", function (e) {
      if (!pronto) return;
      var w = stick.clientWidth, h = stick.clientHeight;
      if (!w || !h) return;
      var pw = mezzo[0] * 2 * w, ph = mezzo[1] * 2 * h;
      var r = stick.getBoundingClientRect();
      lx = (e.clientX - r.left - (w - pw) / 2) / pw;
      ly = (e.clientY - r.top  - (h - ph) / 2) / pw;
      var asp = ph / pw;
      dentroMouse = (lx > -0.35 && lx < 1.35 && ly > -0.35 * asp && ly < 1.35 * asp);
    }, { passive: true });

    global.addEventListener("blur", function () { dentroMouse = false; });

    function disegna(dt) {
      if (!pronto) return;

      gl.viewport(0, 0, res[0], res[1]);
      gl.clear(gl.COLOR_BUFFER_BIT);

      var posa   = ss(I.posaDa, I.posaA, p);
      var spegni = 1 - ss(I.sostaA, I.spentaA, p);
      if (p < I.posaDa - 0.02 || spegni <= 0.002) return;

      /* 1. la lastra, sotto: l'ombra si appoggia al bianco della dust */
      if (texMappa && texGobba && posa > 0.0005) {
        var giro = (1 - posa) * I.giro * Math.PI / 180;
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(lastra.id);
        gl.uniform2f(lastra.u.uMezzo, mezzo[0], mezzo[1]);
        gl.uniform2f(lastra.u.uCentro, 0.5, 0.5);
        gl.uniform1f(lastra.u.uGiroY, giro);
        gl.uniform1f(lastra.u.uGiroX, -giro * 0.38);
        gl.uniform1f(lastra.u.uSchermo, schermo);
        gl.uniform1f(lastra.u.uFuga, 2.2);
        gl.uniform1f(lastra.u.uZ, (1 - posa) * 0.55);
        gl.uniform1i(lastra.u.uMappa, 1);
        gl.uniform1i(lastra.u.uGobba, 2);

        /* il passo della derivata segue la misura A SCHERMO: se la lastra e'
           piu' piccola della mappa, due texel cadono nello stesso pixel e i
           tratti fini sfarfallano */
        var largoPx = Math.max(1, mezzo[0] * 2 * res[0]);
        var altoPx  = Math.max(1, mezzo[1] * 2 * res[1]);
        var k = Math.max(1, texW / largoPx);
        gl.uniform2f(lastra.u.uTexel, k / texW, k / texH);
        gl.uniform1f(lastra.u.uAspetto, altoPx / largoPx);
        gl.uniform1f(lastra.u.uForza, I.forza);
        gl.uniform1f(lastra.u.uMassa, I.massa);
        gl.uniform1f(lastra.u.uDiffusa, I.ombra);
        gl.uniform1f(lastra.u.uLucida, I.lucida);
        gl.uniform1f(lastra.u.uDurezza, I.durezza);
        gl.uniform1f(lastra.u.uAltezza, I.altezza);
        gl.uniform1f(lastra.u.uRaggio, I.luceRaggio);
        gl.uniform1f(lastra.u.uRivela, -0.02 + posa * 1.14);
        gl.uniform1f(lastra.u.uSpegni, spegni);

        sulMouse += ((dentroMouse ? 1 : 0) - sulMouse) * 0.12;
        angolo += dt * 2 * Math.PI / 18;
        var asp = altoPx / largoPx, rr = 0.44, gi = 0.26 * (1 - sulMouse);
        gl.uniform3f(lastra.u.uLuceA, 0.5 + Math.cos(angolo + Math.PI) * rr,
                                      asp / 2 + Math.sin(angolo + Math.PI) * asp * rr, gi);
        gl.uniform3f(lastra.u.uLuceB, 0.5 + Math.cos(angolo) * rr,
                                      asp / 2 + Math.sin(angolo) * asp * rr, gi);
        gl.uniform3f(lastra.u.uLuceC, lx, ly, sulMouse);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      /* 2. i diamanti, sopra: additivi come quelli della dust, perche' la
            loro luce si DEVE sommare — e' addossandosi che fanno il bianco.
            Il lampo dell'atterraggio si vede anche sulla lastra. */
      if (texPunti && ENNE) {
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(dia.id);
        gl.uniform1i(dia.u.uPunti, 0);
        gl.uniform1i(dia.u.uLato, LATO);
        gl.uniform1f(dia.u.uP, p);
        gl.uniform1f(dia.u.uPosaDa, I.posaDa);
        gl.uniform1f(dia.u.uPosaDur, (I.posaA - I.posaDa) * (1 - I.sfasa));
        gl.uniform1f(dia.u.uSfasa, (I.posaA - I.posaDa) * I.sfasa);
        gl.uniform1f(dia.u.uLiberi, I.liberi);
        gl.uniform1f(dia.u.uTempo, tempo);
        gl.uniform1f(dia.u.uPunto, I.punto * dpr);
        gl.uniform1f(dia.u.uEnne, ENNE);
        gl.uniform1f(dia.u.uBokeh, I.bokeh);
        gl.uniform1f(dia.u.uSpegni, spegni);
        gl.uniform4f(dia.u.uLastra, 0.5 - mezzo[0], 0.5 - mezzo[1], mezzo[0] * 2, mezzo[1] * 2);
        gl.drawArrays(gl.POINTS, 0, ENNE);
      }
    }

    function giro(ora) {
      var dt = t0 ? Math.min((ora - t0) / 1000, 0.05) : 0.016;
      t0 = ora;
      tempo += dt;
      p = progresso();
      disegna(dt);
      if (!visibile) { girando = false; t0 = 0; return; }
      requestAnimationFrame(giro);
    }

    function sveglia() {
      if (!pronto || girando || !visibile) return;
      girando = true; t0 = 0;
      requestAnimationFrame(giro);
    }

    /* Gira solo mentre il binario e' a tiro: fuori non si disegna un
       fotogramma per nessuno. */
    new IntersectionObserver(function (es) {
      visibile = es[0].isIntersecting;
      if (visibile) sveglia();
    }, { rootMargin: "20% 0px" }).observe(pin);

    var rT = null;
    global.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(function () { misura(); sveglia(); }, 150);
    }, { passive: true });

    global.capePatti && capePatti.dichiara("la lastra incisa", {
      scrivo: [[".cape-radura-tela", I.stick, "la tela coi diamanti che si posano e la lastra"]],
      leggo:  [[I.pin, "", "il binario: da li' esce il progresso, lo stesso della dust"],
               ["sostaDa/sostaA", "cape-dust.js", "la pausa dentro cui la lastra entra: se cambiano li', cambiano i tempi qui"]]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", monta, { once: true });
  } else {
    monta();
  }

  global.CapeRadura = { mount: monta };
})(window);
