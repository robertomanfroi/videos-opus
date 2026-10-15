# Design — Reel explicativo (estilo-explicativo)

## Ideia
Reel que explica um mecanismo ("quem manda de verdade", "pra onde vai o dinheiro", "como isso funciona").
Sóbrio e confiável: a apresentadora conduz a história, material real prova, UM diagrama chapado explica
e a edição nunca compete com o argumento. Material de apoio entra numa faixa 16:9 no topo com uma etiqueta
pequena de contexto; a legenda são frases curtas numa caixa escura opaca, no mesmo lugar o vídeo inteiro;
o mecanismo é desenhado em UM plano claro cujos elementos mudam no lugar, passo a passo.

## Cores
- `#0f1a24` — caixa da legenda (100 % opaca); etiquetas de contexto em `#111`
- `#ffffff` — texto da legenda
- `#fbfbfa` — plano do diagrama (quase branco)
- `#1c2733` — texto e setas do diagrama
- `--accent` — a ÚNICA cor de destaque (quem ganha / o dinheiro / a relação nova).
  Vem de `perfil.json → cor_destaque`; se vazio, verde `#1f7a63` (o amarelo padrão some no fundo claro).
  Nunca mais de uma cor de destaque.
- `#5d6670` — rótulos secundários e ressalvas ("Sujeito a aprovação.")

## Tipografia
- Só Inter (OFL). Legenda SemiBold 46 px, 1–2 linhas. Nós do diagrama SemiBold 88 px, espaçamento apertado;
  rótulos de relação Medium 34 px; rótulo do passo Medium 38 px em caixa alta, espaçado .2em; subtítulos Regular 32 px.
- Modo palavra (`reel.json {"captions":"words"}`): Archivo Black 86 px, branca, sombra suave (nunca contorno).

## Layout (1080 × 1920)
- Faixa de apoio: y 0–668 (16:9 + margem). Apresentadora abaixo dela. Etiqueta no canto superior esquerdo (56, 52). Crédito no canto inferior direito.
- Legenda: topo da caixa em ~1545 px (terço inferior, acima da interface do Instagram), centralizada, até 900 px de largura.
- Diagrama: rótulo do passo em y 118, ressalva em y 180, conteúdo entre y 450 e 1300, rodapé livre para a legenda.

## O que NÃO fazer
- Nada de legenda karaokê colorida, emoji, destaque amarelo no texto da legenda.
- Nada de zoom, slide, whoosh ou movimento de câmera dentro do diagrama; nada de caixa em volta dos nós (o texto É o nó).
- Nenhuma imagem de IA apresentada como lugar real, documento, logo, tela de app. Ilustração de IA é genérica e leva
  a etiqueta `ILUSTRAÇÃO`. Material de arquivo leva o ano.
- Nada de um diagrama novo por passo: um plano por mecanismo, mudando no lugar.
- Nada de logos de terceiros desenhados ou "parecidos". Se a marca precisa aparecer, só em material real.
