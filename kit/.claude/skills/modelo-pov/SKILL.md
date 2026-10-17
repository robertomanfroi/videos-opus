---
name: modelo-pov
description: Modelo "POV" da Suellen Warmling — vídeo curto de 6 a 8 s com uma cena de bastidor (evento, equipe, clientes, momento marcante) e uma frase "POV: …" fixa no terço de cima, do primeiro ao último quadro; sem fala, a música entra pelo Instagram. Use quando a aluna pedir "modelo POV", "POV", "vídeo de POV", "vídeo com frase em cima". Chamado pela skill `editar`.
---

# Modelo POV

Vem de 2 reels da Suellen (instagram.com/reel/DekedMUBTj1, Ddtk3aaqfjp). É o vídeo de identificação:
uma cena real e uma frase que faz quem assiste se ver nela. Nada se mexe além da própria cena.

## Ficha (1080×1920, medido quadro a quadro)

| Elemento | Regra |
|---|---|
| Duração | **6 a 8 s** (referências: 6,1 e 7,7 s). Um trecho só da cena, sem cortes. |
| Cena | Vídeo real dela (evento, brinde, roda de alunas, equipe, cliente). Tela cheia. Sem fala. |
| Texto | Começa com **"POV:"**. 2 a 4 linhas, 20 a 35 palavras. Branco, Figtree 700, **44 px**, entrelinha **48 px**, **centralizado**, caixa de 776 px. Bloco centrado em **y≈592** (terço de cima, acima das cabeças). Halo escuro suave, nunca contorno. |
| Tempo do texto | Na tela do **primeiro ao último quadro**, parado. Sem entrada, saída ou animação. |
| Som | Som original **mudo**. Ela escolhe a música no Instagram na hora de postar (as referências usam música com letra). |

## O que pedir para a aluna

1. O vídeo da cena (pode ser de qualquer tamanho; você escolhe os melhores 6–8 s).
2. A frase do POV. Se ela não tiver, proponha 3 opções no formato *"POV: você [situação] e [consequência emocional]"* e deixe ela escolher.

## Fluxo

Todo comando passa pelo lançador `$K` (veja o `estilo-celular/SKILL.md`). Os comandos soltos deste guia também:
`ffmpeg …` vira `$K --em video-projects/<slug> ffmpeg …`.

Siga o **Fluxo** do `estilo-celular/SKILL.md` (mesmos comandos e o mesmo jeito de chamar cada programa), trocando
`estilo-celular` por `modelo-pov`, com estas diferenças:

- **Passo 2:** veja o contato e escolha os 6–8 s com mais movimento e emoção (brinde, abraço, palmas). Confira se as
  cabeças ficam abaixo de y≈720; se o assunto estiver no alto, suba o `top` do `#texto` no template, mas mantenha-o no terço de cima.
- **Passo 3:** `keeps.json` com **um trecho só** (`from` e `to` do trecho escolhido).
- **Passo 4:** antes do `cortar.mjs`, crie um `assets/silences.txt` **vazio** (a cena não tem fala: assim nada é cortado).
- **Passo 5:** a transcrição só é feita porque a trava do render pede; não há legenda nem conferência de fala.
- **Passos 6 e 7:** sem prints. Escreva a frase no `#texto` do template.
- **Passo 8:** snapshot no 1º quadro, no meio e no último. Texto inteiro legível sobre a cena; nenhuma cabeça coberta.
- **Entrega:** lembre que o vídeo sai **sem som** e que a música entra no Instagram (Reels → Áudio).

## Ajustes comuns

"texto mais pra baixo/cima" → `top` do `#texto` · "com o som do vídeo" → `data-volume="0.3"` no `#som`
· "mais longo" → até 10 s; além disso, avise que o modelo perde força.
