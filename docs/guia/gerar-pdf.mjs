// Gera o PDF do guia com o Edge (playwright-core da skill). Uso: node gerar-pdf.mjs <guia.html> <saida.pdf> <skill-dir>
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
const [html, pdf, skill] = process.argv.slice(2);
const { chromium } = createRequire(join(skill, "package.json"))("playwright-core");
const b = await chromium.launch({ executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
const p = await b.newPage();
await p.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
// confere se alguma página transborda (conteúdo cortado no PDF)
const sobra = await p.evaluate(() => [...document.querySelectorAll(".pagina")].map((el, i) => {
  const lim = el.getBoundingClientRect().bottom - parseFloat(getComputedStyle(el).paddingBottom) + 4;
  const fundo = Math.max(...[...el.children].filter((c) => !c.classList.contains("rodape")).map((c) => c.getBoundingClientRect().bottom));
  return fundo > lim ? `página ${i + 1} passou ${Math.round(fundo - lim)} px` : null;
}).filter(Boolean));
if (sobra.length) console.log("ATENÇÃO:", sobra.join("; "));
await p.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
await b.close();
console.log("ok", pdf);
