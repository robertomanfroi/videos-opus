---
name: modelo-entrevista
description: Modelo "Entrevista" da Suellen Warmling — entrevistas de corredor em evento (ela com microfone, convidado de corpo inteiro), abertas por uma montagem rápida dos convidados com o título do gancho no centro e o print do perfil do Instagram de cada convidado aparecendo sobre ele; depois, as respostas em sequência, sem legenda. Use quando a aluna pedir "modelo entrevista", "entrevista", "entrevistei pessoas", "vox pop", "perguntei para várias pessoas". Chamado pela skill `editar`.
---

# Modelo entrevista

Vem de 2 reels da Suellen (instagram.com/reel/DdJg1HdqsW-, DdrpDmiKx69). A mesma pergunta para várias
pessoas; a abertura mostra quem são (prints dos perfis = prova de autoridade) e o resto são as respostas.

## Ficha (1080×1920, medido quadro a quadro)

| Elemento | Regra |
|---|---|
| Duração | 60 a 170 s (referências: 82 e 166 s). |
| Enquadramento | Os dois de pé, corpo inteiro ou quase, lado a lado, câmera na altura do peito. Tela cheia. |
| Abertura | **Montagem rápida**: um trecho de **1,5 a 3 s** de cada convidado (a pergunta ou a frase mais forte), em sequência. Na referência DdJg: 7 convidados entre 5 e 20 s. |
| Título do gancho | Branco, Figtree 700, **64 px**, entrelinha **71 px**, centralizado, caixa de 740 px, 3 a 4 linhas. Bloco centrado em **y≈1075** (55% da altura). Na tela do 0 até o fim da abertura (4 a 25 s). Ex.: *Entrevistei empreendedores com milhares de seguidores e eles abriram o jogo*. |
| Print do perfil | Cabeçalho cru do Instagram do convidado (barra com o @ e o selo, foto, posts/seguidores/seguindo, nome, bio e link). **644 px de largura** (cerca de 60% da tela), **canto reto, sem borda, sem sombra**. Topo entre **y=920 e y=1010**, sobre o **tronco do convidado**, nunca no rosto. Entra **~0,3 s depois do corte** para ele e sai no próximo corte. Um por convidado, só na abertura. |
| Título e prints | Não aparecem juntos: título primeiro; os prints começam quando o título sai (ou o título fica sozinho se não houver prints). |
| Depois da abertura | As respostas, uma pessoa por vez, **sem legenda e sem elementos**. Cortes secos para tirar pausas e repetições. |
| Som | Só as vozes (normalizadas). Sem trilha. |

## O que pedir para a aluna

1. Os vídeos das entrevistas (um arquivo por convidado, ou um arquivo só com todas).
2. Prints do perfil de cada convidado na pasta **Meus prints** (só o cabeçalho: foto, @, seguidores, bio).
   Sem print de alguém → siga sem print para essa pessoa e diga qual faltou. **Nunca invente um perfil.**
3. A pergunta que ela fez e o título do gancho (se não tiver, proponha 3).

## Fluxo

Todo comando passa pelo lançador `$K` (veja o `estilo-celular/SKILL.md`). Os comandos soltos deste guia também:
`ffmpeg …` vira `$K --em video-projects/<slug> ffmpeg …`.

Siga o **Fluxo** do `estilo-celular/SKILL.md` (mesmos comandos e o mesmo jeito de chamar cada programa), trocando
`estilo-celular` por `modelo-entrevista`, com estas diferenças:

- **Antes do passo 1, se forem vários arquivos:** junte na ordem dos convidados num `entrevistas.mp4`, todos em 1080×1920 30 fps
  (`ffmpeg -i a.mp4 -i b.mp4 … -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1[v0];…;[v0][a0][v1][a1]…concat=n=N:v=1:a=1[v][a]" -map "[v]" -map "[a]" entrevistas.mp4`)
  e use esse arquivo no passo 1. Anote no `keeps.json` (`why`) onde começa cada convidado.
- **Passo 3 (corte):** primeiro os trechos curtos da abertura (um por convidado), depois as respostas completas.
- **Passo 6 (prints):** recorte só o cabeçalho de cada perfil para `assets/prints/<convidado>.png` e veja cada um.
- **Passo 7 (composição):** troque o `FIM` do `data-duration` do `#titulo` pelo fim da abertura; um `<img class="perfil clip">` por convidado
  com `data-start` = corte para ele + 0,3 s e `data-duration` até o próximo corte; `left/top` sobre o tronco dele
  (olhe o snapshot). Sem legenda.
- **Passo 8 (snapshots):** um quadro em cada print e um depois da abertura. Print nunca cobre rosto; título legível.

## Ajustes comuns

"tira fulano" → `keeps.json` e o print dele · "print maior" → até 780 px · "quero legenda" → explique que o modelo é sem
legenda e ofereça o `estilo-celular`.
