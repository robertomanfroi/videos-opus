// Correção de palavras ouvidas errado na legenda (assets/caption-fixes.json), igual em todos os estilos.
//   {"cloud": "Claude", "apaga-me": ""}  → toda ocorrência, sem ligar para maiúscula nem pontuação:
//                                          "Cloud," vira "Claude," e "cloud." vira "Claude."
//   [{"at": 36.0, "text": "porque eu"}]  → só a palavra dita naquele tempo (±0,08 s)
//   "" apaga a palavra.
const nucleo = (s) => s.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

export function corrige(w, fix) {
  if (!fix) return w.text;
  if (Array.isArray(fix)) {
    const f = fix.find((x) => Math.abs(w.start - x.at) < 0.08);
    return f ? f.text : w.text;
  }
  if (w.text in fix) return fix[w.text];               // chave exata continua valendo
  const n = nucleo(w.text);
  if (!n) return w.text;
  const chave = Object.keys(fix).find((k) => nucleo(k) === n);
  if (chave === undefined) return w.text;
  const novo = fix[chave];
  if (!novo) return "";
  // mantém a pontuação que veio colada na palavra ("cloud," → "Claude,")
  const ini = w.text.match(/^[^\p{L}\p{N}]*/u)[0], fim = w.text.match(/[^\p{L}\p{N}]*$/u)[0];
  return ini + novo.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") + fim;
}
