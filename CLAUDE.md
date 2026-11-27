# Regras do projeto — As Aventuras de Seu Fartura

## Tecnologia
- Apenas **HTML, CSS e JavaScript puro**. Desenho feito no `<canvas>`.
- **Sem dependências**: nada de bibliotecas, frameworks, npm, build ou CDN.
- O jogo deve abrir com um duplo clique no `index.html`.
- Manter a estrutura de arquivos: `index.html`, `style.css`, `fases.js`, `game.js`. Só criar novos arquivos se for realmente necessário.
- `fases.js` contém **apenas dados** (array `FASES`); toda lógica e desenho fica em `game.js`. Uma fase nova deve ser só um objeto novo no array, sem mudar a lógica.

## Código
- Código **simples e comentado**, em português, fácil de um iniciante entender.
- Preferir funções pequenas com nomes claros (`desenharChao`, `atualizar`...).
- Toda movimentação usa `dt` (tempo entre quadros) para rodar igual em qualquer monitor.
- Gráficos desenhados com formas do canvas (retângulos, círculos, caminhos), sem imagens externas por enquanto.
- Evoluir em passos pequenos: cada funcionalidade nova deve funcionar antes de começar a próxima.

## Conteúdo
- Tema: sátira política **leve e bem-humorada**.
- **Todos os personagens são 100% fictícios.** Não usar nomes, rostos, partidos, números, slogans ou símbolos de pessoas ou partidos reais.
- Protagonista: **Seu Fartura** (no jogo, "Nine") — cartoon simples de cueca vermelha, pele em tom neutro, cabelo branco e um tufinho curto de barba branca no queixo. Visual bem-humorado, nada realista.
- Controles: A (esquerda), D (direita), W (pular); Enter/R nas telas de vitória e game over.
- Sem conteúdo ofensivo, discurso de ódio ou ataques a pessoas reais.

## Git
- Commits pequenos e frequentes, com mensagens claras em português descrevendo o que mudou.
- Atualizar a seção "Progresso" do README.md a cada etapa concluída.
