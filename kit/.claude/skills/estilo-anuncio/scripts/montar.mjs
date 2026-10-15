// Monta o index.html do ANÚNCIO. Rodar na raiz do projeto:  node ../../.claude/skills/estilo-anuncio/scripts/montar.mjs
// 1. roda _motor/montar.mjs (legenda palavra a palavra, duração, __CAP_TOP__, __ACCENT__, __FONT_TITLE__, emojis)
// 2. troca o que é só do anúncio, a partir de reel.json e perfil.json:
//    __FAIXA__ / __ZONA_TOP__ / __ZONA_ESC__ : zona dos esquemas. reel.json {"faixa":"topo"|"peito","zonaTop":280,"zonaAltura":340}
//         os blocos são desenhados em 1080×340 e escalados para zonaAltura (o modelo clássico usa 420 de altura)
//    __COR_IA__ : cor do nó "IA" (perfil.json cor_ia → senão violeta #7C6CF2)
//    __USUARIO__ / __NOME__ / __INICIAL__ : do perfil.json
//    assets/img/avatar.png : foto do perfil (perfil.json avatar); sem foto → círculo com a inicial (avatar.svg)
// 3. confere: nenhum marcador __X__ sobrou e nenhuma imagem citada falta em assets/img.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const motor = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "_motor");
execFileSync(process.execPath, [join(motor, "montar.mjs")], { stdio: "inherit" });

const cfg = { faixa: "topo", zonaTop: 280, zonaAltura: 340, ...(existsSync("reel.json") ? JSON.parse(readFileSync("reel.json", "utf8")) : {}) };
const perfil = lerPerfil();
const base = readFileSync("src/index.template.html", "utf8").includes("height:420px;opacity:0") ? 420 : 340;
const usuario = (perfil.usuario || "seu.perfil").replace(/^@/, "");
const nome = perfil.nome || usuario;
const corIa = /^#[0-9a-fA-F]{6}$/.test(perfil.cor_ia || "") ? perfil.cor_ia : "#7C6CF2";

mkdirSync("assets/img", { recursive: true });
let avatar = "assets/img/avatar.png";
if (perfil.avatar && existsSync(perfil.avatar)) copyFileSync(perfil.avatar, avatar);
if (!existsSync(avatar)) {
  avatar = "assets/img/avatar.svg";
  const ini = (nome.trim()[0] || "?").toUpperCase();
  writeFileSync(avatar, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#3a3a3c"/><text x="50" y="66" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="46" fill="#fff">${ini}</text></svg>`);
}

let html = readFileSync("index.html", "utf8")
  .replaceAll("__FAIXA__", cfg.faixa === "peito" ? "peito" : "topo")
  .replaceAll("__ZONA_TOP__", String(cfg.zonaTop))
  .replaceAll("__ZONA_ESC__", (cfg.zonaAltura / base).toFixed(4))
  .replaceAll("__COR_IA__", corIa)
  .replaceAll("__USUARIO__", usuario).replaceAll("__NOME__", nome).replaceAll("__INICIAL__", (nome.trim()[0] || "?").toUpperCase())
  .replaceAll("assets/img/avatar.png", avatar);
writeFileSync("index.html", html);

const sobrou = [...new Set(html.match(/__[A-Z][A-Z0-9_]*__/g) || [])];
const faltam = [...new Set([...html.matchAll(/assets\/img\/[\w.-]+\.(?:jpe?g|png|webp|gif|svg)/gi)].map((m) => m[0]))].filter((f) => !existsSync(f));
if (sobrou.length) console.warn("ATENÇÃO marcadores não trocados:", sobrou.join(", "));
if (faltam.length) console.warn("ATENÇÃO imagens que faltam (troque pela real ou apague o esquema):", faltam.join(", "));
console.log(`anúncio montado — faixa ${cfg.faixa}, zona y ${cfg.zonaTop}–${cfg.zonaTop + cfg.zonaAltura}, legenda y ${cfg.capTop ?? "padrão"}`);
if (sobrou.length || faltam.length) process.exit(2);

function lerPerfil() {
  for (const p of ["../../perfil.json", "perfil.json"]) { try { return JSON.parse(readFileSync(p, "utf8")); } catch {} }
  return {};
}
