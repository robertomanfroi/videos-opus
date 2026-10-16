// Usado só pelo instalador do Codex. O pacote (programas, ~750 MB) fica em %LOCALAPPDATA%\videos-opus\pacote e,
// na pasta de skills do Codex, vai apenas o SKILL.md apontando para ele: o Codex varre as subpastas das skills
// e os milhares de arquivos do pacote (com SKILL.md internos de bibliotecas) atrapalhariam essa varredura.
// Uso: node instalar-codex.mjs <pasta-da-skill-no-codex>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pacote = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destino = process.argv[2];
if (!destino) { console.error("diga a pasta da skill no Codex"); process.exit(1); }
const modelo = readFileSync(join(pacote, "codex", "SKILL.md"), "utf8");
mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, "SKILL.md"), modelo.replaceAll("{{SKILL_DIR}}", pacote));
console.log(JSON.stringify({ ok: true, skill: join(destino, "SKILL.md"), pacote }));
