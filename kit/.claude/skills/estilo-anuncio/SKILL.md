---
name: estilo-anuncio
description: Edita uma gravação vertical (pessoa falando para a câmera) em um ANÚNCIO / criativo para Meta Ads — headline nos primeiros 5 s e depois ESQUEMAS animados que mostram o que a pessoa diz (fluxos, antes/depois, não ✕ / sim ✓, telas de app, prints reais com contador), legenda palavra a palavra, zonas seguras dos anúncios da Meta, sem pausas nem repetições. Use quando a skill `editar` delegar para o estilo anúncio, ou quando a aluna pedir "anúncio", "criativo", "ad", "para tráfego", "patrocinado", "para vender". Para Reel orgânico use estilo-celular ou estilo-editorial.
---

# Estilo anúncio

**A regra única:** a parte de cima (ou a faixa do peito) MOSTRA o mecanismo do que ela fala; nunca
redigita a frase — a legenda já diz. Cada ideia falada vira um esquema que troca na palavra.

Antes de começar leia `../perfil-criadora.md` e carregue (ou crie) o `perfil.json` da raiz. Pergunte também,
numa mensagem só, o que faltar: **nome do produto/oferta, a chamada final (CTA: "comenta X" ou "clica no link") e
as imagens reais que ela quer mostrar** (capa do produto, prints de resultado com os números, quadros de vídeos dela).
Guarde as imagens em `assets/img/` do projeto. Nunca invente logo, capa, número, preço ou resultado.

`src/index.template.html` (copiado de `template/index.template.html`) é um catálogo de 15 esquemas prontos, com
tempos de exemplo. Mantenha o CSS e os helpers; reescreva a headline e escolha/retime os esquemas para a fala dela;
**apague** os blocos que não usar. O modelo antigo, só com texto, está em `src/classico.template.html` (use só se
ela pedir esse visual: copie por cima do `index.template.html`).

## Estrutura: headline e depois esquemas (obrigatório)

1. **0 → ~5 s: só a headline.** Um título grande (linha branca + linha na cor de destaque, ~90–125 px, sublinhado
   opcional varrendo a palavra-chave). Sem esquema, sem tela de app, sem imagem.
2. **Depois da headline: um esquema por ideia falada, trocando na palavra.** Texto dentro do esquema só em
   rótulos curtos (1–3 palavras: "antes", "com IA", "seu negócio").
3. Quando o produto vende um processo, mostre **a complexidade do jeito antigo ao lado da simplicidade do novo**
   (linha do tempo lotada + relógio + ✕ × um pedido + ✓).

Esquemas do catálogo (reuse e retime):

| Ideia falada | Esquema | Bloco |
|---|---|---|
| "fiz X → passei por Y → virou Z" | card de celular (quadro real) → seta tracejada + ponto andando → nó redondo → seta → card resultado | B2 |
| tira erros / pausas | onda de áudio: partes-problema ficam azul/vermelho com etiqueta e somem; relógio diminui | B3 |
| acontece sozinho | celular onde os elementos aparecem sozinhos + contador "0 cliques" | B4 |
| jeito antigo × jeito novo | dois painéis: linha do tempo lotada + relógio + ✕ × um pedido + ✓ | B5 |
| objeções ("sem tempo", "não sei") | **Não ✕ / Sim ✓**: cards de problema levam ✕ → seta → card solução com ✓ | B6 |
| dúvida → prova | balão com a dúvida → card de teste com ✓ | B7 |
| "precisa explicar direito" | pedido genérico → resultado cinza ✕ × instrução detalhada sendo digitada ✓ | B8 |
| lista do que entrega | vagas tracejadas que se enchem com imagens reais ou ícones, uma por item falado | B9 |
| curso / produto | capa real + chips voando para dentro + gráfico subindo | B10 |
| prova social | prints reais com contador de visualizações subindo (recorte o contador do próprio print) | B11 |
| copiar um estilo | referência → nó → o quadro dela recebendo o mesmo estilo + "= mesmo estilo" | B12 |
| oferta / lançamento | etiqueta + carimbo → post com barra de envio → "✓ publicado" | B13 |
| três passos ("grava, edita, posta") | três nós acendendo um em cada palavra | B14 |
| CTA de comentário | caixa de comentário digitando a palavra ("EU QUERO") + card de direct | B15 |
| CTA de link | barra branca "Saiba mais ›" pulsando | B16 |

Antes de renderizar, leia cada bloco e pergunte: "a zona MOSTRA a ideia, ou só repete a legenda?"

Números: os contadores de B3, B5 e B11 vêm com marcadores (`__B3_SEG_ANTES__`, `__B5_SEG_NOVO__`, `__VIEWS_PRINT_1__`…).
O `montar.mjs` para com erro enquanto sobrar algum. Troque pelo número REAL (dito por ela ou lido do print) ou apague o contador.

Imagens: `bruto.jpg` sai sozinho do vídeo (`novo-anuncio.mjs`). Todo o resto (capa, prints, quadros de outros
vídeos, referência) só se a aluna mandar. Faltou imagem → apague ou redesenhe o esquema (ícone desenhado em SVG,
card de texto); nunca deixe vaga de exemplo. Nome/@ e avatar vêm do `perfil.json` (`montar.mjs` troca
`__USUARIO__`, `__NOME__` e põe o avatar; sem foto, um círculo com a inicial).

## Zonas seguras (anúncio da Meta no Reels — obrigatório)

Deixe livres **14 % em cima, 35 % embaixo e 6 % de cada lado**. Em 1080×1920 a caixa segura é
**x 65–1015, y 270–1248**: toda palavra, número, selo, CTA, legenda e rótulo de esquema fica dentro dela (inclusive
no pico de escala/rotação das animações). Só decoração (faixa escura, sombra de painel) pode passar. Confira com
`$K --em video-projects/<slug> node ../../$E/scripts/zonas-seguras.mjs renders/<arquivo>.mp4 assets/seguras.jpg t1 t2 …` (caixa vermelha em cada quadro).

## Zona dos esquemas (`reel.json` na raiz do projeto)

Os blocos são desenhados numa área de 1080×340 e o `montar.mjs` posiciona e escala essa área:

| Enquadramento | `reel.json` |
|---|---|
| cabeça mais baixa, sobra espaço em cima (topo da cabeça abaixo de y ≈ 450) | `{"faixa":"topo","zonaTop":280,"zonaAltura":<topo da cabeça − 290>,"capTop":<queixo + 20, máx. 1165>}` |
| cabeça alta no quadro (selfie de perto, carro) | `{"faixa":"peito","zonaTop":<queixo + 20>,"zonaAltura":<≈ 1150 − zonaTop>,"capTop":<zonaTop + zonaAltura + 10, máx. 1165>}` |

No modo `peito` uma faixa escura cobre do queixo até o fim da área segura, e esquemas + legenda ficam sobre ela.
A legenda (80 px de altura) tem de terminar até y 1248.

## Visual

| Elemento | Regra |
|---|---|
| Faixa escura | `topo`: degradê `rgba(0,0,0,.66)` → transparente descendo do topo. `peito`: faixa escura do queixo até ~y 1300. |
| Kit de esquemas | painéis `rgba(16,16,19,.92)` raio 22 com borda clara de 1 px; cards de celular 160×284 (9:16) com quadros reais; nó redondo da IA na cor `cor_ia`; setas tracejadas com ponto na cor de destaque andando; carimbos redondos ✕ vermelho `#ff453a` e ✓ verde `#30d158` que estouram na palavra; textos de interface em Inter. Decoração repetida (barras da onda, clipes da linha do tempo) usa o `rnd()` com semente do template — **nunca** `Math.random` nem `from:"random"` do GSAP. |
| Tipografia | fonte de título (Archivo Black ou `fonte_titulo` do perfil) na headline, rótulos e legenda. Branco; destaque na cor `cor_destaque` (padrão amarelo `#FFD21F`). |
| Movimento | entradas curtas: sobe + aparece em 0,45–0,6 s (`power3.out` / `expo.out`); carimbos com `back.out`; contadores correndo; barras enchendo; setas crescendo. Saídas em 0,28 s. Esquemas trocam na palavra falada. |
| Legenda | uma palavra por vez, 46 px, branca com contorno escuro, logo abaixo do queixo (`capTop` em `reel.json`). |
| CTA | caixa de comentário digitando a palavra + card de direct, ou barra branca "Saiba mais ›". |

Cores, tamanhos e proibições: `template/DESIGN.md` (copiado para cada projeto).

## Regras de corte

- Tire toda pausa (−30 dB / 0,15 s) e toda repetição; ≤ 90 s se possível. Frase dita duas vezes: fique com a
  ÚLTIMA (a corrigida). Repetição de ênfase ("vale, vale") não é erro.
- Anúncio corta **sem J/L** (`cortar.mjs --no-jl`): a imagem acompanha a fala exatamente.
- Depois de cortar, re-transcreva o `clean.mp4` e leia procurando frase dobrada e palavra cortada. A transcrição
  inteira ESCONDE repetições: varra também o vídeo todo em janelas curtas, numa chamada só,
  `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 --janelas 1,3,5,7,…` (a cada 2 s até o fim), e compare.

## Regras de velocidade (o PC da aluna pode ser lento — valem acima dos passos abaixo)

- A transcrição do `novo-anuncio.mjs` já é `--rapido` (só para escolher o corte). A re-transcrição do `clean.mp4`
  (a da legenda) usa o modelo preciso — uma vez por versão do corte.
- Confira emendas e repetições em UMA chamada com `--janelas`. Nunca uma janela por vez.
- Não renderize rascunho inteiro só para olhar quadros. Use `$K --em video-projects/<slug> hyperframes snapshot --at t1,t2,… -o snapshots`
  (um tempo por esquema) e olhe os PNGs. Renderize UMA vez, quando os snapshots estiverem certos.
- O encoder do raw.mp4 / clean.mp4 é escolhido sozinho. Não mude.
- Antes de cada etapa lenta, avise numa linha curta em português o que está rodando ("Renderizando o anúncio —
  pode levar uns minutos."), para a espera nunca parecer travamento.

## Fluxo (todo comando pelo lançador `$K`)

`E=.claude/skills/estilo-anuncio` · `M=.claude/skills/_motor` · `K` = o lançador da skill videos-opus: `"<VO>\bin\node.exe" "<VO>\scripts\video.mjs" kit`, onde `<VO>` é a pasta da skill videos-opus (a que tem o `SKILL.md` que mandou você ler este guia). Ele põe os programas portáteis no caminho e roda na pasta de trabalho do kit (`$K pasta` mostra qual é; projetos ficam em `<pasta>\video-projects\<slug>`). `$K --em <subpasta> …` roda dentro dela. Nada de `npx`, Python ou `node` solto: tudo passa pelo `$K`.

1. **Projeto + transcrição rápida**: `$K node $E/scripts/novo-anuncio.mjs "<video>" <slug>` → `video-projects/<slug>/`
   com raw.mp4, raw.json, `assets/palavras.txt`, os dois modelos, `assets/img/bruto.jpg` e `reel.json`.
2. **Enquadramento**: folha de contato com grade
   (`$K --em video-projects/<slug> ffmpeg -i assets/raw.mp4 -vf "fps=1/5,drawbox=x=65:y=270:w=950:h=979:color=red:t=6,drawgrid=w=1080:h=100:color=yellow@0.5:t=2,scale=270:-1,tile=7x2" -frames:v 1 assets/contato.png`)
   e OLHE: linhas amarelas a cada 100 px, caixa vermelha = área segura. Ache o topo da cabeça e o queixo e escreva
   `reel.json` (tabela "Zona dos esquemas").
3. **Corte**: leia `assets/palavras.txt`, escreva `assets/keeps.json`; dentro de `assets/`: `$K --em video-projects/<slug>/assets node ../../../$M/cortar.mjs --no-jl`.
4. **Conferência**: na raiz do projeto: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 assets/transcript.json --nomes "<termos do perfil>"`;
   leia; faça a varredura `--janelas`; ajuste o corte até ficar limpo; palavra ouvida errado → `assets/caption-fixes.json`.
5. **Composição**: reescreva `src/index.template.html`: headline em 0–5 s, depois um esquema por ideia falada;
   tempos de `$K --em video-projects/<slug> node ../../$M/ancoras.mjs "frase" …` (raiz do projeto); imagens reais em `assets/img/`.
6. **Montagem + checagem**: `$K --em video-projects/<slug> node ../../$E/scripts/montar.mjs` (para com erro se sobrou marcador ou imagem faltando) →
   `$K --em video-projects/<slug> hyperframes lint` (0 erros) → `$K --em video-projects/<slug> hyperframes snapshot --at …` em CADA esquema e OLHE (rosto nunca coberto,
   rótulos legíveis, números certos, nada de exemplo sobrando) → `zonas-seguras.mjs` sobre os snapshots/tempos →
   render e entrega (pelo lançador, na pasta de trabalho do kit): `$K node $M/renderizar.mjs <slug>` — confere as travas, renderiza em segundo plano, valida e já copia para `prontos/`. Saída 3 = ainda renderizando: rode `$K node $M/renderizar.mjs <slug> --esperar` até sair PRONTO. Nunca rode `$K --em video-projects/<slug> hyperframes render` direto nem `prontos.mjs` à mão. Depois `zonas-seguras.mjs renders/<slug>-final.mp4 …` nos tempos dos esquemas.
7. **Entrega**: responda em português, curto: onde está,
   o que foi cortado, imagens usadas, o que ficou em dúvida, e que o vídeo respeita a área segura da Meta.
   Nunca publique nem suba anúncio.

## Variações de anúncio (quando a aluna pedir "mais de uma versão")

Mesmo corte, outra headline e/ou outro CTA: copie o projeto (`video-projects/<slug>-v2`), troque só o bloco B1 e o
CTA, monte, snapshot da headline e render. Não refaça corte nem transcrição.

## Ajustes depois da entrega

"tira a parte do preço" → `keeps.json`, passos 3–4, recalcule os tempos dos esquemas depois do trecho com `ancoras.mjs` e passo 6. "troca a headline" → B1 e passo 6. "legenda mais para cima"
→ `capTop` em `reel.json` e passo 6. Nunca refaça do zero o que ela não pediu para mudar.
