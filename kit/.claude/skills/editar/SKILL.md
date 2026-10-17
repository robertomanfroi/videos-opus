---
name: editar
description: Porta de entrada para editar um vídeo gravado no celular e transformá-lo em Reel. Use sempre que a aluna pedir para editar, "edita esse vídeo", "faz um reel", "transforma meu vídeo", "edita meu último vídeo", "edita no estilo X", "edita no modelo X", colar o caminho de um vídeo, ou perguntar como editar. Acha o vídeo sozinha, confere se ele serve, pergunta o estilo UMA vez se faltar, delega para a skill do estilo (estilo-celular, estilo-editorial, estilo-explicativo, estilo-colagem, estilo-anuncio) ou do modelo (modelo-tela-dividida, modelo-pov, modelo-texto-na-tela, modelo-sta, modelo-entrevista) e entrega o vídeo pronto na pasta "prontos".
---

# Editar — porta de entrada

A aluna não sabe (nem precisa saber) de pastas, caminhos ou terminal. Ela grava no celular, passa o vídeo
para o computador (Downloads, Área de Trabalho, WhatsApp Web, Google Drive…) e fala com você em português.
Tudo que ela vê é a resposta e o vídeo pronto. Fale curto, em português simples, sem jargão.

`M=.claude/skills/_motor` · `K` = o lançador da skill videos-opus: `"<VO>\bin\node.exe" "<VO>\scripts\video.mjs" kit`,
onde `<VO>` é a pasta da skill videos-opus (a que tem o `SKILL.md` que mandou você ler este guia). Ele põe os programas
portáteis no caminho e roda tudo na **pasta de trabalho do kit** (`$K pasta` mostra qual é). Os caminhos deste guia
(`video-projects/…`, `prontos/…`, `perfil.json`) são relativos a ela: para ler ou editar um arquivo, junte com essa pasta.
`$K --em <subpasta> …` roda dentro de uma subpasta. Nada de `npx`, Python ou `node` solto: tudo passa pelo `$K`.

**Padrão visual premium (obrigatório, vale para todos os estilos):** nunca contorno nas letras, nunca raios/espiral,
faíscas, flash branco ou tremor; legibilidade por sombra suave ou véu escuro; movimento lento e suave; som discreto.
Detalhes na seção "Padrão visual premium" do `SKILL.md` da skill videos-opus. Isso vale acima do que um guia de estilo disser.

## Passo 0 — retomar ou ajustar?

Antes de procurar vídeo novo, olhe o estado:
- Pedido de ajuste ("tira a parte…", "muda a legenda", "o último vídeo") → leia `prontos/ULTIMO.json`: ele diz o `slug`
  e o projeto do último vídeo entregue. Vá direto para **Ajustes** nesse projeto.
- Algum `video-projects/*/projeto.json` com `etapa` diferente de `entregue`, mexido nas últimas 24 h → pergunte:
  "Tem um vídeo pela metade (`<slug>`, parado em <etapa>). Continuo ele?" Se sim, retome da etapa.
- Render em andamento (`video-projects/<slug>/renders/progresso.json` com `fase: renderizando`) → `$K node $M/renderizar.mjs <slug> --esperar`.

## Passo 1 — achar o vídeo

| A aluna disse | Rode |
|---|---|
| colou um caminho (com ou sem aspas) | `$K node $M/achar-video.mjs "<caminho>"` |
| "meu último vídeo", "o que acabei de mandar", ou nada | `$K node $M/achar-video.mjs --ultimo` |
| "qual vídeo você acha?", ou o anterior deu vários | `$K node $M/achar-video.mjs` |

Leia o JSON `{ok, video, motivo, aviso, confirmar, candidatos[], checks{}}`:

- `ok: true` e `confirmar: false` → siga com `video` (o script já guardou uma cópia em `meus-videos/`). Confirme em uma linha:
  "Achei `IMG_2041.mp4`, de hoje 14:02, 3 min — editando."
- `ok: true` e `confirmar: true` → PERGUNTE antes de gastar tempo: "É este: `IMG_2041.mp4`, recebido ontem 14:02, 3 min?"
  (não está em `meus-videos` ou chegou há mais de 2 h — pode ser um vídeo do WhatsApp em Downloads).
- `aviso` (vídeo com mais de 3 min) → diga e pergunte que parte usar; o Reel fica com no máximo 90 s.
- `motivo: "vários candidatos; escolher"` → mostre até 4 `candidatos` com nome, data/hora e tamanho e pergunte
  qual. Em seguida rode de novo com o caminho escolhido.
- `motivo: "nenhum vídeo recente encontrado"` → explique: "Não achei nenhum vídeo novo. Passa o vídeo do celular para o
  computador (por exemplo: mande para você mesma no WhatsApp Web e baixe; ele cai em Downloads) e me avise, ou cola aqui o caminho do arquivo."
- qualquer outro `motivo` (sem som, deitado, curto, chegando, pouco espaço) → repita o motivo em uma frase e PARE.
  Vídeo deitado: sugira regravar em pé. Nunca gaste minutos de transcrição num vídeo que não serve.

O script já espera o arquivo parar de crescer (um download ainda em andamento). Não tente contornar.

## Passo 2 — estilo

Entenda o pedido:

| Ela fala | Estilo | Skill |
|---|---|---|
| celular, cru, "parece que editei no Instagram", natural, simples, sem estilo dito e vídeo é ela falando | **celular** | `estilo-celular` |
| editorial, revista, chique, elegante, "cara de editado", serifada | **editorial** | `estilo-editorial` |
| explicativo, notícia, explicar, "com imagens em cima", didático | **explicativo** | `estilo-explicativo` |
| colagem, recortes, fotos recortadas, scrapbook | **colagem** | `estilo-colagem` |
| anúncio, ad, tráfego, patrocinado, vender, oferta | **anúncio** | `estilo-anuncio` |

**Modelos da Suellen** (formatos copiados dos reels dela; a aluna pede pelo nome, como no ebook):

| Ela fala | Modelo | Skill |
|---|---|---|
| tela dividida, dividido, metade em cima/embaixo, comentar vídeo de alguém | **tela dividida** | `modelo-tela-dividida` |
| POV, "frase em cima do vídeo" | **POV** | `modelo-pov` |
| texto na tela, lista na tela, "vídeo para salvar" | **texto na tela** | `modelo-texto-na-tela` |
| STA, frase, citação, reflexão | **STA** | `modelo-sta` |
| entrevista, entrevistei, vox pop | **entrevista** | `modelo-entrevista` |

POV, texto na tela e STA não precisam de fala: o vídeo pode ser uma cena qualquer. Tela dividida pede também a cena de
contexto; entrevista pede os prints dos perfis dos convidados.

Se ela não disse e não dá para inferir, pergunte UMA vez, mostrando o catálogo em 10 linhas (5 estilos + 5 modelos) (nome + 1 frase).
Se a skill do estilo ainda não existir nesta instalação, diga isso e ofereça o estilo celular.

## Passo 3 — perfil

Leia `perfil.json` na pasta de trabalho do kit. Se não existir ou faltar `nome`/`usuario`, siga `.claude/skills/perfil-criadora.md`
e pergunte tudo numa mensagem só. Salve antes de continuar.

## Passo 4 — extras (só quando fazem sentido)

- Prints (padrão: SEM print). Se o vídeo fala de resultado, número, comentário, post ou perfil, pergunte AGORA, antes da
  transcrição, numa linha: "Quer prints no vídeo? Coloque na pasta **Meus prints** da Área de Trabalho agora; senão sigo sem e você pode pedir depois."
  Não trave esperando: sem resposta, siga sem print e ofereça como ajuste na entrega. Isso vale acima do que a skill do
  estilo disser sobre pedir a tela exata. Olhe no máximo os 12 prints mais recentes, numa folha de contato só.
- Anúncio: pergunte produto/oferta e o CTA, numa pergunta só.
- Nunca invente print, número, logo ou depoimento. Se faltar, peça a tela exata ou deixe de fora.

## Passo 5 — delegar

Leia a `SKILL.md` do estilo escolhido e siga o fluxo dela do começo ao fim (projeto → corte → conferência →
prints → composição → snapshots → `renderizar.mjs`). Slug do projeto: 2–4 palavras do assunto, minúsculas, com hífen
(`duas-noites-engrene`). Se o `novo-projeto` disser que o nome já existe, use o nome que ele sugerir (`-2`).

Antes de cada etapa lenta, uma linha: "Transcrevendo — pode levar uns minutos." / "Renderizando o vídeo final…".
Estilo colagem: avise antes que é o mais demorado (recorte da pessoa + render: em PC sem placa de vídeo pode passar de
40 min) e pergunte se segue ou prefere o celular. Rode o recorte em segundo plano.

## Passo 6 — entregar

O `renderizar.mjs` do passo anterior já confere, renderiza, valida e copia para `prontos/` e para a pasta **Vídeos editados**
da Área de Trabalho — não rode `prontos.mjs` de novo. Se ele saiu com código 3, rode `--esperar` até aparecer PRONTO.

Resposta final, em 3 a 5 linhas:
1. Onde está: "Pronto! Está em **Vídeos editados**, na Área de Trabalho, como `duas-noites-engrene-2026-10-09.mp4` (65 s)."
2. O que cortou: pausas, repetições, trechos descartados (em palavras dela, não em segundos).
3. O que usou: prints e títulos.
4. O que ficou em dúvida: nomes que o transcritor pode ter errado, trechos que você não teve certeza.
5. Como ajustar: "Quer mudar algo? Diga, por exemplo: 'tira a parte do preço' ou 'legenda mais para baixo'."

Nunca publique, envie ou apague vídeos. O original fica onde estava (e uma cópia em `meus-videos/` do kit).

## Ajustes (a aluna volta depois da entrega)

Mexa só no que ela pediu, no projeto de `prontos/ULTIMO.json` (ou o que ela nomear), e renderize uma vez com
`$K node $M/renderizar.mjs <slug>`. Mapa rápido:

| Pedido | Mexe em | Refaz |
|---|---|---|
| tira/encurta um trecho | `assets/keeps.json` | corte → transcrição → montagem → render |
| legenda mais alta/baixa | `reel.json` (`capTop`) | montagem → render |
| troca/tira print ou título | `src/index.template.html` | montagem → snapshots → render |
| palavra errada na legenda | `assets/caption-fixes.json` (`{"errado": "certo"}`, sem ligar para maiúscula/pontuação) | montagem → render |
| outra palavra em destaque | `assets/enfase.json` (editorial) / `assets/emphasis.json` (colagem) | montagem → render |
| outro estilo | novo projeto com outro slug | tudo |

O `renderizar.mjs` entrega como `-v2`, `-v3` sem sobrescrever. Depois de cortar trecho, os tempos dos elementos mudam:
recalcule com `ancoras.mjs` antes de montar.
