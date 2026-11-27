// =====================================================================
// DADOS DAS FASES
// Cada fase é um objeto com as cores do tema e arrays de dados.
// Para criar uma fase nova, basta copiar um objeto e mudar os números.
//
// Convenções de posição:
//   x      = pixels a partir do começo da fase (da esquerda para a direita)
//   acima  = quantos pixels ACIMA DO CHÃO fica o topo (ou os pés)
//
// Formatos:
//   plataformas: [x, acima, largura, altura?]      (altura padrão = 32)
//   itens:       [x, acima]                         (centro da nota)
//   fiscais:     { x, acima, min, max, velocidade } (patrulham entre min e max)
//   moveis:      { x, acima, largura, eixo: "x" | "y", distancia, velocidade }
//                (balançam "distancia" pixels para cada lado do ponto inicial)
//   armadilhas:  { x, largura, acima?, periodo? }   (espinhos; com "periodo"
//                eles sobem e descem a cada "periodo" segundos)
// =====================================================================

const FASES = [
  // ------------------------------------------------------------------
  // FASE 1 — PREFEITURA (dia ensolarado, tijolinhos)
  // ------------------------------------------------------------------
  {
    numero: 1,
    nome: "Prefeitura",
    placa: "PREFEITURA →",
    largura: 4000,
    bandeiraX: 3560,
    predio: "prefeitura",
    predioX: 3650,

    tema: {
      ceu: ["#4aa8ff", "#9fd8ff", "#fff2c2"],
      astro: "sol",
      astroCor: "#ffe066",
      estrelas: false,
      nuvem: "rgba(255, 255, 255, 0.95)",
      morroLonge: "#7fbf7f",
      morroPerto: "#4f9a5a",
      predio: "#5b6c8f",
      janela: "#ffe9a3",
      chao: { terra: "#b5651d", linha: "#8a4a12", topo: "#4caf50", topoEscuro: "#2e7d32" },
      bloco: { fundo: "#c8642a", linha: "#7a3512", contorno: "#4a1f08" },
    },

    plataformas: [
      [350, 110, 160],
      [600, 210, 128],
      [850, 120, 192],
      [1150, 100, 96],
      [1300, 200, 96],
      [1450, 300, 160],
      [1800, 64, 64, 64],   // bloco no chão
      [2000, 130, 224],
      [2350, 96, 64, 96],   // muro alto
      [2550, 120, 160],
      [2800, 220, 192],
      [3100, 140, 128],
      [3250, 32, 64, 32],   // escadaria até a Prefeitura
      [3314, 64, 64, 64],
      [3378, 96, 64, 96],
    ],
    moveis: [],
    armadilhas: [],

    itens: [
      [250, 30], [390, 140], [450, 140], [664, 240],
      [890, 150], [950, 150], [1010, 150], [1100, 30],
      [1198, 130], [1348, 230], [1500, 330], [1560, 330],
      [1650, 30], [1832, 95], [2050, 160], [2110, 160],
      [2170, 160], [2382, 130], [2480, 30], [2600, 150],
      [2660, 150], [2860, 250], [2930, 250], [3164, 170],
      [3282, 62], [3346, 94], [3410, 126], [3480, 30],
    ],

    fiscais: [
      { x: 560,  acima: 0,   min: 530,  max: 820,  velocidade: 80 },
      { x: 2050, acima: 130, min: 2000, max: 2190, velocidade: 60 },
      { x: 2500, acima: 0,   min: 2430, max: 2780, velocidade: 100 },
      { x: 3000, acima: 0,   min: 2950, max: 3216, velocidade: 90 },
    ],
  },

  // ------------------------------------------------------------------
  // FASE 2 — SHOPPING (pôr do sol, vidro e neon, muitos Fiscais e
  // plataformas bem altas)
  // ------------------------------------------------------------------
  {
    numero: 2,
    nome: "Shopping",
    placa: "SHOPPING →",
    largura: 4600,
    bandeiraX: 4180,
    predio: "shopping",
    predioX: 4260,

    tema: {
      ceu: ["#ff7e5f", "#feb47b", "#ffe3a3"],
      astro: "sol",
      astroCor: "#ff9f43",
      estrelas: false,
      nuvem: "rgba(255, 220, 230, 0.85)",
      morroLonge: "#c77d8a",
      morroPerto: "#8e5a7a",
      predio: "#6a4c93",
      janela: "#7df9ff",
      chao: { terra: "#7a7a8a", linha: "#5c5c6c", topo: "#d9d9e0", topoEscuro: "#a0a0b0" },
      bloco: { fundo: "#3fa7b5", linha: "#2a7380", contorno: "#1b4a52" },
    },

    plataformas: [
      [300, 100, 128],
      [500, 200, 128],
      [700, 300, 160],
      [950, 380, 192],      // topo da primeira "torre"
      [1250, 280, 128],
      [1450, 180, 128],
      [1700, 100, 256],
      [2050, 200, 96],
      [2200, 310, 96],
      [2380, 390, 224],     // a mais alta da fase
      [2700, 280, 160],
      [2950, 160, 192],
      [3250, 96, 64, 96],   // muros
      [3450, 112, 64, 112],
      [3650, 200, 192],
      [3900, 32, 64, 32],   // escadaria até o Shopping
      [3964, 64, 64, 64],
      [4028, 96, 64, 96],
    ],
    moveis: [],
    armadilhas: [],

    itens: [
      [364, 130], [564, 230], [740, 330], [800, 330],
      [990, 410], [1046, 410], [1102, 410], [1314, 310],
      [1514, 210], [1760, 130], [1830, 130], [1900, 130],
      [2098, 230], [2248, 340], [2430, 420], [2490, 420],
      [2550, 420], [2780, 310], [3000, 190], [3060, 190],
      [3282, 126], [3482, 142], [3700, 230], [3760, 230],
      [1300, 30], [2300, 30], [3700, 30],
      [3932, 62], [3996, 94], [4060, 126],
    ],

    fiscais: [
      { x: 450,  acima: 0,   min: 440,  max: 660,  velocidade: 90 },
      { x: 1000, acima: 380, min: 950,  max: 1108, velocidade: 50 },
      { x: 1200, acima: 0,   min: 1150, max: 1650, velocidade: 110 },
      { x: 1750, acima: 100, min: 1700, max: 1922, velocidade: 70 },
      { x: 2200, acima: 0,   min: 2100, max: 2650, velocidade: 120 },
      { x: 3000, acima: 160, min: 2950, max: 3108, velocidade: 70 },
      { x: 3600, acima: 0,   min: 3520, max: 3866, velocidade: 100 },
      { x: 3700, acima: 200, min: 3650, max: 3808, velocidade: 60 },
    ],
  },

  // ------------------------------------------------------------------
  // FASE 3 — PALÁCIO (noite estrelada, mármore e tapete vermelho,
  // plataformas móveis e espinhos)
  // ------------------------------------------------------------------
  {
    numero: 3,
    nome: "Palácio",
    placa: "PALÁCIO →",
    largura: 4600,
    bandeiraX: 4180,
    predio: "palacio",
    predioX: 4250,

    tema: {
      ceu: ["#0b1033", "#2a2a6e", "#5b4b8a"],
      astro: "lua",
      astroCor: "#f4f1de",
      estrelas: true,
      nuvem: "rgba(180, 180, 220, 0.25)",
      morroLonge: "#2e3a5c",
      morroPerto: "#1f2a44",
      predio: "#1a1f3a",
      janela: "#ffd86b",
      chao: { terra: "#7b1e1e", linha: "#5a1414", topo: "#d4af37", topoEscuro: "#a8862a" },
      bloco: { fundo: "#e8e4da", linha: "#bdb6a6", contorno: "#8a7f6a" },
    },

    plataformas: [
      [700, 110, 128],
      [900, 200, 128],
      [2130, 300, 192],
      [2700, 200, 160],
      [2950, 120, 256],
      [3900, 32, 64, 32],   // escadaria até o Palácio
      [3964, 64, 64, 64],
      [4028, 96, 64, 96],
    ],

    moveis: [
      { x: 1250, acima: 90,  largura: 96, eixo: "x", distancia: 130, velocidade: 1.2 }, // sobre os espinhos
      { x: 2000, acima: 200, largura: 96, eixo: "y", distancia: 110, velocidade: 1.0 }, // elevador
      { x: 2450, acima: 260, largura: 96, eixo: "x", distancia: 90,  velocidade: 1.4 },
      { x: 3500, acima: 110, largura: 96, eixo: "x", distancia: 110, velocidade: 1.5 },
    ],

    armadilhas: [
      { x: 450,  largura: 128 },
      { x: 1100, largura: 400 },
      { x: 1700, largura: 128, periodo: 2 },          // sobe e desce
      { x: 2110, largura: 560 },
      { x: 3030, largura: 64, acima: 120, periodo: 1.6 }, // em cima de uma plataforma
      { x: 3400, largura: 300 },
    ],

    itens: [
      [300, 30], [514, 150], [764, 140], [964, 230],
      [1180, 140], [1300, 140], [1420, 140], [1764, 40],
      [2048, 330], [2180, 330], [2240, 330], [2300, 330],
      [2410, 290], [2530, 290], [2780, 230], [2990, 150],
      [3062, 190], [3150, 150], [3440, 160], [3550, 160],
      [3660, 160], [3800, 30], [3932, 62], [3996, 94],
      [4060, 126],
    ],

    fiscais: [
      { x: 250,  acima: 0,   min: 180,  max: 410,  velocidade: 70 },
      { x: 1560, acima: 0,   min: 1510, max: 1656, velocidade: 80 },
      { x: 2750, acima: 200, min: 2700, max: 2826, velocidade: 40 },
      { x: 3000, acima: 0,   min: 2870, max: 3300, velocidade: 100 },
      { x: 3760, acima: 0,   min: 3720, max: 3866, velocidade: 80 },
    ],
  },
];
