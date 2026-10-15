// Encontra o vídeo que a aluna quer editar e confere se ele serve, sem ela precisar saber de pastas.
// Uso (na raiz da pasta EdicaoAutomatica):
//   node .claude/skills/_motor/achar-video.mjs                 → lista candidatos recentes (JSON)
//   node .claude/skills/_motor/achar-video.mjs "<caminho>"     → confere esse arquivo (aceita aspas do "Copiar como caminho")
//   node .claude/skills/_motor/achar-video.mjs --ultimo        → o mais recente, já conferido
// Saída: JSON com {ok, video, motivo, aviso, confirmar, candidatos[], checks{}}. A skill `editar` lê e decide o que perguntar.
import { readdirSync, statSync, statfsSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, basename, extname, dirname } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";

const EXT = new Set([".mp4", ".mov", ".m4v", ".mkv", ".webm", ".3gp"]);
const RAIZ = process.cwd();
const MEUS = join(RAIZ, "meus-videos");
const args = process.argv.slice(2);

function pastasCandidatas() {
  const p = [MEUS];
  const home = homedir();
  for (const d of ["Downloads", "Desktop", "Área de Trabalho", join("OneDrive", "Desktop"), join("OneDrive", "Área de Trabalho")]) {
    const c = join(home, d);
    if (existsSync(c)) p.push(c);
  }
  // Área de Trabalho real no Windows (pode estar no OneDrive)
  if (process.platform === "win32") {
    try {
      const d = execFileSync("powershell", ["-NoProfile", "-Command", "[Environment]::GetFolderPath('Desktop')"], { encoding: "utf8" }).trim();
      if (d && existsSync(d) && !p.includes(d)) p.push(d);
    } catch {}
  }
  return p;
}

function listar(pasta, limite = 8) {
  let itens = [];
  try { itens = readdirSync(pasta); } catch { return []; }
  const agora = Date.now();
  return itens
    .filter((f) => EXT.has(extname(f).toLowerCase()) && !f.startsWith("."))
    .map((f) => { const full = join(pasta, f); const st = statSync(full); const t = chegada(st); return { video: full, nome: f, pasta, bytes: st.size, modificado: new Date(t).toISOString(), horas: (agora - t) / 36e5 }; })
    .filter((x) => x.bytes > 100_000 && x.horas < 24 * 14) // últimos 14 dias
    .sort((a, b) => b.modificado.localeCompare(a.modificado))
    .slice(0, limite);
}

// Quando o arquivo CHEGOU neste PC. O LocalSend pode preservar a data de gravação do celular (mtime antigo);
// a criação/alteração local (birthtime/ctime) diz quando ele chegou.
function chegada(st) { return Math.max(st.mtimeMs, st.birthtimeMs || 0, st.ctimeMs || 0); }

function esperarEstavel(caminho, segundos = 5) {
  // O LocalSend grava com o nome final enquanto recebe: o arquivo cresce. Só segue quando parar de crescer.
  let antes = statSync(caminho).size;
  const fim = Date.now() + 120_000; // espera no máximo 2 min
  while (Date.now() < fim) {
    const ini = Date.now();
    while (Date.now() - ini < segundos * 1000) { /* espera ocupada curta, sem dependências */ }
    const agora = statSync(caminho).size;
    if (agora === antes) return true;
    antes = agora;
  }
  return false;
}

function probe(caminho) {
  const out = execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", caminho], { encoding: "utf8" });
  const j = JSON.parse(out);
  const v = (j.streams || []).find((s) => s.codec_type === "video");
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  let w = v?.width || 0, h = v?.height || 0;
  const rot = Number(v?.tags?.rotate || (v?.side_data_list || []).find((s) => s.rotation != null)?.rotation || 0);
  if (Math.abs(rot) % 180 === 90) [w, h] = [h, w];
  return { duracao: Number(j.format?.duration || 0), largura: w, altura: h, temAudio: !!a, codec: v?.codec_name };
}

function conferir(caminho) {
  const r = { ok: false, video: caminho, checks: {}, motivo: null };
  if (!existsSync(caminho)) { r.motivo = "arquivo não encontrado"; return r; }
  r.checks.estavel = esperarEstavel(caminho);
  if (!r.checks.estavel) { r.motivo = "o arquivo ainda está chegando (crescendo há mais de 2 min)"; return r; }
  let p;
  try { p = probe(caminho); } catch {
    const recente = Date.now() - chegada(statSync(caminho)) < 5 * 60_000;
    r.motivo = recente ? "o vídeo parece não ter chegado inteiro — copie o vídeo de novo para o computador" : "não consegui ler o vídeo (arquivo corrompido?)";
    return r;
  }
  Object.assign(r.checks, p);
  r.checks.emPe = p.altura > p.largura;
  if (!p.temAudio) { r.motivo = "o vídeo não tem som"; return r; }
  if (p.duracao < 3) { r.motivo = "vídeo curto demais (menos de 3 s)"; return r; }
  if (!r.checks.emPe) { r.motivo = "o vídeo está deitado (horizontal); para Reels grave em pé"; return r; }
  let livreGB = null;
  try { const f = statfsSync(RAIZ); livreGB = (f.bavail * f.bsize) / 1e9; } catch {}
  r.checks.discoLivreGB = livreGB == null ? null : +livreGB.toFixed(1);
  if (livreGB != null && livreGB < 3) { r.motivo = `pouco espaço no disco (${livreGB.toFixed(1)} GB livres; precisa de uns 3 GB)`; return r; }
  if (p.duracao > 180) r.aviso = `vídeo longo (${Math.round(p.duracao)} s): o Reel fica com no máximo 90 s — confirme com a aluna que parte usar`;
  r.ok = true;
  return r;
}

function copiarParaMeus(caminho) {
  mkdirSync(MEUS, { recursive: true });
  if (resolve(dirname(caminho)) === resolve(MEUS)) return caminho;
  // nome repetido (IMG_0001.MOV de outro dia, "video.mp4"): mesmo tamanho = mesmo vídeo; senão copia como nome-2, nome-3…
  const ext = extname(caminho), base = basename(caminho, ext);
  for (let n = 1; ; n++) {
    const destino = join(MEUS, n === 1 ? `${base}${ext}` : `${base}-${n}${ext}`);
    if (!existsSync(destino)) { copyFileSync(caminho, destino); return destino; }
    if (statSync(destino).size === statSync(caminho).size) return destino;
  }
}

let resultado;
const arg = args.find((a) => !a.startsWith("--"));
if (arg) {
  const limpo = arg.trim().replace(/^["']|["']$/g, "");
  resultado = conferir(limpo);
  if (resultado.ok) resultado.video = copiarParaMeus(limpo);
} else {
  const candidatos = pastasCandidatas().flatMap((p) => listar(p)).sort((a, b) => b.modificado.localeCompare(a.modificado)).slice(0, 8);
  // Um candidato só, ou pedido explícito do mais recente: confere. Só segue SEM perguntar se ele está em meus-videos
  // e chegou há menos de 2 h; senão `confirmar: true` e a skill pergunta "é este?" (vídeo de Downloads pode ser do WhatsApp).
  if ((args.includes("--ultimo") || candidatos.length === 1) && candidatos.length) {
    const c = candidatos[0];
    resultado = conferir(c.video);
    resultado.confirmar = !(resolve(c.pasta) === resolve(MEUS) && c.horas < 2);
    if (resultado.ok) resultado.video = copiarParaMeus(c.video);
    resultado.candidatos = candidatos;
  } else {
    resultado = { ok: false, motivo: candidatos.length ? "vários candidatos; escolher" : "nenhum vídeo recente encontrado", candidatos };
  }
}
console.log(JSON.stringify(resultado, null, 1));
