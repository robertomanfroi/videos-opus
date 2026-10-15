// Baixa fotos candidatas COM LICENÇA CLARA: Wikimedia Commons (pessoas e lugares reais) e Openverse (imagens genéricas).
// Uso:  node .claude/skills/estilo-colagem/scripts/achar-fotos.mjs <pasta> "commons|pele|Pelé 1970|6" "openverse|cadeira|empty chair spotlight|6"
// Grava <pasta>/<tag>_<n>.jpg e anota tag, título, licença, autor e página em <pasta>/fontes.tsv.
// Depois faça uma folha de contato e OLHE antes de escolher (título mente; confira quem está na foto). Precisa de internet.
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const [out, ...pedidos] = process.argv.slice(2);
if (!out || !pedidos.length) { console.error('uso: achar-fotos.mjs <pasta> "commons|tag|termo|6" ["openverse|tag|termo|6" …]'); process.exit(1); }
mkdirSync(out, { recursive: true });
const H = { "User-Agent": "EdicaoAutomatica/1.0 (edicao de video para rede social propria)" };
const get = async (u) => { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; };
const log = (l) => appendFileSync(join(out, "fontes.tsv"), l + "\n");
for (const arg of pedidos) {
  const [src, tag, termo, nn] = arg.split("|"); const n = Number(nn || 6); let k = 0;
  try {
    if (src === "commons") {
      const p = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: `filetype:bitmap|drawing ${termo}`, gsrnamespace: "6", gsrlimit: String(n), prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1280" });
      const r = await (await get("https://commons.wikimedia.org/w/api.php?" + p)).json();
      const pags = Object.values(r?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      for (const [i, pg] of pags.entries()) {
        const ii = pg.imageinfo[0], m = ii.extmetadata || {};
        const lic = m.LicenseShortName?.value || "", art = (m.Artist?.value || "").replace(/<[^>]+>/g, "").trim().slice(0, 60);
        try { writeFileSync(join(out, `${tag}_${i}.jpg`), Buffer.from(await (await get(ii.thumburl || ii.url)).arrayBuffer())); k++; } catch { continue; }
        log(`${tag}_${i}\t${pg.title}\t${lic}\t${art}\t${ii.descriptionurl}`);
      }
    } else {
      const u = "https://api.openverse.org/v1/images/?" + new URLSearchParams({ q: termo, license_type: "commercial", page_size: String(n), mature: "false" });
      const r = await (await get(u)).json();
      for (const [i, it] of (r.results || []).entries()) {
        try { writeFileSync(join(out, `${tag}_${i}.jpg`), Buffer.from(await (await get(it.thumbnail || it.url)).arrayBuffer())); k++; } catch { continue; }
        log(`${tag}_${i}\t${it.title || ""}\t${it.license || ""} ${it.license_version || ""}\t${it.creator || ""}\t${it.foreign_landing_url || ""}`);
      }
    }
  } catch (e) { console.log(`${tag}: falhou (${e.message}). Sem internet? Peça a foto à aluna.`); }
  console.log(tag, k);
}
