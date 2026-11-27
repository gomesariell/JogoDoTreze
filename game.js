// =====================================================================
// As Aventuras de Seu Fartura — jogo de plataforma 2D (sátira fictícia)
// Etapa 1: canvas, loop do jogo e cenário de fundo com parallax.
// =====================================================================

// ---------- Configuração do canvas ----------
const canvas = document.getElementById("jogo");
const ctx = canvas.getContext("2d");
const LARGURA = canvas.width;   // 960
const ALTURA = canvas.height;   // 540
const CHAO_Y = ALTURA - 80;     // altura onde começa o chão

// ---------- Estado do jogo ----------
// "camera" é quanto o mundo já andou para a direita.
// Por enquanto ela anda sozinha só para mostrar o parallax funcionando.
const estado = {
  camera: 0,
  velocidadeCamera: 90, // pixels por segundo
  tempo: 0,             // tempo total em segundos (usado em animações)
};

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

// ---------- Funções de desenho ----------

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

// Texto temporário no topo da tela
function desenharHUD() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(16, 16, 300, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px 'Trebuchet MS', Arial";
  ctx.fillText("Seu Fartura chega em breve...", 28, 42);
}

// ---------- Loop principal ----------

// Atualiza a lógica do jogo. "dt" é o tempo desde o último quadro (segundos),
// assim o jogo roda na mesma velocidade em qualquer monitor (60Hz, 144Hz...).
function atualizar(dt) {
  estado.tempo += dt;
  estado.camera += estado.velocidadeCamera * dt;
}

function desenhar() {
  desenharCenario();
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
