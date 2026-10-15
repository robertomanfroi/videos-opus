#!/usr/bin/env python3
"""Motor de transcrição do pacote Edição Automática de Vídeo.

Transcreve áudio/vídeo com faster-whisper, escolhendo sozinho o melhor modelo para a máquina
(placa NVIDIA → medium preciso; só CPU → modelos leves). Gera o tempo de cada palavra, que a
legenda e o corte precisam, e opcionalmente TXT/SRT para leitura humana.

Uso (dentro do venv ~/.venvs/edicao):
  python transcrever.py <video> <saida.json>                # qualidade de legenda
  python transcrever.py <video> <saida.json> --rapido       # só para escolher o corte
  python transcrever.py <video> --janelas 12.4,30.1,...      # texto de 3 s em volta de cada emenda
  python transcrever.py <video> <saida.json> --txt --srt    # também gera .txt e .srt ao lado

Opções: --modelo NOME (ou env EDICAO_MODELO) · --idioma pt · --span 3 · --nomes "Suellen, MIRA"
        --cpu (força CPU) · --quieto

Formato do JSON: {"language_code", "audio_duration_secs", "text", "words": [{text,start,end}]}
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import site
import subprocess
import sys
import tempfile
from pathlib import Path

MODELO_INFERIOR = {"large-v3": "medium", "medium": "small", "small": "base", "base": "tiny"}
VRAM_MINIMA_GB = {"large-v3": 6, "medium": 2.5, "small": 1.2, "base": 1, "tiny": 1}


def log(msg: str, quieto: bool = False) -> None:
    if not quieto:
        print(msg, flush=True)


def adicionar_dlls_cuda() -> None:
    """As bibliotecas CUDA (cuBLAS, cuDNN) vêm pelo pip (nvidia-*-cu12) e o ctranslate2 precisa achá-las.
    Windows: entram no PATH/DLL search. Linux/WSL: são pré-carregadas com ctypes."""
    bases = list(site.getsitepackages()) + [site.getusersitepackages()]
    if os.name == "nt":
        for base in bases:
            for d in glob.glob(os.path.join(base, "nvidia", "*", "bin")):
                try:
                    os.add_dll_directory(d)
                except (AttributeError, OSError):
                    pass
                os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]
        return
    import ctypes

    for base in bases:
        for lib in sorted(glob.glob(os.path.join(base, "nvidia", "*", "lib", "lib*.so*"))):
            try:
                ctypes.CDLL(lib, mode=ctypes.RTLD_GLOBAL)
            except OSError:
                pass


def aquecer(modelo, idioma: str) -> None:
    """Executa uma transcrição mínima: na placa de vídeo, a falta de uma biblioteca só aparece aqui."""
    fd, wav = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "0.5", wav], check=True)
    try:
        segs, _ = modelo.transcribe(wav, language=idioma, beam_size=1)
        list(segs)
    finally:
        os.remove(wav)


def verificar_espaco_disco(pasta: Path, minimo_mb: int = 500) -> None:
    try:
        livre_mb = shutil.disk_usage(pasta).free / 1e6
    except OSError:
        return
    if livre_mb < minimo_mb:
        sys.exit(f"ERRO: só {livre_mb:.0f} MB livres em {pasta}. Libere espaço no disco e tente de novo.")


def para_wav(midia: str, inicio: float | None = None, dur: float | None = None) -> str:
    """Decodifica com ffmpeg para WAV 16 kHz mono: evita erro de decoder em vídeo de celular e lê mais rápido."""
    fd, caminho = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if inicio is not None:
        cmd += ["-ss", f"{inicio:.3f}"]
    cmd += ["-i", midia]
    if dur is not None:
        cmd += ["-t", f"{dur:.3f}"]
    cmd += ["-vn", "-ac", "1", "-ar", "16000", caminho]
    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        sys.exit("ERRO: ffmpeg não encontrado. Rode o instalador de novo.")
    except subprocess.CalledProcessError:
        sys.exit(f"ERRO: não consegui ler o áudio de '{midia}'. O arquivo tem som? Está corrompido?")
    return caminho


def tem_gpu() -> bool:
    try:
        import ctranslate2  # type: ignore

        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False


def carregar(modelo: str | None, rapido: bool, forcar_cpu: bool, quieto: bool, idioma: str = "pt"):
    """Devolve (modelo, dispositivo, beam). Regras de velocidade medidas em CPU, 1 min de fala, 4 threads:
    medium beam 5 ≈ 19 s · medium beam 1 ≈ 14 s · small beam 1 ≈ 5 s. base é impreciso em português."""
    adicionar_dlls_cuda()
    from faster_whisper import WhisperModel  # type: ignore

    if not forcar_cpu and tem_gpu():
        nome = modelo or "medium"
        try:
            m = WhisperModel(nome, device="cuda", compute_type="float16")
            aquecer(m, idioma)
            log(f"  transcrição na placa de vídeo (modelo {nome})", quieto)
            return m, "cuda", 5
        except Exception as e:  # VRAM curta, driver velho, biblioteca CUDA faltando…
            log(f"  placa de vídeo não deu certo ({type(e).__name__}); usando o processador", quieto)

    nome = modelo or ("small" if rapido else "medium")
    threads = max(2, (os.cpu_count() or 4) - 1)
    while True:
        try:
            m = WhisperModel(nome, device="cpu", compute_type="int8", cpu_threads=threads)
            log(f"  transcrição no processador (modelo {nome}, {threads} threads)", quieto)
            return m, "cpu", 1
        except (MemoryError, RuntimeError, OSError) as e:
            menor = MODELO_INFERIOR.get(nome)
            if not menor:
                sys.exit(f"ERRO: não consegui carregar nenhum modelo de transcrição ({e}).")
            log(f"  modelo {nome} não coube na memória; tentando {menor}", quieto)
            nome = menor


def limpar_palavra(texto: str) -> str:
    """Remove artefatos do Whisper ([MÚSICA], [RISOS]) e espaços extras."""
    texto = re.sub(r"\[[^\]]{1,30}\]", "", texto)
    return texto.strip()


def fmt_srt(seg: float) -> str:
    h, r = divmod(seg, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"


def salvar_extras(saida: Path, words: list[dict], segmentos: list[dict], txt: bool, srt: bool) -> None:
    if txt:
        linhas = [s["text"] for s in segmentos]
        saida.with_suffix(".txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    if srt:
        blocos = []
        for i, s in enumerate(segmentos, 1):
            blocos.append(f"{i}\n{fmt_srt(s['start'])} --> {fmt_srt(s['end'])}\n{s['text']}\n")
        saida.with_suffix(".srt").write_text("\n".join(blocos), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("midia")
    ap.add_argument("saida", nargs="?")
    ap.add_argument("--modelo", default=os.environ.get("EDICAO_MODELO"))
    ap.add_argument("--idioma", default="pt")
    ap.add_argument("--rapido", action="store_true", help="modelo leve: só para decidir o corte")
    ap.add_argument("--janelas", default="", help="tempos separados por vírgula; imprime o texto em volta de cada um")
    ap.add_argument("--span", type=float, default=3.0)
    ap.add_argument("--nomes", default="", help="nomes próprios/termos para o modelo acertar (ex.: 'Suellen, Engrene')")
    ap.add_argument("--cpu", action="store_true")
    ap.add_argument("--txt", action="store_true")
    ap.add_argument("--srt", action="store_true")
    ap.add_argument("--quieto", action="store_true")
    a = ap.parse_args()

    if not Path(a.midia).exists():
        sys.exit(f"ERRO: arquivo não encontrado: {a.midia}")
    prompt_inicial = a.nomes.strip() or None

    # Modo janelas: checa emendas do corte. UMA carga de modelo para todas.
    if a.janelas:
        modelo, _, beam = carregar(a.modelo, True, a.cpu, a.quieto, a.idioma)
        for t in [float(x) for x in a.janelas.split(",") if x.strip()]:
            inicio = max(0.0, t - a.span / 2)
            wav = para_wav(a.midia, inicio, a.span)
            segs, _ = modelo.transcribe(wav, language=a.idioma, beam_size=beam,
                                        condition_on_previous_text=False, initial_prompt=prompt_inicial)
            print(f"[{t:8.2f}] {' '.join(s.text.strip() for s in segs)}", flush=True)
            os.remove(wav)
        return

    if not a.saida:
        sys.exit("uso: transcrever.py <video> <saida.json> [--rapido] [--txt] [--srt]")
    saida = Path(a.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    verificar_espaco_disco(saida.parent)

    modelo, dispositivo, beam = carregar(a.modelo, a.rapido, a.cpu, a.quieto, a.idioma)
    wav = para_wav(a.midia)
    segmentos_iter, info = modelo.transcribe(
        wav, language=a.idioma, beam_size=beam, word_timestamps=True,
        vad_filter=False, condition_on_previous_text=False, initial_prompt=prompt_inicial,
    )
    words: list[dict] = []
    segmentos: list[dict] = []
    for seg in segmentos_iter:
        texto_seg = seg.text.strip()
        if texto_seg:
            segmentos.append({"start": round(seg.start, 3), "end": round(seg.end, 3), "text": texto_seg})
        for w in seg.words or []:
            t = limpar_palavra(w.word)
            if t:
                words.append({"text": t, "start": round(w.start, 3), "end": round(w.end, 3)})
        log(f"[{seg.start:7.2f}] {texto_seg}", a.quieto)
    os.remove(wav)

    if not words:
        sys.exit("ERRO: transcrição vazia. O vídeo tem fala? O som está muito baixo?")

    dados = {
        "language_code": a.idioma,
        "audio_duration_secs": round(info.duration, 3),
        "text": " ".join(w["text"] for w in words),
        "words": words,
    }
    saida.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
    salvar_extras(saida, words, segmentos, a.txt, a.srt)
    print(f"PRONTO dispositivo={dispositivo} beam={beam} palavras={len(words)} -> {saida}", flush=True)


if __name__ == "__main__":
    main()
