# Gera a versão das instruções para o Codex (usada pelo empacotar.sh).
# Cabeçalho só com name e description; SKILL_DIR vira {{SKILL_DIR}}, trocado pelo instalador do Codex.
import sys
s = open(sys.argv[1], encoding="utf-8").read()
fm, corpo = s.split("---\n", 2)[1:]
fm = "\n".join(l for l in fm.splitlines() if l.startswith(("name:", "description:")))
velho = "`SKILL_DIR` é a pasta deste SKILL.md."
assert velho in corpo, "frase do SKILL_DIR mudou"
corpo = corpo.replace(velho, "`SKILL_DIR` é a pasta `{{SKILL_DIR}}` (os programas da skill ficam ali, fora da pasta de skills do Codex).", 1)
open(sys.argv[2], "w", encoding="utf-8").write("---\n" + fm + "\n---\n" + corpo)
