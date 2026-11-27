# As Aventuras de Seu Fartura

Jogo de plataforma 2D no estilo clássico, feito com **HTML, CSS e JavaScript puro** (canvas), sem nenhuma biblioteca. Roda direto no navegador.

## Tema

Sátira política com um personagem **100% fictício**: **Seu Fartura**, um político de roupa vermelha e barba branca que anda por aí carregando um saco de dinheiro. Qualquer semelhança com pessoas reais é mera coincidência.

## Como jogar

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Edge).

Não precisa instalar nada.

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

## Progresso

- [x] Etapa 1 — Canvas, loop do jogo e cenário de fundo
- [ ] Etapa 2 — Seu Fartura na tela, andando e pulando
- [ ] Etapa 3 — Plataformas e colisão
- [ ] Etapa 4 — Itens, inimigos e pontuação
- [ ] Etapa 5 — Menu, fases e fim de jogo

## Desenvolvimento

Projeto desenvolvido com auxílio de IA (Claude Code), escrevendo o mínimo de código à mão. As regras dadas à IA estão em [CLAUDE.md](CLAUDE.md).
