# As Aventuras de Seu Fartura

Jogo de plataforma 2D no estilo clássico, feito com **HTML, CSS e JavaScript puro** (canvas), sem nenhuma biblioteca. Roda direto no navegador.

## Tema

Sátira política com um personagem **100% fictício**: **Seu Fartura**, um político cartoon de cabelo branco, um tufinho de barba no queixo e só de cueca vermelha, atrás de todo dinheiro que encontra pela frente. Qualquer semelhança com pessoas reais é mera coincidência.

## Como jogar

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Edge).

Não precisa instalar nada.

### Controles

| Tecla | Ação |
|---|---|
| A | Andar para a esquerda |
| D | Andar para a direita |
| W | Pular (segure para pular mais alto) |
| Enter ou R | Próxima fase (na vitória) / tentar de novo (no game over) |

### Objetivo

Atravesse cada fase até o **mastro da bandeira de chegada**. No caminho, colete as notas de dinheiro (R$ 100 cada) e fuja dos **Fiscais** e dos **espinhos**. Você tem 3 vidas: cada dano tira uma, empurra o personagem para trás e o deixa piscando (invencível) por 1,5 s. Sem vidas é **GAME OVER** e você tenta a mesma fase de novo. Chegando na bandeira aparece **"Fase concluída!"** e o Enter leva para a próxima.

No fim da Fase 3 não há bandeira: em frente ao Palácio espera o chefão **Doutor Burocracia**. Desvie dos **processos** (papéis) que ele arremessa e **pule na cabeça dele 5 vezes** para vencer o jogo e ver a tela final de vitória.

### Fases

| Fase | Tema e cores | Desafio |
|---|---|---|
| 1 — Prefeitura | Dia ensolarado, tijolinhos, grama | Plataformas básicas e 4 Fiscais |
| 2 — Shopping | Pôr do sol, vidro azul e neon, piso de cerâmica | Plataformas bem altas e 8 Fiscais (alguns lá em cima) |
| 3 — Palácio | Noite estrelada com lua, mármore e tapete vermelho | Plataformas móveis (horizontais e elevador) sobre campos de espinhos, espinhos que sobem e descem e o **chefão Doutor Burocracia** |

## Estrutura do projeto

```
├── index.html   # Página que contém o <canvas> e carrega os scripts
├── style.css    # Estilo da página (centraliza e emoldura o canvas)
├── fases.js     # DADOS das fases: cores do tema, plataformas, itens, inimigos...
├── game.js      # LÓGICA e DESENHO: loop, física, colisão, telas (serve para qualquer fase)
├── README.md    # Este arquivo
└── CLAUDE.md    # Regras do projeto usadas pela IA durante o desenvolvimento
```

## Como funciona

- **Loop do jogo:** usa `requestAnimationFrame`. A cada quadro o jogo chama `atualizar(dt)` (lógica) e `desenhar()` (tela). O `dt` é o tempo entre quadros, então a velocidade é a mesma em qualquer monitor.
- **Sistema de fases:** o arquivo `fases.js` tem o array `FASES`, um objeto por fase, só com dados:
  - `tema`: cores do céu, do sol ou da lua, das estrelas, das nuvens, dos morros, dos prédios, do chão e dos blocos;
  - arrays de `plataformas`, `moveis`, `armadilhas`, `itens` e `fiscais`;
  - posição da bandeira e qual prédio aparece no fim (`prefeitura`, `shopping` ou `palacio`).

  As posições são dadas em "pixels acima do chão", por exemplo `[x, acima, largura]`. A função `carregarFase(indice)` do `game.js` converte esses dados em retângulos que a física entende. **Para criar uma fase nova basta adicionar um objeto ao array**, sem mexer na lógica.
- **Cenário com parallax e tema:** céu em degradê, sol ou lua (com estrelas piscando à noite), nuvens, morros, cidade e chão. Cada camada se move numa velocidade diferente em relação à câmera, criando profundidade, e todas usam as cores do tema da fase.
- **Personagem (Nine):** desenhado em estilo cartoon com formas simples do canvas: cabeça redonda com cabelo branco, um tufinho curto de barba branca no queixo, tronco com barriguinha, **cueca vermelha** e braços e pernas que balançam ao andar. O rosto e a barriga viram para o lado em que ele anda.
- **Física:** aceleração horizontal, gravidade e pulo. Para o controle ficar mais justo, há três ajudas:
  - *coyote time*: dá para pular logo depois de sair da beirada;
  - *buffer* de pulo: apertar o W um pouco antes de tocar o chão também vale;
  - pulo variável: soltar o W cedo faz um pulo mais baixo.
- **Colisão:** tudo é retângulo (AABB). O movimento é resolvido primeiro no eixo X (paredes) e depois no eixo Y (chão e teto), em passos pequenos para nunca atravessar plataformas finas.
- **Plataformas móveis:** a posição segue uma onda de seno (`base + sin(t * velocidade) * distancia`), no eixo X ou Y. O jogador guarda em `jogador.sobre` a plataforma em que está pisando e é deslocado junto com ela a cada passo.
- **Armadilhas (espinhos):** encostar tira uma vida. As que têm `periodo` sobem e descem: ficam ativas em cerca de metade do ciclo.
- **Itens de dinheiro:** ao encostar, a nota sai da lista, a pontuação sobe R$ 100 e aparece um "+R$100" flutuante.
- **Inimigos (Fiscais):** patrulham de um lado para o outro entre `min` e `max`, no chão ou em cima de plataformas.
- **Chefão (Doutor Burocracia):** personagem fictício de terno cinza, cartola, óculos redondos, bigodão e um carimbo gigante. Ele é definido nos dados da fase (`chefao` em `fases.js`) e controlado por uma pequena **máquina de estados**:
  1. `esperando`: até o jogador passar de `arenaX`. Aí a câmera trava mostrando a arena, o jogador não pode mais voltar e é salvo um **checkpoint** (no game over você recomeça na porta da arena).
  2. `apresentando`: faixa "⚠ CHEFÃO" e barra de vida com 5 segmentos no topo da tela.
  3. `andando` ⇄ `preparando`: ele anda de um lado para o outro e, de tempos em tempos, levanta o carimbo e lança de 2 a 4 **processos**. São papéis que voam em arco com gravidade, mirando onde o jogador está, e tiram uma vida se encostarem.
  4. `atordoado`: depois de um pisão ele pisca por 1 s com estrelinhas girando e não causa dano.
  5. `derrotado`: com a vida em zero, ele tomba e a fase termina.

  O **pisão** vale quando o jogador está caindo e os pés estão na parte de cima do chefão: ele perde 1 de vida e o jogador quica para cima. Encostar de lado tira uma vida do jogador. A cada pisão o chefão fica mais rápido e lança mais papéis.
- **Telas:** `estado.tela` controla o momento do jogo.
  - `"jogando"`: o jogo normal.
  - `"vitoria"`: a bandeira desce, caem confetes e aparece "Fase concluída!". Ao derrotar o chefão da última fase aparece a **tela final de vitória**, com troféu, dinheiro total e "Obrigado por jogar!".
  - `"gameover"`: aparece a tela de GAME OVER. O dinheiro volta ao valor do início da fase e as vidas são recarregadas.
- **HUD:** dinheiro (R$), notas coletadas na fase, corações de vida e "Fase N/3 — Nome". No começo de cada fase aparece uma faixa com o nome dela.

## Progresso

- [x] Etapa 1 — Canvas, loop do jogo e cenário de fundo
- [x] Etapa 2 — Personagem andando e pulando, com gravidade e colisão com chão e plataformas
- [x] Etapa 3 — Itens de dinheiro, pontuação, inimigos (Fiscais) e vidas
- [x] Etapa 4 — Fase 1 "Prefeitura" com bandeira de chegada, tela de "Fase concluída!" e GAME OVER
- [x] Etapa 5 — Sistema de fases em dados (`fases.js`): Fase 2 "Shopping" e Fase 3 "Palácio" com plataformas móveis e armadilhas
- [x] Etapa 6 — Chefão "Doutor Burocracia" com barra de vida, processos arremessados e tela final de vitória
- [ ] Etapa 7 — Menu inicial, sons e ajustes finais

## Desenvolvimento

Projeto desenvolvido com auxílio de IA (Claude Code), escrevendo o mínimo de código à mão. As regras dadas à IA estão em [CLAUDE.md](CLAUDE.md).
