"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Database, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { settingsService, type AppSettings } from "@/lib/services/settings.service";

declare global {
  interface Window {
    electron?: {
      chooseDirectory: () => Promise<string | null>;
      chooseDatabaseFile: () => Promise<string | null>;
      chooseDatabaseFolder: () => Promise<string | null>;
    };
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dbValidateResult, setDbValidateResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [imagesPathInput, setImagesPathInput] = useState("");
  const [databasePathInput, setDatabasePathInput] = useState("");
  /** Set when the path came from Browse: file → validate/prepare; directory → New database. */
  const [dbBrowseKind, setDbBrowseKind] = useState<"file" | "directory" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsService.get();
      setSettings(data);
      setImagesPathInput(data.imagesPath || "");
      setDatabasePathInput(data.databasePath || "");
      setDbValidateResult(null);
    } catch {
      setMessage({ type: "error", text: "Failed to load settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleChooseImagesDir = async () => {
    if (typeof window !== "undefined" && window.electron?.chooseDirectory) {
      const path = await window.electron.chooseDirectory();
      if (path != null) {
        setImagesPathInput(path);
        setSaving(true);
        try {
          const updated = await settingsService.update({ imagesPath: path });
          setSettings(updated);
          showMessage("success", "Images directory saved.");
        } catch {
          showMessage("error", "Failed to save images directory.");
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const handleSaveImagesPath = async () => {
    setSaving(true);
    try {
      const updated = await settingsService.update({ imagesPath: imagesPathInput.trim() });
      setSettings(updated);
      showMessage("success", "Images directory saved.");
    } catch {
      showMessage("error", "Failed to save images directory.");
    } finally {
      setSaving(false);
    }
  };

  const validateAndSaveDatabaseFile = async (filePath: string) => {
    try {
      const result = await settingsService.validateDatabase(filePath);
      setDbValidateResult(result);
      if (result.valid) {
        setSaving(true);
        const updated = await settingsService.update({ databasePath: filePath });
        setSettings(updated);
        showMessage("success", "Database file validated and saved. Restart the app to use it.");
      }
    } catch {
      setDbValidateResult({ valid: false, error: "Validation request failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleBrowseDatabaseFile = async () => {
    if (typeof window === "undefined" || !window.electron?.chooseDatabaseFile) return;
    const filePath = await window.electron.chooseDatabaseFile();
    if (!filePath) return;
    setDatabasePathInput(filePath);
    setDbBrowseKind("file");
    setDbValidateResult(null);
    await validateAndSaveDatabaseFile(filePath);
  };

  const handleBrowseDatabaseFolder = async () => {
    if (typeof window === "undefined" || !window.electron?.chooseDatabaseFolder) return;
    const folderPath = await window.electron.chooseDatabaseFolder();
    if (!folderPath) return;
    setDatabasePathInput(folderPath);
    setDbBrowseKind("directory");
    setDbValidateResult(null);
  };

  const handleValidateDatabase = async () => {
    const path = databasePathInput.trim();
    if (!path) {
      setDbValidateResult({ valid: false, error: "Enter a database file path." });
      return;
    }
    setDbValidateResult(null);
    try {
      const result = await settingsService.validateDatabase(path);
      setDbValidateResult(result);
      if (result.valid) {
        setSaving(true);
        const updated = await settingsService.update({ databasePath: path });
        setSettings(updated);
        showMessage("success", "Database file validated and saved. Restart the app to use it.");
      }
    } catch {
      setDbValidateResult({ valid: false, error: "Validation request failed." });
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareDatabase = async () => {
    const path = databasePathInput.trim();
    if (!path) {
      setDbValidateResult({ valid: false, error: "Enter a database file path." });
      return;
    }
    setDbValidateResult(null);
    setSaving(true);
    try {
      const result = await settingsService.prepareDatabase(path);
      if (result.ok) {
        setDbValidateResult({ valid: true });
        const updated = await settingsService.update({ databasePath: path });
        setSettings(updated);
        showMessage(
          "success",
          "Database prepared: missing tables/columns were added and essential seeds inserted where missing. Restart the app if it was already running.",
        );
      } else {
        setDbValidateResult({ valid: false, error: result.error ?? "Prepare failed." });
      }
    } catch {
      setDbValidateResult({ valid: false, error: "Prepare request failed." });
    } finally {
      setSaving(false);
    }
  };

  const runCreateDatabase = async (dir: string) => {
    const trimmed = dir.trim();
    if (!trimmed) {
      showMessage("error", "No folder path to create the database in.");
      return;
    }
    setSaving(true);
    try {
      const result = await settingsService.createDatabase(trimmed, "gg-journal.sqlite");
      if (result.ok && result.path) {
        setDatabasePathInput(result.path);
        setDbBrowseKind("file");
        setDbValidateResult({ valid: true });
        const updated = await settingsService.update({ databasePath: result.path });
        setSettings(updated);
        showMessage("success", "New database created and saved to settings. Restart the app to use it.");
      } else {
        showMessage("error", result.error ?? "Could not create database.");
      }
    } catch {
      showMessage("error", "Create database request failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleNewDatabaseInBrowsedFolder = async () => {
    const folder = databasePathInput.trim();
    if (!folder) {
      showMessage("error", "Browse and select a folder first.");
      return;
    }
    if (dbBrowseKind !== "directory") {
      showMessage("error", "New database needs a folder from Browse (not a file).");
      return;
    }
    await runCreateDatabase(folder);
  };

  const hasElectron = typeof window !== "undefined" && !!window.electron;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold text-dashboard-foreground mb-6">Settings</h1>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              message.type === "success"
                ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-dashboard-foreground/70">Loading settings…</p>
        ) : (
          <div className="space-y-8">
            {/* Images directory */}
            <section className="rounded-xl border border-sidebar-border bg-sidebar p-4">
              <h2 className="text-sm font-semibold text-dashboard-foreground flex items-center gap-2 mb-3">
                <FolderOpen className="h-4 w-4" />
                Images directory
              </h2>
              <p className="text-xs text-dashboard-foreground/60 mb-3">
                Choose the folder where uploaded images are stored. If not set, the app uses the path from .env (IMAGES_FOLDER_PATH).
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={imagesPathInput}
                  onChange={(e) => setImagesPathInput(e.target.value)}
                  placeholder="e.g. C:\Images or /home/user/images"
                  className="flex-1 min-w-[200px] max-w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleChooseImagesDir}
                  disabled={saving || !hasElectron}
                  title={!hasElectron ? "Browse is available in the desktop app (Electron)" : undefined}
                  className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Browse…
                </button>
                <button
                  type="button"
                  onClick={handleSaveImagesPath}
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </section>

            {/* Database file */}
            <section className="rounded-xl border border-sidebar-border bg-sidebar p-4">
              <h2 className="text-sm font-semibold text-dashboard-foreground flex items-center gap-2 mb-3">
                <Database className="h-4 w-4" />
                SQLite database file
              </h2>
              <p className="text-xs text-dashboard-foreground/60 mb-3">
                Use <strong>Browse file</strong> for an existing .db / .sqlite, or <strong>Browse folder</strong> then New
                database to create gg-journal.sqlite there. You can still type a path manually. Restart the server after
                switching files.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  type="text"
                  value={databasePathInput}
                  onChange={(e) => {
                    setDatabasePathInput(e.target.value);
                    setDbBrowseKind(null);
                    setDbValidateResult(null);
                  }}
                  placeholder="Database file path, or folder after Browse folder"
                  className="flex-1 min-w-[200px] max-w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleBrowseDatabaseFile}
                  disabled={saving || !hasElectron}
                  title={!hasElectron ? "Available in the desktop app (Electron)" : "Choose .db or .sqlite file"}
                  className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Browse file…
                </button>
                <button
                  type="button"
                  onClick={handleBrowseDatabaseFolder}
                  disabled={saving || !hasElectron}
                  title={!hasElectron ? "Available in the desktop app (Electron)" : "Choose folder for a new database"}
                  className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Browse folder…
                </button>
                <button
                  type="button"
                  onClick={handleValidateDatabase}
                  disabled={saving || (hasElectron && dbBrowseKind === "directory")}
                  title={dbBrowseKind === "directory" ? "Select a database file to validate" : undefined}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Validate & save
                </button>
                <button
                  type="button"
                  onClick={handlePrepareDatabase}
                  disabled={saving || (hasElectron && dbBrowseKind === "directory")}
                  title={dbBrowseKind === "directory" ? "Prepare applies to a database file path" : undefined}
                  className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  Prepare database
                </button>
                <button
                  type="button"
                  onClick={handleNewDatabaseInBrowsedFolder}
                  disabled={saving || !hasElectron || dbBrowseKind !== "directory"}
                  title={
                    !hasElectron
                      ? "Available in the desktop app"
                      : dbBrowseKind !== "directory"
                        ? "Browse and select a folder first"
                        : "Create gg-journal.sqlite in the selected folder"
                  }
                  className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  New database…
                </button>
              </div>
              {dbValidateResult && (
                <div
                  className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    dbValidateResult.valid
                      ? "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400"
                      : "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  {dbValidateResult.valid ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {dbValidateResult.valid
                      ? "Database structure is valid. Restart the app to use this file."
                      : dbValidateResult.error}
                  </span>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
