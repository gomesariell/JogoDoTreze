// =====================================================================
// As Aventuras de Seu Fartura — jogo de plataforma 2D (sátira fictícia)
// Etapa 2: personagem com movimento, pulo, gravidade e colisão.
// =====================================================================

// ---------- Configuração do canvas ----------
const canvas = document.getElementById("jogo");
const ctx = canvas.getContext("2d");
const LARGURA = canvas.width;   // 960
const ALTURA = canvas.height;   // 540
const CHAO_Y = ALTURA - 80;     // altura onde começa o chão

// ---------- Física (valores em pixels e segundos) ----------
const MUNDO_LARGURA = 3200;       // tamanho total da fase
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
const estado = {
  camera: 0,
  tempo: 0, // tempo total em segundos (usado em animações)
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
};

// ---------- Plataformas (coordenadas do mundo) ----------
// O chão também é uma "plataforma", só que desenhado separado.
const plataformas = [
  { x: 0, y: CHAO_Y, largura: MUNDO_LARGURA, altura: ALTURA - CHAO_Y, chao: true },
  { x: 350,  y: CHAO_Y - 110, largura: 160, altura: 32 },
  { x: 600,  y: CHAO_Y - 210, largura: 128, altura: 32 },
  { x: 850,  y: CHAO_Y - 120, largura: 192, altura: 32 },
  { x: 1150, y: CHAO_Y - 100, largura: 96,  altura: 32 },
  { x: 1300, y: CHAO_Y - 200, largura: 96,  altura: 32 },
  { x: 1450, y: CHAO_Y - 300, largura: 160, altura: 32 },
  { x: 1800, y: CHAO_Y - 64,  largura: 64,  altura: 64 }, // bloco no chão
  { x: 2000, y: CHAO_Y - 130, largura: 224, altura: 32 },
  { x: 2350, y: CHAO_Y - 96,  largura: 64,  altura: 96 }, // muro alto
  { x: 2550, y: CHAO_Y - 120, largura: 160, altura: 32 },
  { x: 2800, y: CHAO_Y - 220, largura: 192, altura: 32 },
];

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
  const esquerda = teclas.ArrowLeft || teclas.KeyA;
  const direita = teclas.ArrowRight || teclas.KeyD;
  const direcao = (direita ? 1 : 0) - (esquerda ? 1 : 0);
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

// Nine: corpo retangular vermelho, rosto e barba branca
function desenharJogador() {
  const j = jogador;
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

// Instruções no topo da tela
function desenharHUD() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(16, 16, 330, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px 'Trebuchet MS', Arial";
  ctx.fillText("← → ou A/D: andar   Espaço: pular", 28, 42);
}

// ---------- Loop principal ----------

// Atualiza a lógica do jogo. "dt" é o tempo desde o último quadro (segundos),
// assim o jogo roda na mesma velocidade em qualquer monitor (60Hz, 144Hz...).
function atualizar(dt) {
  estado.tempo += dt;

  // divide o quadro em passos pequenos para o jogador nunca "atravessar"
  // uma plataforma fina quando está caindo rápido
  let restante = dt;
  while (restante > 0) {
    const passo = Math.min(restante, 1 / 120);
    atualizarJogador(passo);
    restante -= passo;
  }

  atualizarCamera(dt);
}

function desenhar() {
  desenharCenario();
  desenharPlataformas();
  desenharJogador();
  desenharHUD();
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
