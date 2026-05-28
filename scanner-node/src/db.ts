/**
 * Lokal SQLite-database for offline-caching av dekk-data og skannekø.
 * Bruker better-sqlite3 for synkrone operasjoner — enkel og rask på Pi.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "scanner.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    -- Synkronisert bundle fra ScrutMan cloud
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Godkjente dekkspesifikasjoner (fra ScrutMan)
    CREATE TABLE IF NOT EXISTS approved_tires (
      id                   TEXT PRIMARY KEY,
      manufacturer         TEXT NOT NULL,
      model                TEXT NOT NULL,
      size                 TEXT NOT NULL,
      compound             TEXT,
      fia_manufacturer_code INTEGER,
      rfid_chip_model      TEXT,
      barcode_supplier     TEXT,
      disciplines_json     TEXT NOT NULL DEFAULT '[]'
    );

    -- Registrerte dekk for dette eventet
    CREATE TABLE IF NOT EXISTS event_tires (
      tire_id          TEXT PRIMARY KEY,
      rfid_epc         TEXT,
      barcode_number   TEXT,
      serial_number    TEXT,
      discipline       TEXT NOT NULL,
      is_new_for_owner INTEGER NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'ACTIVE',
      approved_tire_id TEXT NOT NULL,
      manufacturer     TEXT NOT NULL,
      model            TEXT NOT NULL,
      size             TEXT NOT NULL,
      compound         TEXT,
      fia_man_code     INTEGER,
      owner_id         TEXT NOT NULL,
      owner_name       TEXT,
      owner_email      TEXT NOT NULL,
      registration_id  TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_event_tires_rfid
      ON event_tires (rfid_epc) WHERE rfid_epc IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_event_tires_barcode
      ON event_tires (barcode_number) WHERE barcode_number IS NOT NULL;

    -- Skanninger som venter på å synkroniseres til sky
    CREATE TABLE IF NOT EXISTS scan_queue (
      local_id        TEXT PRIMARY KEY,
      scan_mode       TEXT NOT NULL DEFAULT 'RFID',
      identifier      TEXT NOT NULL,
      outcome         TEXT NOT NULL,
      reason          TEXT NOT NULL,
      tire_id         TEXT,
      registration_id TEXT,
      scanned_at      TEXT NOT NULL,
      synced          INTEGER NOT NULL DEFAULT 0,
      synced_at       TEXT,
      error           TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_scan_queue_unsynced
      ON scan_queue (synced) WHERE synced = 0;
  `);
}

// ─── Approved tires ──────────────────────────────────────────────────────────

export function upsertApprovedTires(tires: ApprovedTireRow[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO approved_tires
      (id, manufacturer, model, size, compound, fia_manufacturer_code,
       rfid_chip_model, barcode_supplier, disciplines_json)
    VALUES
      (@id, @manufacturer, @model, @size, @compound, @fiaManufacturerCode,
       @rfidChipModel, @barcodeSupplier, @disciplinesJson)
  `);
  const run = db.transaction((rows: ApprovedTireRow[]) => {
    for (const r of rows) stmt.run(r);
  });
  run(tires);
}

export interface ApprovedTireRow {
  id: string;
  manufacturer: string;
  model: string;
  size: string;
  compound: string | null;
  fiaManufacturerCode: number | null;
  rfidChipModel: string | null;
  barcodeSupplier: string | null;
  disciplinesJson: string;
}

// ─── Event tires ─────────────────────────────────────────────────────────────

export function upsertEventTires(tires: EventTireRow[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO event_tires
      (tire_id, rfid_epc, barcode_number, serial_number, discipline,
       is_new_for_owner, status, approved_tire_id,
       manufacturer, model, size, compound, fia_man_code,
       owner_id, owner_name, owner_email, registration_id)
    VALUES
      (@tireId, @rfidEpc, @barcodeNumber, @serialNumber, @discipline,
       @isNewForOwner, @status, @approvedTireId,
       @manufacturer, @model, @size, @compound, @fiaManCode,
       @ownerId, @ownerName, @ownerEmail, @registrationId)
  `);
  const run = db.transaction((rows: EventTireRow[]) => {
    for (const r of rows) stmt.run(r);
  });
  run(tires);
}

export function clearEventTires(): void {
  getDb().exec("DELETE FROM event_tires");
}

export interface EventTireRow {
  tireId: string;
  rfidEpc: string | null;
  barcodeNumber: string | null;
  serialNumber: string | null;
  discipline: string;
  isNewForOwner: number;
  status: string;
  approvedTireId: string;
  manufacturer: string;
  model: string;
  size: string;
  compound: string | null;
  fiaManCode: number | null;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string;
  registrationId: string;
}

export function lookupByRfid(epc: string): EventTireRow | undefined {
  return getDb()
    .prepare("SELECT * FROM event_tires WHERE rfid_epc = ?")
    .get(epc.toUpperCase()) as EventTireRow | undefined;
}

export function lookupByBarcode(code: string): EventTireRow | undefined {
  return getDb()
    .prepare("SELECT * FROM event_tires WHERE barcode_number = ?")
    .get(code) as EventTireRow | undefined;
}

// ─── Scan queue ──────────────────────────────────────────────────────────────

export function enqueueScan(entry: ScanQueueRow): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO scan_queue
      (local_id, scan_mode, identifier, outcome, reason,
       tire_id, registration_id, scanned_at, synced)
    VALUES
      (@localId, @scanMode, @identifier, @outcome, @reason,
       @tireId, @registrationId, @scannedAt, 0)
  `).run(entry);
}

export function getPendingSyncs(limit = 500): ScanQueueRow[] {
  return getDb()
    .prepare("SELECT * FROM scan_queue WHERE synced = 0 ORDER BY scanned_at ASC LIMIT ?")
    .all(limit) as ScanQueueRow[];
}

export function markSynced(localIds: string[]): void {
  if (localIds.length === 0) return;
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE scan_queue SET synced = 1, synced_at = ? WHERE local_id = ?"
  );
  const run = db.transaction(() => {
    const now = new Date().toISOString();
    for (const id of localIds) stmt.run(now, id);
  });
  run();
}

export function markSyncError(localId: string, error: string): void {
  getDb()
    .prepare("UPDATE scan_queue SET error = ? WHERE local_id = ?")
    .run(error, localId);
}

export interface ScanQueueRow {
  localId: string;
  scanMode: string;
  identifier: string;
  outcome: string;
  reason: string;
  tireId: string | null;
  registrationId: string | null;
  scannedAt: string;
}

// ─── Sync meta ───────────────────────────────────────────────────────────────

export function setSyncMeta(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function getSyncMeta(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM sync_meta WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}
