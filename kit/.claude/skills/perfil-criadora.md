# Perfil da criadora (lido por todas as skills de estilo)

Antes do primeiro vídeo, leia `perfil.json` na pasta de trabalho do kit (`$K pasta` mostra qual é). Se ele não existir,
crie. `pasta_prints` é a pasta **Meus prints** na Área de Trabalho real dela (pode estar dentro do OneDrive): crie a pasta
se não existir e grave o caminho completo. Se `nome` ou `usuario` estiverem vazios, pergunte à aluna UMA vez, numa
mensagem só, em português simples, e complete (mantendo o que já existe):

```json
{
  "nome": "Nome que aparece no perfil do Instagram",
  "usuario": "arroba_sem_o_arroba",
  "nicho": "Ex.: Confeitaria artesanal",
  "seguidores": "Ex.: 12,4 mil (como aparece no Instagram)",
  "pasta_prints": "C:\\Users\\<ela>\\Desktop\\Meus prints",
  "avatar": "caminho da foto de perfil (opcional)",
  "cor_destaque": "",
  "fonte_titulo": "",
  "termos": ["nomes próprios e termos do nicho que o transcritor costuma errar"]
}
```

Como perguntar (modelo):

> Antes da primeira edição preciso de 5 coisas, pode responder tudo numa mensagem:
> 1. Seu nome como aparece no Instagram
> 2. Seu @
> 3. Seu nicho em poucas palavras
> 4. Quer uma cor de destaque da sua marca nos vídeos (ex.: #C14B22)? Se não, uso o amarelo padrão.
> 5. Nomes que você fala muito e são difíceis de escrever (sua marca, produto, cidade, ferramentas) — eu acerto na legenda.
> Os prints que você quiser usar no vídeo você coloca na pasta **Meus prints**, que criei na sua Área de Trabalho.

Regras:
- Use esses dados sempre que um template mostrar nome, @, avatar ou número de seguidores.
- `cor_destaque` vazia → a cor padrão de cada estilo. `fonte_titulo`: só se a fonte estiver instalada no computador;
  hoje é usada pelos estilos celular, anúncio e colagem (os outros mantêm a fonte própria).
- `termos` entram no transcritor (`--nomes`) para acertar nomes próprios. Palavras que ainda saírem erradas
  vão em `assets/caption-fixes.json` do projeto (`{"cloud": "Claude"}` — vale com qualquer maiúscula ou pontuação).
- Nunca invente números, logos, capas ou prints. Se faltar algo, diga o que ajudaria e siga sem.
- O vídeo é da aluna: nenhuma marca de terceiros (nem do produto) entra no vídeo.
