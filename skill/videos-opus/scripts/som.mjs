// Efeitos sonoros e batida sintetizados na hora (sem arquivos de áudio de terceiros), mixados com a voz.
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

function estrondo(d = 1.4) {
  const n = Math.floor(SR * d), e = env(n, 0.001, 0.55), en = env(n, 0.001, 0.08), x = new Float32Array(n);
  let fase = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; fase += 2 * Math.PI * (110 * Math.exp(-t * 3) + 38) / SR; x[i] = Math.tanh(1.8 * (Math.sin(fase) * e[i] + 0.5 * gauss() * en[i])); }
  return x;
}
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
function bumbo() {
  const n = Math.floor(SR * 0.35), e = env(n, 0.001, 0.12), x = new Float32Array(n);
  let fase = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; fase += 2 * Math.PI * (150 * Math.exp(-t * 25) + 48) / SR; x[i] = Math.tanh(2 * Math.sin(fase) * e[i]); }
  return x;
}
function chimbal() {
  const n = Math.floor(SR * 0.05), x = ruido(n), lp = passaBaixa(x, 0.5), e = env(n, 0.0005, 0.012);
  for (let i = 0; i < n; i++) x[i] = (x[i] - lp[i]) * e[i];
  return x;
}
function palma() {
  const n = Math.floor(SR * 0.18), x = ruido(n), lp = passaBaixa(x, 0.15), e = env(n, 0.001, 0.05);
  for (let i = 0; i < n; i++) x[i] = (x[i] - lp[i]) * e[i];
  return x;
}
function baixo(f, d) {
  const n = Math.floor(SR * d), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const s = Math.sin(2 * Math.PI * f * i / SR); x[i] = Math.sign(s) * 0.5 + s; }
  const y = passaBaixa(x, 0.04), e = env(n, 0.005, d * 0.6);
  for (let i = 0; i < n; i++) y[i] *= e[i];
  return y;
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
    if (slams.length) por(sfx, whoosh(0.16), 0, 0.6);
    slams.forEach((t, i) => por(sfx, estrondo(), t, i === slams.length - 1 ? 1.0 : 0.75));
    if (saidaAbertura != null) {
      const sub = Math.max(0.8, saidaAbertura - (slams.at(-1) ?? 0) - 0.4);
      const r = whoosh(sub, true);
      for (let i = 0; i < r.length; i++) r[i] *= 0.2 + 0.8 * (i / r.length);
      por(sfx, r, saidaAbertura - sub, 0.35);
      por(sfx, estrondo(1.8), saidaAbertura, 1.0);
      por(sfx, whoosh(0.5, false), saidaAbertura, 0.6);
    }
    for (const t of chaves) { por(sfx, whoosh(0.35), t - 0.3, 0.45); por(sfx, estrondo(0.9), t, 0.4); }
    if (cta != null) { por(sfx, whoosh(0.35), cta - 0.3, 0.45); por(sfx, pop(), cta, 0.6); }
    for (const t of pops) por(sfx, pop(), t, 0.3);
  }
  if (batida) {
    const b = 60 / 124, notas = [55, 55, 65.4, 49];
    for (let k = 0, t = inicioFala; t < duracao; k++, t += b) {
      por(bat, bumbo(), t, 0.9);
      por(bat, chimbal(), t + b / 2, 0.35);
      if (k % 2 === 1) por(bat, palma(), t, 0.45);
      if (k % 2 === 0) por(bat, baixo(notas[(k >> 2) % 4], b * 2), t, 0.35);
    }
    if (inicioFala > 2) for (let t = inicioFala * 0.45; t < inicioFala - 0.4; t += b / 2) por(bat, bumbo(), t, 0.25 * (t - inicioFala * 0.45) / (inicioFala * 0.5));
  }
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
    const m = Math.tanh((v[i] + sfx[i] * 0.55 + bat[i] * 0.16 * duck) * 1.1) * 0.93;
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
