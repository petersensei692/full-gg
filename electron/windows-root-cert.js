/**
 * Windows: install a bundled self-signed .cer into Local Machine "Root" (Trusted Root CA)
 * so the OS trusts code signed with the matching private key (.pfx).
 *
 * - Verifies trust via certificate thumbprint before skipping install.
 * - Uses UAC elevation (sudo-prompt) for certutil; logs to userData.
 * - Retries on later launches if the user denies elevation once.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sudo = require("sudo-prompt");

const CERT_FILE_NAME = "app-root.cer";
const STATE_FILE = "cert-trust-state.json";
const LOG_FILE = "cert-trust.log";

function appendLog(userData, message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console.log("[cert-trust]", message);
  if (!userData) return;
  try {
    fs.appendFileSync(path.join(userData, LOG_FILE), line, "utf8");
  } catch {
    /* ignore */
  }
}

/**
 * @param {import('electron').App} app
 */
function resolveBundledCertPath(app) {
  const packagedPath = path.join(process.resourcesPath, "certs", CERT_FILE_NAME);
  if (fs.existsSync(packagedPath)) return packagedPath;
  if (!app.isPackaged) {
    const devPath = path.join(__dirname, "..", "resources", "certs", CERT_FILE_NAME);
    if (fs.existsSync(devPath)) return devPath;
  }
  return null;
}

function runPowerShellOutput(command) {
  return execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    encoding: "utf8",
  }).trim();
}

function getSha1ThumbprintForCerFile(cerPath) {
  const escaped = cerPath.replace(/'/g, "''");
  const script = `$c = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${escaped}'); Write-Output $c.Thumbprint`;
  return runPowerShellOutput(script).replace(/\s/g, "").toUpperCase();
}

function isThumbprintInLocalMachineRoot(thumbprint) {
  const tp = thumbprint.replace(/\s/g, "").toUpperCase();
  const script =
    `$ErrorActionPreference = 'Stop';` +
    `$tp = '${tp}';` +
    `$found = Get-ChildItem -Path Cert:\\LocalMachine\\Root | Where-Object { $_.Thumbprint -eq $tp };` +
    `if ($found) { exit 0 } else { exit 1 }`;
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function readState(userData) {
  try {
    const raw = fs.readFileSync(path.join(userData, STATE_FILE), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeState(userData, partial) {
  const prev = readState(userData);
  const next = { ...prev, ...partial, updatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(userData, STATE_FILE), JSON.stringify(next, null, 2), "utf8");
}

function installWithElevation(certPath) {
  const escaped = certPath.replace(/"/g, '\\"');
  const cmd = `certutil -addstore -f "Root" "${escaped}"`;
  return new Promise((resolve, reject) => {
    sudo.exec(
      cmd,
      { name: "JournalApp" },
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout: stdout || "", stderr: stderr || "" });
      },
    );
  });
}

function isUserDeniedError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("canceled") ||
    msg.includes("cancelled") ||
    msg.includes("1223") ||
    msg.includes("user declined") ||
    msg.includes("operation was canceled")
  );
}

/**
 * Call after `app.whenReady()` (needs `app.getPath`).
 * @param {import('electron').App} app
 * @returns {Promise<void>}
 */
async function ensureBundledWindowsRootCert(app) {
  if (process.platform !== "win32") return;

  const userData = app.getPath("userData");
  try {
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  } catch {
    /* continue */
  }

  const certPath = resolveBundledCertPath(app);
  if (!certPath) {
    appendLog(userData, "No bundled " + CERT_FILE_NAME + " found; skipping root trust step.");
    return;
  }

  let thumbprint;
  try {
    thumbprint = getSha1ThumbprintForCerFile(certPath);
  } catch (e) {
    appendLog(userData, "Failed to read certificate thumbprint: " + String(e?.message || e));
    writeState(userData, { lastResult: "error", lastError: String(e?.message || e), thumbprint: null });
    return;
  }

  if (isThumbprintInLocalMachineRoot(thumbprint)) {
    appendLog(userData, "Certificate already in Trusted Root (thumbprint " + thumbprint + ").");
    writeState(userData, {
      lastResult: "already_trusted",
      thumbprint,
      lastError: null,
    });
    return;
  }

  const state = readState(userData);
  if (state.lastResult === "success" && state.thumbprint === thumbprint) {
    appendLog(userData, "State file marked success but store check failed; will retry install.");
  }

  appendLog(
    userData,
    "Certificate not yet trusted. Requesting Administrator permission to install into Trusted Root CA…",
  );
  writeState(userData, {
    lastAttemptAt: new Date().toISOString(),
    thumbprint,
    lastResult: "attempting",
    lastError: null,
  });

  try {
    const { stdout, stderr } = await installWithElevation(certPath);
    if (stdout) appendLog(userData, "certutil stdout: " + stdout.trim().slice(0, 500));
    if (stderr) appendLog(userData, "certutil stderr: " + stderr.trim().slice(0, 500));
  } catch (e) {
    const denied = isUserDeniedError(e);
    appendLog(
      userData,
      denied
        ? "User cancelled or denied Administrator elevation. Will offer again on a future launch."
        : "Certificate install failed: " + String(e?.message || e),
    );
    writeState(userData, {
      lastResult: denied ? "elevation_denied" : "error",
      lastError: String(e?.message || e),
      thumbprint,
    });
    return;
  }

  if (!isThumbprintInLocalMachineRoot(thumbprint)) {
    appendLog(userData, "certutil reported success but certificate still not found in Root store; check cert file.");
    writeState(userData, {
      lastResult: "verify_failed",
      lastError: "Post-install thumbprint check failed",
      thumbprint,
    });
    return;
  }

  appendLog(userData, "Certificate installed successfully to Trusted Root Certification Authorities.");
  writeState(userData, {
    lastResult: "success",
    installedAt: new Date().toISOString(),
    lastError: null,
    thumbprint,
  });
}

module.exports = { ensureBundledWindowsRootCert, resolveBundledCertPath };
