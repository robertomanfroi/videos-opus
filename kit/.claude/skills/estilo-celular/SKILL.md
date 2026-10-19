---
name: estilo-celular
description: Edita uma gravação vertical (pessoa falando para a câmera) em um Reel com cara de "editado no próprio celular" — legenda de uma palavra por vez, prints crus acima da cabeça, títulos pequenos, cortes secos, sem pausas nem repetições, no máximo 90 s. Use quando a skill `editar` delegar para o estilo celular, ou quando a aluna pedir "estilo celular", "estilo cru", "parece que editei no Instagram". Para o visual de revista use estilo-editorial; para notícia/explicação use estilo-explicativo; para anúncio use estilo-anuncio.
---

# Estilo celular

**A regra única:** quem assiste precisa sentir que a própria criadora editou no celular, no editor do
Instagram. Nunca pode parecer agência nem IA. Na dúvida: menos, mais cru, menor. Motion graphics
bonitinho aqui é erro.

Antes de começar leia `../perfil-criadora.md` e carregue (ou crie) o `perfil.json` da raiz.

## Visual — inegociável

| Elemento | Regra |
|---|---|
| Prints | Prints reais da pasta **Meus prints** da aluna (cabeçalho de perfil, insights, curtidas/comentários/salvamentos, visualizações, DMs, comentários, posts). Recorte cru: **canto reto, sem borda, sem sombra, sem moldura, sem card arredondado**. Acima da cabeça. |
| Texto acima da cabeça | Fonte de título (`.tit`), branca, **pequena** — títulos 48–70 px, rótulos 40–48 px em 1080 de largura. **Alinhado à esquerda com a borda esquerda do print.** Cor de destaque (`.y`) só em uma palavra ocasional. Sans (`.sans`) só para rótulos como "Ruim / Bom / Viral". |
| Sombra | Só quando a parede atrás é clara (`.sh`). Nunca caixa, fundo ou vidro atrás do texto. |
| Movimento | **Nenhum.** Elementos entram e saem em corte seco (`show()`/`hide()`). Sem fade, slide, zoom, quique. |
| Emojis | Caracteres reais no template (✅ ❌ 🔥 ❤️ 👇 🚨 …); `montar.mjs` troca por arte Twemoji. Nunca desenhe ícones. |
| Legenda | **Uma palavra por vez**, 54 px, branca com sombra suave (nunca contorno). Centralizada no peito, logo abaixo do queixo (`capTop` em `reel.json`). Corte seco palavra a palavra. |
| Título persistente | Um título de assunto pode ficar na tela por longos trechos enquanto os prints trocam acima dele. |
| Listas | Checklists de emoji + palavra (✅ Legenda / ❌ Título), reveladas item a item na palavra falada. |
| Mockups | Evite. Use print real. Só desenhe um mockup se não existir print E a aluna pedir. |

## Regras de corte

- Sem respiração nem pausa: tudo abaixo de −30 dB por ≥ 0,15 s é removido (`cortar.mjs` faz sozinho).
- Remova toda repetição, começo falso e frase refeita. Fique com a **última** versão, a mais limpa.
- **O transcritor esconde repetições e erra tempos.** Depois de cortar, SEMPRE re-transcreva o `clean.mp4`
  e leia de ponta a ponta procurando frase dobrada, palavra cortada e verbo faltando. Recorte até ficar limpo.
- Máximo 90 s, a não ser que a aluna peça outra coisa. Diga na entrega o que ficou de fora.
- **J/L cuts** ligados por padrão (`--jl 6` mais suave, `--no-jl` desliga).

## Regras de velocidade (o PC da aluna pode ser lento — valem acima dos passos abaixo)

- A transcrição do `novo-projeto.mjs` já é `--rapido` (modelo leve, só para escolher o corte).
  A re-transcrição do `clean.mp4` (a da legenda) usa o modelo preciso — rode uma vez por versão do corte, não a cada ajuste.
- Confira todas as emendas em UMA chamada (uma carga de modelo):
  `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 --janelas t1,t2,…` (tempos na linha do tempo do clean). Nunca uma janela por vez.
- Não renderize um rascunho inteiro só para olhar quadros. Use `$K --em video-projects/<slug> hyperframes snapshot --at t1,t2,… -o snapshots`
  (uma vez por troca de elemento) e olhe os PNGs. Renderize o vídeo UMA vez, quando os snapshots estiverem certos.
  Renderize de novo só para mudanças pedidas.
- O encoder do raw.mp4 / clean.mp4 é escolhido sozinho (NVIDIA / Intel / AMD / Apple, senão CPU). Não mude.
- Antes de cada etapa lenta, avise em uma linha curta em português o que está rodando e que pode levar alguns
  minutos ("Transcrevendo o vídeo — no seu PC pode levar uns minutos."), para a espera nunca parecer travamento.

## Fluxo (todo comando pelo lançador `$K`)

`M=.claude/skills/_motor` · `K` = o lançador da skill videos-opus: `"<VO>\bin\node.exe" "<VO>\scripts\video.mjs" kit` (no Mac: `"<VO>/bin/node" "<VO>/scripts/video.mjs" kit`), onde `<VO>` é a pasta da skill videos-opus (a que tem o `SKILL.md` que mandou você ler este guia). Ele põe os programas portáteis no caminho e roda na pasta de trabalho do kit (`$K pasta` mostra qual é; projetos ficam em `<pasta>\video-projects\<slug>`). `$K --em <subpasta> …` roda dentro dela. Nada de `npx`, Python ou `node` solto: tudo passa pelo `$K`.

1. **Projeto + transcrição rápida**: `$K node $M/novo-projeto.mjs "<video>" <slug> .claude/skills/estilo-celular`
   → `video-projects/<slug>/` com `assets/raw.mp4` (1080×1920, 30 fps), `assets/raw.json`, `assets/palavras.txt`,
   fontes e `src/index.template.html`. O slug é curto, minúsculo, com hífens (`promo-engrene`).
2. **Enquadramento**: tire um snapshot de contato do raw (`$K --em video-projects/<slug> ffmpeg -i assets/raw.mp4 -vf "fps=1/4,scale=180:-1,tile=12x1" -frames:v 1 assets/contato.png`)
   e OLHE: onde está o topo da cabeça e o queixo. Elementos vivem entre y≈100 e o topo da cabeça;
   legenda abaixo do queixo → escreva `reel.json` na raiz do projeto: `{"capTop": <px>}` (padrão 1380).
3. **Escolha do corte**: leia `assets/palavras.txt` e escreva `assets/keeps.json`
   (`{"fps":30,"keeps":[{"from":0,"to":9.38,"why":"…"}]}`). Cada `why` explica em português o que ficou e por quê.
4. **Corte**: dentro de `assets/`: `$K --em video-projects/<slug>/assets node ../../../$M/cortar.mjs` → `clean.mp4` + `edit-decisions.json`.
5. **Conferência**: na raiz do projeto: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 assets/transcript.json --nomes "<termos do perfil>"`.
   Repetição ou palavra cortada → volte ao passo 3. Palavra ouvida errado → `assets/caption-fixes.json` (`{"cloud":"Claude"}`).
   `$K --em video-projects/<slug> ffmpeg -i assets/clean.mp4 -af silencedetect=noise=-30dB:d=0.25 -f null -` → não pode sobrar pausa.
6. **Prints**: liste as imagens da `pasta_prints` do perfil (mais recentes primeiro) e VEJA cada candidata antes
   de usar. Recorte com ffmpeg para `assets/prints/` (`-vf crop=w:h:x:y`), e anote a origem em `assets/prints/ORIGEM.md`.
   Sem print adequado → diga qual tela ajudaria e siga SEM print (ela pode pedir depois como ajuste). **Nunca invente um print.**
7. **Composição**: edite `src/index.template.html` — elementos no bloco `ELEMENTOS` e tempos no bloco `TEMPOS`.
   Tempos vêm de `$K --em video-projects/<slug> node ../../$M/ancoras.mjs "frase" "outra frase"` (raiz do projeto), na palavra falada. Só corte seco.
8. **Montagem + checagem**: `$K --em video-projects/<slug> node ../../$M/montar.mjs` → `$K --em video-projects/<slug> hyperframes lint` → snapshots de cada troca de elemento
   (`$K --em video-projects/<slug> hyperframes snapshot --at …`) e OLHE: rosto nunca coberto, texto legível, print alinhado com o título.
   Então render e entrega (pelo lançador, na pasta de trabalho do kit): `$K node $M/renderizar.mjs <slug>` — confere as travas, renderiza em segundo plano, valida e já copia para `prontos/`. Saída 3 = ainda renderizando: rode `$K node $M/renderizar.mjs <slug> --esperar` até sair PRONTO. Nunca rode `$K --em video-projects/<slug> hyperframes render` direto nem `prontos.mjs` à mão.
9. **Entrega**:
   Responda em português, curto: onde está o vídeo, o que foi cortado, prints usados, o que ficou em dúvida.
   Nunca publique nem envie nada.

## Ajustes depois da entrega

"tira a parte do preço" → edite `keeps.json`, repita 4–5, recalcule os TEMPOS de tudo que vem depois do trecho com `ancoras.mjs` e repita 8. "legenda mais para baixo" → `reel.json` e repita 8.
"troca o print" → só 6–8. Nunca refaça do zero o que a aluna não pediu para mudar.
