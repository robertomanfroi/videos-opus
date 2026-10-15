# Design — Vídeo colagem (vertical)

## Em uma frase
Cada frase vira um OBJETO fazendo alguma coisa, entrando na palavra que o nomeia. Algo novo a cada 1–2,5 s.
Pessoas, marcas e lugares citados aparecem com imagem real. Títulos grandes ATRÁS da cabeça (recorte da pessoa),
cards 3D com borda branca brilhando, prints reais em papel quadriculado, carimbos vermelhos, chips, itens
empilhados com arcos azuis, celular com a tela trocando, flashes de luz suaves.

## Tela
1080 × 1920, 30 fps. Área segura do Instagram: x 65–1015, y 270–1248. Texto e imagem-chave dentro dela;
só fundos passam. Topo: y 280 → topo da cabeça. Cenas por cima: y 280–1080. Legenda no peito, abaixo do queixo.

## Cores
- `#070b16` / grade azul — cena "navy" (revelação de nome, comparação)
- `#2f7bff` / `#6aa8ff` — brilho dos cards, chips, arcos (estrutura)
- `#ff2d3a` — carimbo, X neon, seta de marcação
- cor de destaque (`perfil.json` → `cor_destaque`, padrão `#FFD21F`) — chip `.yel` e bloco grande `.yel`
- `#f3f3f1` + grade cinza — papel das provas (legenda vira escura com `capPapel`)

## Tipografia (todas OFL)
- Títulos, chips, carimbos e legenda: fonte de título (Archivo Black ou `fonte_titulo` do perfil), MAIÚSCULAS nos títulos
- Legenda: 58 px, contorno fino `rgba(0,0,0,.55)`; bloco grande 96 px com brilho
- Etiquetas (`.tag`), subitens: Inter 600

## Movimento
Suave, nunca pulando: flashes ≤ .45, aproximação 0,7 s inOut, `back.out(1.3)` nos pops, tremor pequeno no carimbo.
Apresentadora sob uma cena: só escurece (brightness .72), nunca desfoca.

## O que NÃO fazer
- Nada de imagem sem fonte clara; nada de número, manchete ou print inventado.
- Nada de logo desenhado "parecido". Marca só com imagem real.
- Nada de texto solto sobre o rosto: listas ficam num `.panel` opaco.
- Nunca mais de ~2,5 s sem algo novo; nunca uma colagem parada > 2 s.
- Sem Advercase (fonte comercial).
