/**
 * Lokal dekk-oppslag — O(1) fra SQLite-cache.
 * Samme svar-format som ScrutMan cloud API.
 */

import { lookupByRfid, lookupByBarcode, enqueueScan } from "./db.js";
import { v4 as uuidv4 } from "uuid";

export interface LookupResult {
  status: "GREEN" | "RED" | "YELLOW";
  reason: string;
  source: "local" | "cloud";
  rfidEpc?: string;
  barcodeNumber?: string;
  tire?: {
    tireId: string;
    manufacturer: string;
    model: string;
    size: string;
    compound: string | null;
    discipline: string;
    isNewForOwner: boolean;
    status: string;
    ownerName: string | null;
    ownerEmail: string;
    registrationId: string;
    fiaManCode: number | null;
  };
}

export function lookupRfid(epc: string): LookupResult {
  const norm = epc.trim().toUpperCase().replace(/\s/g, "");

  if (!/^[0-9A-F]+$/.test(norm) || norm.length < 20 || norm.length > 32) {
    const result: LookupResult = {
      status: "RED",
      source: "local",
      reason: `Ugyldig RFID EPC-format (${norm.length} tegn)`,
      rfidEpc: norm,
    };
    enqueue("RFID", norm, result);
    return result;
  }

  const row = lookupByRfid(norm);
  const result = buildResult("RFID", norm, row);
  enqueue("RFID", norm, result, row);
  return result;
}

export function lookupBarcode(code: string): LookupResult {
  const trimmed = code.trim();

  if (!/^\d{8,10}$/.test(trimmed)) {
    const result: LookupResult = {
      status: "RED",
      source: "local",
      reason: "Ugyldig FIA strekkode — må være 8–10 siffer",
      barcodeNumber: trimmed,
    };
    enqueue("BARCODE", trimmed, result);
    return result;
  }

  const row = lookupByBarcode(trimmed);
  const result = buildResult("BARCODE", trimmed, row);
  enqueue("BARCODE", trimmed, result, row);
  return result;
}

function buildResult(
  mode: "RFID" | "BARCODE",
  identifier: string,
  row: ReturnType<typeof lookupByRfid>
): LookupResult {
  if (!row) {
    return {
      status: "RED",
      source: "local",
      reason: `${mode === "RFID" ? "RFID EPC" : "Strekkode"} ikke funnet i event-registreringen`,
      ...(mode === "RFID" ? { rfidEpc: identifier } : { barcodeNumber: identifier }),
    };
  }

  if (row.status !== "ACTIVE") {
    return {
      status: "RED",
      source: "local",
      reason: `Dekk er markert som ${row.status}`,
      ...(mode === "RFID" ? { rfidEpc: identifier } : { barcodeNumber: identifier }),
      tire: buildTirePayload(row),
    };
  }

  return {
    status: "GREEN",
    source: "local",
    reason: "Godkjent — registrert for dette eventet (FIA LT54)",
    ...(mode === "RFID" ? { rfidEpc: identifier } : { barcodeNumber: identifier }),
    tire: buildTirePayload(row),
  };
}

function buildTirePayload(row: any) {
  return {
    tireId: row.tire_id ?? row.tireId,
    manufacturer: row.manufacturer,
    model: row.model,
    size: row.size,
    compound: row.compound ?? null,
    discipline: row.discipline,
    isNewForOwner: row.is_new_for_owner === 1 || row.isNewForOwner === true,
    status: row.status,
    ownerName: row.owner_name ?? row.ownerName ?? null,
    ownerEmail: row.owner_email ?? row.ownerEmail ?? "",
    registrationId: row.registration_id ?? row.registrationId ?? "",
    fiaManCode: row.fia_man_code ?? row.fiaManCode ?? null,
  };
}

function enqueue(
  mode: "RFID" | "BARCODE",
  identifier: string,
  result: LookupResult,
  row?: any
): void {
  enqueueScan({
    localId: uuidv4(),
    scanMode: mode,
    identifier,
    outcome: result.status,
    reason: result.reason,
    tireId: row?.tire_id ?? row?.tireId ?? null,
    registrationId: row?.registration_id ?? row?.registrationId ?? null,
    scannedAt: new Date().toISOString(),
  });
}
