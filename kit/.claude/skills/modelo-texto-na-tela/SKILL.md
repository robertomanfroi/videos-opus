---
name: modelo-texto-na-tela
description: Modelo "Texto na tela" da Suellen Warmling — vídeo curto (6 a 12 s) de bastidor com uma lista longa fixa na tela, alinhada à esquerda (título "Já reparou?" ou "REGRAS DE…", itens numerados, conclusão com CTA); curto de propósito para a pessoa pausar, reler e salvar. Sem fala, a música entra pelo Instagram. Use quando a aluna pedir "modelo texto na tela", "lista na tela", "texto grande no vídeo", "vídeo para salvar". Chamado pela skill `editar`.
---

# Modelo texto na tela

Vem de 3 reels da Suellen (instagram.com/reel/DePmYSzGho_, DeMqFfDGn9_, Dd2APCWqbro). O vídeo é fundo;
o conteúdo é a lista. Ninguém lê tudo em 6 s: o vídeo repete, a pessoa pausa, salva e comenta.

## Ficha (1080×1920, medido quadro a quadro)

| Elemento | Regra |
|---|---|
| Duração | **6 a 12 s** (referências: 6,1 · 6,3 · 12,1 s). Um trecho só da cena. |
| Cena | Bastidor dela (palco, evento, plateia, passeio). Tela cheia, de preferência com movimento. |
| Estrutura do texto | 1) título curto (*Já reparou?* / *REGRAS DE NEGÓCIOS DE SUCESSO*); 2) **5 a 12 itens numerados** ("1." "2." …), cada um com 1 a 3 linhas; 3) conclusão com CTA (*Ou seja, MARKETING está em tudo. E pra engrenar o seu marketing, segue @perfil* / *Digite MARKETING.*). |
| Letra | Branco, Figtree 700, **42 px**, entrelinha **47 px**. |
| Alinhamento | **À esquerda**, margem esquerda **188 px**, caixa de **706 px**. |
| Espaços | **Uma linha vazia (47 px)** entre título, cada item e conclusão. Lista muito longa (mais de 10 itens): sem linha vazia entre itens, como nas *Regras*. |
| Posição | Bloco **centralizado na altura** (centro em y≈960). O bloco inteiro cabe entre y≈280 e y≈1640. |
| Tempo | Na tela do primeiro ao último quadro, parado. Sem animação. |
| Halo | Escuro suave, nunca contorno. |
| Som | Som original **mudo**; música pelo Instagram. |

## O que pedir para a aluna

1. O vídeo de fundo.
2. O assunto da lista e o CTA (palavra para comentar ou "segue @perfil"). Escreva a lista para ela aprovar
   antes de montar: itens curtos, concretos, do dia a dia de quem a segue.

## Fluxo

Todo comando passa pelo lançador `$K` (veja o `estilo-celular/SKILL.md`). Os comandos soltos deste guia também:
`ffmpeg …` vira `$K --em video-projects/<slug> ffmpeg …`.

Siga o **Fluxo** do `estilo-celular/SKILL.md` (mesmos comandos e o mesmo jeito de chamar cada programa), trocando
`estilo-celular` por `modelo-texto-na-tela`, com estas diferenças:

- **Passo 3:** `keeps.json` com um trecho só (6–12 s; mais itens = mais perto de 12 s).
- **Passo 4:** antes do `cortar.mjs`, crie `assets/silences.txt` **vazio** (nada é cortado).
- **Passo 5:** a transcrição só é feita porque a trava do render pede.
- **Passo 7:** cada parte vira um `<p>` dentro do `#texto` (título, um `<p>` por item, conclusão). Destaque só com
  MAIÚSCULAS, como nas referências (*MARKETING*), nunca com cor.
- **Passo 8:** snapshot no 1º e no último quadro. Confira se o bloco não passa de y≈1640 nem começa acima de y≈280;
  se passar, encurte o texto (não diminua a letra abaixo de 38 px).
- **Entrega:** vídeo **sem som**, música pelo Instagram.

## Ajustes comuns

"letra maior" → até 46 px, com entrelinha 52 px, e confira se cabe · "texto mais escuro atrás" → não ponha caixa;
escureça a cena com um véu (`#cam{filter:brightness(.8)}`) · "mais tempo" → até 15 s.
