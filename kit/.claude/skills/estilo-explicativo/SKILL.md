---
name: estilo-explicativo
description: Edita uma gravação vertical (pessoa falando para a câmera) em um Reel EXPLICATIVO / de notícia — um mecanismo escondido (dinheiro, controle, quem é dono do quê, como algo funciona) contado pela apresentadora, provado com material REAL numa faixa 16:9 no topo (etiquetas ARQUIVO / ILUSTRAÇÃO / ano), explicado num diagrama chapado de passos numerados, legenda em frases numa caixa escura, voz a 1,05× e uma página de revisão OBRIGATÓRIA (mapa de edição com IDs, material a buscar, checagem de fatos) ANTES de montar. Use quando a skill `editar` delegar para o estilo explicativo, ou quando a aluna pedir "estilo explicativo", "estilo notícia", "explicar como funciona", "com imagens em cima", "didático". Para o visual cru use estilo-celular; revista use estilo-editorial; anúncio use estilo-anuncio.
---

# Estilo explicativo

**A regra única:** a história é o mecanismo, e toda imagem tem uma função: **provar** (material real),
**ilustrar** (imagem genérica de IA, com etiqueta) ou **explicar** (o diagrama). Nada é enfeite, nada é
falso. A edição fica sóbria para o argumento parecer confiável.

Antes de começar leia `../perfil-criadora.md` e carregue (ou crie) o `perfil.json` da raiz.
Cores, tamanhos e proibições: `template/DESIGN.md` (copiado para cada projeto).

## Como um explicativo é conduzido (mapa de batidas de referência, ~88 s)

| Tempo | Plano | Função |
|---|---|---|
| 0–4,5 | split: material real `ARQUIVO` + apresentadora | gancho como pergunta-paradoxo ("como X controla Y sem nunca ter comprado?") |
| 4,5–7,7 | tela cheia: o fato visível (fachada, logo, preço) | o que todo mundo já sabe |
| 7,7–11 | split: foto oficial | o ator conhecido e o número dele |
| 11–15 | apresentadora, punch-in | virada: "mas a relação dele para por aí" |
| 15–18 | split: um apoio por item listado | o que o ator escondido explora |
| 18–29 | apresentadora, enquadramento alternando | o ator novo + "só que tem um problema" + o que ele NÃO fez |
| 29–32 | split: ilustração `ILUSTRAÇÃO` | o passado (quem financiou) |
| 39–42 | split: foto de arquivo com ano + crédito | data-âncora |
| 45–51 | diagrama `1 · …` → `2 · …` | o ator troca **no mesmo lugar**, contorno fino no novo |
| 51–58 | apresentadora | a frase-resumo do mecanismo |
| 58–65 | **mesmo plano do diagrama** → `3 · …` + ressalva | o resultado: linha pontilhada "segue sócia", seta de destaque "controle" |
| 65–72 | apresentadora "então fica assim" → montagem (um plano por ator) | recapitulação: um ator, um papel, uma linha |
| 72–79 | split → apresentadora | traz para quem assiste ("você já passou por isso") |
| 79–88 | tela cheia: **retorno** à imagem da abertura → apresentadora + CTA | volta irônica ao começo, CTA ligado à promessa da série |

Ritmo: apresentadora na tela ~55 %, apoio ~30 %, diagrama ~15 %. Um apoio a cada 5–8 s, cada um de 2–5 s,
entrando no substantivo que mostra. A apresentadora troca de enquadramento (aberto ↔ punch-in) na fronteira das frases.

## Forma do roteiro (confira antes de editar; sugira ajustes se faltar uma batida)

1. **Gancho-paradoxo** — uma pergunta com contradição (quem controla X sem ser dono de X?).
2. **O fato visível** — o que todo mundo vê (o nome na fachada, o logo, o preço).
3. **Virada** — "mas a relação dele para por aí" / "só que tem um problema".
4. **Atores escondidos** — quem opera / financiou / é dono de verdade; diga o que cada um NÃO fez.
5. **Mecanismo em passos numerados** (2–3) — este é o diagrama. Um plano, mudando no lugar.
6. **"Então fica assim"** — recapitulação: uma linha por ator, um plano por ator.
7. **Traz para quem assiste** — como isso toca a vida dela.
8. **Retorno + CTA** — volta à imagem da abertura com uma frase irônica; CTA = a promessa da série.

Se a gravação não é um mecanismo (ex.: um convite, uma dica), adapte: os passos do diagrama viram
"o que era → o que mudou → o que você leva". Nunca reescreva o que a apresentadora disse.

## Visual — inegociável

| Elemento | Regra |
|---|---|
| Faixa de apoio | Topo, y 0–668, largura total. Material real, foto real, print ou ilustração genérica. Etiqueta pequena no canto superior esquerdo (`ARQUIVO · 2020`, `FOTO OFICIAL`, `ILUSTRAÇÃO`, `IMAGEM ILUSTRATIVA`, `TRECHO DESTE VÍDEO`). Crédito no canto inferior direito quando a licença pede. |
| Apresentadora | Abaixo da faixa no split (`reel.json → split`), rosto claramente abaixo da faixa. Fora do split, tela cheia. Reenquadramento só em corte seco (`punch` / `wide`). |
| Legenda | Padrão: **frases de 1–2 linhas** numa caixa **100 % opaca** `#0f1a24`, Inter SemiBold 46 px, sempre no mesmo lugar (terço inferior, `capTop` ≈ 1545). Opcional `reel.json {"captions":"words"}`: uma palavra por vez, Archivo Black, contorno preto. |
| Diagrama | UM plano quase branco por mecanismo. O texto é o nó (sem caixas). Setas finas. **Uma** cor de destaque (`--accent`: `cor_destaque` do perfil, senão verde). Rótulo `1 · …` no topo, ressalva em cinza logo abaixo. Os passos mudam **no mesmo plano** (`relabel`, `swap` no lugar, `outline`, `fade`). Segure o estado final parado ≥ 1,5 s antes de voltar. |
| Movimento | Só corte seco na apresentadora e nos apoios. No diagrama: aparecer (0,3 s), desenhar seta, trocar no lugar. Nada de zoom, slide ou whoosh. Foto parada pode ter `drift` ≤ 5 %. |
| Emoji | Não usa. |

## Regras de honestidade (inegociáveis)

- Lugar, marca ou pessoa real só aparece com material real. Se não achar o material real, diga — não tape o buraco com IA.
- Imagem de arquivo leva o ano; nunca "prova" o estado atual.
- O diagrama mostra o acordo **como anunciado**; aprovações pendentes ficam na tela como ressalva.
- Número aproximado é dito/rotulado como aproximado ("cerca de").
- Ilustração de IA é genérica (sem marca legível, sem documento falso, sem tela de app) e leva `ILUSTRAÇÃO`.
- Nada de logo de terceiros desenhado "parecido". Marca só em material real.
- Foto de pessoa "tipo" (o senhor do interior, os jovens) → imagem de licença livre com autor + licença no crédito,
  etiqueta `IMAGEM ILUSTRATIVA`. Busca automática no Google Imagens é bloqueada: use Openverse
  (`https://api.openverse.org/v1/images/?q=…&license_type=commercial`) e Wikimedia Commons.

## Regras de corte

- Retakes, começos falsos e frases repetidas saem; fica a **última** versão. Repetição de ênfase ("vale, vale") NÃO é retake.
- O corte é pelo **som da fala** (`corte-preciso.mjs`): tira pausas E respirações, preserva o fim das palavras e
  encaixa cada borda no vale de energia mais próximo. Em seguida a voz vai a **1,05×** (`acelerar.mjs`).
- Se uma palavra perder a primeira sílaba, mova o `from` daquele keep um pouco para trás, ou marque `"raw": true`
  no keep (mantém o trecho exatamente como está).
- **O transcritor esconde repetições e erra tempos.** Depois de cortar, re-transcreva o `clean.mp4`, leia de ponta a ponta
  e confira CADA emenda com `--janelas` (uma chamada só). Meia palavra ou retake murmurado aparece ali, não na transcrição inteira.

## Regras de velocidade (o PC da aluna pode ser lento — valem acima dos passos abaixo)

- A transcrição do `novo-projeto.mjs` já é `--rapido` (só para escolher o corte). A do `clean.mp4` (legenda) usa
  o modelo preciso — uma vez por versão do corte.
- Emendas: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 --janelas t1,t2,…` — uma carga de modelo para todas. Sem `--nomes` aqui
  (em janelas curtas o modelo às vezes devolve só a lista de nomes).
- Não renderize rascunho para olhar quadros: `$K --em video-projects/<slug> hyperframes snapshot --at t1,t2,… -o snapshots` e olhe os PNGs.
  Renderize UMA vez, quando os snapshots estiverem certos.
- O encoder é escolhido sozinho (NVIDIA / Intel / AMD / Apple, senão CPU). Não mude.
- Antes de cada etapa lenta, avise em uma linha em português ("Transcrevendo — pode levar uns minutos.").

## Fluxo (todo comando pelo lançador `$K`)

`M=.claude/skills/_motor` · `X=.claude/skills/estilo-explicativo/scripts` ·
`K` = o lançador da skill videos-opus: `"<VO>\bin\node.exe" "<VO>\scripts\video.mjs" kit`, onde `<VO>` é a pasta da skill videos-opus (a que tem o `SKILL.md` que mandou você ler este guia). Ele põe os programas portáteis no caminho e roda na pasta de trabalho do kit (`$K pasta` mostra qual é; projetos ficam em `<pasta>\video-projects\<slug>`). `$K --em <subpasta> …` roda dentro dela. Nada de `npx`, Python ou `node` solto: tudo passa pelo `$K`.

1. **Projeto + transcrição rápida**: `$K node $M/novo-projeto.mjs "<video>" <slug> .claude/skills/estilo-explicativo`
   → `video-projects/<slug>/` com `assets/raw.mp4`, `raw.json`, `palavras.txt`, fontes, `DESIGN.md` e `src/index.template.html`.
2. **Enquadramento**: folha de contato do raw (`$K --em video-projects/<slug> ffmpeg -i assets/raw.mp4 -vf "fps=1/4,scale=180:-1,tile=12x1" -frames:v 1 assets/contato.png`)
   e OLHE. Escreva `reel.json` na raiz do projeto: `{"capTop": 1545, "punch": 1.18, "split": {"y": 668, "scale": 1, "origin": "50% 0%"}}`.
   No split o rosto precisa ficar claramente abaixo da faixa: ajuste só `y` (520–700) num snapshot. Mantenha `scale` 1 — abaixo disso a apresentadora fica mais estreita que a tela e aparecem faixas pretas nas laterais. A caixa da legenda nunca cobre o rosto.
3. **Corte**: escreva `assets/keeps.json` (`{"fps":30,"keeps":[{"from":0,"to":9.4,"why":"…"}]}`, só cortes editoriais) →
   dentro de `assets/`: `$K --em video-projects/<slug>/assets $K --em video-projects/<slug>/assets node ../../../$X/corte-preciso.mjs cut.mp4` → `$K --em video-projects/<slug>/assets node ../../../$X/acelerar.mjs` (→ `clean.mp4` a 1,05×).
4. **Conferência**: na raiz do projeto: `$K --em video-projects/<slug> node ../../$M/transcrever.mjs assets/clean.mp4 assets/transcript.json --nomes "<termos do perfil>"`,
   leia inteiro; depois `--janelas` em todas as emendas (os tempos de `tight-segments.json` divididos por 1,05, acumulados).
   Repetição ou palavra cortada → volte ao 3. Palavra ouvida errado → `assets/caption-fixes.json`.
5. **Checagem da história**: encaixe a transcrição nas 8 batidas. Aponte batidas que faltam e afirmações que precisam
   de fonte (números, datas, "controla", "comprou"). Não reescreva o que foi dito.
6. **Mapa de edição** em `assets/mapa.json` (formato no topo de `checkpoint.mjs`): um item por apoio, tempo na linha do
   tempo FINAL + tempo do bruto. IDs: `V##` vídeo real · `R##` foto real · `P##` print · `B##` ilustração de IA · `M##` diagrama ·
   `Q##` quadro deste vídeo · sufixo `-reprise` para retornos. Para cada um: o que mostra, a frase que cobre, layout
   (split / full / dia), etiqueta, status (pronto / pendente). Para cada `M##`: a ação segundo a segundo
   ("0–1,2 s …; 1,2–2,6 s A vira B no mesmo lugar; …; segura parado para leitura").
7. **CHECKPOINT — antes de qualquer montagem.** `$K --em video-projects/<slug> node ../../$X/checkpoint.mjs` gera `assets/checkpoint.html`
   (gancho, contadores, diagramas com frase e tempo, mapa completo, fontes e o que cada uma pode ou NÃO pode provar,
   **pedido de material** pronto para copiar — por item: o que mostrar, duração, "não aceito IA/render/simulação",
   link + canal + data + início/fim conferidos —, e **Antes da publicação**: fatos a confirmar, valores aproximados,
   relações de marca que as imagens não podem sugerir). Abra para a aluna
   (`powershell -NoProfile -Command "Start-Process '<pasta do kit>\video-projects\<slug>\assets\checkpoint.html'"` com o caminho completo — `$K pasta` mostra a pasta do kit; nunca `cmd /c`, que no Bash do Claude trava), resuma em 3 linhas
   e termine com **"Revisar agora. Montar depois."** ESPERE a aprovação (por ID). Quando ela aprovar, registre com
   `$K --em video-projects/<slug> node ../../$X/checkpoint.mjs --aprovar "<a resposta dela>"` — sem esse registro o `renderizar.mjs` recusa o render.
   Mapa mudou depois? Gere o checkpoint de novo (a aprovação antiga é apagada).
8. **Material**: vídeo real → `assets/broll/V##.mp4` (corte no início/fim, sem som, sem tarja preta; guarde o original;
   em corte de telejornal use `-ss` DEPOIS do `-i` e recorte só a janela da imagem). Fotos → `assets/photos/R##.jpg`
   com crédito. Prints → da pasta **Meus prints**, recortados para `assets/prints/`. Ilustração de IA: escreva o prompt
   (6 s, genérico, sem marca legível, sem documento ou tela falsa) e PERGUNTE antes de qualquer geração paga.
   Toda origem vai em `assets/ORIGEM.md`.
9. **Composição**: `src/index.template.html` — um `.sup` por V/R/P/B/Q, um `.dia` por mecanismo (reaproveitado entre os
   passos). Ajudantes: `split / swapSup / full / drift / punch / wide / diaIn / diaOut / reveal / remove / swap / relabel /
   draw / outline / fade`. Tempos de `$K --em video-projects/<slug> node ../../$M/ancoras.mjs "frase" …`; entre no substantivo falado.
   Diagrama em tela cheia esconde a apresentadora; a legenda continua por cima, no rodapé livre.
10. **Montagem + checagem**: `$K --em video-projects/<slug> node ../../$X/montar.mjs` → `$K --em video-projects/<slug> hyperframes lint` → `$K --em video-projects/<slug> hyperframes snapshot --at …` em
    todo apoio e passo do diagrama, e OLHE: rosto visível sob a faixa, etiqueta legível, caixa da legenda nunca sobre
    o rosto nem sobre um nó do diagrama, sem tarja preta, diagrama legível no tempo que fica, voz em sincronia depois do 1,05×.
    Então render e entrega (pelo lançador, na pasta de trabalho do kit): `$K node $M/renderizar.mjs <slug>` — confere as travas, renderiza em segundo plano, valida e já copia para `prontos/`. Saída 3 = ainda renderizando: rode `$K node $M/renderizar.mjs <slug> --esperar` até sair PRONTO. Nunca rode `$K --em video-projects/<slug> hyperframes render` direto nem `prontos.mjs` à mão. (ele exige `assets/checkpoint.aprovado`).
11. **Entrega**:
    Responda em português, curto: onde está, o que foi cortado, o mapa de edição em uma linha por apoio, fontes, fatos ainda a confirmar.
    Nunca publique nem envie nada.

## Ajustes depois da entrega

"tira a parte X" → `keeps.json`, repita 3–4 e 10 (os tempos do template mudam: recalcule com `ancoras.mjs`).
"legenda palavra por palavra" → `reel.json {"captions":"words","capTop":<abaixo do queixo>}` e repita 10.
"troca a imagem do começo" → só o `.sup` e o `ORIGEM.md`, e 10. Nunca refaça do zero o que a aluna não pediu para mudar.
