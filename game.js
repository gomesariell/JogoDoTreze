// =====================================================================
// As Aventuras de Seu Fartura — jogo de plataforma 2D (sátira fictícia)
// Etapa 4: Fase 1 "Prefeitura" com bandeira de chegada, vitória e game over.
// =====================================================================

// ---------- Configuração do canvas ----------
const canvas = document.getElementById("jogo");
const ctx = canvas.getContext("2d");
const LARGURA = canvas.width;   // 960
const ALTURA = canvas.height;   // 540
const CHAO_Y = ALTURA - 80;     // altura onde começa o chão

// ---------- Física (valores em pixels e segundos) ----------
const GRAVIDADE = 2000;           // aceleração para baixo
const VELOCIDADE_MAX_QUEDA = 900; // limite de velocidade caindo
const VELOCIDADE_ANDAR = 260;     // velocidade máxima andando
const ACELERACAO_CHAO = 2200;     // quão rápido acelera/freia no chão
const ACELERACAO_AR = 1300;       // controle no ar é um pouco menor
const FORCA_PULO = 720;           // velocidade inicial do pulo (~130px de altura)
const TEMPO_COYOTE = 0.1;         // pode pular logo depois de sair da beirada
const TEMPO_BUFFER_PULO = 0.12;   // aperto de pulo "lembrado" antes de tocar o chão

// ---------- Estado do jogo ----------
// "camera" é quanto o mundo já andou para a direita (segue o jogador).
const VIDAS_INICIAIS = 3;
const VALOR_ITEM = 100;           // quanto vale cada nota de dinheiro
const TEMPO_INVENCIVEL = 1.5;     // segundos piscando depois de levar dano

const estado = {
  camera: 0,
  tempo: 0,          // tempo total em segundos (usado em animações)
  pontos: 0,         // dinheiro acumulado (R$)
  vidas: VIDAS_INICIAIS,
  tela: "jogando",   // "jogando", "vitoria" ou "gameover"
  tempoTela: 0,      // há quanto tempo está na tela atual (para animações)
  tempoFase: 0,      // há quanto tempo a fase começou (banner de abertura)
  textos: [],        // textinhos flutuantes tipo "+R$100"
  confetes: [],      // festa na vitória
};

// ---------- Personagem ----------
const jogador = {
  nome: "Nine",
  x: 100,
  y: CHAO_Y - 56,
  largura: 36,
  altura: 56,
  vx: 0,               // velocidade horizontal
  vy: 0,               // velocidade vertical (positivo = para baixo)
  noChao: false,
  olhandoDireita: true,
  tempoCoyote: 0,
  bufferPulo: 0,
  itensColetados: 0,   // quanto mais itens, maior o saco de dinheiro
  invencivel: 0,       // tempo restante de invencibilidade após dano
};

// =====================================================================
// FASE 1 — PREFEITURA
// Todas as posições usam "acima" = quantos pixels acima do chão.
// =====================================================================
const FISCAL_LARGURA = 34;
const FISCAL_ALTURA = 48;
const TAMANHO_ITEM = 24; // caixa de colisão quadrada das notas

// Atalho para criar uma plataforma (o topo fica "acima" pixels acima do chão)
function bloco(x, acima, largura, altura = 32) {
  return { x, y: CHAO_Y - acima, largura, altura };
}

const FASE_1 = {
  numero: 1,
  nome: "Prefeitura",
  largura: 4000,       // tamanho total da fase em pixels
  bandeiraX: 3560,     // encostar no mastro conclui a fase
  prefeituraX: 3650,   // onde fica o prédio da Prefeitura (decoração)

  plataformas: [
    bloco(350, 110, 160),
    bloco(600, 210, 128),
    bloco(850, 120, 192),
    bloco(1150, 100, 96),
    bloco(1300, 200, 96),
    bloco(1450, 300, 160),
    bloco(1800, 64, 64, 64),  // bloco no chão
    bloco(2000, 130, 224),
    bloco(2350, 96, 64, 96),  // muro alto
    bloco(2550, 120, 160),
    bloco(2800, 220, 192),
    bloco(3100, 140, 128),
    // escadaria até a Prefeitura
    bloco(3250, 32, 64, 32),
    bloco(3314, 64, 64, 64),
    bloco(3378, 96, 64, 96),
  ],

  // centro de cada nota de dinheiro: [x, acima]
  itens: [
    [250, 30],
    [390, 140], [450, 140],
    [664, 240],
    [890, 150], [950, 150], [1010, 150],
    [1100, 30],
    [1198, 130],
    [1348, 230],
    [1500, 330], [1560, 330],
    [1650, 30],
    [1832, 95],
    [2050, 160], [2110, 160], [2170, 160],
    [2382, 130],
    [2480, 30],
    [2600, 150], [2660, 150],
    [2860, 250], [2930, 250],
    [3164, 170],
    [3282, 62], [3346, 94], [3410, 126],
    [3480, 30],
  ],

  // Fiscais: andam de um lado para o outro entre "min" e "max"
  fiscais: [
    { x: 560,  acima: 0,   min: 530,  max: 820,                   velocidade: 80 },
    { x: 2050, acima: 130, min: 2000, max: 2224 - FISCAL_LARGURA, velocidade: 60 },
    { x: 2500, acima: 0,   min: 2430, max: 2780,                  velocidade: 100 },
    { x: 3000, acima: 0,   min: 2950, max: 3250 - FISCAL_LARGURA, velocidade: 90 },
  ],
};

const MUNDO_LARGURA = FASE_1.largura;

// O chão também é uma "plataforma", só que desenhado separado.
const plataformas = [
  { x: 0, y: CHAO_Y, largura: MUNDO_LARGURA, altura: ALTURA - CHAO_Y, chao: true },
  ...FASE_1.plataformas,
];

let itens = [];
let inimigos = [];

// Coloca tudo no estado inicial (usado no começo e ao recomeçar)
function reiniciarJogo() {
  estado.pontos = 0;
  estado.vidas = VIDAS_INICIAIS;
  estado.tela = "jogando";
  estado.tempoTela = 0;
  estado.tempoFase = 0;
  estado.textos = [];
  estado.confetes = [];
  estado.camera = 0;

  Object.assign(jogador, {
    x: 100, y: CHAO_Y - jogador.altura, vx: 0, vy: 0,
    noChao: false, olhandoDireita: true, tempoCoyote: 0, bufferPulo: 0,
    itensColetados: 0, invencivel: 0,
  });

  itens = FASE_1.itens.map(([cx, acima]) => ({
    x: cx - TAMANHO_ITEM / 2,
    y: CHAO_Y - acima - TAMANHO_ITEM / 2,
    largura: TAMANHO_ITEM,
    altura: TAMANHO_ITEM,
    fase: Math.random() * Math.PI * 2, // para cada nota flutuar num ritmo diferente
  }));

  // "acima" nos dados é a altura onde ficam os pés do Fiscal
  inimigos = FASE_1.fiscais.map((d) => ({
    x: d.x,
    y: CHAO_Y - d.acima - FISCAL_ALTURA,
    largura: FISCAL_LARGURA,
    altura: FISCAL_ALTURA,
    min: d.min,
    max: d.max,
    velocidade: d.velocidade,
    direcao: 1,
  }));
}
reiniciarJogo();

// ---------- Teclado ----------
// Guarda quais teclas estão pressionadas agora (usando e.code, a tecla física).
const teclas = {};

window.addEventListener("keydown", (e) => {
  // impede a página de rolar com setas/espaço
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  // o pulo é "lembrado" por um instante (buffer), não precisa de timing perfeito
  if (e.code === "Space" && !e.repeat) {
    jogador.bufferPulo = TEMPO_BUFFER_PULO;
  }
  // nas telas de vitória ou game over, R ou Enter recomeça
  // (espera a animação da tela aparecer para não recomeçar sem querer)
  const podeRecomecar =
    (estado.tela === "gameover" && estado.tempoTela > 0.5) ||
    (estado.tela === "vitoria" && estado.tempoTela > 1.5);
  if (podeRecomecar && (e.code === "KeyR" || e.code === "Enter")) {
    reiniciarJogo();
  }
  teclas[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  teclas[e.code] = false;
  // pulo variável: soltar o espaço cedo faz um pulo mais baixo
  if (e.code === "Space" && jogador.vy < 0) {
    jogador.vy *= 0.45;
  }
});

// se a janela perder o foco, solta todas as teclas (evita andar sozinho)
window.addEventListener("blur", () => {
  for (const k in teclas) teclas[k] = false;
});

// ---------- Funções auxiliares ----------

// Move "valor" em direção a "alvo" sem passar dele
function aproximar(valor, alvo, passo) {
  if (valor < alvo) return Math.min(valor + passo, alvo);
  return Math.max(valor - passo, alvo);
}

// Dois retângulos estão se sobrepondo?
function colide(a, b) {
  return a.x < b.x + b.largura && a.x + a.largura > b.x &&
         a.y < b.y + b.altura && a.y + a.altura > b.y;
}

// ---------- Lógica do jogador ----------

function atualizarJogador(dt) {
  const j = jogador;

  // 1) Direção escolhida pelo teclado: -1 esquerda, 0 parado, 1 direita
  //    (depois de vencer, o controle é desligado)
  const controle = estado.tela === "jogando";
  const esquerda = controle && (teclas.ArrowLeft || teclas.KeyA);
  const direita = controle && (teclas.ArrowRight || teclas.KeyD);
  const direcao = (direita ? 1 : 0) - (esquerda ? 1 : 0);
  if (!controle) j.bufferPulo = 0;
  if (direcao !== 0) j.olhandoDireita = direcao > 0;

  // 2) Acelera suavemente até a velocidade desejada
  const aceleracao = j.noChao ? ACELERACAO_CHAO : ACELERACAO_AR;
  j.vx = aproximar(j.vx, direcao * VELOCIDADE_ANDAR, aceleracao * dt);

  // 3) Pulo (com "coyote time" e "buffer" para o controle ficar gostoso)
  j.tempoCoyote = j.noChao ? TEMPO_COYOTE : Math.max(0, j.tempoCoyote - dt);
  j.bufferPulo = Math.max(0, j.bufferPulo - dt);
  if (j.bufferPulo > 0 && j.tempoCoyote > 0) {
    j.vy = -FORCA_PULO;
    j.bufferPulo = 0;
    j.tempoCoyote = 0;
    j.noChao = false;
  }

  // 4) Gravidade
  j.vy = Math.min(j.vy + GRAVIDADE * dt, VELOCIDADE_MAX_QUEDA);

  // 5) Move no eixo X e resolve colisões laterais
  j.x += j.vx * dt;
  for (const p of plataformas) {
    if (!colide(j, p)) continue;
    if (j.vx > 0) j.x = p.x - j.largura;   // bateu do lado esquerdo do bloco
    else if (j.vx < 0) j.x = p.x + p.largura; // bateu do lado direito
    j.vx = 0;
  }
  // não deixa sair das bordas do mundo
  j.x = Math.max(0, Math.min(j.x, MUNDO_LARGURA - j.largura));

  // 6) Move no eixo Y e resolve colisões de cima/baixo
  j.y += j.vy * dt;
  j.noChao = false;
  for (const p of plataformas) {
    if (!colide(j, p)) continue;
    if (j.vy > 0) {
      j.y = p.y - j.altura; // caiu em cima da plataforma
      j.noChao = true;
    } else if (j.vy < 0) {
      j.y = p.y + p.altura; // bateu a cabeça embaixo
    }
    j.vy = 0;
  }
}

// A câmera segue o jogador com suavidade, sem sair do mundo
function atualizarCamera(dt) {
  const alvo = jogador.x + jogador.largura / 2 - LARGURA * 0.4;
  const limitado = Math.max(0, Math.min(alvo, MUNDO_LARGURA - LARGURA));
  estado.camera += (limitado - estado.camera) * Math.min(1, dt * 8);
}

// Cria um textinho que sobe e some (ex: "+R$100")
function criarTexto(texto, x, y, cor) {
  estado.textos.push({ texto, x, y, cor, vida: 1 });
}

// Encostou numa nota? Ela some e o dinheiro aumenta
function atualizarItens() {
  for (let i = itens.length - 1; i >= 0; i--) {
    if (!colide(jogador, itens[i])) continue;
    const item = itens[i];
    itens.splice(i, 1);
    estado.pontos += VALOR_ITEM;
    jogador.itensColetados++;
    criarTexto("+R$" + VALOR_ITEM, item.x + item.largura / 2, item.y, "#7CFC00");
  }
}

// Fiscais patrulham e tiram uma vida se encostarem no jogador
function atualizarInimigos(dt) {
  const j = jogador;
  j.invencivel = Math.max(0, j.invencivel - dt);

  for (const f of inimigos) {
    // anda e vira ao chegar no limite da patrulha
    f.x += f.direcao * f.velocidade * dt;
    if (f.x < f.min) { f.x = f.min; f.direcao = 1; }
    if (f.x > f.max) { f.x = f.max; f.direcao = -1; }

    // dano (só durante o jogo e se não estiver piscando)
    if (estado.tela !== "jogando" || j.invencivel > 0 || !colide(j, f)) continue;
    estado.vidas--;
    j.invencivel = TEMPO_INVENCIVEL;
    criarTexto("-1 vida", j.x + j.largura / 2, j.y, "#ff4d4d");

    // empurrão para longe do Fiscal
    const ladoJogador = j.x + j.largura / 2 < f.x + f.largura / 2 ? -1 : 1;
    j.vx = ladoJogador * 400;
    j.vy = -450;
    j.noChao = false;

    if (estado.vidas <= 0) {
      estado.tela = "gameover";
      estado.tempoTela = 0;
    }
  }
}

// Chegou no mastro da bandeira? Fase concluída!
function verificarChegada() {
  if (estado.tela !== "jogando") return;
  if (jogador.x + jogador.largura < FASE_1.bandeiraX) return;

  estado.tela = "vitoria";
  estado.tempoTela = 0;
  jogador.vx = 0;
  jogador.invencivel = 0;
  criarTexto("CHEGOU!", jogador.x + jogador.largura / 2, jogador.y - 10, "#ffd700");

  // solta confetes do topo da tela
  const cores = ["#ffd700", "#ff4d4d", "#4aa8ff", "#7CFC00", "#ffffff", "#ff8c00"];
  for (let i = 0; i < 120; i++) {
    estado.confetes.push({
      x: Math.random() * LARGURA,
      y: -Math.random() * ALTURA,
      vy: 80 + Math.random() * 120,
      giro: Math.random() * Math.PI * 2,
      cor: cores[i % cores.length],
    });
  }
}

// Confetes caem balançando
function atualizarConfetes(dt) {
  for (const c of estado.confetes) {
    c.y += c.vy * dt;
    c.giro += dt * 6;
    c.x += Math.sin(c.giro) * 30 * dt;
    if (c.y > ALTURA) c.y = -10; // recomeça no topo
  }
}

// Textos flutuantes sobem e desaparecem em 1 segundo
function atualizarTextos(dt) {
  for (const t of estado.textos) {
    t.y -= 40 * dt;
    t.vida -= dt;
  }
  estado.textos = estado.textos.filter((t) => t.vida > 0);
}

// ---------- Elementos do cenário (gerados uma vez) ----------

// Nuvens: posição, tamanho e velocidade própria
const nuvens = [];
for (let i = 0; i < 8; i++) {
  nuvens.push({
    x: Math.random() * LARGURA * 2,
    y: 40 + Math.random() * 160,
    escala: 0.6 + Math.random() * 0.8,
  });
}

// Prédios ao fundo (a "capital" do país fictício)
const predios = [];
let px = 0;
while (px < LARGURA * 2) {
  const largura = 50 + Math.random() * 70;
  const altura = 80 + Math.random() * 140;
  predios.push({ x: px, largura, altura });
  px += largura + 10 + Math.random() * 30;
}
const LARGURA_CIDADE = px; // usado para repetir os prédios infinitamente

// ---------- Funções de desenho do cenário ----------

// Céu com degradê do azul ao amarelo claro perto do horizonte
function desenharCeu() {
  const grad = ctx.createLinearGradient(0, 0, 0, ALTURA);
  grad.addColorStop(0, "#4aa8ff");
  grad.addColorStop(0.6, "#9fd8ff");
  grad.addColorStop(1, "#fff2c2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}

// Sol com um brilho que "pulsa" de leve
function desenharSol() {
  const pulso = Math.sin(estado.tempo * 2) * 4;
  const x = LARGURA - 140;
  const y = 100;

  // brilho em volta
  const brilho = ctx.createRadialGradient(x, y, 10, x, y, 90 + pulso);
  brilho.addColorStop(0, "rgba(255, 240, 150, 0.9)");
  brilho.addColorStop(1, "rgba(255, 240, 150, 0)");
  ctx.fillStyle = brilho;
  ctx.beginPath();
  ctx.arc(x, y, 90 + pulso, 0, Math.PI * 2);
  ctx.fill();

  // disco do sol
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
}

// Uma nuvem é feita de alguns círculos sobrepostos
function desenharNuvem(x, y, escala) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(x, y, 22 * escala, 0, Math.PI * 2);
  ctx.arc(x + 25 * escala, y - 12 * escala, 28 * escala, 0, Math.PI * 2);
  ctx.arc(x + 55 * escala, y, 22 * escala, 0, Math.PI * 2);
  ctx.arc(x + 28 * escala, y + 8 * escala, 24 * escala, 0, Math.PI * 2);
  ctx.fill();
}

function desenharNuvens() {
  const faixa = LARGURA + 200; // espaço em que as nuvens dão a volta
  for (const n of nuvens) {
    // nuvens andam bem devagar (parallax 0.2) e também sozinhas com o tempo
    let x = n.x - estado.camera * 0.2 - estado.tempo * 10;
    x = ((x % faixa) + faixa) % faixa - 100; // repete na tela
    desenharNuvem(x, n.y, n.escala);
  }
}

// Morros ao fundo usando ondas de seno
function desenharMorros(cor, alturaBase, amplitude, frequencia, parallax) {
  const deslocamento = estado.camera * parallax;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(0, ALTURA);
  for (let x = 0; x <= LARGURA; x += 8) {
    const y = alturaBase - Math.sin((x + deslocamento) * frequencia) * amplitude
                         - Math.sin((x + deslocamento) * frequencia * 2.3) * amplitude * 0.3;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(LARGURA, ALTURA);
  ctx.closePath();
  ctx.fill();
}

// Silhueta da cidade com janelinhas acesas
function desenharCidade() {
  const deslocamento = (estado.camera * 0.4) % LARGURA_CIDADE;
  for (const p of predios) {
    // desenha cada prédio duas vezes para a cidade nunca acabar
    for (const repeticao of [0, LARGURA_CIDADE]) {
      const x = p.x - deslocamento + repeticao;
      if (x + p.largura < 0 || x > LARGURA) continue;
      const y = CHAO_Y - p.altura;

      ctx.fillStyle = "#5b6c8f";
      ctx.fillRect(x, y, p.largura, p.altura);

      // janelas
      ctx.fillStyle = "#ffe9a3";
      for (let jy = y + 10; jy < CHAO_Y - 15; jy += 18) {
        for (let jx = x + 8; jx < x + p.largura - 10; jx += 16) {
          ctx.fillRect(jx, jy, 6, 8);
        }
      }
    }
  }
}

// Chão estilo plataforma: grama em cima e blocos de terra embaixo
function desenharChao() {
  const tamanhoBloco = 40;
  const deslocamento = estado.camera % tamanhoBloco;

  // terra
  ctx.fillStyle = "#b5651d";
  ctx.fillRect(0, CHAO_Y, LARGURA, ALTURA - CHAO_Y);

  // linhas dos blocos
  ctx.strokeStyle = "#8a4a12";
  ctx.lineWidth = 2;
  for (let x = -deslocamento; x < LARGURA; x += tamanhoBloco) {
    for (let y = CHAO_Y + 14; y < ALTURA; y += tamanhoBloco) {
      ctx.strokeRect(x, y, tamanhoBloco, tamanhoBloco);
    }
  }

  // grama
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, CHAO_Y, LARGURA, 14);
  ctx.fillStyle = "#2e7d32";
  ctx.fillRect(0, CHAO_Y + 12, LARGURA, 4);
}

// Junta todas as camadas na ordem certa (do fundo para frente)
function desenharCenario() {
  desenharCeu();
  desenharSol();
  desenharNuvens();
  desenharMorros("#7fbf7f", CHAO_Y - 90, 40, 0.006, 0.15);
  desenharCidade();
  desenharMorros("#4f9a5a", CHAO_Y - 20, 25, 0.012, 0.6);
  desenharChao();
}

// ---------- Decoração da Fase 1: placa, Prefeitura e bandeira ----------

// Placa verde de estrada no começo da fase
function desenharPlaca() {
  const x = Math.round(150 - estado.camera);
  if (x + 140 < 0 || x > LARGURA) return;

  ctx.fillStyle = "#6d4c41"; // poste
  ctx.fillRect(x + 61, CHAO_Y - 70, 8, 70);

  ctx.fillStyle = "#2e7d32"; // placa
  ctx.fillRect(x, CHAO_Y - 112, 130, 46);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, CHAO_Y - 109, 124, 40);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 14px 'Trebuchet MS', Arial";
  ctx.fillText("PREFEITURA →", x + 65, CHAO_Y - 92);
  ctx.font = "11px 'Trebuchet MS', Arial";
  ctx.fillText("Fase 1 · 3,5 km", x + 65, CHAO_Y - 76);
  ctx.textAlign = "left";
}

// Prédio da Prefeitura no fim da fase (só decoração, não colide)
function desenharPrefeitura() {
  const w = 300;
  const h = 200;
  const x = Math.round(FASE_1.prefeituraX - estado.camera);
  if (x + w + 30 < 0 || x - 30 > LARGURA) return;
  const topo = CHAO_Y - h;

  // mastro no telhado com bandeirinha azul da cidade fictícia
  ctx.fillStyle = "#999";
  ctx.fillRect(x + w / 2 - 2, topo - 140, 4, 70);
  ctx.fillStyle = "#2f6fd6";
  const onda = Math.sin(estado.tempo * 5) * 2;
  ctx.fillRect(x + w / 2 + 2, topo - 140 + onda, 34, 20);

  // paredes
  ctx.fillStyle = "#efe3c8";
  ctx.fillRect(x, topo, w, h);

  // frontão triangular
  ctx.fillStyle = "#e2d3b0";
  ctx.strokeStyle = "#a8957a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 15, topo);
  ctx.lineTo(x + w / 2, topo - 70);
  ctx.lineTo(x + w + 15, topo);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // relógio com ponteiros girando (bem rápido, é sátira!)
  const rx = x + w / 2;
  const ry = topo - 28;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(rx, ry, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  for (const [tamanho, velocidade] of [[13, 2], [8, 0.3]]) {
    const ang = estado.tempo * velocidade;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.sin(ang) * tamanho, ry - Math.cos(ang) * tamanho);
    ctx.stroke();
  }

  // faixa com o nome
  ctx.fillStyle = "#8b6b3e";
  ctx.fillRect(x + 50, topo + 10, w - 100, 24);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  ctx.fillText("PREFEITURA", x + w / 2, topo + 28);
  ctx.textAlign = "left";

  // colunas (duas de cada lado da porta)
  for (const cx of [30, 80, 204, 254]) {
    ctx.fillStyle = "#fbf6ea";
    ctx.fillRect(x + cx, topo + 44, 16, h - 64);
    ctx.fillStyle = "#d9ccb0"; // sombra da coluna
    ctx.fillRect(x + cx + 11, topo + 44, 5, h - 64);
    ctx.fillStyle = "#cbbd9f"; // capitel
    ctx.fillRect(x + cx - 4, topo + 40, 24, 6);
  }

  // porta com arco
  ctx.fillStyle = "#6d4c41";
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 25, CHAO_Y - 20);
  ctx.lineTo(x + w / 2 - 25, CHAO_Y - 70);
  ctx.arc(x + w / 2, CHAO_Y - 70, 25, Math.PI, 0);
  ctx.lineTo(x + w / 2 + 25, CHAO_Y - 20);
  ctx.closePath();
  ctx.fill();

  // escadaria na frente
  ctx.fillStyle = "#d8cbb0";
  ctx.fillRect(x - 10, CHAO_Y - 20, w + 20, 10);
  ctx.fillStyle = "#cbbd9f";
  ctx.fillRect(x - 20, CHAO_Y - 10, w + 40, 10);
}

// Mastro de chegada com bandeira quadriculada (desce quando você vence)
function desenharBandeira() {
  const x = Math.round(FASE_1.bandeiraX - estado.camera);
  if (x < -100 || x > LARGURA + 100) return;
  const altura = 280;
  const topo = CHAO_Y - altura;

  // base de pedra
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(x - 11, CHAO_Y - 16, 28, 16);

  // mastro
  ctx.fillStyle = "#d0d0d0";
  ctx.fillRect(x, topo, 6, altura - 16);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 1, topo, 2, altura - 16);

  // bola dourada no topo
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x + 3, topo - 6, 8, 0, Math.PI * 2);
  ctx.fill();

  // pano quadriculado ondulando, pendurado à esquerda do mastro
  const descida = estado.tela === "vitoria" ? Math.min(1, estado.tempoTela / 1.2) : 0;
  const py = topo + 6 + descida * (altura - 80);
  for (let col = 0; col < 4; col++) {
    const onda = Math.sin(estado.tempo * 6 + col * 0.8) * 3;
    for (let lin = 0; lin < 3; lin++) {
      ctx.fillStyle = (col + lin) % 2 === 0 ? "#111" : "#fff";
      ctx.fillRect(x - 14 - col * 14, py + lin * 14 + onda, 14, 14);
    }
  }
}

// ---------- Desenho das plataformas e do personagem ----------

// Plataformas de tijolinhos
function desenharPlataformas() {
  for (const p of plataformas) {
    if (p.chao) continue; // o chão já foi desenhado no cenário
    const x = Math.round(p.x - estado.camera);
    if (x + p.largura < 0 || x > LARGURA) continue; // fora da tela

    // fundo do bloco
    ctx.fillStyle = "#c8642a";
    ctx.fillRect(x, p.y, p.largura, p.altura);

    // tijolos (linhas alternadas deslocadas), recortados dentro do bloco
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, p.y, p.largura, p.altura);
    ctx.clip();
    ctx.strokeStyle = "#7a3512";
    ctx.lineWidth = 2;
    for (let by = 0; by < p.altura; by += 16) {
      const desloc = (by / 16) % 2 === 0 ? 0 : 16;
      for (let bx = -desloc; bx < p.largura; bx += 32) {
        ctx.strokeRect(x + bx + 1, p.y + by + 1, 30, 14);
      }
    }
    ctx.restore();

    // brilho no topo e contorno
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x, p.y, p.largura, 3);
    ctx.strokeStyle = "#4a1f08";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, p.y + 1, p.largura - 2, p.altura - 2);
  }
}

// Notas de dinheiro verdes que flutuam para cima e para baixo
function desenharItens() {
  for (const item of itens) {
    const x = item.x - estado.camera;
    if (x + item.largura < 0 || x > LARGURA) continue;
    const cx = x + item.largura / 2;
    const cy = item.y + item.altura / 2 + Math.sin(estado.tempo * 4 + item.fase) * 4;

    // brilho
    ctx.fillStyle = "rgba(180, 255, 150, 0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // nota
    ctx.fillStyle = "#2e9e44";
    ctx.fillRect(cx - 14, cy - 9, 28, 18);
    ctx.strokeStyle = "#145c22";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 14, cy - 9, 28, 18);
    ctx.fillStyle = "#c8f5c8";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", cx, cy + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}

// Fiscal: terno azul-escuro, boné, óculos escuros e prancheta
function desenharInimigos() {
  for (const f of inimigos) {
    const x = Math.round(f.x - estado.camera);
    if (x + f.largura < 0 || x > LARGURA) continue;
    const y = Math.round(f.y);
    const w = f.largura;
    const h = f.altura;
    const olhaDireita = f.direcao > 0;
    const passo = Math.sin(estado.tempo * 14 + f.min) * 3;

    // sombra
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // pernas
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(x + 5, y + h - 9 + passo, 10, 9 - passo);
    ctx.fillRect(x + w - 15, y + h - 9 - passo, 10, 9 + passo);

    // terno
    ctx.fillStyle = "#2c3e66";
    ctx.fillRect(x, y + 16, w, h - 24);
    ctx.fillStyle = "#ffffff"; // camisa
    ctx.fillRect(x + w / 2 - 4, y + 16, 8, 12);
    ctx.fillStyle = "#c0392b"; // gravata
    ctx.fillRect(x + w / 2 - 2, y + 17, 4, 12);

    // cabeça, boné e óculos escuros
    ctx.fillStyle = "#e8b88a";
    ctx.fillRect(x + 5, y + 2, w - 10, 16);
    ctx.fillStyle = "#1f2a44";
    ctx.fillRect(x + 3, y, w - 6, 6);
    ctx.fillRect(olhaDireita ? x + w - 6 : x - 2, y + 4, 8, 3); // aba do boné
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 7, y + 8, w - 14, 4);

    // prancheta na mão da frente
    const px = olhaDireita ? x + w - 4 : x - 8;
    ctx.fillStyle = "#a0522d";
    ctx.fillRect(px, y + 22, 12, 15);
    ctx.fillStyle = "#f4f4f4";
    ctx.fillRect(px + 2, y + 24, 8, 11);

    // nome acima
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px 'Trebuchet MS', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Fiscal", x + w / 2, y - 6);
    ctx.textAlign = "left";
  }
}

// Saco de dinheiro nas costas: cresce conforme os itens coletados
function desenharSaco(x, y, w, olhandoDireita) {
  const raio = 9 + Math.min(jogador.itensColetados, 24) * 0.6;
  const cx = olhandoDireita ? x - raio * 0.4 : x + w + raio * 0.4;
  const cy = y + 34 - raio * 0.3;

  // saco
  ctx.fillStyle = "#d9b77a";
  ctx.strokeStyle = "#7a5a2b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // amarração no topo
  ctx.fillStyle = "#7a5a2b";
  ctx.fillRect(cx - 4, cy - raio - 4, 8, 6);

  // cifrão
  ctx.fillStyle = "#2e7d32";
  ctx.font = `bold ${Math.round(raio * 1.1)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", cx, cy + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// Nine: corpo retangular vermelho, rosto e barba branca
function desenharJogador() {
  const j = jogador;

  // pisca enquanto está invencível (depois de levar dano)
  if (j.invencivel > 0 && Math.floor(j.invencivel * 12) % 2 === 0) return;

  const x = Math.round(j.x - estado.camera);
  const y = Math.round(j.y);
  const w = j.largura;
  const h = j.altura;

  // pernas balançam quando está andando no chão
  const andando = j.noChao && Math.abs(j.vx) > 20;
  const passo = andando ? Math.sin(estado.tempo * 18) * 3 : 0;

  // sombra no chão/plataforma
  if (j.noChao) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // pernas
  ctx.fillStyle = "#3a2a20";
  ctx.fillRect(x + 5, y + h - 10 + passo, 11, 10 - passo);
  ctx.fillRect(x + w - 16, y + h - 10 - passo, 11, 10 + passo);

  // corpo (roupa vermelha)
  ctx.fillStyle = "#d62828";
  ctx.fillRect(x, y + 18, w, h - 26);
  ctx.strokeStyle = "#5c0d0d";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 19, w - 2, h - 28);

  // cinto
  ctx.fillStyle = "#7a0f0f";
  ctx.fillRect(x, y + 38, w, 4);

  // cabeça (pele) com cabelo branco
  ctx.fillStyle = "#f1c27d";
  ctx.fillRect(x + 4, y, w - 8, 22);
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(x + 4, y, w - 8, 5);

  // olho e nariz do lado para onde está olhando
  const dir = j.olhandoDireita;
  ctx.fillStyle = "#222";
  ctx.fillRect(dir ? x + w - 14 : x + 10, y + 7, 4, 4);
  ctx.fillStyle = "#e0a96d";
  ctx.fillRect(dir ? x + w - 6 : x + 2, y + 10, 4, 5);

  // saco de dinheiro (nas costas)
  desenharSaco(x, y, w, dir);

  // barba branca (desce um pouco sobre a roupa)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 13);
  ctx.lineTo(x + w - 4, y + 13);
  ctx.lineTo(x + w - 4, y + 24);
  ctx.quadraticCurveTo(x + w / 2, y + 38, x + 4, y + 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#cfcfcf";
  ctx.lineWidth = 1;
  ctx.stroke();

  // nome acima da cabeça
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  ctx.fillText(j.nome, x + w / 2, y - 6);
  ctx.textAlign = "left";
}

// Textos flutuantes ("+R$100", "-1 vida")
function desenharTextos() {
  ctx.font = "bold 16px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  for (const t of estado.textos) {
    ctx.globalAlpha = Math.max(0, t.vida);
    const x = t.x - estado.camera;
    ctx.fillStyle = "#000";
    ctx.fillText(t.texto, x + 1, t.y + 1);
    ctx.fillStyle = t.cor;
    ctx.fillText(t.texto, x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

// Painel com dinheiro, itens restantes e vidas
function desenharHUD() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(16, 16, 260, 70);

  ctx.font = "bold 20px 'Trebuchet MS', Arial";
  ctx.fillStyle = "#7CFC00";
  ctx.fillText("R$ " + estado.pontos.toLocaleString("pt-BR"), 28, 44);

  ctx.font = "14px 'Trebuchet MS', Arial";
  ctx.fillStyle = "#fff";
  const total = FASE_1.itens.length;
  ctx.fillText(`Notas: ${total - itens.length}/${total}`, 28, 70);

  // corações das vidas
  ctx.font = "20px Arial";
  for (let i = 0; i < VIDAS_INICIAIS; i++) {
    ctx.fillStyle = i < estado.vidas ? "#ff4d4d" : "rgba(255, 255, 255, 0.25)";
    ctx.fillText("♥", 170 + i * 26, 44);
  }

  // nome da fase no canto direito
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(LARGURA - 216, 16, 200, 34);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px 'Trebuchet MS', Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Fase ${FASE_1.numero} — ${FASE_1.nome}`, LARGURA - 28, 39);
  ctx.textAlign = "left";
}

// Faixa "FASE 1 — PREFEITURA" que aparece no começo e some sozinha
function desenharBannerFase() {
  if (estado.tempoFase > 3) return;
  const alpha = Math.min(1, 3 - estado.tempoFase); // some no último segundo
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, ALTURA / 2 - 70, LARGURA, 110);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 44px 'Trebuchet MS', Arial";
  ctx.fillText(`FASE ${FASE_1.numero}`, LARGURA / 2, ALTURA / 2 - 20);
  ctx.fillStyle = "#fff";
  ctx.font = "22px 'Trebuchet MS', Arial";
  ctx.fillText(`${FASE_1.nome.toUpperCase()} — chegue até a bandeira!`, LARGURA / 2, ALTURA / 2 + 18);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

// Texto grande com sombra, centralizado
function textoCentral(texto, y, tamanho, cor) {
  ctx.font = `bold ${tamanho}px 'Trebuchet MS', Arial`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.fillText(texto, LARGURA / 2 + 3, y + 3);
  ctx.fillStyle = cor;
  ctx.fillText(texto, LARGURA / 2, y);
  ctx.textAlign = "left";
}

// Tela de GAME OVER (perdeu todas as vidas)
function desenharGameOver() {
  const alpha = Math.min(1, estado.tempoTela / 0.5); // aparece aos poucos
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(20, 0, 0, 0.75)";
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  textoCentral("GAME OVER", ALTURA / 2 - 40, 64, "#ff4d4d");
  textoCentral("Os Fiscais pegaram você!", ALTURA / 2 + 5, 24, "#fff");
  textoCentral("Dinheiro: R$ " + estado.pontos.toLocaleString("pt-BR"), ALTURA / 2 + 40, 20, "#7CFC00");
  if (estado.tempoTela > 0.5 && Math.floor(estado.tempo * 2) % 2 === 0) {
    textoCentral("Aperte R ou Enter para tentar de novo", ALTURA / 2 + 90, 18, "#fff");
  }
  ctx.globalAlpha = 1;
}

// Tela de FASE CONCLUÍDA (encostou na bandeira)
function desenharVitoria() {
  // confetes caindo
  for (const c of estado.confetes) {
    ctx.fillStyle = c.cor;
    ctx.fillRect(c.x, c.y, 6, 10 * Math.abs(Math.cos(c.giro)) + 2);
  }

  // o painel só aparece depois que a bandeira desce
  const alpha = Math.max(0, Math.min(1, (estado.tempoTela - 1.2) / 0.5));
  if (alpha === 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(LARGURA / 2 - 280, ALTURA / 2 - 120, 560, 230);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  ctx.strokeRect(LARGURA / 2 - 280, ALTURA / 2 - 120, 560, 230);

  const total = FASE_1.itens.length;
  textoCentral("Fase concluída!", ALTURA / 2 - 55, 54, "#ffd700");
  textoCentral(`Fase ${FASE_1.numero} — ${FASE_1.nome}`, ALTURA / 2 - 15, 20, "#fff");
  textoCentral("Dinheiro: R$ " + estado.pontos.toLocaleString("pt-BR"), ALTURA / 2 + 20, 22, "#7CFC00");
  textoCentral(`Notas: ${total - itens.length}/${total}   ·   Vidas: ${estado.vidas}`, ALTURA / 2 + 50, 18, "#fff");
  if (estado.tempoTela > 1.5 && Math.floor(estado.tempo * 2) % 2 === 0) {
    textoCentral("Aperte R ou Enter para jogar de novo", ALTURA / 2 + 88, 16, "#ddd");
  }
  ctx.globalAlpha = 1;
}

// ---------- Loop principal ----------

// Atualiza a lógica do jogo. "dt" é o tempo desde o último quadro (segundos),
// assim o jogo roda na mesma velocidade em qualquer monitor (60Hz, 144Hz...).
function atualizar(dt) {
  estado.tempo += dt;
  atualizarTextos(dt);

  if (estado.tela === "gameover") {
    estado.tempoTela += dt;
    return; // jogo parado esperando recomeçar
  }
  if (estado.tela === "vitoria") {
    estado.tempoTela += dt; // o personagem ainda cai/para, mas sem controle
    atualizarConfetes(dt);
  } else {
    estado.tempoFase += dt;
  }

  // divide o quadro em passos pequenos para o jogador nunca "atravessar"
  // uma plataforma fina quando está caindo rápido
  let restante = dt;
  while (restante > 0) {
    const passo = Math.min(restante, 1 / 120);
    atualizarJogador(passo);
    restante -= passo;
  }

  atualizarItens();
  atualizarInimigos(dt);
  verificarChegada();
  atualizarCamera(dt);
}

function desenhar() {
  desenharCenario();
  desenharPlaca();
  desenharPrefeitura();
  desenharBandeira();
  desenharPlataformas();
  desenharItens();
  desenharInimigos();
  desenharJogador();
  desenharTextos();
  desenharHUD();
  desenharBannerFase();
  if (estado.tela === "gameover") desenharGameOver();
  if (estado.tela === "vitoria") desenharVitoria();
}

let ultimoTempo = performance.now();

function loop(agora) {
  // limita o dt para evitar "saltos" quando a aba fica em segundo plano
  const dt = Math.min((agora - ultimoTempo) / 1000, 0.05);
  ultimoTempo = agora;

  atualizar(dt);
  desenhar();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
