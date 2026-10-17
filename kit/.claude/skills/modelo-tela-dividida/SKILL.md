---
name: modelo-tela-dividida
description: Modelo "Tela dividida" da Suellen Warmling — nos primeiros segundos a tela se divide: em cima uma cena de contexto (notícia, vídeo de outra pessoa, produto, evento), embaixo a aluna falando, com o título do gancho em cima da emenda; quando o gancho acaba, corte seco para ela em tela cheia, sem legenda, até o fim. Use quando a aluna pedir "modelo tela dividida", "tela dividida", "vídeo dividido", "metade em cima metade embaixo", ou quiser comentar um vídeo/notícia de outra pessoa. Chamado pela skill `editar`.
---

# Modelo tela dividida

Vem de 4 reels da Suellen (instagram.com/reel/DehQhcfBxaB, DeejDfLBhWL, DechnDSqGm3, DeSJ_O3KFJ-).
A graça do modelo: o contexto em cima prende quem rola o feed, o título faz a pergunta e ela responde.
Depois do gancho é só ela falando, sem nada na tela.

## Ficha (1080×1920, medido quadro a quadro)

| Elemento | Regra |
|---|---|
| Duração | 40 a 75 s. Fala começa no primeiro quadro. |
| Divisão | Do 0 até o fim da frase do gancho: **3 a 11 s** (referências: 2,8 · 6,1 · 7,5 · 10,7 s). Termina em corte seco, nunca no meio de palavra. |
| Metade de cima | Cena de contexto, `1080×960`, preenchendo tudo (corte central), **sem som**. |
| Metade de baixo | A própria gravação dela, `1080×960`. Rosto a ~25% abaixo da emenda (topo da cabeça perto de y=1000). Mesmo tamanho da tela cheia, sem zoom. |
| Emenda | Reta em **y = 960**, sem borda, sem sombra. |
| Título do gancho | Branco, Figtree 700, **69 px**, entrelinha **79 px**, centralizado, caixa de 720 px. **2 linhas** (3 se for longa). O bloco fica sobre a emenda (centro em y≈925): a última linha encosta na emenda. Halo escuro suave, nunca contorno. Some junto com a divisão. Pode ter aspas e "?" (ex.: *O mundo hoje é dos "preguiçosos"?*). |
| Depois da divisão | Ela em tela cheia, **sem legenda, sem título, sem print**. Cortes secos só para tirar pausa e erro. |
| Som | Só a voz dela (normalizada). Sem trilha. |

## O que pedir para a aluna

1. A gravação dela falando (em pé, rosto no terço de cima).
2. A **cena de contexto**: um vídeo curto salvo no computador (notícia, vídeo de outra pessoa, produto, cliente, evento).
   Sem vídeo de contexto, pergunte se ela tem um; não invente nem baixe nada da internet.
3. O título do gancho, se ela já tiver. Se não, proponha um a partir da primeira frase dela (pergunta curta e provocativa).

## Fluxo

Todo comando passa pelo lançador `$K` (veja o `estilo-celular/SKILL.md`). Os comandos soltos deste guia também:
`ffmpeg …` vira `$K --em video-projects/<slug> ffmpeg …`.

Siga o **Fluxo** do `estilo-celular/SKILL.md` (mesmos comandos e o mesmo jeito de chamar cada programa), trocando
`estilo-celular` por `modelo-tela-dividida`, com estas diferenças:

- **Passo 2 (enquadramento):** além do contato, decida a 2ª coordenada do `object-position` de `#camBaixo`
  (padrão `30%`; aumente se a cabeça ficar cortada embaixo da emenda, diminua se sobrar parede).
- **Passo 3 (corte):** o primeiro trecho do `keeps.json` começa na primeira palavra do gancho.
- **Passo 6 (cena de contexto, no lugar dos prints):** prepare `assets/broll/contexto.mp4` com o ffmpeg:
  `ffmpeg -y -ss <início> -t <FIM> -i "<vídeo de contexto>" -an -vf "scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,fps=30" -c:v libx264 -crf 18 -pix_fmt yuv420p assets/broll/contexto.mp4`
  (rode na pasta do projeto). O trecho tem que ter a parte mais forte da cena.
- **Passo 7 (composição):** no `src/index.template.html` troque as 3 ocorrências de `FIM` pelo fim do gancho
  (tempo do clean, de `ancoras.mjs`, logo depois da última palavra da frase) e escreva o título no `#titulo`.
  Nada de legenda: este modelo não usa `__CAPTIONS__`.
- **Passo 8 (snapshots):** tire em 1 s, no último quadro da divisão, logo depois dela e no meio do vídeo.
  Confira: título inteiro legível, nenhuma letra cortada nas bordas, rosto dela inteiro na metade de baixo.

## Ajustes comuns

"divisão mais longa/curta" → muda `FIM` (3 lugares) e o tamanho do `contexto.mp4` · "título em 3 linhas" → `<br>` onde ela quiser
· "outro trecho da cena" → refaz o `contexto.mp4` com outro `-ss` · "quero legenda depois" → diga que o modelo é sem
legenda e ofereça o `estilo-celular`.
