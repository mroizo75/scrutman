/**
 * Synkronisering mot ScrutMan cloud.
 * - Last ned sync-bundle (godkjente dekk + event-dekk)
 * - Send opp køede offline-skanninger
 */

import {
  upsertApprovedTires, upsertEventTires, clearEventTires,
  getPendingSyncs, markSynced, markSyncError,
  setSyncMeta, getSyncMeta,
  ApprovedTireRow, EventTireRow,
} from "./db.js";

const API_URL    = process.env.SCRUTMAN_API_URL ?? "";
const EVENT_ID   = process.env.SCRUTMAN_EVENT_ID ?? "";
const TOKEN      = process.env.SCANNER_NODE_SECRET ?? "";
const NODE_ID    = process.env.NODE_ID ?? "node-01";
const NODE_NAME  = process.env.NODE_NAME ?? "Scanner Node";

let _isOnline = false;
let _lastSyncAt: string | null = null;
let _pendingCount = 0;

export function isOnline(): boolean { return _isOnline; }
export function lastSyncAt(): string | null { return _lastSyncAt; }
export function pendingCount(): number { return _pendingCount; }

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}

/** Check internet reachability by hitting the sync-bundle endpoint */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/events/${EVENT_ID}/sync-bundle`);
    _isOnline = res.ok;
    return _isOnline;
  } catch {
    _isOnline = false;
    return false;
  }
}

/** Download and cache sync-bundle from ScrutMan */
export async function downloadBundle(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/events/${EVENT_ID}/sync-bundle`);
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt}` };
    }

    const bundle = await res.json();

    // Store approved tires
    const approvedRows: ApprovedTireRow[] = (bundle.approvedTires ?? []).map((t: any) => ({
      id: t.id,
      manufacturer: t.manufacturer,
      model: t.model,
      size: t.size,
      compound: t.compound ?? null,
      fiaManufacturerCode: t.fiaManufacturerCode ?? null,
      rfidChipModel: t.rfidChipModel ?? null,
      barcodeSupplier: t.barcodeSupplier ?? null,
      disciplinesJson: JSON.stringify(t.disciplines ?? []),
    }));
    upsertApprovedTires(approvedRows);

    // Replace event tires
    clearEventTires();
    const eventRows: EventTireRow[] = (bundle.eventTireRegistrations ?? []).map((etr: any) => ({
      tireId: etr.tireId,
      rfidEpc: etr.tire?.rfidEpc?.toUpperCase() ?? null,
      barcodeNumber: etr.tire?.barcodeNumber ?? null,
      serialNumber: etr.tire?.serialNumber ?? null,
      discipline: etr.tire?.discipline ?? "",
      isNewForOwner: etr.tire?.isNewForOwner ? 1 : 0,
      status: etr.tire?.status ?? "ACTIVE",
      approvedTireId: etr.tire?.approvedTire?.id ?? "",
      manufacturer: etr.tire?.approvedTire?.manufacturer ?? "",
      model: etr.tire?.approvedTire?.model ?? "",
      size: etr.tire?.approvedTire?.size ?? "",
      compound: etr.tire?.approvedTire?.compound ?? null,
      fiaManCode: etr.tire?.approvedTire?.fiaManufacturerCode ?? null,
      ownerId: etr.tire?.currentOwner?.id ?? "",
      ownerName: etr.tire?.currentOwner?.name ?? null,
      ownerEmail: etr.tire?.currentOwner?.email ?? "",
      registrationId: etr.registrationId ?? "",
    }));
    upsertEventTires(eventRows);

    _lastSyncAt = new Date().toISOString();
    setSyncMeta("lastBundleSync", _lastSyncAt);
    setSyncMeta("eventId", EVENT_ID);
    setSyncMeta("bundleGeneratedAt", bundle.generatedAt ?? "");
    setSyncMeta("registeredTiresCount", String(bundle.stats?.registeredTiresCount ?? 0));

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

/** Upload queued offline scans to ScrutMan */
export async function uploadPendingScans(): Promise<{ uploaded: number; failed: number }> {
  const pending = getPendingSyncs(500);
  _pendingCount = pending.length;

  if (pending.length === 0) return { uploaded: 0, failed: 0 };

  const payload = pending.map((r) => ({
    localId: r.localId,
    scanMode: r.scanMode,
    identifier: r.identifier,
    outcome: r.outcome,
    reason: r.reason,
    tireId: r.tireId,
    registrationId: r.registrationId,
    scannedAt: r.scannedAt,
    nodeId: NODE_ID,
    nodeName: NODE_NAME,
  }));

  try {
    const res = await apiFetch(`/api/events/${EVENT_ID}/scan-results`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`[sync] Upload failed: HTTP ${res.status} — ${txt}`);
      return { uploaded: 0, failed: pending.length };
    }

    const result = await res.json();
    const accepted: string[] = result.accepted > 0
      ? pending.slice(0, result.accepted).map((r) => r.localId)
      : [];
    markSynced(accepted);
    _pendingCount = pending.length - accepted.length;
    return { uploaded: accepted.length, failed: pending.length - accepted.length };
  } catch (err: any) {
    // Mark error on all — will retry next cycle
    for (const r of pending) markSyncError(r.localId, err?.message ?? "network error");
    return { uploaded: 0, failed: pending.length };
  }
}

/** Full sync cycle: bundle + pending uploads */
export async function syncCycle(): Promise<void> {
  const online = await checkConnectivity();
  if (!online) {
    console.log("[sync] Offline — hopper over synkronisering");
    return;
  }

  console.log("[sync] Online — starter synkronisering...");

  // Upload pending first (most time-sensitive)
  const uploadResult = await uploadPendingScans();
  if (uploadResult.uploaded > 0 || uploadResult.failed > 0) {
    console.log(`[sync] Lastet opp ${uploadResult.uploaded} skanninger (${uploadResult.failed} feilet)`);
  }

  // Then refresh bundle
  const bundleResult = await downloadBundle();
  if (bundleResult.ok) {
    console.log(`[sync] Bundle oppdatert — ${_lastSyncAt}`);
  } else {
    console.error(`[sync] Bundle feil: ${bundleResult.error}`);
  }
}

/** Restore state from DB on startup */
export function restoreFromCache(): void {
  _lastSyncAt = getSyncMeta("lastBundleSync") ?? null;
  const pending = getPendingSyncs(1);
  _pendingCount = pending.length;
  if (_lastSyncAt) {
    console.log(`[sync] Gjenopprettet fra cache — sist synk: ${_lastSyncAt}`);
  }
}
