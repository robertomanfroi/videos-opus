# Design — Reel editorial

## Em uma frase
Reel de pessoa falando que assume que foi *editado*: calmo, caprichado, cara de revista. Uma palavra
minúscula por vez, em sans, no meio da tela; as palavras que carregam o sentido viram serifa itálica na
cor de destaque. Cortes secos de aproximação a cada frase ou duas. Cards arredondados, chuva de
miniaturas, tira de filme, parede de reels, uma nota à mão com seta e pequenos momentos de interface.
Todo elemento ilustra exatamente o que está sendo dito e sai dentro da mesma frase.

## Cores
- `#ffffff` — texto sans, notas à mão
- cor de destaque (`perfil.json` → `cor_destaque`; padrão `#F4E27C`, amarelo manteiga claro) — palavras serifadas
- `#0d0d0d` — cards escuros
- `#f2ede6` — papel da parede de reels
- Sombras: suaves — `0 3px 22px rgba(0,0,0,.30)` no texto, `0 24px 60px rgba(0,0,0,.38)` nos cards

## Tipografia (todas OFL)
- Sans: Inter 600, minúscula, espaçamento −0.035em — legenda 92 px, linhas de pilha 104 px, apartes 42 px
- Voz serifada: Instrument Serif Italic — 124–132 px
- À mão: Caveat Bold — notas 86 px

## O que NÃO fazer
- Nada de contorno preto na legenda, nada de caixa ou faixa atrás das palavras
- Nada de fonte pesada tipo Archivo Black nem amarelo saturado `#FFD21F` (isso é o estilo celular)
- No máximo ~1 palavra serifada por frase, senão o destaque perde o sentido
- Nenhum elemento sobre o rosto; cards ficam ao lado ou acima da cabeça
- Nada de quique no texto; só as miniaturas usam `back.out`
