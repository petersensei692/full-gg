# Bundled root certificate (Windows trust)

The packaged app looks for **`app-root.cer`** in this folder. It is copied to `resources/certs/` beside the app and, on Windows, the Electron main process can install it into **Trusted Root Certification Authorities** (elevated) so Windows trusts binaries signed with your matching **`.pfx`**.

## 1. Generate a self-signed CA + code-signing cert (OpenSSL)

Run in Git Bash or WSL (adjust `CN` / validity as needed).

```bash
# Root CA (private key + self-signed cert)
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=JournalApp Dev Root CA" -out ca.crt

# Code-signing cert signed by that CA
openssl genrsa -out codesign.key 4096
openssl req -new -key codesign.key -out codesign.csr \
  -subj "/CN=JournalApp Code Signing"
openssl x509 -req -in codesign.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out codesign.crt -days 825 -sha256 -extfile <(echo "extendedKeyUsage=codeSigning")

# Public .cer for Windows trust (install this one in the store)
openssl x509 -in ca.crt -out app-root.cer -outform DER

# PFX for signtool / osslsigncode (keep secret; do not commit)
openssl pkcs12 -export -out codesign.pfx -inkey codesign.key -in codesign.crt \
  -certfile ca.crt -password pass:YOUR_PASSWORD
```

Copy **`app-root.cer`** into this directory before `npm run electron:build`.  
Keep **`codesign.pfx`**, **`ca.key`**, and **`codesign.key`** out of git (see `.gitignore`).

## 2. Sign your `.exe` (example)

Use `signtool` (Windows SDK) or `osslsigncode` with `codesign.pfx`. After users install the bundled `app-root.cer` (or you install it for them on first run), Windows will trust that signature.

## 3. Behaviour in the app

- On **Windows**, shortly after `app.whenReady()`, the app checks whether the SHA1 thumbprint of `app-root.cer` is already in **Local Machine → Trusted Root**.
- If not, it prompts for **Administrator** (UAC) and runs `certutil -addstore -f "Root" "<path>"`.
- If the user cancels UAC, the failure is logged and the app **retries on a later launch** (no infinite loop in one session).
- Logs and state live under `%APPDATA%\JournalApp\` (see `app.getPath('userData')`): `cert-trust.log`, `cert-trust-state.json`.

If **`app-root.cer`** is missing, the step is skipped (no error).

**Note:** In this repository, the path is `resources/certs/` (not `build/certs`) because a file named `build` exists at the project root.
