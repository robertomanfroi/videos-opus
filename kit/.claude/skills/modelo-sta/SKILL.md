---
name: modelo-sta
description: Modelo "STA" da Suellen Warmling — vídeo de 10 a 18 s com uma cena calma e contemplativa (lugar bonito, céu, café, viagem) e uma citação fixa no centro: título curto ("Frase de um bilionário:") + a frase entre aspas. Sem fala, a música entra pelo Instagram. Use quando a aluna pedir "modelo STA", "STA", "vídeo de frase", "citação na tela", "frase de reflexão". Chamado pela skill `editar`.
---

# Modelo STA

Vem do reel da Suellen instagram.com/reel/Dd6TyABKZD9. Uma frase forte, uma cena que dá tempo de ler.
Diferente do *texto na tela* (lista, rápido, para salvar), aqui o ritmo é lento: dá para ler a frase inteira.

## Ficha (1080×1920, medido quadro a quadro)

| Elemento | Regra |
|---|---|
| Duração | **10 a 18 s** (referência: 17,6 s). Regra: ~3,5 palavras por segundo de texto + 2 s. Um trecho só, câmera parada ou quase. |
| Cena | Lugar com céu, árvore, fachada, mesa de café, vista. Calma, pouco movimento, luz de dia. |
| Texto | 1) título curto com dois-pontos (*Frase de um bilionário:*); 2) **uma linha vazia**; 3) a frase entre aspas curvas “ ” (40 a 70 palavras). |
| Letra | Branco, Figtree 700, **54 px**, entrelinha **59 px**, **centralizado**, caixa de **684 px** (10 a 12 linhas). |
| Posição | Bloco centrado em **y≈1060** (um pouco abaixo do meio): na referência vai de y=685 a y=1437. |
| Tempo | Na tela do primeiro ao último quadro, parado. Sem animação. |
| Halo | Escuro suave, nunca contorno (a cena é clara: confira legibilidade no céu e nas paredes brancas). |
| Som | Som original **mudo**; música pelo Instagram. |

## O que pedir para a aluna

1. O vídeo da cena.
2. A frase e o título (de quem é a frase, ou o tipo: *Frase de um bilionário*, *Conselho que mudou meu negócio*).
   Se a autoria não for conhecida, o título não inventa nome.

## Fluxo

Todo comando passa pelo lançador `$K` (veja o `estilo-celular/SKILL.md`). Os comandos soltos deste guia também:
`ffmpeg …` vira `$K --em video-projects/<slug> ffmpeg …`.

Siga o **Fluxo** do `estilo-celular/SKILL.md` (mesmos comandos e o mesmo jeito de chamar cada programa), trocando
`estilo-celular` por `modelo-sta`, com estas diferenças:

- **Passo 3:** `keeps.json` com um trecho só, na duração da regra acima.
- **Passo 4:** antes do `cortar.mjs`, crie `assets/silences.txt` **vazio**.
- **Passo 5:** a transcrição só é feita porque a trava do render pede.
- **Passo 7:** título no primeiro `<p>`, frase no segundo, com aspas curvas.
- **Passo 8:** snapshot no 1º, no meio e no último quadro. Texto legível nos pontos mais claros da cena;
  se não estiver, escureça a cena com `#cam{filter:brightness(.82)}` (nunca caixa atrás do texto).
- **Entrega:** vídeo **sem som**, música pelo Instagram.

## Ajustes comuns

"frase maior" → corte palavras, não diminua a letra abaixo de 48 px · "mais tempo para ler" → até 20 s.
