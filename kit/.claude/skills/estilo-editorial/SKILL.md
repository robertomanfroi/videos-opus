---
name: estilo-editorial
description: Edita uma gravação vertical (pessoa falando para a câmera) em um Reel com cara de REVISTA / "editado com capricho" — uma palavra minúscula por vez no meio da tela com a palavra-chave em serifa itálica na cor de destaque, pilhas de frase montadas linha a linha, cortes secos de aproximação, cards arredondados com prints reais, chuva de miniaturas, tira de filme, parede de reels, nota à mão com seta e pequenos momentos de interface. Use quando a skill `editar` delegar para o estilo editorial, ou quando a aluna pedir "estilo editorial", "estilo revista", "serifado", "caprichado", "cara de editado". Para o visual cru use estilo-celular; notícia/explicação use estilo-explicativo; anúncio use estilo-anuncio.
---

# Estilo editorial

**A regra única:** a edição faz parte da mensagem. Calmo, caprichado, visivelmente *desenhado* — o oposto
do estilo celular. Mas todo elemento ilustra exatamente o que está sendo dito, entra na palavra e sai dentro
da mesma frase. Enfeite sem frase ligada é erro.

Antes de começar leia `../perfil-criadora.md` e carregue (ou crie) o `perfil.json` da raiz.
Cores, tamanhos e proibições: `template/DESIGN.md` (copiado para cada projeto).

## Visual — inegociável

| Elemento | Regra |
|---|---|
| Legenda | **Uma palavra por vez**, minúscula, no meio da tela (`capTop` em `reel.json`, ≈ 1000–1150, abaixo do queixo). Inter 600, 92 px, espaçamento apertado, sombra suave, **sem contorno**. Corte seco palavra a palavra. |
| Voz serifada | A palavra que carrega o sentido (≈ 1 por frase) vira Instrument Serif Italic, 124 px, na cor de destaque (`cor_destaque` do perfil, senão `#F4E27C`). Defina em `assets/enfase.json`. Apartes caem para o tamanho pequeno (`pequeno`). |
| Pilha de frase | Gancho e frases fortes montados **linha a linha**, misturando linhas sans e serifadas. Cada linha sobe desfocando na palavra falada. Enquanto a pilha fala, a legenda some (`esconder`). |
| Câmera | Corte seco a cada 1–2 frases: entre ângulos reais, se ela gravou mais de um; senão **aproximação** (`punch(1.2–1.35)` ↔ `punch(1)`). Nunca zoom animado. CTA no enquadramento mais perto. |
| Cards | Prints reais em moldura **arredondada** com sombra suave, ao lado ou acima da cabeça, entrando com leve inclinação. No máximo 2 ao mesmo tempo. Card escuro (`.dark`) para uma frase-resumo sans + serifa. |
| Chuva de miniaturas | "uma semana inteira de vídeos", "tudo que você aprendeu" → 10–14 miniaturas saem da pessoa (`scatter`). |
| Tira de filme | "em lote", "copiar e colar", sequência → uma fileira de quadros atravessa a tela (`strip`). |
| Parede | Momentos de prova → metades de cima e de baixo fecham com uma grade de reels, ela fica numa faixa (`wallIn/wallOut`). |
| Nota à mão | Uma confissão pessoal por vídeo, em Caveat, com seta desenhada apontando para ela. |
| Interface | Pequenos mockups honestos da ação descrita (barra de estilo `restyle`, janela de linha do tempo `timelineWin`). No máximo 2 por vídeo, só onde a frase descreve aquela ação. |
| CTA | Últimos 4–6 s: enquadramento mais perto; pilha "comenta *palavra*" ou "clica no *link abaixo*" com a palavra-chave em serifa. |
| Emoji | Raro (só no CTA, tipo 👇). `montar.mjs` troca por arte Twemoji. |

Alterne trechos cheios e vazios. Nunca dois elementos de tela inteira (parede, chuva) seguidos.

## Regras de honestidade

- Prints, miniaturas e capas só reais: pasta **Meus prints** da aluna ou capas dos reels dela. Veja cada
  candidata antes de usar. Nunca invente número, perfil, comentário ou tela.
- Sem material real para um beat → troque por pilha de frase ou card escuro (só texto do que ela disse).
  Quadros do próprio vídeo podem substituir miniaturas, registrando isso no `ORIGEM.md`.

## Regras de corte

- Tire toda pausa (−30 dB / 0,15 s) e todo retake; ≤ 90 s, ideal 35–60 s. Fique com a **última** versão.
  Repetição de ênfase ("vale, vale") NÃO é retake.
- J/L ligado (padrão do `cortar.mjs`): combina com o ritmo calmo do estilo.
- **O transcritor esconde repetições e erra tempos.** Depois de cortar, re-transcreva o `clean.mp4`, leia de
  ponta a ponta e confira as emendas com `--janelas` (uma chamada só).

## Regras de velocidade (o PC da aluna pode ser lento — valem acima dos passos abaixo)

- A transcrição do `novo-projeto.mjs` já é `--rapido` (só para escolher o corte). A do `clean.mp4` (legenda)
  usa o modelo preciso — uma vez por versão do corte.
- Emendas: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 --janelas t1,t2,…` — uma carga de modelo para todas.
- Não renderize rascunho para olhar quadros: `$K --em video-projects/<slug> hyperframes snapshot --at t1,t2,… -o snapshots` (um tempo por
  beat) e olhe os PNGs. Renderize UMA vez, quando os snapshots estiverem certos.
- O encoder é escolhido sozinho (NVIDIA / Intel / AMD / Apple, senão CPU). Não mude.
- Antes de cada etapa lenta, avise em uma linha em português ("Renderizando — pode levar uns minutos.").

## Fluxo (todo comando pelo lançador `$K`)

`M=.claude/skills/_motor` · `X=.claude/skills/estilo-editorial/scripts` ·
`K` = o lançador da skill videos-opus: `"<VO>\bin\node.exe" "<VO>\scripts\video.mjs" kit`, onde `<VO>` é a pasta da skill videos-opus (a que tem o `SKILL.md` que mandou você ler este guia). Ele põe os programas portáteis no caminho e roda na pasta de trabalho do kit (`$K pasta` mostra qual é; projetos ficam em `<pasta>\video-projects\<slug>`). `$K --em <subpasta> …` roda dentro dela. Nada de `npx`, Python ou `node` solto: tudo passa pelo `$K`.

1. **Projeto + transcrição rápida**: `$K node $M/novo-projeto.mjs "<video>" <slug> .claude/skills/estilo-editorial`
   → `video-projects/<slug>/` com `assets/raw.mp4`, `raw.json`, `palavras.txt`, fontes, `DESIGN.md` e `src/index.template.html`.
2. **Enquadramento**: folha de contato (`$K --em video-projects/<slug> ffmpeg -i assets/raw.mp4 -vf "fps=1/4,scale=180:-1,tile=12x1" -frames:v 1 assets/contato.png`)
   e OLHE onde ficam o topo da cabeça e o queixo. `reel.json`: `{"capTop": <logo abaixo do queixo, ≈ 1000–1150>}`.
3. **Corte**: escreva `assets/keeps.json` (`{"fps":30,"keeps":[{"from":0,"to":9.4,"why":"…"}]}`); dentro de `assets/`:
   `$K --em video-projects/<slug>/assets node ../../../$M/cortar.mjs` → `clean.mp4`. Segundo ângulo (se houver): sincronize com o raw, corte com o mesmo keeps → `angle2-clean.mp4`.
4. **Conferência**: na raiz do projeto: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 assets/transcript.json --nomes "<termos do perfil>"`,
   leia inteiro, `--janelas` nas emendas. Repetição ou palavra cortada → volte ao 3. Palavra ouvida errado → `assets/caption-fixes.json`.
5. **Plano de beats** em `assets/beats.md` (tabela tempo · fala · beat · câmera · serifa): para cada frase UM de
   só legenda · pilha · card · card escuro · chuva · tira · parede · nota · interface. Mostre o plano em 3–5 linhas à aluna antes de compor.
6. **Material**: prints da `pasta_prints` do perfil (veja cada um) → `assets/prints/`; capas dos reels dela → `assets/thumbs/`.
   Toda origem em `assets/prints/ORIGEM.md`.
7. **Composição**: em `src/index.template.html`, troque o bloco `ELEMENTOS` pelos do plano (um id por elemento) e escreva
   o bloco `TEMPOS` com os ajudantes `line / fadeOut / punch / cardIn / cardOut / scatter / strip / wallIn / wallOut /
   noteIn / restyle / timelineWin`. Tempos de `$K --em video-projects/<slug> node ../../$M/ancoras.mjs "frase" …`, entrando na palavra falada.
   `assets/enfase.json`: `{"palavras": [...], "em": [t], "pequeno": [[a,b]], "esconder": [[a,b]]}` — esconda a legenda
   em todo trecho em que pilha, card escuro ou interface já mostra as palavras.
8. **Montagem + checagem**: `$K --em video-projects/<slug> node ../../$X/montar.mjs` → `$K --em video-projects/<slug> hyperframes lint` (0 erros) → `$K --em video-projects/<slug> hyperframes snapshot --at …`
   em cada beat e OLHE: rosto nunca coberto, linhas da pilha sem sobreposição, serifa legível, card não cortado,
   legenda nunca duplicando texto na tela. Então render e entrega (pelo lançador, na pasta de trabalho do kit): `$K node $M/renderizar.mjs <slug>` — confere as travas, renderiza em segundo plano, valida e já copia para `prontos/`. Saída 3 = ainda renderizando: rode `$K node $M/renderizar.mjs <slug> --esperar` até sair PRONTO. Nunca rode `$K --em video-projects/<slug> hyperframes render` direto nem `prontos.mjs` à mão.
   Guarde a evidência em `VERIFY.md`.
9. **Entrega**:
   Responda em português, curto: onde está, o que foi cortado, o plano de beats, material usado. Nunca publique nem envie nada.

## Ajustes depois da entrega

"tira a parte X" → `keeps.json`, repita 3–4 e 8 (recalcule os tempos com `ancoras.mjs`). "outra palavra em destaque" →
`enfase.json` e 8. "legenda mais para baixo" → `capTop` e 8. Nunca refaça do zero o que a aluna não pediu para mudar.
