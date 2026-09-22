/*
 * cape-radura — la radura bianca, i diamanti che si posano, la lastra incisa.
 *
 * E' la seconda meta' della sezione dust, e non e' una sezione a parte: vive
 * DENTRO al pannello incollato della dust, sullo stesso binario, e legge lo
 * stesso progresso. Quello che si vede, in ordine:
 *
 *   1. LA RADURA. Il bianco non copre tutto lo schermo: si apre al centro e
 *      il suo bordo si SBRICIOLA. Non sfuma — una sfumatura larga da nero a
 *      bianco e' una fascia di grigio, e nel cielo di diamanti il grigio non
 *      esiste. Il taglio e' netto e il raggio viene eroso da un rumore a tre
 *      grane: quella che si vede e' una costa frastagliata, e il resto lo
 *      fanno i diamanti che ci volano dentro.
 *
 *   2. I DIAMANTI CHE SI POSANO. Ognuno ha un punto d'arrivo pescato
 *      sull'inchiostro della stampa. Convergono, rallentano, e il lampo che
 *      fanno atterrando e' il loro ultimo atto. Una parte non atterra mai e
 *      resta a scintillare attorno.
 *
 *      IL RIBALTAMENTO. Sul nero un diamante e' luce aggiunta. Sul bianco la
 *      luce aggiunta non esiste — sopra il bianco non c'e' niente — e un
 *      diamante vero su un foglio di carta si vede per lo SPIGOLO SCURO
 *      delle sue facce e per il colore che disperde. Quindi ogni particella
 *      legge quanto e' bianca la carta sotto di se' e ci passa attraverso:
 *      scintilla bianca fuori, granello scuro dentro. E' la stessa legge
 *      della goffratura, ed e' quello che tiene insieme la sezione.
 *
 *      Per questo qui la miscela NON e' additiva come nella dust: additivo
 *      vuol dire che si puo' solo schiarire. Qui serve "sopra" con l'alfa
 *      premoltiplicata, che sa fare tutte e due le cose.
 *
 *   3. LA LASTRA. La stampa goffrata a secco. Compare NELL'ORDINE IN CUI I
 *      DIAMANTI SI POSANO — dal basso in su, perche' una cosa si alza da
 *      terra — quindi non arriva: precipita. Mentre si compone e' girata
 *      nello spazio e torna in faccia man mano che si completa.
 *
 *   4. LA FINE. La lastra svanisce, la radura si allarga fino a mangiare
 *      tutto, e quando e' tutto bianco c'e' gia' la sezione dopo.
 *
 * COSA VUOLE IN PAGINA: niente. Un tag <script> nel footer, dopo cape-dust.
 * Le tre immagini se le prende da sola dalla repo, ricavando l'indirizzo
 * dal proprio <script>: cambiando lo SHA nel tag, seguono anche loro.
 *
 * SOTTO I 992 PX non parte: niente WebGL, niente goffratura. Al suo posto
 * la stampa piatta in nero su bianco, che su un telefono si legge meglio di
 * un rilievo pallido e non costa niente.
 */
(function (global) {
  "use strict";

  /* ——— le manopole ———————————————————————————————————————————————
     Sono tutte qui. Il resto del file non ha numeri suoi.             */

  var I = {
    pin:   ".cape-dust-pin",
    stick: ".cape-dust-stick",

    /* DOVE COMINCIA, sul binario intero. La dust finisce il suo spettacolo
       a 0.64 (glielo dice il suo parametro `coda`): qui si parte prima, a
       0.52, cosi' la radura si apre mentre il campo e' ancora al massimo
       della luce. I due si accavallano di proposito. */
    da:    0.52,

    /* ——— i tempi, misurati sul progresso DI QUESTA parte ——— */
    raduraDa: 0.10, raduraA: 0.30,   /* si apre */
    largaDa:  0.30, largaA:  0.60,   /* si allarga per far posto alla lastra */
    posaDa:   0.30, posaA:   0.62,   /* i diamanti atterrano e compongono */
    sostaA:   0.80,                  /* fin qui la lastra resta */
    fineA:    0.92,                  /* qui il bianco e' pieno: l'ultimo tratto
                                        del binario e' carta ferma, ed e' li'
                                        che lo studio-hero entra senza stacco */
    sfasa:    0.55,                  /* quanta parte della finestra d'atterraggio
                                        separa il primo diamante dall'ultimo:
                                        e' questo che fa salire la lastra da
                                        terra invece di farla apparire */

    /* ——— la radura ——— */
    raggio:   0.40,   /* quanto si apre, in altezze di schermo */
    raggioFine: 1.90, /* alla fine: abbastanza da coprire anche gli angoli di
                         uno schermo largo, con margine */
    liberi:   0.22,   /* quota di diamanti che non atterra mai */

    /* ——— i diamanti ——— */
    punto:    1.9,    /* lato del punto in px css: piccoli, come nella dust */
    bokeh:    3.4,    /* di quante volte si allarga uno del tutto fuori fuoco */

    /* ——— la lastra ——— */
    lastra:   78,     /* altezza in vh */
    giro:     34,     /* di quanti gradi e' girata quando comincia a comporsi */
    massa:    2.6,    /* volume della goffratura */
    ombra:    0.62,   /* quanto scurisce la luce radente */
    lucida:   0.34,   /* il riflesso, che lo tiene solo il solco */
    forza:    6.5,    /* quanto sono ripide le pareti */
    durezza:  28.0,
    altezza:  0.30,
    luceRaggio: 0.85,

    /* Sopra questa tela non c'e' un elemento da cui il cursore possa
       leggere il colore: c'e' una simulazione. Glielo diciamo noi, ed e'
       lo stesso accordo che aveva la dust — che con la coda accesa ha
       smesso apposta di occuparsene, perche' il suo progresso satura molto
       prima e direbbe "chiaro" mentre lo schermo e' ancora nero. */
    cursore:    "#capecur",
    cursoreVar: "--cc",
    suScuro:    "#ffffff",
    suBianco:   "#141416",

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

  /* La radura, scritta una volta e incollata in tutti gli shader che la
     usano. Il fondo la disegna, ogni diamante la legge per sapere se sotto
     di lui c'e' carta o cielo. */
  var RADURA = [
    "uniform float uRaggio, uMorbido, uEroso, uAspetto;",
    "float tritaV(vec2 i){ return fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453); }",
    "float rumore(vec2 q){",
    "  vec2 i = floor(q), f = fract(q);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(tritaV(i), tritaV(i + vec2(1.0, 0.0)), f.x),",
    "             mix(tritaV(i + vec2(0.0, 1.0)), tritaV(i + vec2(1.0, 1.0)), f.x), f.y);",
    "}",
    "float radura(vec2 u){",
    "  vec2 d = (u - 0.5) * vec2(uAspetto, 1.0);",
    "  float r = length(d);",
    "  float a = atan(d.y, d.x);",
    "  float rr = uRaggio * (1.0 + 0.05 * sin(a * 7.0 + 1.3) + 0.03 * sin(a * 13.0 - 2.1));",
    "  float n = rumore(u * 23.0) * 0.55 + rumore(u * 57.0) * 0.30 + rumore(u * 131.0) * 0.15;",
    "  r += (n - 0.5) * uEroso;",
    "  return (1.0 - smoothstep(rr - uMorbido, rr + uMorbido, r)) * step(0.0005, uRaggio);",
    "}"
  ].join("\n");

  /* ——— il fondo: trasparente fuori, carta dentro ————————————————————
     Non dipinge il nero: sotto c'e' gia' la tela della dust col suo cielo.
     Dipinge SOLO la carta, e dove la carta c'e' copre quello che sta sotto. */
  var VS_QUAD = HEAD + [
    "out vec2 vUv;",
    "void main(){",
    "  vec2 q = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));",
    "  vUv = q;",
    "  gl_Position = vec4(q * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FS_FONDO = HEAD + [
    "in vec2 vUv;",
    "out vec4 oCol;",
    RADURA,
    "void main(){",
    "  float w = radura(vUv);",
    "  oCol = vec4(vec3(w), w);",
    "}"
  ].join("\n");

  /* ——— i diamanti ——————————————————————————————————————————————————
     Tutto da gl_VertexID: il punto d'arrivo da una texture, il resto da dei
     tritatutto. Niente stato accumulato, quindi scorrendo all'indietro la
     scena si ricompone esatta.

     GRANDEZZE. La luminosita' segue una legge di potenza: quasi tutti
     fiochi, pochissimi di prima grandezza. Un campo in cui tutti i punti
     pesano uguale si legge come disturbo, non come cielo.

     PROFONDITA'. Ogni diamante sta a una quota e il piano a fuoco e' uno
     solo: chi ne sta lontano si allarga e si spegne in proporzione — stessa
     energia, piu' area. E' lo stacco fra i pochi nitidi e i molti impastati
     a fare l'ottica da gioielliere. Posandosi torna a fuoco, perche' e'
     arrivato sulla lastra.                                                */
  var VS_DIA = HEAD + [
    "uniform sampler2D uPunti;",
    "uniform int   uLato;",
    "uniform float uP, uPosaDa, uPosaDur, uSfasa, uLiberi, uTempo, uPunto, uEnne, uBokeh;",
    "uniform vec4  uLastra;",
    "out float vLum, vBianco, vSfuoco, vScocca;",
    RADURA,
    "float trita(float n){ return fract(sin(n * 12.9898) * 43758.5453); }",
    "void main(){",
    "  int i = gl_VertexID;",
    "  ivec2 c = ivec2(i % uLato, i / uLato);",
    /* due righe per particella: sopra la x, sotto la y, sedici bit ciascuna */
    "  vec3 a = texelFetch(uPunti, c, 0).rgb;",
    "  vec3 b = texelFetch(uPunti, ivec2(c.x, c.y + uLato), 0).rgb;",
    "  vec2 arrivo = vec2(a.r * 256.0 + a.g, b.r * 256.0 + b.g) * 255.0 / 65535.0;",
    "",
    "  float fi = float(i);",
    "  float h1 = trita(fi * 0.0131 + 0.71), h2 = trita(fi * 0.0177 + 3.13);",
    "  float h3 = trita(fi * 0.0219 + 7.77), h4 = trita(fi * 0.0263 + 11.9);",
    "",
    /* da dove viene: una nuvola piu' fitta al centro, non un tappeto */
    "  float ang = h1 * 6.2831;",
    "  float ray = pow(h2, 0.62) * 1.15;",
    "  vec2 S = vec2(0.5 + cos(ang) * ray * 0.62, 0.5 + sin(ang) * ray * 0.62);",
    "  float z = h3;",
    "  S += vec2(sin(uTempo * 0.10 + h1 * 6.2831), cos(uTempo * 0.08 + h1 * 6.2831)) * 0.010 * (0.5 + z);",
    "",
    "  vec2 D = uLastra.xy + vec2(arrivo.x, 1.0 - arrivo.y) * uLastra.zw;",
    "",
    /* quando: sfasato per rango, cosi' la lastra si compone dal basso */
    "  float rango = fi / uEnne;",
    "  float q = clamp((uP - uPosaDa - rango * uSfasa) / uPosaDur, 0.0, 1.0);",
    "  float libero = step(h4, uLiberi);",
    "  q *= (1.0 - libero);",
    "  float e = 1.0 - pow(1.0 - q, 3.0);",
    "  vec2 P = mix(S, D, e);",
    "  vBianco = radura(P);",
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
    "  vLum = (base + vScocca * 1.5) * morte / (area * area);",
    "  gl_PointSize = uPunto * (1.0 + grande * 2.2) * area * (1.0 + vScocca * 3.2);",
    "  gl_Position = vec4(P * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FS_DIA = HEAD + [
    "in float vLum, vBianco, vSfuoco, vScocca;",
    "out vec4 oCol;",
    "void main(){",
    "  vec2 c = gl_PointCoord * 2.0 - 1.0;",
    "  float r = length(c);",
    "  float cuore = exp(-r * r * 7.5);",
    "  float disco = smoothstep(1.0, 0.72, r) * 0.42;",
    "  float forma = mix(cuore, disco, vSfuoco);",
    /* la croce solo sul lampo: su ogni puntino sarebbe una decorazione, su
       uno che in quell'istante sta scoccando e' un riflesso */
    "  float croce = (max(0.0, 1.0 - abs(c.x) * 6.0) * exp(-abs(c.y) * 5.0)",
    "               + max(0.0, 1.0 - abs(c.y) * 6.0) * exp(-abs(c.x) * 5.0))",
    "               * vScocca * (1.0 - vSfuoco) * 0.5;",
    "  float a = clamp((forma + croce) * vLum, 0.0, 1.0);",
    "  vec3 col = mix(vec3(1.0), vec3(0.05, 0.05, 0.07), vBianco);",
    "  col = mix(col, col * vec3(1.05, 0.96, 0.88), vBianco * 0.55);",
    "  oCol = vec4(col * a, a);",
    "}"
  ].join("\n");

  /* ——— la lastra ————————————————————————————————————————————————————
     La rotazione sta nello shader e non in CSS, perche' il rettangolo dove
     cadono i diamanti va misurato PIATTO: una cosa che ruota cambia misura a
     ogni fotogramma e i diamanti inseguirebbero un bersaglio che si muove. */
  var VS_LASTRA = HEAD + [
    "uniform vec2  uMezzo;",     /* mezza larghezza e mezza altezza, in unita' di schermo */
    "uniform vec2  uCentro;",
    "uniform float uGiroY, uGiroX, uFuga, uZ, uSchermo;",
    "out vec2 vUv;",
    "void main(){",
    "  vec2 q = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1));",
    "  vUv = q;",
    /* SI RUOTA IN ALTEZZE DI SCHERMO, tutte e tre le assi nella stessa
       unita'. La x arriva come frazione della larghezza: se la si ruota
       cosi' com'e', mescolandola alla z, la lastra si deforma invece di
       girare. Si converte prima, si riconverte dopo. */
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
    /* il riflesso lo tiene SOLO il solco: su una gobba larga un riflesso
       largo sembra plastica bagnata, sulle incisioni sottili sembra gesso */
    "  vec3 np = normalize(vec3(ps, 1.0));",
    "  float d = luce(n, np, pos, uLuceA) + luce(n, np, pos, uLuceB) + luce(n, np, pos, uLuceC);",
    /* Sulla carta bianca piena la luce puo' solo fare OMBRA: sopra il bianco
       non c'e' niente da schiarire. E' la stessa legge dei diamanti dentro
       la radura, ed e' anche quello che toglie il rettangolo — dipingendo
       anche il bianco si vedrebbe il riquadro della lastra sulla pagina. */
    "  float a = clamp(-d, 0.0, 1.0);",
    /* compare nell'ordine in cui i diamanti si posano: dal basso in su */
    "  a *= 1.0 - smoothstep(uRivela - 0.10, uRivela + 0.02, 1.0 - uv.y);",
    "  a *= uSpegni;",
    "  oCol = vec4(0.0, 0.0, 0.0, a);",
    "}"
  ].join("\n");

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
    var cursore = document.querySelector(I.cursore);
    var p = 0, pr = 0, tempo = 0, t0 = 0, girando = false, visibile = false;

    /* ——— il ripiego: sotto i 992 px, la stampa piatta ———
       Non e' una resa graziosa, e' la scelta giusta: senza puntatore la
       goffratura non si puo' scoprire, e un rilievo pallido su un telefono
       si legge peggio di una stampa nera. */
    function ripiego() {
      var velo = document.createElement("div");
      velo.className = "cape-radura-velo";
      velo.setAttribute("aria-hidden", "true");
      var im = document.createElement("img");
      im.className = "cape-radura-piatta";
      im.alt = "";
      im.decoding = "async";
      im.src = DOVE + I.file.piatta;
      velo.appendChild(im);
      stick.appendChild(velo);

      function passo() {
        var r = pin.getBoundingClientRect();
        var corsa = pin.offsetHeight - global.innerHeight;
        var g = corsa > 0 ? clamp(-r.top / corsa, 0, 1) : (r.top <= 0 ? 1 : 0);
        var q = clamp((g - I.da) / (1 - I.da), 0, 1);
        velo.style.opacity = ss(I.raduraDa, I.raduraA, q).toFixed(3);
        im.style.opacity = (ss(I.posaDa, I.posaA, q) * (1 - ss(I.sostaA, 0.95, q))).toFixed(3);
        requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
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

    var fondo  = programma(gl, VS_QUAD, FS_FONDO, ["uRaggio", "uMorbido", "uEroso", "uAspetto"]);
    var dia    = programma(gl, VS_DIA, FS_DIA,
      ["uPunti", "uLato", "uP", "uPosaDa", "uPosaDur", "uSfasa", "uLiberi", "uTempo",
       "uPunto", "uEnne", "uBokeh", "uLastra", "uRaggio", "uMorbido", "uEroso", "uAspetto"]);
    var lastra = programma(gl, VS_LASTRA, FS_LASTRA,
      ["uMezzo", "uCentro", "uGiroY", "uGiroX", "uFuga", "uZ", "uSchermo",
       "uMappa", "uGobba", "uTexel", "uLuceA", "uLuceB", "uLuceC",
       "uAspetto", "uForza", "uMassa", "uDiffusa", "uLucida", "uDurezza",
       "uAltezza", "uRaggio", "uRivela", "uSpegni"]);

    if (!fondo || !dia || !lastra) return ripiego();

    stick.appendChild(cv);

    /* Un VAO vuoto: in WebGL2 si disegna da gl_VertexID e non serve nessun
       buffer, ma un VAO va legato lo stesso o alcuni driver si lamentano. */
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    /* ——— le tre immagini ——— */
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

    /* I punti d'arrivo si leggono col texelFetch, cioe' esatti, senza
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

    /* ——— la misura ——— */
    var res = [0, 0], dpr = 1, aspetto = 1.6, mezzo = [0, 0];

    function misura() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = stick.clientWidth, h = stick.clientHeight;
      if (!w || !h) return;
      var L = Math.round(w * dpr), A = Math.round(h * dpr);
      if (L !== res[0] || A !== res[1]) {
        res[0] = L; res[1] = A;
        cv.width = L; cv.height = A;
      }
      aspetto = w / h;
      /* la lastra: altezza in vh, larghezza per proporzione, tutto in unita'
         di schermo (1 = tutta la larghezza, 1 = tutta l'altezza) */
      var altezza = I.lastra / 100;
      var larghezza = altezza * (1600 / 1387) / aspetto;
      mezzo[0] = larghezza / 2; mezzo[1] = altezza / 2;
    }

    /* ——— le luci sulla lastra ——— */
    var lx = 0.5, ly = 0.3, sulMouse = 0, dentroMouse = false, angolo = 0;

    global.addEventListener("pointermove", function (e) {
      if (!pronto) return;
      var w = stick.clientWidth, h = stick.clientHeight;
      if (!w || !h) return;
      var pw = mezzo[0] * 2 * w, ph = mezzo[1] * 2 * h;
      var sx = (w - pw) / 2, sy = (h - ph) / 2;
      var r = stick.getBoundingClientRect();
      lx = (e.clientX - r.left - sx) / pw;
      ly = (e.clientY - r.top - sy) / pw;
      var asp = ph / pw;
      dentroMouse = (lx > -0.35 && lx < 1.35 && ly > -0.35 * asp && ly < 1.35 * asp);
    }, { passive: true });

    global.addEventListener("blur", function () { dentroMouse = false; });

    /* ——— il disegno ——— */
    function disegna(dt) {
      if (!pronto) return;

      var raggio = I.raggio * 0.55 * ss(I.raduraDa, I.raduraA, pr)
                 + I.raggio * 0.45 * ss(I.largaDa, I.largaA, pr)
                 + (I.raggioFine - I.raggio) * ss(I.sostaA, I.fineA, pr);
      /* netto il taglio, largo lo sbriciolamento: il contrario di una
         sfumatura, che darebbe una fascia di grigio */
      var morbido = 0.010 + raggio * 0.018;
      var eroso   = 0.055 + raggio * 0.115;

      gl.viewport(0, 0, res[0], res[1]);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (raggio <= 0.0005 && pr <= 0) return;

      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      /* 1. la carta */
      gl.useProgram(fondo.id);
      gl.uniform1f(fondo.u.uRaggio, raggio);
      gl.uniform1f(fondo.u.uMorbido, morbido);
      gl.uniform1f(fondo.u.uEroso, eroso);
      gl.uniform1f(fondo.u.uAspetto, aspetto);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      /* 2. la lastra */
      var posa   = ss(I.posaDa, I.posaA, pr);
      var spegni = 1 - ss(I.sostaA, I.sostaA + 0.13, pr);
      if (texMappa && texGobba && spegni > 0.002 && posa > 0.0005) {
        var giro = (1 - posa) * I.giro * Math.PI / 180;
        gl.useProgram(lastra.id);
        gl.uniform2f(lastra.u.uMezzo, mezzo[0], mezzo[1]);
        gl.uniform2f(lastra.u.uCentro, 0.5, 0.5);
        gl.uniform1f(lastra.u.uGiroY, giro);
        gl.uniform1f(lastra.u.uGiroX, -giro * 0.38);
        gl.uniform1f(lastra.u.uSchermo, aspetto);
        gl.uniform1f(lastra.u.uFuga, 2.2);
        gl.uniform1f(lastra.u.uZ, (1 - posa) * 0.55);
        gl.uniform1i(lastra.u.uMappa, 1);
        gl.uniform1i(lastra.u.uGobba, 2);

        /* il passo della derivata segue la misura A SCHERMO: se la lastra e'
           piu' piccola della mappa, due texel cadono nello stesso pixel e i
           tratti fini sfarfallano */
        var largoPx = Math.max(1, mezzo[0] * 2 * res[0]);
        var k = Math.max(1, texW / largoPx);
        gl.uniform2f(lastra.u.uTexel, k / texW, k / texH);
        gl.uniform1f(lastra.u.uAspetto, (mezzo[1] * res[1]) / Math.max(1, mezzo[0] * res[0]));
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
        var asp = (mezzo[1] * res[1]) / Math.max(1, mezzo[0] * res[0]);
        var cx = 0.5, cy = asp / 2, rr = 0.44, gi = 0.26 * (1 - sulMouse);
        gl.uniform3f(lastra.u.uLuceA, cx + Math.cos(angolo + Math.PI) * rr,
                                      cy + Math.sin(angolo + Math.PI) * asp * rr, gi);
        gl.uniform3f(lastra.u.uLuceB, cx + Math.cos(angolo) * rr,
                                      cy + Math.sin(angolo) * asp * rr, gi);
        gl.uniform3f(lastra.u.uLuceC, lx, ly, sulMouse);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      /* 3. i diamanti, sopra a tutto: il lampo dell'atterraggio deve vedersi
            anche sulla lastra */
      if (texPunti && ENNE) {
        gl.useProgram(dia.id);
        gl.uniform1i(dia.u.uPunti, 0);
        gl.uniform1i(dia.u.uLato, LATO);
        gl.uniform1f(dia.u.uP, pr);
        gl.uniform1f(dia.u.uPosaDa, I.posaDa);
        gl.uniform1f(dia.u.uPosaDur, (I.posaA - I.posaDa) * (1 - I.sfasa));
        gl.uniform1f(dia.u.uSfasa, (I.posaA - I.posaDa) * I.sfasa);
        gl.uniform1f(dia.u.uLiberi, I.liberi);
        gl.uniform1f(dia.u.uTempo, tempo);
        gl.uniform1f(dia.u.uPunto, I.punto * dpr);
        gl.uniform1f(dia.u.uEnne, ENNE);
        gl.uniform1f(dia.u.uBokeh, I.bokeh);
        gl.uniform4f(dia.u.uLastra, 0.5 - mezzo[0], 0.5 - mezzo[1], mezzo[0] * 2, mezzo[1] * 2);
        gl.uniform1f(dia.u.uRaggio, raggio);
        gl.uniform1f(dia.u.uMorbido, morbido);
        gl.uniform1f(dia.u.uEroso, eroso);
        gl.uniform1f(dia.u.uAspetto, aspetto);
        gl.drawArrays(gl.POINTS, 0, ENNE);
      }
    }

    /* ——— il ciclo ——— */
    var statoChiaro = null;

    function stato() {
      var r = pin.getBoundingClientRect();
      var corsa = pin.offsetHeight - global.innerHeight;
      p = corsa > 0 ? clamp(-r.top / corsa, 0, 1) : (r.top <= 0 ? 1 : 0);
      pr = clamp((p - I.da) / (1 - I.da), 0, 1);

      /* La barra in alto legge il colore sotto di se'. Qui sotto non c'e'
         niente di opaco da leggere: glielo diciamo noi, e il momento in cui
         cambia e' quando la carta arriva a coprire il centro. */
      var chiaro = ss(I.raduraDa, I.raduraA, pr) > 0.5;
      if (chiaro !== statoChiaro) {
        statoChiaro = chiaro;
        stick.setAttribute("data-hdr", chiaro ? "light" : "dark");
        if (cursore) cursore.style.setProperty(I.cursoreVar, chiaro ? I.suBianco : I.suScuro);
      }
    }

    function giro(ora) {
      var dt = t0 ? Math.min((ora - t0) / 1000, 0.05) : 0.016;
      t0 = ora;
      tempo += dt;
      stato();
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

    global.capePatti && capePatti.dichiara("la radura", {
      scrivo: [[".cape-radura-tela", I.stick, "la tela con la carta, i diamanti e la lastra"],
               ["data-hdr", I.stick, "dice alla barra se sotto c'e' il nero o la carta"],
               [I.cursoreVar, I.cursore, "il colore del cursore sopra la simulazione"]],
      leggo:  [[I.pin, "", "il binario: da li' esce il progresso, lo stesso della dust"]]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", monta, { once: true });
  } else {
    monta();
  }

  global.CapeRadura = { mount: monta };
})(window);
