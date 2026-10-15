// Gera a página de revisão (CHECKPOINT) do reel explicativo ANTES de montar: mapa de edição com IDs, diagramas
// segundo a segundo, material a buscar (com texto pronto para pedir), fontes e o que cada uma prova ou NÃO prova,
// e a lista "Antes da publicação". Termina com "Revisar agora. Montar depois."
// Rodar na raiz do projeto:  node ../../.claude/skills/estilo-explicativo/scripts/checkpoint.mjs
// Entrada: assets/mapa.json   Saídas: assets/checkpoint.html (abrir no navegador) e assets/mapa.md
//
// assets/mapa.json:
// { "gancho": "Como um banco controla o estádio sem nunca ter comprado?",
//   "duracao": 66,
//   "itens": [ { "id": "V01", "mostra": "vista aérea real do estádio", "frase": "como um banco consegue…",
//                "saida": "0.0–4.5", "bruto": "0.0–4.7", "layout": "split", "etiqueta": "ARQUIVO · 2020",
//                "status": "pendente", "fonte": "", "prova": "", "nao_prova": "",
//                "acao": "só para M##: 0–1,2 s …; 1,2–2,6 s card A vira B no mesmo lugar; segura parado" } ],
//   "pedido_material": "texto pronto para a aluna mandar a quem tem o material (opcional; gerado se faltar)",
//   "antes_da_publicacao": ["fato a confirmar", "número aproximado", "relação de marca que a imagem não pode sugerir"] }
// Tipos pelo prefixo do ID: V vídeo real · R foto real · P print · B ilustração de IA (genérica) · M diagrama · Q quadro deste vídeo.
// Sufixo "-reprise" = retorno a um apoio já usado (não conta como novo).
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";

// Aprovação: SÓ depois que a aluna respondeu aprovando (copie a resposta dela). O renderizar.mjs exige este arquivo.
//   node ../../.claude/skills/estilo-explicativo/scripts/checkpoint.mjs --aprovar "pode montar, tira o R03"
const iA = process.argv.indexOf("--aprovar");
if (iA >= 0) {
  const resposta = (process.argv[iA + 1] || "").trim();
  if (!existsSync("assets/mapa.json")) { console.error("falta assets/mapa.json"); process.exit(1); }
  if (resposta.length < 2) { console.error('cole a resposta da aluna: --aprovar "<o que ela disse>"'); process.exit(1); }
  writeFileSync("assets/checkpoint.aprovado", JSON.stringify({ resposta, em: new Date().toISOString() }, null, 2));
  rmSync("assets/checkpoint.pendente", { force: true });
  console.log("checkpoint aprovado — pode montar");
  process.exit(0);
}

const m = JSON.parse(readFileSync("assets/mapa.json", "utf8"));
const itens = m.itens || [];
const tipo = (id) => id.replace(/-reprise$/, "")[0].toUpperCase();
const novo = itens.filter((i) => !/-reprise$/.test(i.id));
const conta = (f) => novo.filter(f).length;
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const NOMES = { V: "vídeo real", R: "foto real", P: "print", B: "ilustração (IA)", M: "diagrama", Q: "quadro deste vídeo" };

const cont = {
  "Apoios prontos": conta((i) => tipo(i.id) !== "M" && i.status === "pronto"),
  "Material a buscar": conta((i) => "VRP".includes(tipo(i.id)) && i.status !== "pronto"),
  "Diagramas": conta((i) => tipo(i.id) === "M"),
  "Duração": `${Math.round(m.duracao || 0)} s`,
};
const pendentes = novo.filter((i) => "VRP".includes(tipo(i.id)) && i.status !== "pronto");
const pedido = m.pedido_material || (pendentes.length ? pendentes.map((i) =>
  `${i.id} — ${i.mostra}. Duração: uns ${dur(i.saida)} s. Precisa ser material REAL (não aceito IA, render ou simulação). ` +
  `Me mande o link + canal/autor + data + início e fim (mm:ss) conferidos assistindo.`).join("\n\n") : "");
function dur(r = "") { const [a, b] = r.split(/[–-]/).map(Number); return isFinite(b - a) ? Math.max(1, Math.round(b - a)) : "?"; }

const linhas = itens.map((i) => `<tr><td><b>${esc(i.id)}</b><br><small>${NOMES[tipo(i.id)] || ""}</small></td><td>${esc(i.saida)}<br><small>bruto ${esc(i.bruto || "—")}</small></td>` +
  `<td>${esc(i.mostra)}</td><td><i>“${esc(i.frase)}”</i></td><td>${esc(i.layout || "")}</td><td>${esc(i.etiqueta || "")}</td>` +
  `<td class="${i.status === "pronto" ? "ok" : "pend"}">${esc(i.status || "pendente")}</td></tr>`).join("\n");
const diagramas = itens.filter((i) => tipo(i.id) === "M").map((i) => `<div class="card"><h3>${esc(i.id)} · ${esc(i.mostra)}</h3>` +
  `<p class="q">“${esc(i.frase)}”</p><p><b>${esc(i.saida)} s</b> — ${esc(i.acao || "")}</p></div>`).join("\n");
const fontes = itens.filter((i) => i.fonte).map((i) => `<div class="card"><h3>${esc(i.id)} · ${esc(i.mostra)}</h3><p>Fonte: ${esc(i.fonte)}</p>` +
  `<p>✔ Pode provar: ${esc(i.prova || "—")}</p><p>✘ NÃO prova: ${esc(i.nao_prova || "—")}</p></div>`).join("\n");
const antes = (m.antes_da_publicacao || []).map((x) => `<li>${esc(x)}</li>`).join("");

writeFileSync("assets/checkpoint.html", `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão do reel</title><style>
:root{--bg:#f6f5f2;--fg:#1c2733;--mut:#5d6670;--card:#fff;--line:#e3e1dc;--ok:#1f7a63;--pend:#b4541a}
@media (prefers-color-scheme:dark){:root{--bg:#12161b;--fg:#e9edf1;--mut:#9aa4ae;--card:#1b2128;--line:#2a323b;--ok:#5cc3a0;--pend:#f0a36b}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:28px;line-height:1.2;margin:8px 0 4px} h2{margin-top:36px;font-size:20px} h3{margin:0 0 6px;font-size:16px}
.cont{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px}
.cont div,.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.cont b{display:block;font-size:26px} .cont span{color:var(--mut);font-size:13px}
.card{margin:10px 0} .q{color:var(--mut)}
.tab{overflow-x:auto} table{border-collapse:collapse;width:100%;min-width:720px;background:var(--card)}
td,th{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left;font-size:14px} small{color:var(--mut)}
.ok{color:var(--ok);font-weight:600} .pend{color:var(--pend);font-weight:600}
pre{white-space:pre-wrap;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
.fim{margin-top:40px;font-size:22px;font-weight:700}
</style></head><body><main>
<small>Revisão antes de montar</small><h1>${esc(m.gancho)}</h1>
<div class="cont">${Object.entries(cont).map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join("")}</div>
<h2>Diagramas</h2>${diagramas || "<p>Nenhum.</p>"}
<h2>Mapa de edição</h2><div class="tab"><table><tr><th>ID</th><th>Tempo (s)</th><th>Mostra</th><th>Frase</th><th>Layout</th><th>Etiqueta</th><th>Status</th></tr>${linhas}</table></div>
<h2>Fontes e o que cada uma prova</h2>${fontes || "<p>Nenhuma fonte externa.</p>"}
<h2>Material a pedir</h2>${pedido ? `<pre>${esc(pedido)}</pre>` : "<p>Nada pendente.</p>"}
<h2>Antes da publicação</h2><ul>${antes || "<li>Nada a confirmar.</li>"}</ul>
<p class="fim">Revisar agora. Montar depois.</p>
</main></body></html>`);

const md = [`# ${m.gancho}`, "", Object.entries(cont).map(([k, v]) => `${k}: ${v}`).join(" · "), "",
  "| ID | Tempo | Mostra | Frase | Layout | Etiqueta | Status |", "|---|---|---|---|---|---|---|",
  ...itens.map((i) => `| ${i.id} | ${i.saida} (bruto ${i.bruto || "—"}) | ${i.mostra} | ${i.frase} | ${i.layout || ""} | ${i.etiqueta || ""} | ${i.status || "pendente"} |`),
  "", ...itens.filter((i) => tipo(i.id) === "M").map((i) => `- **${i.id}** ${i.saida}: ${i.acao || ""}`),
  "", "## Antes da publicação", ...(m.antes_da_publicacao || []).map((x) => `- ${x}`)].join("\n");
writeFileSync("assets/mapa.md", md + "\n");
rmSync("assets/checkpoint.aprovado", { force: true });   // mapa novo = aprovação velha não vale
writeFileSync("assets/checkpoint.pendente", new Date().toISOString());
console.log(`assets/checkpoint.html — ${itens.length} itens, ${pendentes.length} pendente(s). Abra no navegador e espere a aprovação.`);
