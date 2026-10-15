// Prints reais de uma notícia para os cards de "prova": o bloco da manchete e parágrafos por palavra-chave.
// Rodar de QUALQUER pasta:  node .claude/skills/estilo-colagem/scripts/print-noticia.mjs "<url>" <pasta-saida> "palavra 1" "palavra 2" …
// Saída: <pasta>/print-manchete.png + print-<palavra>.png (largura de celular, 2.5x, barras fixas do site escondidas).
// Usa o playwright do kit com o Chrome ou Edge do sistema (ou o navegador de render do kit).
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { existsSync } from "node:fs";
// acha o kit (pasta com node_modules/playwright*) subindo a partir do script e, se não der, da pasta atual
const acharKit = (ini) => { for (let d = ini; ; d = dirname(d)) { if (["playwright", "playwright-core"].some((m) => existsSync(resolve(d, "node_modules", m)))) return d; if (dirname(d) === d) return null; } };
const kit = acharKit(dirname(fileURLToPath(import.meta.url))) || acharKit(process.cwd());
if (!kit) { console.error("não achei o playwright do kit: rode de dentro da pasta EdicaoAutomatica"); process.exit(1); }
const req = createRequire(resolve(kit, "package.json"));
let chromium;
try { ({ chromium } = req("playwright")); } catch { ({ chromium } = req("playwright-core")); }
const [url, out, ...chaves] = process.argv.slice(2);
if (!url || !out) { console.error('uso: print-noticia.mjs "<url>" <pasta> "palavra" …'); process.exit(1); }
mkdirSync(out, { recursive: true });
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
let b;
for (const channel of ["chrome", "msedge", undefined]) { try { b = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) }); break; } catch {} }
if (!b) { console.error("Nenhum navegador encontrado (instale o Google Chrome ou o Edge)."); process.exit(1); }
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5 });
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(4000);
const limpar = () => p.evaluate(() => { for (const e of document.querySelectorAll("body *")) { const s = getComputedStyle(e);
  if ((s.position === "fixed" || s.position === "sticky") && !e.querySelector("h1,p")) e.style.display = "none"; } });
const foto = async (achar, arg, arq, padTop, extra) => {
  await limpar();
  const el = (await p.evaluateHandle(achar, arg)).asElement(); if (!el) { console.log("não achei:", arq); return; }
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await limpar();
  const bx = await el.boundingBox();
  await p.screenshot({ path: `${out}/${arq}`, clip: { x: 0, y: Math.max(0, bx.y - padTop), width: 430, height: bx.height + padTop + extra } });
  console.log("salvo", arq);
};
await foto(() => document.querySelector("h1"), null, "print-manchete.png", 60, 150);
for (const k of chaves) await foto((k) => [...document.querySelectorAll("p")].find((s) => s.innerText.includes(k)), k, `print-${slug(k)}.png`, 16, 16);
await b.close();
