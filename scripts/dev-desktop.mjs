import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const electron = require("electron");
const vite = path.join(process.cwd(), "node_modules", ".bin", "vite");

const viteProcess = spawn(vite, ["--host", "127.0.0.1", "--port", "5173", "--strictPort"], {
  stdio: "inherit"
});

async function waitForVite() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:5173");
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Vite did not start within 30 seconds.");
}

let electronProcess;
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  electronProcess?.kill("SIGTERM");
  viteProcess.kill("SIGTERM");
  setTimeout(() => process.exit(exitCode), 100);
}

try {
  await waitForVite();
  electronProcess = spawn(electron, ["electron/main.cjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: "http://127.0.0.1:5173"
    }
  });
  electronProcess.on("exit", (code) => stop(code ?? 0));
} catch (error) {
  console.error(error);
  stop(1);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
