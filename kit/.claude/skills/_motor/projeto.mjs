// Estado de cada projeto em video-projects/<slug>/projeto.json — de onde veio o vídeo, qual estilo, em que etapa parou.
// Todo script do motor atualiza a etapa; a skill `editar` lê isso para retomar ou ajustar numa sessão nova.
// Etapas: criado → transcrito → cortado → conferido → montado → renderizado → entregue
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export const lerProjeto = (proj) => { try { return JSON.parse(readFileSync(join(proj, "projeto.json"), "utf8")); } catch { return null; } };

export function marcarEtapa(proj, etapa, extra = {}) {
  const p = lerProjeto(proj) || {};
  const agora = new Date().toISOString();
  Object.assign(p, extra, { etapa, atualizado: agora });
  p.historico = [...(p.historico || []), { etapa, em: agora }].slice(-30);
  writeFileSync(join(proj, "projeto.json"), JSON.stringify(p, null, 2));
  return p;
}

// prontos/ULTIMO.json: o último vídeo entregue (para "ajusta o último vídeo" numa sessão nova)
export function marcarUltimo(raiz, dados) {
  const f = join(raiz, "prontos", "ULTIMO.json");
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify({ ...dados, em: new Date().toISOString() }, null, 2));
}
