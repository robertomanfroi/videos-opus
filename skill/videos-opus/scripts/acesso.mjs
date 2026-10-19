// Período de uso: a skill funciona por PRAZO_DIAS a partir do primeiro uso (o diagnóstico da instalação não conta).
// Depois disso, fica disponível para quem se tornar aluna da Super Black Eterna (28/10).
// A data do primeiro uso fica guardada fora da pasta da skill, em dois lugares, para não zerar ao reinstalar.
// Alunas (guia das alunas): a senha do guia libera para sempre. A liberação fica nos mesmos lugares, então vale
// também depois de reinstalar ou atualizar com o instalador comum.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

export const PRAZO_DIAS = 7;
export const MENSAGEM =
  `Seu período de teste de ${PRAZO_DIAS} dias terminou. ` +
  "Essa skill está disponível para quem se tornar aluna da Super Black Eterna (28/10). " +
  "Se você já é aluna, peça: \"libera o Vídeos Opus com a senha do guia das alunas\" e diga a senha.";

const DIA = 24 * 60 * 60 * 1000;
const SAL = "vop-sbe-2026";

function locais() {
  const l = [];
  if (process.env.LOCALAPPDATA) l.push(join(process.env.LOCALAPPDATA, "videos-opus", "acesso.json"));
  if (process.env.APPDATA) l.push(join(process.env.APPDATA, "videos-opus", "acesso.json"));
  if (process.platform === "darwin") l.push(join(homedir(), "Library", "Application Support", "videos-opus", "acesso.json"));
  l.push(join(homedir(), ".videos-opus", "acesso.json"));
  return [...new Set(l)];
}

// só o resumo da senha fica aqui; a senha está no guia das alunas (maiúsculas, espaços e traços não importam)
const SENHAS = ["c7b600d0dd53545e7f9f6eb9"];
const resumoSenha = (senha) => createHash("sha256").update(`${SAL}|senha|${String(senha).toUpperCase().replace(/[^A-Z0-9]/g, "")}`).digest("hex").slice(0, 24);
const assinaturaLiberada = (quando) => createHash("sha256").update(`${SAL}|liberada|${quando}`).digest("hex").slice(0, 24);
const arqLiberada = (arq) => join(dirname(arq), "liberada.json");

function liberada() {
  return locais().some((arq) => {
    try { const d = JSON.parse(readFileSync(arqLiberada(arq), "utf8")); return Number.isFinite(d.quando) && d.assinatura === assinaturaLiberada(d.quando); }
    catch { return false; }
  });
}

// Grava a liberação para sempre. Devolve { ok, mensagem }.
export function liberar(senha) {
  if (!senha || !SENHAS.includes(resumoSenha(senha))) return { ok: false, mensagem: "Senha errada. Confira a senha no guia das alunas e tente de novo." };
  const quando = Date.now();
  let gravou = 0;
  for (const arq of locais()) {
    try { mkdirSync(dirname(arq), { recursive: true }); writeFileSync(arqLiberada(arq), JSON.stringify({ quando, assinatura: assinaturaLiberada(quando) })); gravou++; } catch {}
  }
  if (!gravou) return { ok: false, mensagem: "Não consegui gravar a liberação neste computador. Mande uma foto desta tela para o suporte." };
  return { ok: true, mensagem: "Pronto! O Vídeos Opus está liberado para sempre neste computador." };
}

const assinar = (inicio, ultimo) => createHash("sha256").update(`${SAL}|${inicio}|${ultimo}`).digest("hex").slice(0, 24);

function ler(arq) {
  try {
    const d = JSON.parse(readFileSync(arq, "utf8"));
    if (Number.isFinite(d.inicio) && Number.isFinite(d.ultimo) && d.assinatura === assinar(d.inicio, d.ultimo)) return d;
    return "invalido";
  } catch { return null; }   // arquivo truncado (disco cheio, queda de energia) não bloqueia: os outros locais valem
}

function gravar(inicio, ultimo) {
  for (const arq of locais()) {
    try { mkdirSync(dirname(arq), { recursive: true }); writeFileSync(arq, JSON.stringify({ inicio, ultimo, assinatura: assinar(inicio, ultimo) })); } catch {}
  }
}

// iniciar=false só consulta (usado no diagnóstico), sem começar a contar.
export function verificarAcesso({ iniciar = true } = {}) {
  if (liberada()) return { bloqueado: false, liberada: true };
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
  // relógio atrasado de propósito não devolve dias: vale o maior horário já visto. Mas um horário mais de 1 dia
  // à frente de agora é relógio que estava errado (bateria do computador), não uso: esse é ignorado.
  const vistos = validos.map((d) => d.ultimo).filter((u) => u <= agora + DIA);
  const ultimo = Math.max(agora, ...vistos);
  if (iniciar) gravar(inicio, ultimo);
  const usados = (ultimo - inicio) / DIA;
  if (usados >= PRAZO_DIAS) return { bloqueado: true, mensagem: MENSAGEM };
  return { bloqueado: false, diasRestantes: Math.max(1, Math.ceil(PRAZO_DIAS - usados)), iniciado: true };
}
