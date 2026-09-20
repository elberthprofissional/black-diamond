// =====================================================================
// scripts/serve-static.mjs
// Servidor estático para a pasta dist/ (versão de produção do site).
// Usado pelo launcher "Black Diamond Server.exe".
// Porta padrão: 5173 (mesma URL do modo dev).
// =====================================================================

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, appendFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = normalize(join(__dirname, "..", "dist"));
const PORT = Number(process.env.PORT || 5173);
const LOG = join(__dirname, "..", "server.log");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function log(line) {
  const ts = new Date().toISOString();
  try {
    appendFileSync(LOG, `[${ts}] ${line}\n`);
  } catch {
    /* log é apenas auxiliar */
  }
}

if (!existsSync(ROOT)) {
  log("ERRO: pasta dist/ não encontrada. Rode npm run build antes.");
  console.error("[black-diamond] pasta dist/ não encontrada. Rode npm run build antes.");
  process.exit(1);
}

const server = createServer((req, res) => {
  try {
    const url = (req.url || "/").split("?")[0];
    let rel = normalize(decodeURIComponent(url)).replace(/^[/\\]+/, "");
    let file = normalize(join(ROOT, rel));

    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }

    let stat = existsSync(file) ? statSync(file) : null;
    if (stat && stat.isDirectory()) {
      file = join(file, "index.html");
      stat = existsSync(file) ? statSync(file) : null;
    }
    if (!stat) {
      file = join(ROOT, "index.html");
      stat = statSync(file);
    }

    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(file).pipe(res);
  } catch (err) {
    log("ERRO ao servir: " + (err.message ?? err));
    res.writeHead(500);
    res.end("erro interno");
  }
});

server.on("error", (err) => {
  log("ERRO no servidor: " + (err.message ?? err));
  console.error("[black-diamond] erro:", err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  log(`no ar em http://localhost:${PORT} (dist = ${ROOT})`);
  console.log(`[black-diamond] no ar em http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  log("encerrado");
  process.exit(0);
});