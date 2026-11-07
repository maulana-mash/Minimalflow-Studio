"""
MinimalFlow Studio — Direct Netlify Deployer
Mengunggah folder minimalflow-studio secara instan langsung ke Netlify API
tanpa melalui proses commit/push GitHub.
"""

import os
import io
import zipfile
import urllib.request
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(BASE_DIR, "minimalflow-studio")
ENV_PATH = os.path.join(BASE_DIR, ".env")

# Baca kredensial dari .env
TOKEN = os.environ.get("NETLIFY_AUTH_TOKEN", "")
SITE_ID = os.environ.get("NETLIFY_SITE_ID", "")

if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == "NETLIFY_AUTH_TOKEN" and not TOKEN:
                    TOKEN = v
                elif k == "NETLIFY_SITE_ID" and not SITE_ID:
                    SITE_ID = v

if not TOKEN or not SITE_ID:
    print("Error: NETLIFY_AUTH_TOKEN atau NETLIFY_SITE_ID belum diatur di file .env")
    exit(1)

print(f"1. Memverifikasi koneksi ke Netlify (Site ID: {SITE_ID})...")
req = urllib.request.Request(
    f"https://api.netlify.com/api/v1/sites/{SITE_ID}",
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "User-Agent": "MinimalFlowDeployer/1.0"
    }
)

with urllib.request.urlopen(req) as resp:
    site_info = json.loads(resp.read().decode())
    print(f"   Terhubung: {site_info.get('name')} -> {site_info.get('ssl_url')}")

print(f"\n2. Mengemas berkas 'minimalflow-studio'...")
zip_buffer = io.BytesIO()
file_count = 0
with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.startswith(".env") or file.endswith(".pyc"):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, SOURCE_DIR).replace("\\", "/")
            zf.write(full_path, rel_path)
            file_count += 1

zip_bytes = zip_buffer.getvalue()
print(f"   Total {file_count} berkas dikemas ({len(zip_bytes):,} bytes).")

print(f"\n3. Mengunggah langsung ke Netlify...")
deploy_req = urllib.request.Request(
    f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys",
    data=zip_bytes,
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/zip",
        "User-Agent": "MinimalFlowDeployer/1.0"
    },
    method="POST"
)

with urllib.request.urlopen(deploy_req) as deploy_resp:
    result = json.loads(deploy_resp.read().decode())
    print("\nBERHASIL DEPLOY!")
    print(f"   Status : {result.get('state')}")
    print(f"   URL    : {result.get('ssl_url')}")
