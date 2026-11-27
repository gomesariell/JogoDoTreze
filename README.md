# As Aventuras de Seu Fartura

Jogo de plataforma 2D no estilo clássico, feito com **HTML, CSS e JavaScript puro** (canvas), sem nenhuma biblioteca. Roda direto no navegador.

Protótipo desenvolvido com auxílio de IA (**Claude Code**), escrevendo o mínimo de código à mão: o jogo inteiro foi construído a partir dos prompts listados no fim deste arquivo.

## Descrição do projeto

Sátira política leve e bem-humorada, com personagens **100% fictícios**. O protagonista é **Seu Fartura** (chamado de "Nine" no jogo): um político cartoon de cabelo branco, com um tufinho de barba no queixo e só de cueca vermelha. Ele atravessa a cidade atrás de todo dinheiro que encontra pela frente, e o dinheiro vai parar... na cueca. Qualquer semelhança com pessoas reais é mera coincidência.

O jogo tem **3 fases** e um **chefão**:

| Fase | Visual | Desafio |
|---|---|---|
| 1 — Prefeitura | Dia ensolarado, tijolinhos e grama | Plataformas básicas e 4 Fiscais |
| 2 — Shopping | Pôr do sol, vidro azul e neon | Plataformas bem altas e 8 Fiscais |
| 3 — Palácio | Noite estrelada, mármore e tapete vermelho | Plataformas móveis sobre espinhos, espinhos que sobem e descem e o chefão **Doutor Burocracia** |

### Destaques

- **Física de plataforma** com aceleração, gravidade e pulo variável (segurar o W pula mais alto).
- **Dinheiro na cueca:** a cada 3 notas coletadas aparece uma notinha enfiada no elástico. A cueca fica estufada e, com bastante dinheiro, começam a escapar notas pelas pernas.
- **Fiscais** que patrulham, **espinhos**, **plataformas móveis** e um **elevador**.
- **Chefão Doutor Burocracia:**
  - tem barra de vida;
  - arremessa "processos" (papéis em arco) que precisam ser desviados;
  - é derrotado com 5 pisões na cabeça e fica mais rápido a cada pisão.
- Cenário com **parallax** (camadas que se movem em velocidades diferentes) e tema de cores próprio em cada fase.
- Telas de **Fase concluída**, **GAME OVER** (com checkpoint no chefão) e **tela final de vitória**.

## Como rodar

Não precisa instalar nada.

1. Baixe o projeto: clique em **Code → Download ZIP** no GitHub e extraia, ou clone com:
   ```bash
   git clone <url-deste-repositorio>
   ```
2. Abra a pasta do projeto e dê **dois cliques no `index.html`**. Ele abre no navegador (Chrome, Edge ou Firefox).
3. Clique na página, se precisar, e jogue.

**Opcional:** para rodar com um servidor local, abra o terminal na pasta do projeto e use um dos comandos abaixo. Depois acesse `http://localhost:8000`.
```bash
python -m http.server 8000
# ou
npx serve .
```

### Controles

| Tecla | Ação |
|---|---|
| A | Andar para a esquerda |
| D | Andar para a direita |
| W | Pular (segure para pular mais alto) |
| Enter ou R | Próxima fase (na vitória) / tentar de novo (no game over) |

### Objetivo

- **Fases 1 e 2:** chegue até o mastro da **bandeira de chegada**.
- **No caminho:** colete as notas (R$ 100 cada) e fuja dos Fiscais, dos espinhos e dos processos.
- **Vidas:** você tem 3. Cada dano tira uma e deixa o personagem piscando (invencível) por 1,5 s.
- **Game over:** sem vidas, você tenta a mesma fase de novo.
- **Fase 3:** termina derrotando o Doutor Burocracia. Pule na cabeça dele 5 vezes.

## Estrutura do projeto

```
├── index.html   # Página com o <canvas> do jogo; carrega fases.js e depois game.js
├── style.css    # Estilo da página (centraliza e emoldura o canvas)
├── fases.js     # DADOS das fases: cores, plataformas, notas, Fiscais, espinhos, chefão
├── game.js      # LÓGICA e DESENHO: loop, física, colisão, chefão, HUD e telas
├── README.md    # Este arquivo
└── CLAUDE.md    # Regras do projeto seguidas pela IA durante o desenvolvimento
```

## Como funciona

- **Loop do jogo:** `requestAnimationFrame` chama `atualizar(dt)` (lógica) e `desenhar()` (tela) cerca de 60 vezes por segundo. O `dt` é o tempo entre quadros, então o jogo roda na mesma velocidade em qualquer monitor.
- **Fases em dados:** `fases.js` tem o array `FASES`, um objeto por fase. As posições ficam em "pixels acima do chão", por exemplo `[x, acima, largura]`, e `carregarFase()` transforma isso em retângulos. **Para criar uma fase nova basta adicionar um objeto ao array.**
- **Colisão:** tudo é retângulo (AABB). O movimento é resolvido primeiro no eixo X (paredes) e depois no Y (chão e teto), em passos pequenos para não atravessar plataformas finas.
- **Física com "ajudinhas":**
  - *coyote time*: dá para pular logo depois de sair da beirada;
  - *buffer de pulo*: apertar o W um pouco antes de tocar o chão também vale.
- **Plataformas móveis:** a posição segue uma onda de seno. O jogador guarda em `jogador.sobre` a plataforma em que está pisando e anda junto com ela.
- **Chefão:** é uma pequena máquina de estados (`apresentando → andando ⇄ preparando → atordoado → derrotado`). O pisão vale quando o jogador está caindo e encosta na parte de cima dele.
- **Telas:** `estado.tela` alterna entre `"jogando"`, `"vitoria"` e `"gameover"`.
- **Gráficos:** tudo é desenhado com formas do canvas (retângulos, círculos, curvas). Não há nenhuma imagem externa.

## Arquivos .md utilizados

| Arquivo | Para que serve |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Regras do projeto lidas pela IA (Claude Code) a cada pedido: só HTML/CSS/JS puro, sem dependências, código simples e comentado em português, personagens 100% fictícios, `fases.js` só com dados, controles A/D/W, commits pequenos e frequentes. |
| [README.md](README.md) | Este arquivo: descrição, como rodar, como funciona e histórico de prompts. Atualizado a cada etapa. |

## Prompts utilizados

O desenvolvimento foi feito em etapas, um prompt por vez no **Claude Code**. Cada etapa terminou em um commit, que pode ser visto com `git log`. O enunciado do trabalho foi colado junto do primeiro prompt, como contexto.

**1. Estrutura inicial: canvas, loop e fundo** (commit `58927de`)
```
Crie um jogo de plataforma 2D simples mas com uma performance bonita, estilo Super Mario, usando apenas HTML, CSS e JavaScript puro (canvas), sem bibliotecas, rodando direto no navegador. Estrutura: index.html, style.css, game.js. Crie também um README.md explicando o projeto e um CLAUDE.md com as regras do projeto (código simples e comentado, sem dependências, personagens 100% fictícios). Tema: sátira política com um político fictício chamado "Seu Fartura" (roupa vermelha, barba branca, carregando um saco de dinheiro). Por enquanto, só monte o canvas, o loop do jogo e um fundo simples. Faça um commit inicial.
```

**2. Personagem, movimento e colisão** (commit `057d184`)
```
Adicione o personagem Nine como um retângulo vermelho com barba branca desenhada no canvas. Movimento com setas ou A/D, pulo com espaço, gravidade e colisão com o chão e plataformas. Só isso, bem funcionando. Atualize o README.md e faça um commit.
```

**3. Dinheiro, pontuação, inimigos e vidas** (commit `b865a33`)
```
Adicione itens de dinheiro espalhados pelas plataformas. Ao encostar, o item some e o saco de dinheiro do personagem aumenta, com pontuação na tela. Adicione 2 ou 3 inimigos simples (ex: "Fiscal") que andam de um lado para o outro; encostar neles tira uma vida. Atualize o README.md e faça um commit.
```

**4. Fase 1 "Prefeitura", bandeira e game over** (commit `b66d21c`)
```
Monte a Fase 1 com tema "Prefeitura": plataformas, dinheiro, inimigos e uma bandeira de chegada. Ao chegar, mostre "Fase concluída!". Adicione tela de game over ao perder todas as vidas. Commit.
```

**5. Sistema de fases, Fase 2 e Fase 3** (commit `c318df1`)
```
Crie um sistema de fases em arrays de dados. Fase 2 "Shopping" (mais inimigos e plataformas altas) e Fase 3 "Palácio" (plataformas móveis e armadilhas). Cada fase com seu fundo e cor. Commit.
```

**6. Chefão "Doutor Burocracia"** (commit `157afdf`)
```
No final da Fase 3, adicione um chefão fictício chamado "Doutor Burocracia", com barra de vida, que lança papéis ("processos") que o jogador precisa desviar. O jogador o derrota pulando em cima dele 5 vezes. Tela final de vitória. Commit.
```

**7. Novo visual do personagem e controles A/D/W** (commit `5d31c5d`)
```
1. Barba: diminua bastante o tamanho da barba branca. Ela deve ser pequena, só um pedaço curto no queixo, sem cobrir o peito.

2. Roupa: remova a roupa vermelha de corpo inteiro e o saco de dinheiro nas costas. O personagem agora aparece de cueca vermelha, em estilo cartoon simples e bem-humorado (desenho de canvas com formas básicas, nada realista), com pele em um tom neutro, braços e pernas simples.

3- As movimentações gostaria que mudasse para A esquerda, D direita, W pular
```

**8. Dinheiro aparecendo na cueca** (commit `3f07778`)
```
faltou a parte da cueca dele, conforme ele vai pegando o dinheiro vai aparecendo na cueca, e algumas notas aparecem saindo da cueca
```

**9. Revisão final e documentação** (commit final)
```
Revise o código, adicione comentários simples, deixe o README.md com instruções de como rodar e uma descrição do projeto, e liste no README quais prompts e arquivos .md foram usados. Faça o commit final.
```

## Progresso

- [x] Etapa 1 — Canvas, loop do jogo e cenário de fundo
- [x] Etapa 2 — Personagem andando e pulando, com gravidade e colisão
- [x] Etapa 3 — Itens de dinheiro, pontuação, Fiscais e vidas
- [x] Etapa 4 — Fase 1 "Prefeitura" com bandeira, "Fase concluída!" e GAME OVER
- [x] Etapa 5 — Sistema de fases em dados: Fase 2 "Shopping" e Fase 3 "Palácio"
- [x] Etapa 6 — Chefão "Doutor Burocracia" e tela final de vitória
- [x] Etapa 7 — Personagem cartoon de cueca, dinheiro na cueca e controles A/D/W
- [x] Etapa 8 — Revisão do código, comentários e documentação final
