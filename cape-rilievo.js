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

  var AUTO_FORZA = 0.28; /* quanto valgono rispetto al puntatore. Basso
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
    milano: [["v",0,"M484 502l15-8M498 511l-1 12M527 474l-4 5l-11 10M531 492l-4 27M496 527l0 11M466 486l6 6M526 520l-1 9M466 521l6 6M523 542l-24-2l-3-2M552 509l-21-17M464 521l-6-8M534 517l8-5l5 0M537 477l1-3l-4 1M448 504l16-21l7-13M524 542l1-9M476 539l5 4l8 0M515 546l-12-2M461 526l15 13M531 464l-8-4M510 457l-24 1l-6-2l-4 1M471 467l3-9M456 514l-2-4l-5-3M465 539l10 0M516 456l-12-12M532 466l12 0M533 544l-9-1M459 525l-11-11l-4-1"],["v",1,"M492 446l6 0l6-2M481 444l-6 12M491 446l-9-2M519 559l4-12M474 456l-8-10M559 501l-3 5M517 438l4 15M447 519l2 12M451 537l9 1M534 545l8 0M562 518l-9-9M499 439l-6 3M516 438l-8 2M554 474l3-1l2 3M443 502l-10-11M523 459l7 0l2-2l29-40M499 438l-3-4l-5 0M507 439l1-8M475 434l6 7M567 552l-29-1l-14-5M501 438l2-6l4-1M473 458l-30 0l-11-1M573 480l-11 17M463 445l-18 2M511 419l6 15l0 4M573 478l-3-2l-10 0M443 513l-26 12"],["v",2,"M563 519l4 25M548 545l18 0M489 598l5-50M508 431l0-3l-2-7M427 477l-3 8l7 7M514 589l5-25M445 447l-9 0M574 478l3-4l2 2M427 457l-6 26M563 518l38-7M564 459l6-3l5-11M444 437l5-4M567 521l23 21M463 444l-24-27M506 419l4-8M582 464l-3 7M427 455l1-8M538 582l-6 0l-5 3M518 588l7-2M590 543l-3 2l-20-1M568 552l4 17M438 586l2-29M542 581l11 1M574 479l37 0M498 597l8-3M429 446l5-23l3-6M569 551l22 0l3-4"],["v",3,"M553 580l9 1M579 440l5 8M509 405l2-10M602 512l-11 30M574 433l-13-16M471 596l-7 1M428 447l-8-4l-24-2M397 569l42-13M566 579l7 0M459 596l-8 0M426 456l-42-4M381 542l36-16M605 507l7-18M527 585l1 52M449 407l7-8l1-7l-9-10M589 579l-7-1M486 636l3-37M382 520l1-26M474 387l-5-5M418 591l10 1M603 406l-24 32M459 624l2-21M384 456l-1 35M608 441l0 6M589 578l9 0M385 445l10-4M442 636l0-22l-3-17l-1-3"],["v",4,"M523 366l-9 18M506 595l4 65M397 574l-5-3M501 376l2-10M377 449l7 3M649 532l-41-23M607 418l-1 11M401 599l10-3l6-5M360 492l23-37M401 410l3-2l0-4M498 378l2-25M600 577l23-1M524 366l13 2M508 362l15 4M601 402l-20-13M606 414l1-5l-3-3M496 381l-8-27l-6-12M555 369l-14-5M486 637l0 11M359 453l4 1l9-3M359 492l-4-11M572 371l-3 5M532 351l-1 12l10 1M534 638l5 4M524 366l4-18M569 379l8-12M629 573l-1-2l3-3"],["v",5,"M587 389l7-11M589 674l-7-54l-8-39M613 391l-7 11M349 466l5 13M344 584l48-13M571 362l-3-1l0 3M596 378l5 4M485 652l-1 6M543 346l-5 5l-5 0M344 451l15 2M616 418l31-5M459 344l-8 3l-19 17M559 354l-6-4M500 350l3-17M472 343l4 1l5-2M408 638l22-1M472 343l-12 1M659 451l-1 29M478 336l8 4M544 344l-1-6M571 362l6-6l5-13M653 442l5 0l1 5M659 503l2 4l6 2l11 1M610 356l-15 22M452 331l7 13M368 385l0 20M342 442l-1-6"],["v",6,"M582 343l-13 1l-5-2l-2 2M629 368l-15 22M543 337l2-9M472 343l-10-18l0-3M387 638l15 0M332 372l52 56M659 481l28 0M647 541l25 15l15-3M343 450l-23-2M484 682l-1-11M658 411l-9 2M371 381l0-9M441 664l18 16M549 659l12 25M363 615l17 21M304 483l23-18l11-5M354 606l-4-5l-1-4M433 679l5-7l0-16M584 342l9 0M495 314l6 6l3 1M583 342l4-7M319 448l17-17M363 360l7 7l-2 18M593 338l-5-3M639 374l-9-7M403 334l6 6M346 620l13-6"],["v",7,"M542 312l1 7M507 314l12-4l23 1M666 605l-22 11M594 329l-1 9M688 480l0-31M592 327l-3 1l-2 6M304 486l7 0M690 548l-2-1l1-29M621 342l-6 7M479 303l9 5M426 685l6-6M312 453l-5 7M428 687l5-8M650 363l-9 11M634 361l5-7M566 692l-4-4l0-2M334 422l-24-26M639 354l-17-12M608 337l15-3M711 519l-22-1M303 557l6-3M648 361l-8-7M621 341l3-6M715 426l-28 0l-29-15M433 697l2-5l-2-2M687 553l24-10M517 278l-10 35"],["v",8,"M461 298l6-1M413 319l-22 0M595 319l-2-6M339 623l-11 4M676 600l10-6l2 1l0 5M329 376l0 6M640 354l8-14M378 329l4-4M327 627l10 11l7 1M304 486l-33 11M604 308l-5 7M588 307l5-5M280 518l14 32M303 447l-26-3M637 320l-12 14M657 344l-8-4M693 593l20-3M601 305l-1-3l5-5M712 571l0 6M589 674l12 59M277 510l-4-9M641 332l9-1l5-3M331 371l-5-5l-2-13l-6-11M671 341l-13-1l-1 4M716 433l0-7M656 328l0 3l-7 8M389 313l-12-15"],["v",9,"M520 268l-2 8M282 434l-5-5M623 301l0 3l-2 3M714 405l0 8l1 3l2-1M344 328l5-5M264 476l7 21M363 309l-5 5M715 592l6 3M558 270l-10-3M349 322l-6-8M518 259l3 6M467 262l9 1M522 259l-1 6M742 434l-15 8l-1 4M465 264l-7-1M384 290l5-4M676 331l0 7M744 425l-28 1M653 295l-15 23M583 734l-9-8M271 497l-32 12M395 279l5-5M747 537l1-18M384 269l-18 18l10 10M601 292l13-17l4-15M635 291l2-3l-3-2M736 588l1 6l-1 0"],["v",10,"M676 330l0-9l10-12M340 311l-9-9M263 576l-10 4M516 254l9-2l6-18M426 253l-10 8l1 1M748 518l14-6M631 282l3-6M714 330l-38 1M745 425l3-1l0-3M599 744l3-5l-1-6M244 430l10 6M515 254l-14-28M453 263l-8-17l-14-17M655 285l-1 7M236 502l2 7M269 366l4 1l6-1M750 434l11-1M531 234l7 3M249 582l-8 4M391 741l-7 7M658 277l-1-3l-8 2l6 9M743 626l-1-11M252 628l12-11M687 306l-3-7l2-1M738 646l-2-7M252 627l-6-23M238 509l-31 12"],["v",11,"M713 311l1 18M256 637l-4-9M239 426l-15-13M739 330l-24 0M654 256l1 2l-3 3l2 3l-1 2M690 293l5-5M713 292l-14 4l-11 10M754 366l2 11M784 426l-5 5l-13 2M712 310l-7-1l-1-10l8 1l0 9M206 521l2 9l13 18l5 18l11 21M254 639l-7 7M499 222l-10-19M749 357l3 0l1 5M621 244l5-11M210 491l2 6M233 389l0-7M536 189l-5 13l3 20l-3 12M213 499l0 4l-9 6l2 11M743 339l6 8M750 353l6 2M740 331l3 7M214 426l5-7M317 238l22 48M714 293l1 9M754 662l-11-5M720 299l-1 2l-4 1"],["v",12,"M272 319l1-17M210 491l-13-34M212 598l9-5M761 354l4 1l1-3l-3-1l-2 2M217 609l2-2l0-3l-2 0M747 330l7 0M709 277l5 8M701 268l-7-4M237 686l14-7l3-2l0-2M197 457l-8-22l4-4l8-3l5 1M718 289l11-8M760 666l2-8l2-4l31-16M232 374l-11-26l0-11M541 188l-2 3l-1-4M781 585l1 2l3-3l34-2l5-4l3-5M747 329l-1-32l-6-26M232 393l-38-1l-18-8M317 238l14-9M249 259l22 13l5 5l-1 1M756 331l42-5M317 238l-6-11M731 278l8-7M617 153l-15 40l-16 29M660 211l0 7M538 186l5-22M276 263l1-4l-4-2M319 213l9 12"],["v",13,"M488 201l-32-66M494 169l-2-7M272 319l-6-3l-16-22l-9-9l-37-11l-15-9M659 208l-1-6M659 190l4 11l-1 10M788 687l-5 2l-1-2M401 824l-4 9M153 541l8-4M636 186l3-9M157 498l-9 1M237 687l-13 5l-19-5l-32 12M393 156l23 12l16-1M656 180l2 18M363 181l18-13M801 698l-13-11M789 686l19 9M179 658l-5-5l-7-14M722 785l-6 6M854 409l-7 0M161 626l-3-6M704 799l8-5M302 192l-4 4l1 2l5 0l2-4M606 153l11-1M236 251l-4-5M543 164l1-4l-1-24l4-8l1-40M687 814l6 5M608 146l10 5"],["v",14,"M809 323l30-2M307 176l2 15M811 711l-6-8M647 163l4-6M818 695l4-9M757 222l-5 5M324 171l-17 4M644 137l-1 7l2 13l-2 2l-4 0l-21-8M831 379l30-10l7-5M456 133l-7-15M873 408l-7 4M297 174l9 1M273 194l-2 0l-5-3M236 221l-2 0l-3 2M667 153l10 1M392 146l-5-14l-19-19M874 408l8 1M154 373l-25-12l-7-2M264 193l-6-3M821 724l1-1l-4-3M266 191l-7-2M343 857l-9-4l-3 0M692 157l-14-3M812 728l7 8M763 215l5-6M318 849l9-1M154 687l-2 2l5 12l11-1"],["v",15,"M261 817l0-8M862 331l-9 3M879 593l12-2M618 150l20-50M706 154l-13 3M337 873l6-15M665 140l6-8M182 218l46 16M659 134l5-7M247 183l1 0l-1 3l3 1M302 192l-18-5l-4-4l-14-12l-16-19l-22-20M102 529l-13-4M864 321l1-2l-5-5l0-2M706 154l12-2M604 104l4 7M96 521l-7 4M217 798l-1-7M259 174l-7-5M239 181l4 2l2-2M498 74l1 10l-2 2l-18 5l-24 21M831 748l5-5l-5-6M828 732l31-25l9 4M908 408l-5 0l-3 1M367 110l-21 2M239 181l-6-4M547 87l-1-4l2 1l0 3M871 299l-8 5"],["v",16,"M97 350l24 8M86 529l-5 7M663 116l4 0l1-3M297 126l35-7l9-5M908 413l2-1l4 1M816 778l-5 4M268 849l1 4l3 1M592 81l10 20M721 152l-3-26M931 489l-8-5l-7-1M693 157l13-62M543 76l7 1M229 174l-6 0l1-2M897 336l-6-4M584 82l7-1M890 692l-21 19M273 131l1 2l23-7M217 168l18-2M250 150l-1-3l3-2M588 72l4 8M506 67l-8-2M882 298l5 0l1-1M861 259l0-6M929 403l-6-1M648 77l-7 17M189 264l-31-19l-29-26l-10-6M429 63l-4 4l1 2"],["v",17,"M924 384l2 2l6-2M551 63l0-6M209 167l-2-3l-6 1M904 293l-15 6M705 94l-18 4l-7-1M94 349l-13-5l-15-7M71 676l21-11M552 49l0-9M828 172l-7 8M947 379l-7 0M38 522l2-2l5 3M348 53l1 13M145 204l-11-3M938 767l-25-20l-17-19l-27-17M270 83l3 5l4 0l3 4M594 36l-15 0M936 733l-7-1l-8-5l-30-35M31 418l5-5l-3-4M920 286l8-4M894 807l-17-27l-6-7M102 242l0-5l-1-1M743 72l-26 19M97 241l-2 8M871 803l-7 6M685 62l6 1l2-5M841 166l-2-1l2-4M708 88l3-17l-3-21"],["v",18,"M219 118l-4-7M302 59l4 7M61 334l-18-10M574 17l2 16M861 181l0-2l-2 2l1 2l1-1M939 708l-7 1M984 544l-6 5M112 196l1-2l6 4l9 1l1 5l-3 3M107 209l1 8l-5 12M113 212l-5-3M649 32l-27 2M862 182l14 0M856 828l3 5M17 541l-6 6M868 158l-12-3l-10 1l-14 11M27 513l-16 0l-4-2l-2 2l-4-1M969 379l12 1M661 38l-7-5M976 393l5-4M18 394l5 4M345 28l1 10M63 720l-5 4M943 276l-3 2l-2 0M974 634l1 8M858 162l8 1M9 508l-4-3l-4-9M735 72l11-10"],["v",19,"M408 19l-2-13M994 483l5-14M57 724l-3 3l2 4M878 179l0-14M711 42l-4 5M894 807l10-6M977 649l0 19M107 192l-5 1l-3-2l-1 1M873 159l3 2l1 2M94 186l13 6M973 696l-1-12l4-14M939 734l8-1l25-7M754 63l5-4M717 43l1-6M651 32l12-31M879 153l-6 5M968 268l-22 8M938 767l-9 12M342 16l-3-5M39 737l-7 5M983 724l-6-11l-3-16M792 33l-29 24l0 7l17 1M16 297l0 11M999 698l-11 2l-14-4M279 26l-5-5M738 0l-16 25l-4 9l1 2M10 316l-6-2"],["v",20,"M76 184l-3-6M237 20l4 11l8 9l1 5M776 21l-23 31M974 267l23-5M278 5l25-4M24 235l3 11M270 12l-1 1l-1-2l-2-4M15 761l5-4l4-9M799 38l17 11l1 2l-1 2M167 65l-6-2M866 110l7-37M776 21l16 11M841 62l-1-6M223 1l5 11l4 4l5 0M11 768l-3-4l-2 0M147 59l12 5M2 762l6-5M845 71l1 1l26-4l1-3M71 138l3-5l3-1M83 127l1-8M73 128l8 3M56 158l-4-5M923 122l-6 5M171 29l9 17M896 138l8 0l32 5l19 1l44-7M784 9l4-7M926 99l-15 21"],["v",21,"M86 109l0-8M142 57l-4-9M908 99l17-1M877 66l-3-3l7-9M137 43l2 3l-2 1M156 31l8-9M887 46l-1 3l-3 2M992 161l-6 1M27 126l8 3M939 82l18-23M933 58l5-9M9 109l4-8M18 90l-2 6M914 25l-1-11M999 80l-2-2l-6 0M979 33l-21 24"],["a",0,"M466 521l18-19M531 479l0-7M522 461l3 5M496 543l6 1M522 459l-6-2M555 478l-12 11l-11-3M451 534l8-8"],["a",1,"M482 441l8-7M450 538l-2 6M444 509l-22-21M491 433l8-9M506 594l7-5M573 579l-1-8M448 407l-9 9"],["a",2,"M607 509l-13 34M607 508l9-16l0-9M561 417l-2-23l8-13M594 546l31 28M396 568l-3-5l-7-7l-6-14M379 541l-2-7M384 428l12 13"],["a",3,"M440 376l5 6M406 383l0 3l5 2l26 29M579 389l-5-5M587 389l-12-6M568 379l-9-7M361 451l8-6l8 4M602 401l-15-11"],["a",4,"M439 374l-8-9M559 371l9-6M552 350l-11 13M379 542l-45 21M499 350l-5-8M431 364l-11-8M552 350l-8-4"],["a",5,"M361 451l-19-20M543 345l-5-3M406 368l-3 1l-12 12M488 341l10-5M615 391l17 12l15 9M561 340l-8 9M529 344l-1-2l4-9l5-4l7-2"],["a",6,"M510 661l-4 6l-20 15M419 353l-5-5M504 323l-1 9M545 328l6 3l10 8M634 581l32 23M447 323l-4 3l-4 10M573 324l-12 15"],["a",7,"M469 323l-7-1M613 354l16 13M612 353l-15-12M402 335l6 6M597 341l10-4M317 594l27-10M402 334l-9-10"],["a",8,"M573 324l14-16M599 316l24 18M431 319l-21-23M688 619l-22-15M593 312l-5-4M334 563l-66 30M559 292l15 6l13 9"],["a",9,"M389 319l-6-4M633 333l8-1M557 292l-6-3M308 393l6-5M314 377l7-1l4-3l-1-1M550 289l-23-10M526 279l-8-2"],["a",10,"M609 301l-5 6M329 347l2 2l0 16M658 346l26 18M368 306l15 9M350 323l6 6M600 293l6 3M558 271l26 10l15 11"],["a",11,"M395 280l13 13M749 357l-27 16l-25 0l-1 14l-2 2l-36 20M358 355l-44-48M262 469l0-10l12-12M438 256l15 7M385 269l10 10M584 734l7 5"],["a",12,"M318 341l-7-7l-14-6M688 619l54 37M751 483l0 10l17 19M691 364l51-25M267 593l-21 11M244 603l-7-15M647 259l-3 11"],["a",13,"M313 300l-6-3M297 328l-21-6l-4-2M343 857l34-81l7-6l17-5l5-4l3-6l1-37l9-22M242 392l-8 0M242 392l-5-3l-3 1M307 266l31 20M305 294l-2-3l-3-2"],["a",14,"M233 393l-1 9l-8 10M332 229l26 18l5 2l3-1l18 21M244 604l-25 12M516 209l-4 0l-1-1M472 799l-1-7M769 513l58 60M754 663l5 3"],["a",15,"M198 394l10 5l16 14M203 523l-28 6M692 158l-36 169M760 667l28 19M311 226l6-12M819 382l-6 4M319 213l0-5l-2-1"],["a",16,"M311 226l-7-13l-1-1l-1 2M306 265l-70-44M468 853l-2-2l3-3M213 609l-3-9l-2-1l-35 29l-56 24l-19 10M808 694l-1-5l10-9M828 683l-6 2M838 664l3-2l3 0l4 6l0 3l-1 3l-14 13"],["a",17,"M236 221l-3 4l-2-1M659 146l5-5M344 858l4 2l0 4M844 321l9-5l3-4l0-3M893 403l-2 4l-7-1M864 324l-2 6M839 656l28 13l24 23"],["a",18,"M415 44l13 40l21 33M729 144l3-1l-1-5M731 120l-1-6l-2-2l-4 0M708 89l19-12M414 41l-3-14M53 687l15-9M867 163l-4 5l-5 3l-27 5l-9 5"],["a",19,"M648 43l1-8M694 49l-10-1l-14-7M744 71l10-7M81 196l8 7l18 6M869 158l5-10M2 714l51-27M895 137l15-16"],["a",20,"M797 36l-5-3M79 139l2-7M776 21l8-12M86 111l-2 8M39 131l14 8l15 5M877 66l7 0M926 98l13-15"],["a",21,"M15 119l7 3l0 4M7 120l0 1l7 7"],["p",0,"M467 446l13-2M447 546l-7 10M501 407l-2-23"],["p",1,"M418 590l-16-9l-5-6M616 478l-5-68l-1-4l-4-3M616 481l42 0"],["p",2,"M442 636l15-1l29 1M440 652l2-15M406 382l0-13"],["p",3,"M659 482l0 20M498 336l-4 5M503 332l7 2l18 14"],["p",4,"M419 356l-13 12M578 366l15-23M439 664l1-12"],["p",5,"M469 323l9 13M486 683l20 0M461 322l-13 0"],["p",6,"M679 510l8 0l1 6M657 388l1 21M432 319l15 3"],["p",7,"M415 319l16 1M303 447l15 1M544 305l6-15"],["p",8,"M480 732l4-49M342 363l9-9M658 346l-1 15"],["p",9,"M688 481l34-1l24 2M554 280l-3 9M484 271l15-1l18 7"],["p",10,"M483 271l-22 2l-5-7M558 271l-2 7M476 745l4-12"],["p",11,"M356 298l11 8M307 393l-64-1M356 298l-17-11"],["p",12,"M475 750l-4 38M558 270l18-45l3-5l5-18M584 202l-42-14"],["p",13,"M470 798l-1 23l3 16M808 642l-9-4M584 202l21-49"],["p",14,"M307 194l7 3l5 7M839 656l-11-7l-20-7M468 853l-2 20"],["p",15,"M847 411l8 1l5-3M827 669l-9 8l-1 3M608 146l-2 6"],["p",16,"M818 696l-4 1l-5-2M823 681l7-9M864 407l9 1"],["p",17,"M740 270l81-88M858 288l3-9l0-17M608 146l39-103"],["p",18,"M894 138l-18 9M994 18l-15 14"]],
    parigi: [["v",0,"M519 514l-6-5M485 494l-8-5M479 502l-6-6"],["v",1,"M531 534l-12-13l-3-2M463 487l-7-3M437 476l9 3"],["v",2,"M434 474l-9-5M401 468l21 0M555 564l10 12l0 2"],["v",3,"M381 469l17-1M359 479l8-7l11-4M348 495l7-12"],["v",4,"M609 624l-20-18M616 627l2 2l11 4M302 553l17-26l7-8"],["v",5,"M633 635l6 3M659 639l-20 0M299 558l-9 11"],["v",6,"M639 648l-3 19l0 10l5 9l15 19M279 584l8-9M399 287l-20 7l-3 5"],["v",7,"M323 333l7-2l14-10M404 283l28-18l9 1M319 333l-26 15"],["v",8,"M256 606l5-5l8-2M268 379l20-28M461 207l-5 23"],["v",9,"M648 784l20-42l0-9l-6-19l0-3M237 616l-8 1M207 458l-5 4l-9 36"],["v",10,"M229 618l-3 2l-5 1l-13-7M192 500l1 18M229 617l-17-10l-11-9l-3 1"],["v",11,"M190 544l6-18M198 600l5 8M196 592l-2-12"],["v",12,"M193 579l-6-15l0-8l1-5M462 199l-9-28M453 170l7 1l6 5l3 5l3 12"],["v",13,"M643 818l-1-19l3-7M842 758l-15 0l-13-2l-9-4l-12-10l-5-9l-4-29l-7-22l-26-23l-13-16l-8-2l-65-3M886 591l-9 0l-27-8l-10 1l-27-1l-20 4l-9 7l-5 9l-1 12l2 13l12 13l12 8l36 10l36 2l20 5l11 12l2 9"],["v",14,"M319 189l-18-17M311 166l4 6l19 14M297 197l0-23l2-2"],["v",15,"M300 163l9-8M261 188l-40 32M888 589l9-8l-1-15l-9-12l-4-16l0-12l5-9l5-5l7-3l24-3l14-4l18 2l8-4l13-1"],["a",0,"M552 559l-10-12l-8-8l-2 0"],["a",1,"M570 583l9 11"],["a",2,"M344 497l-1 3l-13 14"],["a",3,"M370 299l-13 13l-6 4"],["a",4,"M453 236l-12 20"],["a",5,"M245 418l-1-5l19-26"],["a",6,"M237 424l-11 12l-11 8l-8 9"],["a",7,"M318 161l30 21"],["a",8,"M330 148l42-5l10 3"],["a",9,"M267 186l1-4l9-7l19-8"],["a",10,"M220 221l-27 23l-6 7l-3 5"],["a",11,"M179 262l-32 29l-23 14l-7-1"],["a",12,"M723 961l-1-3l0-25l-3-8l-11-14l-9-16l-29-28l-11-26l-11-14"],["p",0,"M452 170l-27-12l-29-8"],["p",1,"M311 165l7-4"],["p",2,"M310 166l-9 2"],["p",3,"M321 153l-3 7"],["p",4,"M116 315l-7-1l-19 5l-22 14l-15 18l-8 18l0 3"]]
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

  function nascondi(){ sezione.classList.remove('is-dentro'); }


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
    var ora = (r.top <= 0 && r.bottom > window.innerHeight * 0.5);
    if(ora === incollata) return;
    incollata = ora;
    sezione.classList.toggle('is-incollata', ora);
    if(ora){ mostra(); if(motore) motore.sveglia(); }
    else   { nascondi(); if(motore) motore.spegni(); }
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
