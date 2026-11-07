#!/usr/bin/env python3
"""
MinimalFlow Studio — AI Diagram Vision Scanner (Automated CLI & Module)
Mengonversi screenshot alur, foto diagram papan tulis, atau berkas gambar diagram
menjadi skrip Mermaid (.mmd) dan dokumen alur MinimalFlow (.flow.json) secara otomatis.

Mendukung:
1. Google GenAI SDK resmi (gemini-3.8-flash & gemini-4-argon) jika GEMINI_API_KEY tersedia.
2. Gemini Stealth Bridge (GSB http://127.0.0.1:20133) secara otomatis jika GEMINI_API_KEY belum diatur.
"""

import os
import sys
import json
import base64
import argparse
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

# Prompt Rekonstruksi Semantik Diagram Vektor
SYSTEM_DIAGRAM_PROMPT = """
You are an expert Diagram & Flowchart Reverse-Engineering Specialist.
Analyze the provided diagram image and reconstruct its complete and exact semantic flow into clean, structured Mermaid flowchart syntax (flowchart TD or flowchart LR).

CRITICAL EXTRACTION RULES:
1. Orientation:
   - Use 'flowchart TD' if the diagram flows mostly from top to bottom.
   - Use 'flowchart LR' if it flows mostly horizontally from left to right.
2. Subgraphs / Swimlanes / Actors:
   - If the diagram contains visual container boxes, groups, or actor regions (e.g. 'GURU', 'SISWA', 'USER', 'SYSTEM', 'FRONTEND', 'BACKEND'), wrap them inside standard Mermaid subgraphs:
     subgraph ID ["Title of Box"]
       ...
     end
3. Geometries & Shapes:
   - Start / End / Terminator -> Stadium: ID(["Exact text"])
   - Decision / Condition / Branching -> Diamond: ID{"Exact condition text"}
   - Process / Step / Action -> Rectangle: ID["Exact text"]
   - Database / Battery / Hardware -> Cylinder: ID[("Exact text")]
   - Input / Output / Data -> Parallelogram: ID[/"Exact text"/]
   - Event / Marker -> Circle: ID(("Exact text"))
4. Text Extraction:
   - Extract the text inside each shape verbatim with exact spelling, punctuation, and casing.
   - For multi-line text, use <br/> or clean spacing.
5. Connections, Arrows & Edge Labels:
   - Identify every arrow accurately:
     A --> B
     A -->|Condition / Label| B
     A -.->|Dashed Label| B
   - For decision branches, include exact outcome labels like "Ya", "Tidak", "Lulus", "Perlu Perbaikan".
   - If an edge loops back to an earlier step or cross-connects between subgraphs, reconstruct the link cleanly.
6. Clean Output:
   - Output ONLY the raw Mermaid code.
   - Do NOT include conversational filler, preamble, markdown backticks, or explanations.
""".strip()


def load_env_gemini_key():
    """Membaca GEMINI_API_KEY dari os.environ atau file .env lokal jika ada."""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key and key.strip():
        return key.strip()

    # Periksa .env di direktori saat ini atau parent
    search_dirs = [Path.cwd(), Path(__file__).resolve().parent, Path(__file__).resolve().parent.parent]
    for d in search_dirs:
        env_file = d / ".env"
        if env_file.exists():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
                    elif line.startswith("GOOGLE_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return None


def is_gsb_available(port=20133):
    """Memeriksa apakah Gemini Stealth Bridge (GSB) aktif di localhost."""
    url = f"http://127.0.0.1:{port}/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MinimalFlow-Scanner"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def scan_via_gsb(image_bytes, mime_type="image/png", use_argon=False, port=20133):
    """Memindai gambar menggunakan Gemini Stealth Bridge lokal (Zero API Key)."""
    model_name = "gemini-argon" if use_argon else "gemini-flash"
    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": SYSTEM_DIAGRAM_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64_data}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1
    }

    url = f"http://127.0.0.1:{port}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }

    try:
        import requests
        resp = requests.post(url, json=payload, headers=headers, timeout=180)
        resp.raise_for_status()
        res = resp.json()
    except ImportError:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=180) as resp:
            res = json.loads(resp.read().decode("utf-8"))

    choices = res.get("choices", [])
    if not choices:
        raise RuntimeError("GSB tidak mengembalikan pilihan respons.")
    text_out = choices[0].get("message", {}).get("content", "")
    return clean_mermaid_output(text_out)


def scan_via_official_sdk(image_bytes, mime_type="image/png", api_key=None, use_argon=False):
    """Memindai gambar menggunakan google-genai SDK resmi."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise RuntimeError("Pustaka 'google-genai' belum terpasang. Jalankan: pip install -U google-genai")

    client = genai.Client(api_key=api_key)
    models_to_try = ["gemini-4-argon", "gemini-3.8-flash"] if use_argon else ["gemini-3.8-flash", "gemini-3.5-flash-lite"]

    last_err = None
    for m in models_to_try:
        try:
            print(f"[*] Menghubungi Google GenAI ({m})...")
            interaction = client.interactions.create(
                model=m,
                input=[
                    {"type": "text", "text": SYSTEM_DIAGRAM_PROMPT},
                    {"type": "image", "data": base64.b64encode(image_bytes).decode("utf-8"), "mime_type": mime_type}
                ]
            )
            text_out = interaction.output_text or ""
            if text_out:
                return clean_mermaid_output(text_out)
        except Exception as e:
            last_err = e
            print(f"[-] Model {m} sibuk ({e}). Mencoba model cadangan...")

    # Fallback ke generate_content API klasik jika interactions mengalami kendala
    try:
        part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        resp = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[SYSTEM_DIAGRAM_PROMPT, part]
        )
        if resp.text:
            return clean_mermaid_output(resp.text)
    except Exception as e:
        last_err = e

    raise last_err or RuntimeError("Gagal memanggil model Google GenAI.")


def clean_mermaid_output(raw_text):
    """Membersihkan tag markdown pembungkus dari teks Mermaid."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def copy_to_clipboard(text):
    """Menyalin teks ke clipboard Windows tanpa dependensi eksternal."""
    try:
        cmd = f'Set-Clipboard -Value @\'\n{text}\n\'@'
        subprocess.run(["powershell", "-NoProfile", "-Command", cmd], check=True, capture_output=True)
        return True
    except Exception:
        return False


def scan_diagram(image_path, use_argon=False):
    """Orkestrator pemindaian: memilih engine terbaik secara otomatis."""
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Berkas gambar tidak ditemukan: {image_path}")

    # Deteksi MIME Type
    ext = path.suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".bmp": "image/bmp"
    }
    mime_type = mime_map.get(ext, "image/png")
    image_bytes = path.read_bytes()

    api_key = load_env_gemini_key()
    gsb_up = is_gsb_available()

    if api_key:
        print(f"[*] Menggunakan Google GenAI SDK Resmi ({'gemini-4-argon' if use_argon else 'gemini-3.8-flash'})...")
        return scan_via_official_sdk(image_bytes, mime_type, api_key=api_key, use_argon=use_argon)
    elif gsb_up:
        print(f"[*] Menggunakan Gemini Stealth Bridge Lokal (Zero API Key - {'gemini-argon' if use_argon else 'gemini-flash'})...")
        return scan_via_gsb(image_bytes, mime_type, use_argon=use_argon)
    else:
        raise RuntimeError(
            "Tidak ada koneksi AI yang tersedia:\n"
            "1. Atur kunci GEMINI_API_KEY (misal: export GEMINI_API_KEY='AIzaSy...'), ATAU\n"
            "2. Jalankan Gemini Stealth Bridge (gsb.exe) di latar belakang."
        )


def compile_to_minimalflow_json(mmd_content):
    """Mengonversi sintaks Mermaid ke format JSON CAD MinimalFlow menggunakan adapter.js."""
    try:
        current_dir = Path(__file__).resolve().parent
        adapter_path = current_dir / "js" / "adapter.js"
        if not adapter_path.exists():
            adapter_path = current_dir / "minimalflow-studio" / "js" / "adapter.js"
        if not adapter_path.exists():
            return None

        adapter_js_path = str(adapter_path).replace("\\", "/")
        node_script = f"""
        global.window = global;
        const fs = require('fs');
        eval(fs.readFileSync('{adapter_js_path}', 'utf8'));
        const mmd = {json.dumps(mmd_content)};
        const res = window.MinimalFlow.Adapter.parseUniversal(mmd, true);
        if (res.success) {{
            process.stdout.write(JSON.stringify(res.document));
        }} else {{
            process.exit(1);
        }}
        """
        proc = subprocess.run(["node", "-e", node_script], capture_output=True, text=True, check=True)
        return json.loads(proc.stdout)
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(
        description="MinimalFlow Studio — AI Diagram Vision Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Contoh Penggunaan:
  python scan_diagram.py diagram.png
  python scan_diagram.py screenshot.jpg --argon --output hasil_alur.mmd
  python scan_diagram.py foto_sketsa.png --copy
        """
    )
    parser.add_argument("image", help="Jalur berkas gambar diagram (PNG, JPG, WebP)")
    parser.add_argument("--argon", action="store_true", help="Gunakan penalaran mendalam Gemini 4 Argon (untuk sketsa rumit)")
    parser.add_argument("-o", "--output", help="Simpan skrip Mermaid hasil pemindaian ke berkas tertentu")
    parser.add_argument("--no-copy", action="store_true", help="Jangan salin hasil ke clipboard Windows secara otomatis")

    args = parser.parse_args()

    print(f"\n=======================================================")
    print(f"  MinimalFlow Studio — AI Diagram Vision Scanner")
    print(f"=======================================================")
    print(f"Berkas Gambar : {args.image}")

    try:
        mermaid_code = scan_diagram(args.image, use_argon=args.argon)
        if not mermaid_code:
            print("[!] AI tidak menghasilkan teks diagram.")
            sys.exit(1)

        print("\n[+] Berhasil Merekontruksi Diagram:")
        print("-------------------------------------------------------")
        print(mermaid_code)
        print("-------------------------------------------------------")

        # Simpan ke berkas jika diminta atau buatkan berkas default .mmd
        out_path = args.output
        if not out_path:
            input_p = Path(args.image)
            out_path = str(input_p.with_suffix(".mmd"))

        Path(out_path).write_text(mermaid_code, encoding="utf-8")
        print(f"[+] Berkas Skrip Mermaid tersimpan ke: {out_path}")

        # Otomatis kompilasi ke JSON CAD MinimalFlow (.flow.json)
        compiled_json = compile_to_minimalflow_json(mermaid_code)
        if compiled_json:
            json_out_path = str(Path(out_path).with_suffix(".flow.json"))
            Path(json_out_path).write_text(json.dumps(compiled_json, indent=2), encoding="utf-8")
            print(f"[+] Berkas CAD MinimalFlow tersimpan ke : {json_out_path}")

        # Salin ke clipboard Windows
        if not args.no_copy:
            if copy_to_clipboard(mermaid_code):
                print("[+] Skrip Mermaid telah disalin otomatis ke Clipboard!")
                print("    -> Anda bisa langsung buka MinimalFlow Studio dan tekan Ctrl+V / Impor MMD.")

        print("[OK] Selesai sempurna.\n")

    except Exception as e:
        print(f"\n[ERROR] {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
