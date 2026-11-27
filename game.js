// =====================================================================
// As Aventuras de Seu Fartura — jogo de plataforma 2D (sátira fictícia)
//
// Os DADOS de cada fase ficam em fases.js. Este arquivo tem a LÓGICA e o
// DESENHO, que funcionam para qualquer fase. Organização do arquivo:
//
//   1. Constantes, estado do jogo e personagem
//   2. Carregar fases (transforma os dados de fases.js em retângulos)
//   3. Teclado (A, D, W, Enter/R)
//   4. Lógica: física, câmera, itens, dano, Fiscais, espinhos, chegada
//   5. Chefão "Doutor Burocracia" e seus processos
//   6. Desenho: cenário, prédios, plataformas, itens, personagens, HUD, telas
//   7. Loop principal (atualizar → desenhar, ~60 vezes por segundo)
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

// ---------- Regras do jogo ----------
const VIDAS_INICIAIS = 3;
const VALOR_ITEM = 100;           // quanto vale cada nota de dinheiro
const TEMPO_INVENCIVEL = 1.5;     // segundos piscando depois de levar dano
const FISCAL_LARGURA = 34;
const FISCAL_ALTURA = 48;
const TAMANHO_ITEM = 24;          // caixa de colisão quadrada das notas
const ALTURA_MOVEL = 24;          // espessura das plataformas móveis
const ALTURA_ESPINHO = 18;

// ---------- Chefão ----------
const CHEFE_LARGURA = 64;
const CHEFE_ALTURA = 88;
const GRAVIDADE_PROCESSO = 900;   // os papéis caem em arco
const TEMPO_VOO_PROCESSO = 1.05;  // quanto tempo um papel leva até o chão
const FORCA_QUIQUE = 650;         // pulo do jogador depois de pisar no chefe
const RECUO_PORTA_ARENA = 58;     // a arena fecha logo depois da escadaria (arenaX - 58)

// ---------- Estado do jogo ----------
const estado = {
  camera: 0,           // quanto o mundo já andou para a direita (segue o jogador)
  tempo: 0,            // tempo total em segundos (usado em animações)
  pontos: 0,           // dinheiro acumulado (R$)
  pontosInicioFase: 0, // para voltar a esse valor ao tentar a fase de novo
  vidas: VIDAS_INICIAIS,
  faseAtual: 0,        // índice no array FASES
  tela: "jogando",     // "jogando", "vitoria" ou "gameover"
  tempoTela: 0,        // há quanto tempo está na tela atual (para animações)
  tempoFase: 0,        // há quanto tempo a fase começou
  checkpointX: null,   // ao chegar no chefão, o game over volta para cá
  textos: [],          // textinhos flutuantes tipo "+R$100"
  confetes: [],        // festa na vitória
};

// Dados da fase carregada (preenchidos por carregarFase)
let fase = null;       // o objeto da fase atual em FASES
let plataformas = [];  // plataformas fixas (inclui o chão)
let moveis = [];       // plataformas que se mexem
let solidos = [];      // fixas + móveis: tudo em que o jogador pode pisar
let armadilhas = [];   // espinhos
let itens = [];        // notas de dinheiro
let inimigos = [];     // Fiscais
let chefe = null;      // o chefão da fase (se houver)
let processos = [];    // papéis lançados pelo chefão

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
  sobre: null,         // plataforma em que está pisando (para andar junto com as móveis)
  olhandoDireita: true,
  tempoCoyote: 0,
  bufferPulo: 0,
  invencivel: 0,       // tempo restante de invencibilidade após dano
};

// =====================================================================
// CARREGAR FASES
// Transforma os dados de fases.js (em "pixels acima do chão") em
// retângulos com x, y, largura e altura que a física entende.
// =====================================================================

// "inicioX" permite começar no meio da fase (checkpoint do chefão)
function carregarFase(indice, inicioX = 100) {
  estado.faseAtual = indice;
  fase = FASES[indice];

  estado.tela = "jogando";
  estado.tempoTela = 0;
  estado.tempoFase = 0;
  estado.textos = [];
  estado.confetes = [];
  estado.camera = Math.max(0, Math.min(inicioX - LARGURA * 0.4, fase.largura - LARGURA));
  estado.pontosInicioFase = estado.pontos;

  Object.assign(jogador, {
    x: inicioX, y: CHAO_Y - jogador.altura, vx: 0, vy: 0,
    noChao: false, sobre: null, olhandoDireita: true,
    tempoCoyote: 0, bufferPulo: 0, invencivel: 0,
  });

  // o chão também é uma "plataforma", só que desenhado separado
  const chao = { x: 0, y: CHAO_Y, largura: fase.largura, altura: ALTURA - CHAO_Y, chao: true };
  plataformas = [chao].concat(
    fase.plataformas.map(([x, acima, largura, altura = 32]) => ({
      x, y: CHAO_Y - acima, largura, altura,
    }))
  );

  moveis = fase.moveis.map((m) => ({
    x: m.x,
    y: CHAO_Y - m.acima,
    baseX: m.x,               // ponto central do movimento
    baseY: CHAO_Y - m.acima,
    largura: m.largura,
    altura: ALTURA_MOVEL,
    eixo: m.eixo,
    distancia: m.distancia,
    velocidade: m.velocidade,
    t: 0,
    movel: true,
  }));

  solidos = plataformas.concat(moveis);

  armadilhas = fase.armadilhas.map((a) => ({
    x: a.x,
    y: CHAO_Y - (a.acima || 0) - ALTURA_ESPINHO,
    largura: a.largura,
    altura: ALTURA_ESPINHO,
    periodo: a.periodo || 0,  // 0 = sempre para cima
    ativa: true,
  }));

  itens = fase.itens.map(([cx, acima]) => ({
    x: cx - TAMANHO_ITEM / 2,
    y: CHAO_Y - acima - TAMANHO_ITEM / 2,
    largura: TAMANHO_ITEM,
    altura: TAMANHO_ITEM,
    fase: Math.random() * Math.PI * 2, // para cada nota flutuar num ritmo diferente
  }));

  // "acima" é a altura onde ficam os pés do Fiscal
  inimigos = fase.fiscais.map((d) => ({
    x: d.x,
    y: CHAO_Y - d.acima - FISCAL_ALTURA,
    largura: FISCAL_LARGURA,
    altura: FISCAL_ALTURA,
    min: d.min,
    max: d.max,
    velocidade: d.velocidade,
    direcao: 1,
  }));

  chefe = fase.chefao ? criarChefe(fase.chefao) : null;
  processos = [];
}

// Começa o jogo do zero, na Fase 1
function iniciarJogo() {
  estado.pontos = 0;
  estado.vidas = VIDAS_INICIAIS;
  estado.checkpointX = null;
  carregarFase(0);
}

// Depois do game over: repete a mesma fase com vidas cheias
// (se já tinha chegado no chefão, volta direto para a porta da arena)
function tentarDeNovo() {
  const pontos = estado.pontosInicioFase;
  estado.vidas = VIDAS_INICIAIS;
  if (estado.checkpointX !== null) {
    carregarFase(estado.faseAtual, estado.checkpointX);
    criarTexto("Checkpoint!", jogador.x + jogador.largura / 2, jogador.y - 20, "#ffd700");
  } else {
    carregarFase(estado.faseAtual);
  }
  estado.pontos = pontos;
  estado.pontosInicioFase = pontos;
}

// Depois da vitória: vai para a próxima fase (ou recomeça se zerou o jogo)
function proximaFase() {
  // o checkpoint só vale para a fase em que foi salvo
  estado.checkpointX = null;
  if (estado.faseAtual + 1 < FASES.length) {
    carregarFase(estado.faseAtual + 1);
  } else {
    iniciarJogo();
  }
}

// A fase atual é a última do array FASES?
function ehUltimaFase() {
  return estado.faseAtual === FASES.length - 1;
}

// ---------- Teclado ----------
// Guarda quais teclas estão pressionadas agora (usando e.code, a tecla física).
const teclas = {};

// Controles: A = esquerda, D = direita, W = pular
const TECLA_ESQUERDA = "KeyA";
const TECLA_DIREITA = "KeyD";
const TECLA_PULO = "KeyW";

window.addEventListener("keydown", (e) => {
  // o pulo é "lembrado" por um instante (buffer), não precisa de timing perfeito
  if (e.code === TECLA_PULO && !e.repeat) {
    jogador.bufferPulo = TEMPO_BUFFER_PULO;
  }

  // nas telas de vitória ou game over, R ou Enter continua
  // (espera a animação da tela aparecer para não pular sem querer)
  if (e.code === "KeyR" || e.code === "Enter") {
    if (estado.tela === "gameover" && estado.tempoTela > 0.5) tentarDeNovo();
    else if (estado.tela === "vitoria" && estado.tempoTela > 1.5) proximaFase();
  }

  teclas[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  teclas[e.code] = false;
  // pulo variável: soltar o W cedo faz um pulo mais baixo
  if (e.code === TECLA_PULO && jogador.vy < 0) {
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

// Cria um textinho que sobe e some (ex: "+R$100")
function criarTexto(texto, x, y, cor) {
  estado.textos.push({ texto, x, y, cor, vida: 1 });
}

// =====================================================================
// LÓGICA
// =====================================================================

// Plataformas móveis balançam usando seno; quem está em cima vai junto
function atualizarMoveis(dt) {
  for (const m of moveis) {
    m.t += dt;
    const desloc = Math.sin(m.t * m.velocidade) * m.distancia;
    const novoX = m.eixo === "x" ? m.baseX + desloc : m.baseX;
    const novoY = m.eixo === "y" ? m.baseY + desloc : m.baseY;
    const dx = novoX - m.x;
    const dy = novoY - m.y;
    m.x = novoX;
    m.y = novoY;

    // carrega o jogador junto
    if (jogador.sobre === m) {
      jogador.x += dx;
      jogador.y += dy;
    }
  }
}

// Física do jogador em 6 passos: teclado → aceleração → pulo → gravidade
// → mover e colidir no eixo X → mover e colidir no eixo Y
function atualizarJogador(dt) {
  const j = jogador;

  // conta o tempo de invencibilidade (pisca depois de levar dano)
  j.invencivel = Math.max(0, j.invencivel - dt);

  // 1) Direção escolhida pelo teclado: -1 esquerda, 0 parado, 1 direita
  //    (fora da tela "jogando", o controle é desligado)
  const controle = estado.tela === "jogando";
  const esquerda = controle && teclas[TECLA_ESQUERDA];
  const direita = controle && teclas[TECLA_DIREITA];
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
    j.sobre = null;
  }

  // 4) Gravidade
  j.vy = Math.min(j.vy + GRAVIDADE * dt, VELOCIDADE_MAX_QUEDA);

  // 5) Move no eixo X e resolve colisões laterais
  j.x += j.vx * dt;
  for (const p of solidos) {
    if (!colide(j, p)) continue;
    if (j.vx > 0) j.x = p.x - j.largura;        // bateu do lado esquerdo do bloco
    else if (j.vx < 0) j.x = p.x + p.largura;   // bateu do lado direito
    j.vx = 0;
  }
  // não deixa sair das bordas da fase (nem fugir da arena do chefão)
  const limiteEsquerdo = chefe && chefe.ativo ? chefe.arenaX - RECUO_PORTA_ARENA : 0;
  j.x = Math.max(limiteEsquerdo, Math.min(j.x, fase.largura - j.largura));

  // 6) Move no eixo Y e resolve colisões de cima/baixo
  j.y += j.vy * dt;
  j.noChao = false;
  j.sobre = null;
  for (const p of solidos) {
    if (!colide(j, p)) continue;
    if (j.vy > 0) {
      j.y = p.y - j.altura; // caiu em cima da plataforma
      j.noChao = true;
      j.sobre = p;
    } else if (j.vy < 0) {
      j.y = p.y + p.altura; // bateu a cabeça embaixo
    }
    j.vy = 0;
  }
}

// A câmera segue o jogador com suavidade, sem sair da fase
function atualizarCamera(dt) {
  const alvo = jogador.x + jogador.largura / 2 - LARGURA * 0.4;
  let limitado = Math.max(0, Math.min(alvo, fase.largura - LARGURA));
  // na luta contra o chefão a câmera fica parada mostrando a arena inteira
  if (chefe && chefe.ativo) limitado = fase.largura - LARGURA;
  estado.camera += (limitado - estado.camera) * Math.min(1, dt * 8);
}

// Encostou numa nota? Ela some e o dinheiro aumenta
function atualizarItens() {
  for (let i = itens.length - 1; i >= 0; i--) {
    if (!colide(jogador, itens[i])) continue;
    const item = itens[i];
    itens.splice(i, 1);
    estado.pontos += VALOR_ITEM;
    criarTexto("+R$" + VALOR_ITEM, item.x + item.largura / 2, item.y, "#7CFC00");
  }
}

// Tira uma vida, empurra o jogador para longe e deixa ele piscando
function levarDano(origemX) {
  const j = jogador;
  estado.vidas--;
  j.invencivel = TEMPO_INVENCIVEL;
  criarTexto("-1 vida", j.x + j.largura / 2, j.y, "#ff4d4d");

  const ladoJogador = j.x + j.largura / 2 < origemX ? -1 : 1;
  j.vx = ladoJogador * 400;
  j.vy = -550;
  j.noChao = false;
  j.sobre = null;

  if (estado.vidas <= 0) {
    estado.tela = "gameover";
    estado.tempoTela = 0;
  }
}

// Pode levar dano agora? (só jogando e se não estiver piscando)
function podeLevarDano() {
  return estado.tela === "jogando" && jogador.invencivel <= 0;
}

// Fiscais patrulham e tiram uma vida se encostarem no jogador
function atualizarInimigos(dt) {
  for (const f of inimigos) {
    // anda e vira ao chegar no limite da patrulha
    f.x += f.direcao * f.velocidade * dt;
    if (f.x < f.min) { f.x = f.min; f.direcao = 1; }
    if (f.x > f.max) { f.x = f.max; f.direcao = -1; }

    if (podeLevarDano() && colide(jogador, f)) {
      levarDano(f.x + f.largura / 2);
    }
  }
}

// Espinhos: alguns sobem e descem (periodo), os outros estão sempre ativos
function atualizarArmadilhas() {
  for (const a of armadilhas) {
    if (a.periodo > 0) {
      a.ativa = estado.tempoFase % a.periodo < a.periodo * 0.55;
    }
    if (!a.ativa || !podeLevarDano()) continue;

    // caixa de colisão um pouco menor que o desenho (mais justo para o jogador)
    const caixa = { x: a.x + 4, y: a.y + 6, largura: a.largura - 8, altura: a.altura - 6 };
    if (colide(jogador, caixa)) {
      levarDano(a.x + a.largura / 2);
    }
  }
}

// Chegou no mastro da bandeira? Fase concluída!
function verificarChegada() {
  if (estado.tela !== "jogando" || fase.bandeiraX === null) return;
  if (jogador.x + jogador.largura < fase.bandeiraX) return;
  vencerFase("CHEGOU!");
}

// Fim da fase: desliga o controle, mostra um texto e solta confetes
function vencerFase(texto) {
  estado.tela = "vitoria";
  estado.tempoTela = 0;
  jogador.vx = 0;
  jogador.invencivel = 0;
  criarTexto(texto, jogador.x + jogador.largura / 2, jogador.y - 10, "#ffd700");

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

// =====================================================================
// CHEFÃO: DOUTOR BUROCRACIA
// Estados: "esperando" (antes da arena) → "apresentando" → "andando" ⇄
// "preparando" (vai lançar processos) → ... "atordoado" (levou pisão)
// → "derrotado" (vida chegou a zero).
// =====================================================================

// Monta o objeto do chefão a partir dos dados da fase
function criarChefe(dados) {
  return {
    nome: dados.nome,
    x: dados.x,
    y: CHAO_Y - CHEFE_ALTURA,
    largura: CHEFE_LARGURA,
    altura: CHEFE_ALTURA,
    vidaMax: dados.vida,
    vida: dados.vida,
    arenaX: dados.arenaX,
    minX: dados.arenaX + 40,
    maxX: fase.largura - CHEFE_LARGURA - 20,
    ativo: false,
    estado: "esperando",
    timer: 0,
    tempoAtivo: 0,      // tempo desde que a luta começou (banner de apresentação)
    direcao: -1,
    piscando: 0,
  };
}

// Quanto mais apanha, mais rápido e bravo ele fica
function raivaDoChefe() {
  return chefe.vidaMax - chefe.vida; // 0 no começo, 4 com 1 de vida
}

// Joga alguns papéis em arco na direção do jogador, espalhados
function lancarProcessos() {
  const c = chefe;
  const quantidade = 2 + Math.floor(raivaDoChefe() / 2); // 2, 2, 3, 3, 4
  const origemX = c.x + c.largura / 2;
  const origemY = c.y + 16;
  const alvoX = jogador.x + jogador.largura / 2;

  for (let i = 0; i < quantidade; i++) {
    const espalhar = (i - (quantidade - 1) / 2) * 110;
    const dx = alvoX + espalhar - origemX;
    processos.push({
      x: origemX - 11,
      y: origemY,
      largura: 22,
      altura: 16,
      vx: Math.max(-700, Math.min(700, dx / TEMPO_VOO_PROCESSO)),
      vy: -420 - Math.random() * 60,
      giro: Math.random() * Math.PI,
    });
  }
}

// Um passo da luta: ativa a arena, roda o estado atual e checa o contato
function atualizarChefe(dt) {
  if (!chefe) return; // fase sem chefão
  const c = chefe;
  const j = jogador;
  c.piscando = Math.max(0, c.piscando - dt);

  // a luta começa quando o jogador entra na arena
  if (!c.ativo) {
    if (j.x <= c.arenaX) return;
    c.ativo = true;
    c.estado = "apresentando";
    c.timer = 1.8;
    estado.checkpointX = c.arenaX - 40; // game over agora volta para a porta da arena
  }
  c.tempoAtivo += dt;
  c.timer -= dt;

  // --- comportamento de cada estado ---
  if (c.estado === "apresentando") {
    if (c.timer <= 0) { c.estado = "andando"; c.timer = 1.5; }
  } else if (c.estado === "andando") {
    const velocidade = 90 + raivaDoChefe() * 30;
    c.x += c.direcao * velocidade * dt;
    if (c.x < c.minX) { c.x = c.minX; c.direcao = 1; }
    if (c.x > c.maxX) { c.x = c.maxX; c.direcao = -1; }
    if (c.timer <= 0) { c.estado = "preparando"; c.timer = 0.6; }
  } else if (c.estado === "preparando") {
    // vira para o jogador e levanta o carimbo antes de lançar
    c.direcao = j.x < c.x ? -1 : 1;
    if (c.timer <= 0) {
      lancarProcessos();
      c.estado = "andando";
      c.timer = Math.max(0.8, 2.2 - raivaDoChefe() * 0.3 + Math.random() * 0.6);
    }
  } else if (c.estado === "atordoado") {
    if (c.timer <= 0) { c.estado = "andando"; c.timer = 0.8; }
  } else if (c.estado === "derrotado") {
    // espera ele terminar de cair antes de mostrar a vitória
    if (c.timer <= 0 && estado.tela === "jogando") vencerFase("VENCEU!");
    return;
  }

  // --- contato com o jogador ---
  if (estado.tela !== "jogando" || !colide(j, c)) return;

  // pisou em cima: estava caindo e os pés estão na parte de cima do chefe
  const pisou = j.vy > 0 && j.y + j.altura - c.y < 30;
  if (pisou) {
    j.vy = -FORCA_QUIQUE; // quica para cima
    j.noChao = false;
    j.sobre = null;
    if (c.estado === "atordoado" || c.estado === "apresentando") return;

    c.vida--;
    c.piscando = 1;
    criarTexto("CARIMBADO!", c.x + c.largura / 2, c.y - 30, "#ffd700");
    if (c.vida <= 0) {
      c.estado = "derrotado";
      c.timer = 2.5;
      processos = [];
      criarTexto("PROCESSO ARQUIVADO!", c.x + c.largura / 2, c.y - 55, "#7CFC00");
    } else {
      c.estado = "atordoado";
      c.timer = 1;
    }
  } else if (c.estado !== "atordoado" && podeLevarDano()) {
    levarDano(c.x + c.largura / 2); // encostou de lado
  }
}

// Papéis voam em arco; somem ao tocar o chão ou o jogador
function atualizarProcessos(dt) {
  for (const p of processos) {
    p.vy += GRAVIDADE_PROCESSO * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.giro += dt * 8;
    if (p.y + p.altura >= CHAO_Y) p.morto = true;
    if (!p.morto && podeLevarDano() && colide(jogador, p)) {
      p.morto = true;
      levarDano(p.x + p.largura / 2);
    }
  }
  processos = processos.filter((p) => !p.morto);
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

// =====================================================================
// DESENHO DO CENÁRIO (usa as cores do tema da fase)
// =====================================================================

// Elementos gerados uma vez e reaproveitados em todas as fases
const nuvens = [];
for (let i = 0; i < 8; i++) {
  nuvens.push({
    x: Math.random() * LARGURA * 2,
    y: 40 + Math.random() * 160,
    escala: 0.6 + Math.random() * 0.8,
  });
}

const estrelas = [];
for (let i = 0; i < 80; i++) {
  estrelas.push({
    x: Math.random() * LARGURA,
    y: Math.random() * 300,
    raio: 0.5 + Math.random() * 1.5,
    fase: Math.random() * Math.PI * 2,
  });
}

// Prédios ao fundo (a cidade do país fictício), lado a lado com espaços
const predios = [];
let proximoPredioX = 0;
while (proximoPredioX < LARGURA * 2) {
  const largura = 50 + Math.random() * 70;
  const altura = 80 + Math.random() * 140;
  predios.push({ x: proximoPredioX, largura, altura });
  proximoPredioX += largura + 10 + Math.random() * 30;
}
const LARGURA_CIDADE = proximoPredioX; // usado para repetir os prédios infinitamente

// Céu em degradê com 3 cores
function desenharCeu(cores) {
  const grad = ctx.createLinearGradient(0, 0, 0, ALTURA);
  grad.addColorStop(0, cores[0]);
  grad.addColorStop(0.6, cores[1]);
  grad.addColorStop(1, cores[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}

// Estrelas piscando (só nas fases noturnas)
function desenharEstrelas() {
  for (const e of estrelas) {
    ctx.globalAlpha = 0.5 + Math.sin(estado.tempo * 3 + e.fase) * 0.5;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.raio, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Sol ou lua, com um brilho que "pulsa" de leve
function desenharAstro(tema) {
  const pulso = Math.sin(estado.tempo * 2) * 4;
  const x = LARGURA - 140;
  const y = tema.astro === "lua" ? 90 : 100;

  // brilho em volta
  const brilho = ctx.createRadialGradient(x, y, 10, x, y, 90 + pulso);
  brilho.addColorStop(0, tema.astro === "lua" ? "rgba(255, 255, 230, 0.4)" : "rgba(255, 240, 150, 0.9)");
  brilho.addColorStop(1, "rgba(255, 240, 150, 0)");
  ctx.fillStyle = brilho;
  ctx.beginPath();
  ctx.arc(x, y, 90 + pulso, 0, Math.PI * 2);
  ctx.fill();

  // disco
  ctx.fillStyle = tema.astroCor;
  ctx.beginPath();
  ctx.arc(x, y, tema.astro === "lua" ? 32 : 40, 0, Math.PI * 2);
  ctx.fill();

  // crateras da lua
  if (tema.astro === "lua") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (const [cx, cy, r] of [[-10, -8, 7], [9, 6, 9], [-6, 12, 4]]) {
      ctx.beginPath();
      ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Uma nuvem é feita de alguns círculos sobrepostos
function desenharNuvem(x, y, escala, cor) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, 22 * escala, 0, Math.PI * 2);
  ctx.arc(x + 25 * escala, y - 12 * escala, 28 * escala, 0, Math.PI * 2);
  ctx.arc(x + 55 * escala, y, 22 * escala, 0, Math.PI * 2);
  ctx.arc(x + 28 * escala, y + 8 * escala, 24 * escala, 0, Math.PI * 2);
  ctx.fill();
}

// Todas as nuvens, deslizando devagar e dando a volta na tela
function desenharNuvens(cor) {
  const faixa = LARGURA + 200; // espaço em que as nuvens dão a volta
  for (const n of nuvens) {
    // nuvens andam bem devagar (parallax 0.2) e também sozinhas com o tempo
    let x = n.x - estado.camera * 0.2 - estado.tempo * 10;
    x = ((x % faixa) + faixa) % faixa - 100; // repete na tela
    desenharNuvem(x, n.y, n.escala, cor);
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
function desenharCidade(corPredio, corJanela) {
  const deslocamento = (estado.camera * 0.4) % LARGURA_CIDADE;
  for (const p of predios) {
    // desenha cada prédio duas vezes para a cidade nunca acabar
    for (const repeticao of [0, LARGURA_CIDADE]) {
      const x = p.x - deslocamento + repeticao;
      if (x + p.largura < 0 || x > LARGURA) continue;
      const y = CHAO_Y - p.altura;

      ctx.fillStyle = corPredio;
      ctx.fillRect(x, y, p.largura, p.altura);

      ctx.fillStyle = corJanela;
      for (let jy = y + 10; jy < CHAO_Y - 15; jy += 18) {
        for (let jx = x + 8; jx < x + p.largura - 10; jx += 16) {
          ctx.fillRect(jx, jy, 6, 8);
        }
      }
    }
  }
}

// Chão: faixa no topo (grama, piso ou tapete) e blocos embaixo
function desenharChao(cores) {
  const tamanhoBloco = 40;
  const deslocamento = estado.camera % tamanhoBloco;

  ctx.fillStyle = cores.terra;
  ctx.fillRect(0, CHAO_Y, LARGURA, ALTURA - CHAO_Y);

  ctx.strokeStyle = cores.linha;
  ctx.lineWidth = 2;
  for (let x = -deslocamento; x < LARGURA; x += tamanhoBloco) {
    for (let y = CHAO_Y + 14; y < ALTURA; y += tamanhoBloco) {
      ctx.strokeRect(x, y, tamanhoBloco, tamanhoBloco);
    }
  }

  ctx.fillStyle = cores.topo;
  ctx.fillRect(0, CHAO_Y, LARGURA, 14);
  ctx.fillStyle = cores.topoEscuro;
  ctx.fillRect(0, CHAO_Y + 12, LARGURA, 4);
}

// Junta todas as camadas na ordem certa (do fundo para frente)
function desenharCenario() {
  const tema = fase.tema;
  desenharCeu(tema.ceu);
  if (tema.estrelas) desenharEstrelas();
  desenharAstro(tema);
  desenharNuvens(tema.nuvem);
  desenharMorros(tema.morroLonge, CHAO_Y - 90, 40, 0.006, 0.15);
  desenharCidade(tema.predio, tema.janela);
  desenharMorros(tema.morroPerto, CHAO_Y - 20, 25, 0.012, 0.6);
  desenharChao(tema.chao);
}

// =====================================================================
// DECORAÇÃO: placa do começo e prédio do fim de cada fase
// =====================================================================

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
  ctx.fillText(fase.placa, x + 65, CHAO_Y - 92);
  ctx.font = "11px 'Trebuchet MS', Arial";
  ctx.fillText(`Fase ${fase.numero}`, x + 65, CHAO_Y - 76);
  ctx.textAlign = "left";
}

// Escolhe qual prédio desenhar no fim da fase (só decoração, não colide)
function desenharPredioFinal() {
  const x = Math.round(fase.predioX - estado.camera);
  if (x + 400 < 0 || x - 60 > LARGURA) return;
  if (fase.predio === "prefeitura") desenharPrefeitura(x);
  if (fase.predio === "shopping") desenharShopping(x);
  if (fase.predio === "palacio") desenharPalacio(x);
}

// Faixa com o nome em cima de um prédio
function faixaComNome(x, y, largura, texto, corFundo, corTexto) {
  ctx.fillStyle = corFundo;
  ctx.fillRect(x, y, largura, 24);
  ctx.fillStyle = corTexto;
  ctx.font = "bold 16px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  ctx.fillText(texto, x + largura / 2, y + 18);
  ctx.textAlign = "left";
}

// Fase 1: Prefeitura com colunas, frontão e relógio
function desenharPrefeitura(x) {
  const w = 300;
  const h = 200;
  const topo = CHAO_Y - h;

  // mastro no telhado com bandeirinha azul da cidade fictícia
  ctx.fillStyle = "#999";
  ctx.fillRect(x + w / 2 - 2, topo - 140, 4, 70);
  ctx.fillStyle = "#2f6fd6";
  ctx.fillRect(x + w / 2 + 2, topo - 140 + Math.sin(estado.tempo * 5) * 2, 34, 20);

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

  faixaComNome(x + 50, topo + 10, w - 100, "PREFEITURA", "#8b6b3e", "#fff");

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

// Fase 2: Shopping de vidro com letreiro neon piscando
function desenharShopping(x) {
  const w = 320;
  const h = 180;
  const topo = CHAO_Y - h;

  // corpo
  ctx.fillStyle = "#e0e0e8";
  ctx.fillRect(x, topo, w, h);

  // vidraças
  for (let lin = 0; lin < 3; lin++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = (lin + col) % 2 === 0 ? "#7fd3e6" : "#a8e6f2";
      ctx.fillRect(x + 12 + col * 37, topo + 50 + lin * 30, 33, 26);
    }
  }

  // porta de vidro automática
  ctx.fillStyle = "#bdefff";
  ctx.fillRect(x + w / 2 - 40, CHAO_Y - 40, 80, 40);
  ctx.fillStyle = "#5c6b73";
  ctx.fillRect(x + w / 2 - 1, CHAO_Y - 40, 2, 40);

  // letreiro neon
  const brilho = 0.7 + 0.3 * Math.sin(estado.tempo * 6);
  ctx.fillStyle = "#4a148c";
  ctx.fillRect(x + 40, topo - 40, w - 80, 44);
  ctx.fillStyle = `rgba(255, 105, 180, ${brilho})`;
  ctx.font = "bold 28px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  ctx.fillText("SHOPPING", x + w / 2, topo - 8);
  ctx.textAlign = "left";

  // toldo listrado em cima da porta
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ff6b6b" : "#ffffff";
    ctx.fillRect(x + w / 2 - 60 + i * 20, CHAO_Y - 54, 20, 12);
  }
}

// Fase 3: Palácio com torres, cúpula dourada e tapete vermelho
function desenharPalacio(x) {
  const w = 340;
  const h = 160;
  const topo = CHAO_Y - h;

  // torres laterais com telhado cônico dourado
  for (const tx of [x - 10, x + w - 40]) {
    ctx.fillStyle = "#f3ead2";
    ctx.fillRect(tx, topo - 60, 50, h + 60);
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.moveTo(tx - 5, topo - 60);
    ctx.lineTo(tx + 25, topo - 115);
    ctx.lineTo(tx + 55, topo - 60);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd86b"; // janela acesa
    ctx.fillRect(tx + 18, topo - 35, 14, 22);
  }

  // corpo principal
  ctx.fillStyle = "#f8f1dc";
  ctx.fillRect(x + 40, topo, w - 80, h);

  // cúpula dourada com ponta
  ctx.fillStyle = "#d4af37";
  ctx.beginPath();
  ctx.arc(x + w / 2, topo, 60, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x + w / 2 - 2, topo - 82, 4, 22);
  ctx.beginPath();
  ctx.arc(x + w / 2, topo - 84, 6, 0, Math.PI * 2);
  ctx.fill();

  faixaComNome(x + 100, topo + 14, w - 200, "PALÁCIO", "#7b1e1e", "#ffd700");

  // colunas
  for (const cx of [60, 95, 231, 266]) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + cx, topo + 50, 14, h - 70);
    ctx.fillStyle = "#e2d7bd";
    ctx.fillRect(x + cx + 10, topo + 50, 4, h - 70);
  }

  // porta dourada com arco
  ctx.fillStyle = "#b8860b";
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 25, CHAO_Y - 20);
  ctx.lineTo(x + w / 2 - 25, CHAO_Y - 70);
  ctx.arc(x + w / 2, CHAO_Y - 70, 25, Math.PI, 0);
  ctx.lineTo(x + w / 2 + 25, CHAO_Y - 20);
  ctx.closePath();
  ctx.fill();

  // escadaria de mármore com tapete vermelho
  ctx.fillStyle = "#e8e4da";
  ctx.fillRect(x - 10, CHAO_Y - 20, w + 20, 10);
  ctx.fillStyle = "#d6d0c2";
  ctx.fillRect(x - 20, CHAO_Y - 10, w + 40, 10);
  ctx.fillStyle = "#c62828";
  ctx.fillRect(x + w / 2 - 22, CHAO_Y - 20, 44, 20);
}

// Mastro de chegada com bandeira quadriculada (desce quando você vence)
function desenharBandeira() {
  if (fase.bandeiraX === null) return; // fase com chefão não tem bandeira
  const x = Math.round(fase.bandeiraX - estado.camera);
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

// =====================================================================
// DESENHO DE PLATAFORMAS, ARMADILHAS, ITENS, INIMIGOS E JOGADOR
// =====================================================================

// Um bloco de tijolinhos nas cores do tema
function desenharBloco(x, y, largura, altura, cores) {
  ctx.fillStyle = cores.fundo;
  ctx.fillRect(x, y, largura, altura);

  // tijolos (linhas alternadas deslocadas), recortados dentro do bloco
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, largura, altura);
  ctx.clip();
  ctx.strokeStyle = cores.linha;
  ctx.lineWidth = 2;
  for (let by = 0; by < altura; by += 16) {
    const desloc = (by / 16) % 2 === 0 ? 0 : 16;
    for (let bx = -desloc; bx < largura; bx += 32) {
      ctx.strokeRect(x + bx + 1, y + by + 1, 30, 14);
    }
  }
  ctx.restore();

  // brilho no topo e contorno
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(x, y, largura, 3);
  ctx.strokeStyle = cores.contorno;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, largura - 2, altura - 2);
}

// Plataformas fixas (só as que aparecem na tela)
function desenharPlataformas() {
  for (const p of plataformas) {
    if (p.chao) continue; // o chão já foi desenhado no cenário
    const x = Math.round(p.x - estado.camera);
    if (x + p.largura < 0 || x > LARGURA) continue; // fora da tela
    desenharBloco(x, p.y, p.largura, p.altura, fase.tema.bloco);
  }
}

// Plataformas móveis: bloco com faixa amarela e preta de "atenção"
function desenharMoveis() {
  for (const m of moveis) {
    const x = Math.round(m.x - estado.camera);
    if (x + m.largura < 0 || x > LARGURA) continue;
    const y = Math.round(m.y);
    desenharBloco(x, y, m.largura, m.altura, fase.tema.bloco);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + m.altura - 7, m.largura, 7);
    ctx.clip();
    for (let i = -1; i < m.largura / 10 + 1; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#ffd700" : "#222";
      ctx.beginPath();
      ctx.moveTo(x + i * 10, y + m.altura);
      ctx.lineTo(x + i * 10 + 7, y + m.altura - 7);
      ctx.lineTo(x + i * 10 + 17, y + m.altura - 7);
      ctx.lineTo(x + i * 10 + 10, y + m.altura);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// Espinhos metálicos (recolhidos aparecem só como pontinhas)
function desenharArmadilhas() {
  for (const a of armadilhas) {
    const x = Math.round(a.x - estado.camera);
    if (x + a.largura < 0 || x > LARGURA) continue;
    const base = a.y + a.altura;
    const alturaPonta = a.ativa ? a.altura : 5;

    // base escura
    ctx.fillStyle = "#37474f";
    ctx.fillRect(x, base - 4, a.largura, 4);

    // triângulos
    const quantidade = Math.max(1, Math.round(a.largura / 16));
    const larguraPonta = a.largura / quantidade;
    ctx.fillStyle = a.ativa ? "#cfd8dc" : "#90a4ae";
    ctx.strokeStyle = "#455a64";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < quantidade; i++) {
      const px = x + i * larguraPonta;
      ctx.beginPath();
      ctx.moveTo(px, base - 3);
      ctx.lineTo(px + larguraPonta / 2, base - alturaPonta);
      ctx.lineTo(px + larguraPonta, base - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
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

// Doutor Burocracia: terno cinza, cartola, óculos redondos, bigodão,
// um carimbo gigante numa mão e uma pilha de papéis na outra
function desenharChefe() {
  if (!chefe) return;
  const c = chefe;
  const x = Math.round(c.x - estado.camera);
  if (x + c.largura < -40 || x > LARGURA + 40) return;
  const y = Math.round(c.y);
  const w = c.largura;
  const h = c.altura;
  const frente = c.direcao; // 1 = olhando para a direita
  const derrotado = c.estado === "derrotado";

  // pisca depois de levar um pisão
  if (c.piscando > 0 && Math.floor(c.piscando * 14) % 2 === 0) return;

  // sombra
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, CHAO_Y, w / 2 + 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  // derrotado: tomba para trás devagar
  if (derrotado) {
    const queda = Math.min(1, (2.5 - c.timer) / 0.6);
    ctx.translate(x + w / 2, CHAO_Y);
    ctx.rotate(-frente * queda * Math.PI / 2);
    ctx.translate(-(x + w / 2), -CHAO_Y);
  }

  // pernas (balançam andando)
  const passo = c.estado === "andando" ? Math.sin(estado.tempo * 12) * 4 : 0;
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 10, y + h - 14 + passo, 16, 14 - passo);
  ctx.fillRect(x + w - 26, y + h - 14 - passo, 16, 14 + passo);

  // terno
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(x, y + 32, w, h - 44);
  ctx.fillStyle = "#fff"; // camisa
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 10, y + 32);
  ctx.lineTo(x + w / 2 + 10, y + 32);
  ctx.lineTo(x + w / 2, y + 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b71c1c"; // gravata-borboleta
  ctx.fillRect(x + w / 2 - 8, y + 33, 16, 6);
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 33, w - 2, h - 46);

  // cabeça
  ctx.fillStyle = "#f0c8a0";
  ctx.fillRect(x + 10, y + 6, w - 20, 28);

  // cartola
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 4, y + 4, w - 8, 6);      // aba
  ctx.fillRect(x + 14, y - 22, w - 28, 28);  // copa
  ctx.fillStyle = "#7b1e1e";
  ctx.fillRect(x + 14, y - 2, w - 28, 5);    // fita

  // óculos redondos (olhos viram X quando derrotado)
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  for (const ox of [x + w / 2 - 10, x + w / 2 + 10]) {
    ctx.beginPath();
    ctx.arc(ox, y + 18, 7, 0, Math.PI * 2);
    ctx.stroke();
    if (derrotado) {
      ctx.beginPath();
      ctx.moveTo(ox - 3, y + 15); ctx.lineTo(ox + 3, y + 21);
      ctx.moveTo(ox + 3, y + 15); ctx.lineTo(ox - 3, y + 21);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#111";
      ctx.fillRect(ox - 1 + frente * 2, y + 17, 3, 3);
    }
  }

  // sobrancelhas bravas e bigodão
  ctx.fillStyle = "#666";
  ctx.fillRect(x + w / 2 - 17, y + 8, 12, 3);
  ctx.fillRect(x + w / 2 + 5, y + 8, 12, 3);
  ctx.fillStyle = "#777";
  ctx.beginPath();
  ctx.ellipse(x + w / 2 - 8, y + 29, 10, 4, 0.2, 0, Math.PI * 2);
  ctx.ellipse(x + w / 2 + 8, y + 29, 10, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // pilha de papéis na mão de trás
  const tras = frente > 0 ? x - 14 : x + w - 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#fdfdfd" : "#e8e8e8";
    ctx.fillRect(tras + (i % 2), y + 58 - i * 5, 18, 5);
  }

  // carimbo gigante na mão da frente (levanta quando vai atacar)
  const levantado = c.estado === "preparando";
  const cx = frente > 0 ? x + w + 2 : x - 22;
  const cy = levantado ? y - 30 : y + 40;
  ctx.fillStyle = "#6d4c41"; // cabo
  ctx.fillRect(cx + 6, cy, 8, 16);
  ctx.beginPath();
  ctx.arc(cx + 10, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c62828"; // base
  ctx.fillRect(cx, cy + 16, 20, 9);

  ctx.restore();

  // nome acima
  if (!derrotado) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 12px 'Trebuchet MS', Arial";
    ctx.textAlign = "center";
    ctx.fillText(c.nome, x + w / 2, y - 30);
    ctx.textAlign = "left";
  }

  // estrelinhas girando quando está atordoado
  if (c.estado === "atordoado") {
    ctx.fillStyle = "#ffd700";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const ang = estado.tempo * 6 + (i * Math.PI * 2) / 3;
      ctx.fillText("★", x + w / 2 + Math.cos(ang) * 26, y - 34 + Math.sin(ang) * 6);
    }
    ctx.textAlign = "left";
  }
}

// Processos: folhas de papel girando, com linhas e um carimbo vermelho
function desenharProcessos() {
  for (const p of processos) {
    const x = p.x - estado.camera + p.largura / 2;
    const y = p.y + p.altura / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.giro);
    ctx.fillStyle = "#fffdf2";
    ctx.fillRect(-11, -8, 22, 16);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(-11, -8, 22, 16);
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(-8, -5, 14, 2);
    ctx.fillRect(-8, -1, 10, 2);
    ctx.fillStyle = "#d32f2f";
    ctx.fillRect(2, 2, 7, 4);
    ctx.restore();
  }
}

// Posição (em relação ao centro) e inclinação de cada nota enfiada na
// cueca, na ordem em que vão aparecendo (1 nova a cada 3 coletadas)
const NOTAS_NA_CUECA = [
  { dx: -5, ang: -0.35 }, { dx: 5, ang: 0.3 },  { dx: 0, ang: 0.05 },
  { dx: -11, ang: -0.7 }, { dx: 10, ang: 0.65 }, { dx: -2, ang: -0.15 },
  { dx: 8, ang: 0.45 },   { dx: -8, ang: -0.5 },
];

// Uma notinha verde presa pela base (cx, cy), apontando para cima e girada
function desenharNotaPequena(cx, cy, angulo, comprimento) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angulo);
  ctx.fillStyle = "#2e9e44";
  ctx.fillRect(-3.5, -comprimento, 7, comprimento);
  ctx.strokeStyle = "#145c22";
  ctx.lineWidth = 1;
  ctx.strokeRect(-3.5, -comprimento, 7, comprimento);
  ctx.fillStyle = "#c8f5c8"; // detalhe claro no meio da nota
  ctx.fillRect(-1, -comprimento + 3, 2, 3);
  ctx.restore();
}

// Nine: personagem cartoon de cueca vermelha, cabelo branco e
// um tufinho de barba branca no queixo
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

  const PELE = "#e3b48c";
  const PELE_SOMBRA = "#c9956c";
  const CONTORNO = "#5a3d2b";
  const dir = j.olhandoDireita;
  const lado = dir ? 1 : -1; // para espelhar detalhes do rosto
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = CONTORNO;

  // pernas (balançam ao andar) com pezinhos
  ctx.fillStyle = PELE;
  ctx.fillRect(x + 9, y + 44 + passo, 7, 12 - passo);
  ctx.fillRect(x + w - 16, y + 44 - passo, 7, 12 + passo);
  ctx.fillStyle = PELE_SOMBRA;
  ctx.fillRect(x + 7 + (dir ? 2 : -1), y + h - 3, 10, 3);
  ctx.fillRect(x + w - 18 + (dir ? 2 : -1), y + h - 3, 10, 3);

  // braço de trás (mais escuro, balança ao contrário)
  const braco = andando ? Math.sin(estado.tempo * 18) * 4 : 0;
  ctx.fillStyle = PELE_SOMBRA;
  ctx.fillRect(dir ? x + 3 : x + w - 9, y + 23 - braco, 6, 15);

  // tronco com barriguinha (a barriga fica para o lado em que ele olha)
  const curvaDireita = dir ? x + w + 3 : x + w - 5;
  const curvaEsquerda = dir ? x + 5 : x - 3;
  ctx.fillStyle = PELE;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 20);
  ctx.lineTo(x + w - 7, y + 20);
  ctx.quadraticCurveTo(curvaDireita, y + 32, x + w - 6, y + 42);
  ctx.lineTo(x + 6, y + 42);
  ctx.quadraticCurveTo(curvaEsquerda, y + 32, x + 7, y + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // umbigo
  ctx.fillStyle = PELE_SOMBRA;
  ctx.fillRect(x + w / 2 + lado * 3, y + 34, 2, 2);

  // --- dinheiro na cueca: quanto mais notas, mais aparece ---
  const notas = Math.floor(estado.pontos / VALOR_ITEM);
  const estufado = (Math.min(notas, 30) / 30) * 4; // cueca incha até 4px
  // as notas balançam ao andar e chacoalham no ar
  const balanco = !j.noChao ? Math.sin(estado.tempo * 25) * 0.2
                : andando ? Math.sin(estado.tempo * 18) * 0.12 : 0;

  // notas enfiadas no elástico (desenhadas antes da cueca, que cobre a base)
  const naCintura = Math.min(NOTAS_NA_CUECA.length, Math.floor(notas / 3));
  for (let i = 0; i < naCintura; i++) {
    const n = NOTAS_NA_CUECA[i];
    desenharNotaPequena(x + w / 2 + n.dx, y + 43, n.ang + balanco, 10 + (i % 3));
  }

  // cueca vermelha com elástico (fica mais estufada com o dinheiro)
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = "#d62828";
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 40);
  ctx.lineTo(x + w - 6, y + 40);
  ctx.lineTo(x + w - 7 + estufado, y + 47);
  ctx.lineTo(x + w / 2 + 3, y + 49 + estufado / 2);
  ctx.lineTo(x + w / 2 - 3, y + 49 + estufado / 2);
  ctx.lineTo(x + 7 - estufado, y + 47);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#9e1414";
  ctx.fillRect(x + 6, y + 40, w - 12, 2);

  // cifrão estampado quando a cueca já está bem cheia
  if (notas >= 6) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 7px Arial";
    ctx.textAlign = "center";
    ctx.fillText("$", x + w / 2, y + 47);
    ctx.textAlign = "left";
  }

  // notas escapando pelas pernas da cueca
  if (notas >= 12) desenharNotaPequena(x + 9 - estufado, y + 46, Math.PI + 0.7 - balanco, 9);
  if (notas >= 20) desenharNotaPequena(x + w - 9 + estufado, y + 46, Math.PI - 0.7 + balanco, 9);
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 1.5;

  // braço da frente
  ctx.fillStyle = PELE;
  ctx.fillRect(dir ? x + w - 10 : x + 4, y + 23 + braco, 6, 15);
  ctx.strokeRect(dir ? x + w - 10 : x + 4, y + 23 + braco, 6, 15);

  // cabeça redondinha
  ctx.fillStyle = PELE;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 11, 12, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // cabelo branco (topete e laterais)
  ctx.fillStyle = "#f5f5f5";
  ctx.beginPath();
  ctx.ellipse(x + w / 2 - lado * 2, y + 2, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(dir ? x + w / 2 - 12 : x + w / 2 + 8, y + 4, 4, 8);

  // olho, sobrancelha, nariz e sorriso do lado para onde está olhando
  const ox = x + w / 2 + lado * 5;
  ctx.fillStyle = "#222";
  ctx.fillRect(ox - 1, y + 8, 3, 3);
  ctx.fillStyle = "#eeeeee";
  ctx.fillRect(ox - 3, y + 5, 6, 2);
  ctx.fillStyle = PELE_SOMBRA;
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + lado * 11, y + 12, 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CONTORNO;
  ctx.beginPath();
  ctx.arc(x + w / 2 + lado * 5, y + 14, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // barba: só um tufinho curto e branco no queixo
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + lado * 4, y + 21, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // nome acima da cabeça
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  ctx.fillText(j.nome, x + w / 2, y - 6);
  ctx.textAlign = "left";
}

// =====================================================================
// HUD E TELAS
// =====================================================================

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

// Painel com dinheiro, notas, vidas e nome da fase
function desenharHUD() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(16, 16, 260, 70);

  ctx.font = "bold 20px 'Trebuchet MS', Arial";
  ctx.fillStyle = "#7CFC00";
  ctx.fillText("R$ " + estado.pontos.toLocaleString("pt-BR"), 28, 44);

  ctx.font = "14px 'Trebuchet MS', Arial";
  ctx.fillStyle = "#fff";
  const total = fase.itens.length;
  ctx.fillText(`Notas: ${total - itens.length}/${total}`, 28, 70);

  // corações das vidas
  ctx.font = "20px Arial";
  for (let i = 0; i < VIDAS_INICIAIS; i++) {
    ctx.fillStyle = i < estado.vidas ? "#ff4d4d" : "rgba(255, 255, 255, 0.25)";
    ctx.fillText("♥", 170 + i * 26, 44);
  }

  // nome da fase no canto direito
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(LARGURA - 236, 16, 220, 34);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px 'Trebuchet MS', Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Fase ${fase.numero}/${FASES.length} — ${fase.nome}`, LARGURA - 28, 39);
  ctx.textAlign = "left";
}

// Faixa "FASE N — NOME" que aparece no começo e some sozinha
function desenharBannerFase() {
  if (estado.tempoFase > 3) return;
  ctx.globalAlpha = Math.min(1, 3 - estado.tempoFase); // some no último segundo
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, ALTURA / 2 - 70, LARGURA, 110);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 44px 'Trebuchet MS', Arial";
  ctx.fillText(`FASE ${fase.numero}`, LARGURA / 2, ALTURA / 2 - 20);
  ctx.fillStyle = "#fff";
  ctx.font = "22px 'Trebuchet MS', Arial";
  const objetivo = fase.objetivo || "chegue até a bandeira!";
  ctx.fillText(`${fase.nome.toUpperCase()} — ${objetivo}`, LARGURA / 2, ALTURA / 2 + 18);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

// Barra de vida do chefão no topo da tela + apresentação no começo da luta
function desenharHUDChefe() {
  if (!chefe || !chefe.ativo || estado.tela === "vitoria") return;
  const c = chefe;

  // barra com um segmento por ponto de vida
  const largura = 320;
  const x = LARGURA / 2 - largura / 2;
  const y = 96;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x - 10, y - 24, largura + 20, 46);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 14px 'Trebuchet MS', Arial";
  ctx.textAlign = "center";
  ctx.fillText(c.nome.toUpperCase(), LARGURA / 2, y - 8);
  ctx.textAlign = "left";

  const segmento = largura / c.vidaMax;
  for (let i = 0; i < c.vidaMax; i++) {
    ctx.fillStyle = i < c.vida ? "#e53935" : "#424242";
    ctx.fillRect(x + i * segmento + 2, y, segmento - 4, 14);
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y - 1, largura, 16);

  // faixa de apresentação nos primeiros segundos
  if (c.tempoAtivo < 2.5) {
    ctx.globalAlpha = Math.min(1, 2.5 - c.tempoAtivo);
    ctx.fillStyle = "rgba(60, 0, 0, 0.7)";
    ctx.fillRect(0, ALTURA / 2 - 60, LARGURA, 100);
    textoCentral("⚠ CHEFÃO: DOUTOR BUROCRACIA ⚠", ALTURA / 2 - 12, 34, "#ffd700");
    textoCentral("Desvie dos processos e pule na cabeça dele 5 vezes!", ALTURA / 2 + 24, 18, "#fff");
    ctx.globalAlpha = 1;
  }
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
  ctx.globalAlpha = Math.min(1, estado.tempoTela / 0.5); // aparece aos poucos
  ctx.fillStyle = "rgba(20, 0, 0, 0.75)";
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  textoCentral("GAME OVER", ALTURA / 2 - 40, 64, "#ff4d4d");
  textoCentral(`Você caiu na Fase ${fase.numero} — ${fase.nome}`, ALTURA / 2 + 5, 24, "#fff");
  textoCentral("Dinheiro: R$ " + estado.pontos.toLocaleString("pt-BR"), ALTURA / 2 + 40, 20, "#7CFC00");
  if (estado.tempoTela > 0.5 && Math.floor(estado.tempo * 2) % 2 === 0) {
    textoCentral("Aperte R ou Enter para tentar esta fase de novo", ALTURA / 2 + 90, 18, "#fff");
  }
  ctx.globalAlpha = 1;
}

// Tela FINAL: aparece ao derrotar o chefão da última fase
function desenharVitoriaFinal(alpha) {
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(0, 0, 0, ALTURA);
  grad.addColorStop(0, "rgba(40, 20, 80, 0.92)");
  grad.addColorStop(1, "rgba(120, 60, 0, 0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // troféu simples desenhado com formas
  const tx = LARGURA / 2;
  const ty = 110 + Math.sin(estado.tempo * 2) * 4;
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(tx - 34, ty - 30);
  ctx.lineTo(tx + 34, ty - 30);
  ctx.quadraticCurveTo(tx + 30, ty + 20, tx, ty + 24);
  ctx.quadraticCurveTo(tx - 30, ty + 20, tx - 34, ty - 30);
  ctx.fill();
  ctx.fillRect(tx - 6, ty + 22, 12, 16);
  ctx.fillRect(tx - 22, ty + 36, 44, 8);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 5;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(tx + lado * 36, ty - 12, 12, lado > 0 ? -Math.PI / 2 : Math.PI / 2, lado > 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  }

  textoCentral("VITÓRIA!", 225, 64, "#ffd700");
  textoCentral("O Doutor Burocracia foi derrotado!", 268, 24, "#fff");
  textoCentral("Prefeitura, Shopping e Palácio: missão cumprida.", 300, 18, "#ddd");
  textoCentral("Dinheiro total: R$ " + estado.pontos.toLocaleString("pt-BR"), 350, 28, "#7CFC00");
  textoCentral(`Vidas restantes: ${estado.vidas}`, 385, 18, "#fff");
  textoCentral("Obrigado por jogar!", 430, 22, "#ffd700");
  if (estado.tempoTela > 1.5 && Math.floor(estado.tempo * 2) % 2 === 0) {
    textoCentral("Aperte Enter para jogar de novo", 475, 16, "#ddd");
  }
  ctx.globalAlpha = 1;
}

// Tela de FASE CONCLUÍDA (ou a tela final, na última fase)
function desenharVitoria() {
  const alpha = Math.max(0, Math.min(1, (estado.tempoTela - 1.2) / 0.5));

  if (ehUltimaFase()) {
    if (alpha > 0) desenharVitoriaFinal(alpha);
    desenharConfetes();
    return;
  }

  desenharConfetes();
  // o painel só aparece depois que a bandeira desce
  if (alpha === 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(LARGURA / 2 - 290, ALTURA / 2 - 120, 580, 230);
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  ctx.strokeRect(LARGURA / 2 - 290, ALTURA / 2 - 120, 580, 230);

  const total = fase.itens.length;
  textoCentral("Fase concluída!", ALTURA / 2 - 55, 52, "#ffd700");
  textoCentral(`Fase ${fase.numero} — ${fase.nome}`, ALTURA / 2 - 15, 20, "#fff");
  textoCentral("Dinheiro: R$ " + estado.pontos.toLocaleString("pt-BR"), ALTURA / 2 + 20, 22, "#7CFC00");
  textoCentral(`Notas: ${total - itens.length}/${total}   ·   Vidas: ${estado.vidas}`, ALTURA / 2 + 50, 18, "#fff");
  if (estado.tempoTela > 1.5 && Math.floor(estado.tempo * 2) % 2 === 0) {
    textoCentral("Aperte Enter para a próxima fase", ALTURA / 2 + 88, 16, "#ddd");
  }
  ctx.globalAlpha = 1;
}

// Confetes caindo (desenhados por cima de tudo)
function desenharConfetes() {
  for (const c of estado.confetes) {
    ctx.fillStyle = c.cor;
    ctx.fillRect(c.x, c.y, 6, 10 * Math.abs(Math.cos(c.giro)) + 2);
  }
}

// =====================================================================
// LOOP PRINCIPAL
// =====================================================================

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
    atualizarMoveis(passo);
    atualizarJogador(passo);
    restante -= passo;
  }

  atualizarItens();
  atualizarInimigos(dt);
  atualizarArmadilhas();
  atualizarChefe(dt);
  atualizarProcessos(dt);
  verificarChegada();
  atualizarCamera(dt);
}

function desenhar() {
  desenharCenario();
  desenharPlaca();
  desenharPredioFinal();
  desenharBandeira();
  desenharPlataformas();
  desenharMoveis();
  desenharArmadilhas();
  desenharItens();
  desenharInimigos();
  desenharChefe();
  desenharJogador();
  desenharProcessos();
  desenharTextos();
  desenharHUD();
  desenharHUDChefe();
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

iniciarJogo();
requestAnimationFrame(loop);
