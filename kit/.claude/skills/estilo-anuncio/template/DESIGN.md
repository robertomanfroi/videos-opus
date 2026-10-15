# Design — estilo anúncio

## Ideia
Anúncio com a pessoa falando, em tela cheia. Os primeiros ~5 s têm UMA headline (fonte de título,
linha branca + linha na cor de destaque) e mais nada. Depois, a zona dos esquemas mostra um esquema
animado do que ela está dizendo — fluxos, antes/depois, não ✕ / sim ✓, telas de app simples,
quadros reais e prints — uma ideia por vez, trocando na palavra falada. O esquema ILUSTRA; não repete
a frase (a legenda palavra a palavra já diz). Rótulos com 1–3 palavras. Entradas curtas e firmes;
nada cobre o rosto.

## Zona dos esquemas (reel.json)
- `topo` (padrão): de y 280 até o topo da cabeça. Faixa escura suave descendo do topo.
- `peito`: quando a cabeça está alta no quadro (topo da cabeça acima de y ≈ 450, comum em vídeo de carro
  ou selfie de perto). Faixa escura entre o queixo e y 1248; esquemas logo abaixo do queixo; legenda no fim da faixa.

## Cores
- `#ffffff` — texto
- destaque (`perfil.json cor_destaque`, padrão amarelo `#FFD21F`) — linha da headline, selos, pontos que andam nas setas, gráficos
- nó da IA (`perfil.json cor_ia`, padrão violeta `#7C6CF2`)
- `#ff453a` carimbos ✕ e problemas · `#30d158` carimbos ✓ e resultados · `#5ac8fa` / `#e535e5` acentos secundários de interface
- faixa escura `rgba(0,0,0,.66)` → transparente; painéis `rgba(16,16,19,.92)` com borda de 1 px clara
- anel do Instagram `#feda75 → #d62976 → #4f5bd5` (só em avatar de mock)

## Tipografia (todas OFL)
- Archivo Black (ou `perfil.json fonte_titulo`) — headline (90–125 px), títulos e rótulos dos esquemas, legenda (46 px)
- Inter — texto de interface dentro dos mocks (pedidos, nomes de arquivo, chips)

## Área segura (anúncios da Meta no Reels)
- 1080×1920: texto só dentro de x 65–1015, y 270–1248 (14 % em cima, 35 % embaixo e 6 % dos lados livres)
- Decoração (faixa escura, sombra de painel) pode passar do limite

## O que NÃO fazer
- Esquema nos primeiros ~5 s (só headline); bloco de texto que só repete a legenda
- Texto, número, selo, CTA ou legenda fora da área segura
- Qualquer coisa cobrindo o rosto
- Logo, capa, número de seguidores, faturamento ou resultado inventado (só perfil.json e prints reais da aluna)
- Imagem de exemplo esquecida; marca de terceiros no vídeo
- Ficar parado muito tempo sem troca; piscar ou tremer a tela
