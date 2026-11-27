# As Aventuras de Seu Fartura

Jogo de plataforma 2D no estilo clássico, feito com **HTML, CSS e JavaScript puro** (canvas), sem nenhuma biblioteca. Roda direto no navegador.

## Tema

Sátira política com um personagem **100% fictício**: **Seu Fartura**, um político de roupa vermelha e barba branca que anda por aí carregando um saco de dinheiro. Qualquer semelhança com pessoas reais é mera coincidência.

## Como jogar

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Edge).

Não precisa instalar nada.

### Controles

| Tecla | Ação |
|---|---|
| ← → ou A / D | Andar |
| Espaço | Pular (segure para pular mais alto) |
| R ou Enter | Recomeçar (nas telas de vitória ou game over) |

### Objetivo

**Fase 1 — Prefeitura:** atravesse a cidade até a Prefeitura e encoste no **mastro da bandeira de chegada**. No caminho, colete as notas de dinheiro (cada uma vale R$ 100) e fuja dos **Fiscais**. Você tem 3 vidas: cada vez que encosta num Fiscal perde uma, é empurrado para trás e fica alguns instantes piscando (invencível). Sem vidas, é **GAME OVER**. Chegando na bandeira, aparece **"Fase concluída!"** com o resumo da fase.

## Estrutura do projeto

```
├── index.html   # Página que contém o <canvas> do jogo
├── style.css    # Estilo da página (centraliza e emoldura o canvas)
├── game.js      # Toda a lógica: loop do jogo, cenário, personagem...
├── README.md    # Este arquivo
└── CLAUDE.md    # Regras do projeto usadas pela IA durante o desenvolvimento
```

## Como funciona

- **Loop do jogo:** usa `requestAnimationFrame`. A cada quadro o jogo chama `atualizar(dt)` (lógica) e `desenhar()` (tela). O `dt` é o tempo entre quadros, então a velocidade é a mesma em qualquer monitor.
- **Cenário com parallax:** céu em degradê, sol, nuvens, morros, cidade e chão. Cada camada se move numa velocidade diferente em relação à câmera, criando sensação de profundidade.
- **Personagem (Nine):** desenhado com formas do canvas — corpo retangular vermelho, rosto, barba branca e pernas que balançam ao andar.
- **Física:** a cada passo o jogo aplica aceleração horizontal, gravidade e o pulo. Inclui *coyote time* (dá para pular logo após sair da beirada), *buffer* de pulo (apertar espaço um pouco antes de tocar o chão também vale) e pulo variável (soltar o espaço cedo faz um pulo mais baixo).
- **Colisão:** jogador e plataformas são retângulos (AABB). O movimento é resolvido primeiro no eixo X (paredes) e depois no eixo Y (chão e teto). O quadro é dividido em passos pequenos para nunca atravessar plataformas finas.
- **Câmera:** segue o jogador suavemente pela fase (4000 px de largura).
- **Fase 1 — Prefeitura:** todos os dados da fase (plataformas, notas, Fiscais, posição da bandeira e do prédio) ficam num único objeto `FASE_1` no `game.js`. As posições são dadas em "pixels acima do chão", então é fácil editar ou criar novas fases. A fase começa com uma faixa "FASE 1 — PREFEITURA" e uma placa de estrada, passa por plataformas e uma escadaria, e termina no prédio da Prefeitura (colunas, frontão, relógio e bandeira da cidade fictícia).
- **Telas do jogo:** a variável `estado.tela` controla em que momento o jogo está: `"jogando"`, `"vitoria"` ou `"gameover"`.
  - **Vitória:** encostar no mastro desliga o controle, a bandeira quadriculada desce, caem confetes e aparece o painel "Fase concluída!" com dinheiro, notas e vidas.
  - **Game over:** ao perder a última vida o jogo congela e aparece a tela "GAME OVER".
  - Nas duas telas, R ou Enter chama `reiniciarJogo()`, que volta tudo ao estado inicial.
- **Itens de dinheiro:** 28 notas flutuando sobre as plataformas e o chão. Quando o retângulo do jogador encosta numa nota, ela é removida da lista, a pontuação sobe R$ 100 e aparece um "+R$100" flutuante. O **saco de dinheiro** nas costas do personagem cresce a cada nota coletada.
- **Inimigos (Fiscais):** 4 Fiscais patrulham de um lado para o outro entre dois limites (três no chão e um em cima de uma plataforma). Encostar neles tira uma vida e dá 1,5 s de invencibilidade.
- **HUD:** mostra o dinheiro (R$), quantas notas foram coletadas, os corações de vida e o nome da fase.

## Progresso

- [x] Etapa 1 — Canvas, loop do jogo e cenário de fundo
- [x] Etapa 2 — Personagem andando e pulando, com gravidade e colisão com chão e plataformas
- [x] Etapa 4 — Itens de dinheiro, pontuação, inimigos (Fiscais) e vidas
- [x] Etapa 5 — Fase 1 "Prefeitura" com bandeira de chegada, tela de "Fase concluída!" e GAME OVER
- [ ] Etapa 6 — Menu inicial e novas fases

## Desenvolvimento

Projeto desenvolvido com auxílio de IA (Claude Code), escrevendo o mínimo de código à mão. As regras dadas à IA estão em [CLAUDE.md](CLAUDE.md).
