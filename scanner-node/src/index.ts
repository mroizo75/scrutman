/**
 * ScrutMan Scanner Node
 *
 * Kjøres på Raspberry Pi 4 eller mini-PC ved banen.
 * Eksponerer lokalt HTTP API på port 3100 (konfigurerbart).
 * Synkroniserer automatisk mot ScrutMan cloud via SCANNER_NODE_SECRET.
 *
 * Kompatibel med:
 *   - Håndholdte UHF RFID-skannere (Zebra RFD40, Chainway C72 osv.) over HTTP
 *   - Portal-skannere (Impinj R700, Zebra FX9600) med LLRP→HTTP-bridge
 *   - Strekkode-skannere (alle modeller med HID/USB-modus)
 *   - Nettleser-grensesnitt (samme som cloud, men offline-capable)
 */

import "dotenv/config";
import express from "express";
import cron from "node-cron";
import { syncCycle, restoreFromCache, isOnline, lastSyncAt, pendingCount, downloadBundle } from "./sync.js";
import { lookupRfid, lookupBarcode } from "./lookup.js";
import { getPendingSyncs, getSyncMeta } from "./db.js";

const PORT     = parseInt(process.env.PORT ?? "3100");
const SYNC_SEC = parseInt(process.env.SYNC_INTERVAL_SECONDS ?? "30");
const NODE_ID  = process.env.NODE_ID ?? "node-01";
const NODE_NAME= process.env.NODE_NAME ?? "Scanner Node";

const app = express();
app.use(express.json());

// Allow requests from web UI on same local network
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

// ─── Health / status ─────────────────────────────────────────────────────────

app.get("/status", (_req, res) => {
  const pending = getPendingSyncs(1);
  res.json({
    nodeId: NODE_ID,
    nodeName: NODE_NAME,
    online: isOnline(),
    lastSyncAt: lastSyncAt(),
    pendingScans: pendingCount(),
    eventId: getSyncMeta("eventId") ?? process.env.SCRUTMAN_EVENT_ID ?? null,
    bundleGeneratedAt: getSyncMeta("bundleGeneratedAt") ?? null,
    registeredTiresCount: parseInt(getSyncMeta("registeredTiresCount") ?? "0"),
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── RFID oppslag ─────────────────────────────────────────────────────────────

/**
 * GET /rfid/:epc
 * Brukes av UHF-lesere og håndholdte skannere.
 * Svar: < 5 ms fra lokal SQLite-cache.
 */
app.get("/rfid/:epc", (req, res) => {
  const result = lookupRfid(req.params.epc);
  res.status(result.status === "RED" ? 200 : 200).json(result);
});

// POST-variant for portal-skannere (Impinj/Zebra HTTP-modus)
app.post("/rfid", (req, res) => {
  const { epc, tagId } = req.body ?? {};
  const identifier = epc ?? tagId ?? "";
  if (!identifier) {
    res.status(400).json({ status: "RED", reason: "Mangler epc/tagId i body" });
    return;
  }
  res.json(lookupRfid(identifier));
});

// ─── Strekkode-oppslag ────────────────────────────────────────────────────────

/**
 * GET /barcode/:code
 * FIA LT54 Interleaved 2/5, 8–10 siffer.
 */
app.get("/barcode/:code", (req, res) => {
  res.json(lookupBarcode(req.params.code));
});

app.post("/barcode", (req, res) => {
  const { code, barcode } = req.body ?? {};
  const identifier = code ?? barcode ?? "";
  if (!identifier) {
    res.status(400).json({ status: "RED", reason: "Mangler code/barcode i body" });
    return;
  }
  res.json(lookupBarcode(identifier));
});

// ─── Batch-oppslag (for portal-skannere som sender mange tags på en gang) ────

/**
 * POST /scan-batch
 * Body: { tags: [{ type: "RFID"|"BARCODE", value: string }] }
 * Brukes av Impinj Octane SDK og lignende når flere dekk passerer portalen.
 */
app.post("/scan-batch", (req, res) => {
  const { tags } = req.body ?? {};
  if (!Array.isArray(tags)) {
    res.status(400).json({ error: "Forventet { tags: [] }" });
    return;
  }
  const results = tags.map((t: { type?: string; value: string }) => {
    if ((t.type ?? "RFID") === "BARCODE") {
      return { ...lookupBarcode(t.value), input: t.value };
    }
    return { ...lookupRfid(t.value), input: t.value };
  });
  res.json({ results, processedAt: new Date().toISOString() });
});

// ─── Manuell synkronisering ──────────────────────────────────────────────────

app.post("/sync", async (_req, res) => {
  try {
    await syncCycle();
    res.json({
      ok: true,
      online: isOnline(),
      lastSyncAt: lastSyncAt(),
      pendingScans: pendingCount(),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// Force re-download of bundle (e.g. after new tires are registered)
app.post("/sync/bundle", async (_req, res) => {
  try {
    const result = await downloadBundle();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // Restore local state from SQLite on startup
  restoreFromCache();

  // Initial sync
  console.log("[node] Starter innledende synkronisering...");
  await syncCycle();

  // Scheduled sync every N seconds
  const cronExpr = SYNC_SEC <= 59
    ? `*/${SYNC_SEC} * * * * *`  // every N seconds
    : `0 */${Math.floor(SYNC_SEC / 60)} * * * *`;  // every N minutes

  cron.schedule(cronExpr, () => {
    syncCycle().catch((e) => console.error("[sync] Feil:", e));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║          ScrutMan Scanner Node — KLAR              ║
╠════════════════════════════════════════════════════╣
║  Node:      ${NODE_NAME.padEnd(38)}║
║  ID:        ${NODE_ID.padEnd(38)}║
║  Port:      ${String(PORT).padEnd(38)}║
║  Synk hvert: ${String(SYNC_SEC + 's').padEnd(37)}║
╠════════════════════════════════════════════════════╣
║  RFID:      GET  /rfid/:epc                        ║
║  Barcode:   GET  /barcode/:code                    ║
║  Batch:     POST /scan-batch                       ║
║  Status:    GET  /status                           ║
║  Synk:      POST /sync                             ║
╚════════════════════════════════════════════════════╝
`);
  });
}

start().catch((e) => {
  console.error("[node] Fatal feil:", e);
  process.exit(1);
});
