// Trilha e efeitos sintetizados na hora (sem arquivos de áudio de terceiros), mixados com a voz.
// PADRÃO PREMIUM (regra da skill): nada de estrondo, flash sonoro ou batida eletrônica; trilha ambiente,
// deslizes discretos, sinos e toques leves.
import { writeFileSync } from "node:fs";

const SR = 48000;

// gerador determinístico (mesmo vídeo, mesmo som)
function aleatorio(semente = 7) {
  let a = semente >>> 0;
  const u = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
}
const gauss = aleatorio(7);

function env(n, ataque, decai) {
  const e = new Float32Array(n), k = Math.max(1, Math.floor(ataque * SR));
  for (let i = 0; i < n; i++) e[i] = Math.exp(-(i / SR) / decai) * (i < k ? i / k : 1);
  return e;
}
function passaBaixa(x, a) { const y = new Float32Array(x.length); let acc = 0; for (let i = 0; i < x.length; i++) { acc += a * (x[i] - acc); y[i] = acc; } return y; }
function ruido(n) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = gauss(); return x; }

function whoosh(d = 0.45, sobe = true) {
  const n = Math.floor(SR * d), x = ruido(n), y = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n, sh = sobe ? p * p : (1 - p) * (1 - p);
    acc += (0.02 + 0.35 * sh) * (x[i] - acc);
    y[i] = acc * Math.pow(Math.sin(Math.PI * p), 1.5) * 2.2;
  }
  return y;
}
function pop() {
  const n = Math.floor(SR * 0.09), e = env(n, 0.0005, 0.025), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * (900 * Math.exp(-t * 40) + 300) * t) * e[i]; }
  return x;
}

function sino(d = 1.6) {
  const n = Math.floor(SR * d), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 1318.5 * t) + 0.5 * Math.sin(2 * Math.PI * 1975.5 * t)) * Math.exp(-t * 3) * Math.min(1, i / 60); }
  return x;
}
function toque() { const n = Math.floor(SR * 0.03), x = ruido(n), e = env(n, 0.0005, 0.004); for (let i = 0; i < n; i++) x[i] *= e[i]; return x; }
// trilha ambiente: acordes longos (Lá m, Fá, Dó, Sol a 76 bpm), dedilhado e pulso grave discreto
function trilhaAmbiente(buf, ini, dur) {
  const BEAT = 60 / 76, BAR = BEAT * 4, hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const AC = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  for (let b = 0; ini + b * BAR < dur; b++) {
    const t0 = ini + b * BAR, notas = AC[b % 4], len = Math.floor((BAR + 1.2) * SR), i0 = Math.floor(t0 * SR);
    for (const m of [...notas, notas[0] - 12]) for (const det of [-0.0025, 0.0025]) {
      const f = hz(m) * (1 + det);
      for (let k = 0; k < len && i0 + k < buf.length; k++) { const t = k / SR, e = Math.min(1, t / 0.9) * Math.min(1, (BAR + 1.2 - t) / 1.2), ph = 2 * Math.PI * f * t; buf[i0 + k] += (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * e * 0.05; }
    }
  }
  for (let t = ini + BAR, k = 0; t < dur; t += BEAT / 2, k++) {
    const b = Math.floor((t - ini) / BAR), f = hz(AC[b % 4][k % 3] + 12), i0 = Math.floor(t * SR);
    for (let j = 0; j < SR * 0.9 && i0 + j < buf.length; j++) { const tt = j / SR; buf[i0 + j] += Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 5) * 0.08 * Math.min(1, j / 80); }
  }
  for (let t = ini + BAR; t < dur; t += BEAT * 2) {
    const i0 = Math.floor(t * SR);
    for (let j = 0; j < SR * 0.5 && i0 + j < buf.length; j++) { const tt = j / SR; buf[i0 + j] += Math.sin(2 * Math.PI * (52 + 30 * Math.exp(-tt * 18)) * tt) * Math.exp(-tt * 6) * 0.5; }
  }
}

function por(buf, x, t0, g = 1) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < x.length && i0 + i < buf.length; i++) if (i0 + i >= 0) buf[i0 + i] += g * x[i];
}

// voz: Float32Array mono 48 kHz. eventos: { slams[], saidaAbertura, chaves[], cta, pops[] }.
// inicioFala: quando a batida entra (antes disso, só tensão crescente).
export function mixar(voz, duracao, eventos, { batida = true, efeitos = true, inicioFala = 0, silenciarAte = 0 } = {}) {
  const N = Math.floor(SR * duracao), sfx = new Float32Array(N), bat = new Float32Array(N);
  if (efeitos) {
    const { slams = [], saidaAbertura = null, chaves = [], cta = null, pops = [] } = eventos;
    if (slams.length) { por(sfx, whoosh(0.8), Math.max(0, slams[0] - 0.4), 0.25); por(sfx, sino(), slams.at(-1) + 0.3, 0.35); }
    if (saidaAbertura != null) por(sfx, whoosh(0.7, false), saidaAbertura, 0.25);
    for (const t of chaves) { por(sfx, whoosh(0.6), t - 0.45, 0.2); por(sfx, sino(1.2), t, 0.18); }
    if (cta != null) { por(sfx, whoosh(0.6), cta - 0.45, 0.2); por(sfx, sino(), cta, 0.3); }
    for (const t of pops) por(sfx, toque(), t, 0.25);
  }
  if (batida) trilhaAmbiente(bat, inicioFala > 2 ? 0 : inicioFala, duracao);
  // voz normalizada; antes da fala (abertura sobre trecho mudo) fica baixa
  const v = new Float32Array(N);
  for (let i = 0; i < N && i < voz.length; i++) v[i] = voz[i];
  if (silenciarAte > 0) {
    const a = Math.floor((silenciarAte - 0.2) * SR), b2 = Math.floor(silenciarAte * SR);
    for (let i = 0; i < Math.min(N, b2); i++) v[i] *= i < a ? 0.25 : 0.25 + 0.75 * (i - a) / (b2 - a);
  }
  const ini = Math.floor(Math.max(0, silenciarAte) * SR);
  const amostra = Array.from(v.subarray(ini).filter((_, i) => i % 7 === 0), Math.abs).sort((x, y) => x - y);
  const pico = amostra[Math.floor(amostra.length * 0.995)] || 1;
  for (let i = 0; i < N; i++) v[i] = (v[i] / pico) * 0.7;
  // abaixa a batida quando ela fala
  const janela = 2400;
  let soma = 0;
  const out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    soma += Math.abs(v[Math.min(N - 1, i + janela / 2)]) - (i - janela / 2 - 1 >= 0 ? Math.abs(v[i - janela / 2 - 1]) : 0);
    const duck = 1 / (1 + (soma / janela) * 6);
    const m = Math.tanh((v[i] + sfx[i] * 0.55 + bat[i] * 0.22 * duck) * 1.1) * 0.93;
    const s = Math.max(-32768, Math.min(32767, Math.round(m * 32767)));
    out.writeInt16LE(s, i * 4); out.writeInt16LE(s, i * 4 + 2);
  }
  return out;
}

export function salvarWav(arquivo, pcmEstereo) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcmEstereo.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcmEstereo.length, 40);
  writeFileSync(arquivo, Buffer.concat([h, pcmEstereo]));
}

export const TAXA = SR;
