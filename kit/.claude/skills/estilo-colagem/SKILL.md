---
name: estilo-colagem
description: Edita uma gravação vertical (pessoa falando para a câmera) em um vídeo COLAGEM — muito animado e ilustrado: cada frase vira um objeto entrando na palavra, títulos grandes ATRÁS da cabeça (recorte da pessoa), revelação de nome com o nome em arco, cards 3D com borda branca brilhando sobre a apresentadora escurecida, prints reais em papel quadriculado, carimbos vermelhos, chips, itens empilhados com arcos azuis, lista ✅/❌, celular com a tela trocando, flashes de luz, sons baixos e legenda em blocos curtos no peito. Use quando a skill `editar` delegar para o estilo colagem, ou quando a aluna pedir "estilo colagem", "vídeo com esquemas", "muito animado", "muito ilustrado". Para o visual cru use estilo-celular; revista use estilo-editorial; notícia use estilo-explicativo; anúncio use estilo-anuncio.
---

# Estilo colagem

**A regra única:** cada frase vira um OBJETO fazendo alguma coisa, entrando na palavra que o nomeia (ou até
0,5 s antes). Algo novo acontece a cada 1–2,5 s. Quando uma pessoa, marca ou lugar real é citado, a imagem
real dele está na tela. Texto nunca é enfeite: a legenda carrega a fala, os títulos carregam conceitos.

Antes de começar leia `../perfil-criadora.md` e carregue (ou crie) o `perfil.json` da raiz.
Cores, tamanhos e proibições: `template/DESIGN.md` (copiado para cada projeto).

## Catálogo de técnicas (o que o estilo faz, segundo a segundo)

| O que acontece | Técnica (componente · ajudante) |
|---|---|
| frase-chave grande atrás da cabeça, o recorte dela passa na frente | `.bh` dentro de `#behind` · `tl.from` |
| nome de pessoa citada em arco 3D atrás do recorte dela, fundo azul quadriculado | cena `.navy` + `textPath` + recorte · `flash`, `rise` |
| apresentadora escurece, card de foto entra inclinado com borda branca brilhando; seta/anel marcam alguém | `.card` · `blurIn`, `tilt`, `draw`, `blurOut` |
| chips curtos acima da cabeça, um por item falado | `.chip` (`red` / `yel` / `white`) · `pop`, `slideX` |
| prova: print real de notícia em papel quadriculado, um troca pelo outro | cena `.paper` + `.card.print` · `tilt`, `swapCard`, `capPapel` |
| palavra carimbada em vermelho com tremor | `.stamp` · `stamp` |
| X neon riscando algo | `svg.draw` com dois traços · `draw` |
| itens empilhados com número, foto e subitens, ligados por arcos azuis | `.fn` + arcos `svg.draw` · `slideX`, `draw` |
| lista ✅ / ❌ revelada item a item | `.panel` + `.row` · `slideX` |
| celular cuja tela troca, terminando no próprio vídeo | `.phone` + `.feed` + `<video id="mini" src="assets/clean.mp4">` |
| troca de cena com luz | `flash` (branco → azul) · `leak` (laranja/azul) |
| CTA final que fica até o fim ("comenta PALAVRA" / "link na bio") | `.chip` grande ou card de perfil |

**Legenda:** blocos de 2–3 palavras (≤ 18 letras) no peito, troca seca; a palavra-chave da frase vira bloco GRANDE
sozinho (96 px, brilho vermelho/azul ou cor de destaque) via `assets/emphasis.json`. No papel claro use `capPapel`.

**Som:** `sons.mjs` gera whoosh (troca de cena), hit (carimbo, X), pop (chip), tick (item de lista), rise e uma cama
musical suave — tudo BAIXO (volumes 0,1–0,2 em `assets/sfx.json`; música 0,06). Sem licença de terceiros.

## Layout vertical (área segura do Instagram)

Caixa segura **x 65–1015, y 270–1248**. Texto e imagem-chave dentro dela; só fundos passam.
Meça a cabeça por vídeo com `topo-cabeca.mjs`.
- **Topo** (y 280 → topo da cabeça): chips, adesivos, títulos acima/atrás da cabeça.
- **Cenas por cima** (y 280–1080, centro): cards e cenas sobre a apresentadora. Ela fica **nítida, só escurecida**
  (brightness .72); listas ficam num `.panel` opaco para o texto nunca flutuar sobre o rosto.
- **Legenda** no peito, abaixo do queixo e acima de y 1248 (`reel.json → capTop`).

## Regras de honestidade

- Imagem só com fonte clara: Wikimedia Commons / Openverse (`achar-fotos.mjs`, que anota licença e autor), prints reais
  de notícia (`print-noticia.mjs`), arquivos da própria aluna. O que entrou no vídeo fica listado em `assets/photos/FONTES.md`.
- Pessoa real usada só para ilustrar → etiqueta `Imagem ilustrativa` e aviso na entrega.
- Nada de número, manchete, print, logo ou perfil inventado. Sem imagem real para uma frase → chip, título atrás
  da cabeça, carimbo ou lista (só com as palavras que ela disse).
- Política e temas sensíveis: neutro, sem deboche nem elogio; print real prova a afirmação.

## Regras de corte

- Tire toda pausa, gaguejo e frase repetida (fique com a ÚLTIMA). Quando ela RE-DIZ uma frase para corrigir o sentido,
  fique só com a corrigida — leia a transcrição pelo sentido, não só por palavras iguais. Repetição de ênfase fica.
- **O transcritor esconde repetições e erra tempos.** Re-transcreva o `clean.mp4` e confira TODAS as emendas com
  `--janelas` numa chamada só.
- Movimento SUAVE: flashes ≤ .45, aproximação 0,7 s inOut, tremor pequeno, `back.out(1.3)` nos pops.

## Regras de velocidade (o PC da aluna pode ser lento — valem acima dos passos abaixo)

- O recorte da pessoa (`matte-pessoa.mjs`) é a etapa mais pesada: ~3–15 min por minuto de vídeo, conforme o PC.
  Avise antes de começar e rode **uma vez por versão FINAL do corte**.
- A transcrição do `novo-projeto.mjs` já é `--rapido`; a do `clean.mp4` usa o modelo preciso, uma vez por corte.
- Não renderize rascunho: `$K --em video-projects/<slug> hyperframes snapshot --at t1,t2,… -o snapshots`. Renderize UMA vez.
- Antes de cada etapa lenta, avise em uma linha em português ("Recortando você do fundo — pode levar uns minutos.").

## Fluxo (todo comando pelo lançador `$K`)

`M=.claude/skills/_motor` · `C=.claude/skills/estilo-colagem/scripts` ·
`K` = o lançador da skill videos-opus: `"<VO>\bin\node.exe" "<VO>\scripts\video.mjs" kit` (no Mac: `"<VO>/bin/node" "<VO>/scripts/video.mjs" kit`), onde `<VO>` é a pasta da skill videos-opus (a que tem o `SKILL.md` que mandou você ler este guia). Ele põe os programas portáteis no caminho e roda na pasta de trabalho do kit (`$K pasta` mostra qual é; projetos ficam em `<pasta>\video-projects\<slug>`). `$K --em <subpasta> …` roda dentro dela. Nada de `npx`, Python ou `node` solto: tudo passa pelo `$K`.

1. **Projeto + transcrição rápida**: `$K node $M/novo-projeto.mjs "<video>" <slug> .claude/skills/estilo-colagem`.
2. **Corte**: escreva `assets/keeps.json`; dentro de `assets/`: `$K --em video-projects/<slug>/assets node ../../../$M/cortar.mjs` → `clean.mp4`.
3. **Conferência**: na raiz do projeto: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 assets/transcript.json --nomes "<termos do perfil>"`,
   leia inteiro, `--janelas` nas emendas. Volte ao 2 até ficar limpo. Palavra ouvida errado → `assets/caption-fixes.json`.
4. **Recorte da pessoa** (títulos atrás da cabeça): dentro de `assets/`: `$K --em video-projects/<slug>/assets $K --em video-projects/<slug>/assets node ../../../$C/matte-pessoa.mjs clean.mp4 fg.webm`
   → `$K --em video-projects/<slug>/assets node ../../../$C/topo-cabeca.mjs fg-matte.mp4` (topo da cabeça e layout sugerido) → `reel.json {"capTop": <px>}`.
   O `montar-colagem.mjs` usa o recorte só nas janelas dos títulos `.bh` (recorte pelo vídeo inteiro trava o render em PC com pouca memória). Sem nenhum `.bh`, pule este passo.
5. **Plano de beats** em `assets/beats.md`: cada frase → uma técnica do catálogo, com a palavra de entrada.
   Confira: nunca 2,5 s sem mudança, pessoa citada = pessoa mostrada, tudo na área segura. Mostre o plano à aluna (3–5 linhas).
6. **Material** (tudo na raiz do projeto) → `assets/photos/`:
   pessoas/lugares `$K --em video-projects/<slug> node ../../$C/achar-fotos.mjs assets/photos "commons|tag|termo|6"`, genéricas `"openverse|tag|termo|6"`
   (licença e autor vão para `assets/photos/fontes.tsv`); faça folha de contato e OLHE. Recorte pessoas:
   `$K --em video-projects/<slug> node ../../$C/recortar.mjs assets/photos/in.jpg assets/photos/in-recorte.png`. Prova de notícia:
   `$K --em video-projects/<slug> node ../../$C/print-noticia.mjs "<url>" assets/photos "palavra 1" …`. Sons: `$K --em video-projects/<slug> node ../../$C/sons.mjs`.
   Liste em `assets/photos/FONTES.md` só o que entrou no vídeo (de `fontes.tsv`, prints de notícia e arquivos da aluna).
7. **Composição**: em `src/index.template.html`, troque os exemplos comentados pelas cenas do plano (uma `.clip` por cena,
   trilhas diferentes) e escreva o bloco TEMPOS com os ajudantes. Tempos de `$K --em video-projects/<slug> node ../../$M/ancoras.mjs "frase" …`.
   `assets/emphasis.json` (`[{"words":"duas noites","color":"yel"}]`), `assets/sfx.json` (`[{"t":2.43,"f":"whoosh","v":0.15}]`).
7b. **Recorte depois de compor**: guarde `assets/transcript-v1.json`, recorte, re-transcreva e rode
   `$K --em video-projects/<slug> node ../../$C/remapear-tempos.mjs assets/transcript-v1.json assets/transcript.json` (move cenas, TEMPOS, sons e destaques).
   **Depois rode o recorte da pessoa de novo** — `fg.webm` velho vira um fantasma dela fora de sincronia; o `montar-colagem.mjs` se recusa a montar.
8. **Montagem + checagem**: `$K --em video-projects/<slug> node ../../$C/montar-colagem.mjs` → `$K --em video-projects/<slug> hyperframes lint` (0 erros) → snapshots em cada beat e OLHE
   (rosto nunca coberto por texto solto, título atrás da cabeça sem fantasma, cards não cortados, tudo na área segura) →
   render e entrega (pelo lançador, na pasta de trabalho do kit): `$K node $M/renderizar.mjs <slug>` — confere as travas, renderiza em segundo plano, valida e já copia para `prontos/`. Saída 3 = ainda renderizando: rode `$K node $M/renderizar.mjs <slug> --esperar` até sair PRONTO. Nunca rode `$K --em video-projects/<slug> hyperframes render` direto nem `prontos.mjs` à mão. Depois `$K --em video-projects/<slug> node ../../$C/folha-beats.mjs renders/<slug>-final.mp4 snapshots/beats t1 t2 …`
   e OLHE as folhas. Guarde a evidência em `VERIFY.md`.
9. **Entrega**: responda em português, curto: onde está,
   cortes, fontes das imagens, usos ilustrativos, pontos em aberto. Nunca publique nem envie nada.

## Ajustes depois da entrega

"tira a parte X" → passo 7b inteiro (inclusive o recorte da pessoa). "troca a foto" → só `assets/photos/`, `FONTES.md` e 8.
"menos som" → volumes em `sfx.json` / `reel.json "musica"` e 8. Nunca refaça do zero o que a aluna não pediu para mudar.
