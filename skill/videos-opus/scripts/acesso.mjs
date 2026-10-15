// Período de uso: a skill funciona por PRAZO_DIAS a partir do primeiro uso (o diagnóstico da instalação não conta).
// Depois disso, fica disponível somente para quem garantiu sua compra da Super Black Eterna.
// A data do primeiro uso fica guardada fora da pasta da skill, em dois lugares, para não zerar ao reinstalar.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

export const PRAZO_DIAS = 7;
export const MENSAGEM =
  `O período de uso do Vídeos Opus terminou (${PRAZO_DIAS} dias a partir do primeiro uso). ` +
  "Agora ele está disponível somente para quem garantiu sua compra da Super Black Eterna.";

const DIA = 24 * 60 * 60 * 1000;
const SAL = "vop-sbe-2026";

function locais() {
  const l = [];
  if (process.env.LOCALAPPDATA) l.push(join(process.env.LOCALAPPDATA, "videos-opus", "acesso.json"));
  if (process.env.APPDATA) l.push(join(process.env.APPDATA, "videos-opus", "acesso.json"));
  l.push(join(homedir(), ".videos-opus", "acesso.json"));
  return [...new Set(l)];
}

const assinar = (inicio, ultimo) => createHash("sha256").update(`${SAL}|${inicio}|${ultimo}`).digest("hex").slice(0, 24);

function ler(arq) {
  try {
    const d = JSON.parse(readFileSync(arq, "utf8"));
    if (Number.isFinite(d.inicio) && Number.isFinite(d.ultimo) && d.assinatura === assinar(d.inicio, d.ultimo)) return d;
    return "invalido";
  } catch { return existsSync(arq) ? "invalido" : null; }
}

function gravar(inicio, ultimo) {
  for (const arq of locais()) {
    try { mkdirSync(dirname(arq), { recursive: true }); writeFileSync(arq, JSON.stringify({ inicio, ultimo, assinatura: assinar(inicio, ultimo) })); } catch {}
  }
}

// iniciar=false só consulta (usado no diagnóstico), sem começar a contar.
export function verificarAcesso({ iniciar = true } = {}) {
  const agora = Date.now();
  const lidos = locais().map(ler);
  const validos = lidos.filter((d) => d && d !== "invalido");
  if (!validos.length) {
    // arquivo existia mas foi alterado à mão: trata como período encerrado
    if (lidos.includes("invalido")) return { bloqueado: true, mensagem: MENSAGEM };
    if (!iniciar) return { bloqueado: false, diasRestantes: PRAZO_DIAS, iniciado: false };
    gravar(agora, agora);
    return { bloqueado: false, diasRestantes: PRAZO_DIAS, iniciado: true };
  }
  const inicio = Math.min(...validos.map((d) => d.inicio));
  // relógio atrasado de propósito não devolve dias: vale o maior horário já visto
  const ultimo = Math.max(agora, ...validos.map((d) => d.ultimo));
  if (iniciar) gravar(inicio, ultimo);
  const usados = (ultimo - inicio) / DIA;
  if (usados >= PRAZO_DIAS) return { bloqueado: true, mensagem: MENSAGEM };
  return { bloqueado: false, diasRestantes: Math.max(1, Math.ceil(PRAZO_DIAS - usados)), iniciado: true };
}
