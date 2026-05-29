import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ── Types (mirror the API response) ──────────────────────────────────────────

export interface WheelResult {
  pos: string;
  label: string;
  outcome: "GREEN" | "RED";
  resultLabel: string;
  detail: string;
  rfidEpc: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
}

export interface ScanSession {
  id: string;
  startNumber: string;
  driverName: string;
  vehicleName: string | null;
  subDiscipline: string | null;
  heat: string;
  overallResult: "PASS" | "FAIL";
  wheelResults: string;
  notes: string | null;
  scannedBy: { name: string | null; email: string };
  createdAt: string;
  registration: {
    user: { name: string | null; licenseNumber: string | null };
    class: { name: string } | null;
    userVehicle: { make: string; model: string; startNumber: string } | null;
  } | null;
}

export interface EventInfo {
  id: string;
  title: string;
  startDate: string;
  location: string | null;
  club: { name: string } | null;
}

export interface TyreReportPdfProps {
  event: EventInfo;
  sessions: ScanSession[];
  heats: string[];
  generatedAt?: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const C = {
  primary: "#1d4ed8",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#86efac",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fca5a5",
  amber: "#d97706",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray600: "#4b5563",
  gray700: "#374151",
  gray900: "#111827",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.gray900,
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 36,
    backgroundColor: C.white,
  },

  // ── Header ──
  headerBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingBottom: 10,
    marginBottom: 14,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.primary },
  headerSub: { fontSize: 9, color: C.gray600, marginTop: 2 },
  headerMeta: { fontSize: 8, color: C.gray600, marginTop: 1 },
  headerRight: { alignItems: "flex-end" },
  headerBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  generatedAt: { fontSize: 7, color: C.gray400, marginTop: 4 },

  // ── Summary boxes ──
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryBox: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  summaryNum: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  summaryLabel: { fontSize: 8, marginTop: 2 },

  // ── Heat section header ──
  heatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
    marginTop: 10,
  },
  heatHeaderText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  heatStats: { marginLeft: "auto", fontSize: 8, color: "#bfdbfe" },

  // ── Summary table ──
  table: { borderWidth: 1, borderColor: C.gray200, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.gray100,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.gray600, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  tableRowFail: { backgroundColor: C.redBg },
  tableCell: { fontSize: 8, color: C.gray700 },
  tableCellBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gray900 },

  // ── Session card ──
  sessionCard: {
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 5,
    marginBottom: 8,
    overflow: "hidden",
  },
  sessionCardFail: { borderColor: C.redBorder },
  sessionCardHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  sessionCardHeadPass: { backgroundColor: C.greenBg },
  sessionCardHeadFail: { backgroundColor: C.redBg },
  sessionNum: { fontSize: 14, fontFamily: "Helvetica-Bold", marginRight: 8, width: 30 },
  sessionNumPass: { color: C.green },
  sessionNumFail: { color: C.red },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  sessionMeta: { fontSize: 7, color: C.gray600, marginTop: 1 },
  sessionBadgeRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  heatBadge: {
    fontSize: 7,
    color: C.primary,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  resultBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  resultBadgePass: { backgroundColor: C.greenBg, color: C.green },
  resultBadgeFail: { backgroundColor: C.redBg, color: C.red },
  lamp: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
    flexShrink: 0,
  },
  lampGreen: { backgroundColor: C.green },
  lampRed: { backgroundColor: C.red },

  // ── Wheel grid ──
  wheelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    padding: 8,
  },
  wheelCell: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  wheelCellPass: { backgroundColor: C.greenBg, borderColor: C.greenBorder },
  wheelCellFail: { backgroundColor: C.redBg, borderColor: C.redBorder },
  wheelPos: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.gray600, textTransform: "uppercase", marginBottom: 1 },
  wheelResult: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  wheelResultPass: { color: C.green },
  wheelResultFail: { color: C.red },
  wheelDetail: { fontSize: 7, color: C.red, marginTop: 1 },
  wheelTyre: { fontSize: 7, color: C.gray600, marginTop: 1 },
  wheelRfid: { fontSize: 6, color: C.gray400, fontFamily: "Helvetica-Oblique", marginTop: 1 },
  sessionNote: { fontSize: 7, color: C.gray600, fontFamily: "Helvetica-Oblique", paddingHorizontal: 8, paddingBottom: 5 },
  sessionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 5,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
  },
  sessionFooterText: { fontSize: 7, color: C.gray400 },

  // ── Signature block ──
  sigRow: { flexDirection: "row", gap: 20, marginTop: 24 },
  sigBox: { flex: 1, alignItems: "center" },
  sigLine: { borderBottomWidth: 1, borderBottomColor: C.gray400, width: "100%", marginBottom: 4 },
  sigLabel: { fontSize: 7, color: C.gray600, textAlign: "center" },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.gray400 },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.gray900,
    marginBottom: 5,
    marginTop: 12,
  },
  sectionTitleFail: { color: C.red },
  sectionTitlePass: { color: C.green },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
}

function parseWheels(raw: string): WheelResult[] {
  try { return JSON.parse(raw); } catch { return []; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: ScanSession }) {
  const pass = session.overallResult === "PASS";
  const wheels = parseWheels(session.wheelResults);
  const classLabel = session.subDiscipline ?? session.registration?.class?.name ?? "";

  return (
    <View style={pass ? s.sessionCard : [s.sessionCard, s.sessionCardFail]} wrap={false}>
      {/* Header row */}
      <View style={[s.sessionCardHead, pass ? s.sessionCardHeadPass : s.sessionCardHeadFail]}>
        <Text style={[s.sessionNum, pass ? s.sessionNumPass : s.sessionNumFail]}>
          #{session.startNumber}
        </Text>
        <View style={s.sessionInfo}>
          <Text style={s.sessionName}>{session.driverName}</Text>
          <Text style={s.sessionMeta}>
            {[classLabel, session.vehicleName].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={s.sessionBadgeRow}>
          <Text style={s.heatBadge}>Heat {session.heat}</Text>
          <Text style={[s.resultBadge, pass ? s.resultBadgePass : s.resultBadgeFail]}>
            {pass ? "PASS" : "FAIL"}
          </Text>
        </View>
      </View>

      {/* 4 wheel cells */}
      <View style={s.wheelGrid}>
        {wheels.map((w) => (
          <View key={w.pos} style={[s.wheelCell, w.outcome === "GREEN" ? s.wheelCellPass : s.wheelCellFail]}>
            <View style={[s.lamp, w.outcome === "GREEN" ? s.lampGreen : s.lampRed]} />
            <View style={{ flex: 1 }}>
              <Text style={s.wheelPos}>{w.label}</Text>
              <Text style={[s.wheelResult, w.outcome === "GREEN" ? s.wheelResultPass : s.wheelResultFail]}>
                {w.resultLabel}
              </Text>
              {w.outcome === "RED" && w.detail && (
                <Text style={s.wheelDetail}>{w.detail}</Text>
              )}
              {w.manufacturer && (
                <Text style={s.wheelTyre}>{w.manufacturer} {w.model}{w.serialNumber ? ` · ${w.serialNumber}` : ""}</Text>
              )}
              {w.rfidEpc && (
                <Text style={s.wheelRfid}>{w.rfidEpc.slice(0, 18)}…</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Note */}
      {session.notes && (
        <Text style={s.sessionNote}>Note: {session.notes}</Text>
      )}

      {/* Footer */}
      <View style={s.sessionFooter}>
        <Text style={s.sessionFooterText}>Scanned by: {session.scannedBy.name ?? session.scannedBy.email}</Text>
        <Text style={s.sessionFooterText}>{fmtTime(session.createdAt)}</Text>
      </View>
    </View>
  );
}

function HeatSummaryTable({ sessions }: { sessions: ScanSession[] }) {
  const COL = { num: "6%", driver: "22%", cls: "16%", vehicle: "20%", result: "10%", by: "18%", time: "8%" };
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { width: COL.num }]}>#</Text>
        <Text style={[s.tableHeaderCell, { width: COL.driver }]}>Driver</Text>
        <Text style={[s.tableHeaderCell, { width: COL.cls }]}>Class</Text>
        <Text style={[s.tableHeaderCell, { width: COL.vehicle }]}>Vehicle</Text>
        <Text style={[s.tableHeaderCell, { width: COL.result }]}>Result</Text>
        <Text style={[s.tableHeaderCell, { width: COL.by }]}>Scanned by</Text>
        <Text style={[s.tableHeaderCell, { width: COL.time }]}>Time</Text>
      </View>
      {sessions.map((s_) => {
        const pass = s_.overallResult === "PASS";
        return (
          <View key={s_.id} style={pass ? s.tableRow : [s.tableRow, s.tableRowFail]}>
            <Text style={[s.tableCellBold, { width: COL.num }]}>{s_.startNumber}</Text>
            <Text style={[s.tableCell, { width: COL.driver }]}>{s_.driverName}</Text>
            <Text style={[s.tableCell, { width: COL.cls }]}>{s_.subDiscipline ?? s_.registration?.class?.name ?? "—"}</Text>
            <Text style={[s.tableCell, { width: COL.vehicle }]}>{s_.vehicleName ?? "—"}</Text>
            <Text style={[s.tableCell, { width: COL.result, color: pass ? C.green : C.red, fontFamily: "Helvetica-Bold" }]}>
              {s_.overallResult}
            </Text>
            <Text style={[s.tableCell, { width: COL.by }]}>{s_.scannedBy.name ?? s_.scannedBy.email}</Text>
            <Text style={[s.tableCell, { width: COL.time }]}>{fmtTime(s_.createdAt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main PDF Document ─────────────────────────────────────────────────────────

export function TyreReportPdf({ event, sessions, heats, generatedAt }: TyreReportPdfProps) {
  const total = sessions.length;
  const passed = sessions.filter((s) => s.overallResult === "PASS").length;
  const failed = sessions.filter((s) => s.overallResult === "FAIL").length;
  const failedSessions = sessions.filter((s) => s.overallResult === "FAIL");
  const passedSessions = sessions.filter((s) => s.overallResult === "PASS");

  const sessionsByHeat = heats.reduce<Record<string, ScanSession[]>>((acc, h) => {
    acc[h] = sessions.filter((s) => s.heat === h);
    return acc;
  }, {});

  return (
    <Document
      title={`Tyre Inspection Report — ${event.title}`}
      author="ScrutMan FIA LT54 Tyre Management"
      subject="Official Tyre Inspection Report"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerBox} fixed>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Tyre Inspection Report</Text>
            <Text style={s.headerSub}>FIA LT54 Tyre Verification — Official Record</Text>
            <Text style={s.headerMeta}>{event.title}</Text>
            <Text style={s.headerMeta}>
              {fmtDate(event.startDate)}
              {event.location ? `  ·  ${event.location}` : ""}
              {event.club ? `  ·  ${event.club.name}` : ""}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerBadge}>OFFICIAL DOCUMENT</Text>
            <Text style={s.generatedAt}>
              Generated: {generatedAt ?? new Date().toLocaleString("en")}
            </Text>
          </View>
        </View>

        {/* ── Summary stats ── */}
        <View style={s.summaryRow}>
          <View style={[s.summaryBox, { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" }]}>
            <Text style={[s.summaryNum, { color: C.primary }]}>{total}</Text>
            <Text style={[s.summaryLabel, { color: C.primary }]}>Cars Inspected</Text>
          </View>
          <View style={[s.summaryBox, { borderColor: C.greenBorder, backgroundColor: C.greenBg }]}>
            <Text style={[s.summaryNum, { color: C.green }]}>{passed}</Text>
            <Text style={[s.summaryLabel, { color: C.green }]}>Passed ✓</Text>
          </View>
          <View style={[s.summaryBox, {
            borderColor: failed > 0 ? C.redBorder : C.gray200,
            backgroundColor: failed > 0 ? C.redBg : C.gray100,
          }]}>
            <Text style={[s.summaryNum, { color: failed > 0 ? C.red : C.gray400 }]}>{failed}</Text>
            <Text style={[s.summaryLabel, { color: failed > 0 ? C.red : C.gray400 }]}>
              {failed > 0 ? "Failed ✗" : "No Failures"}
            </Text>
          </View>
          <View style={[s.summaryBox, { borderColor: "#fde68a", backgroundColor: "#fffbeb" }]}>
            <Text style={[s.summaryNum, { color: C.amber }]}>{heats.length || 1}</Text>
            <Text style={[s.summaryLabel, { color: C.amber }]}>Heats</Text>
          </View>
        </View>

        {/* ── Failed section ── */}
        {failedSessions.length > 0 && (
          <>
            <Text style={[s.sectionTitle, s.sectionTitleFail]}>
              Failed Inspections ({failedSessions.length})
            </Text>
            {failedSessions.map((sess) => (
              <SessionCard key={sess.id} session={sess} />
            ))}
          </>
        )}

        {/* ── Passed section ── */}
        {passedSessions.length > 0 && (
          <>
            <Text style={[s.sectionTitle, s.sectionTitlePass]}>
              Passed Inspections ({passedSessions.length})
            </Text>
            {passedSessions.map((sess) => (
              <SessionCard key={sess.id} session={sess} />
            ))}
          </>
        )}

        {/* ── Per-heat summary tables ── */}
        {heats.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Event Summary by Heat</Text>
            {heats.map((h) => {
              const hs = sessionsByHeat[h] ?? [];
              const hp = hs.filter((s) => s.overallResult === "PASS").length;
              const hf = hs.filter((s) => s.overallResult === "FAIL").length;
              return (
                <View key={h}>
                  <View style={s.heatHeader}>
                    <Text style={s.heatHeaderText}>Heat {h}</Text>
                    <Text style={s.heatStats}>
                      {hs.length} cars · {hp} pass · {hf} fail
                    </Text>
                  </View>
                  <HeatSummaryTable sessions={hs} />
                </View>
              );
            })}
          </>
        )}

        {/* ── Signatures ── */}
        <View style={s.sigRow} wrap={false}>
          {["Technical Inspector", "FIA Delegate", "Event Director"].map((role) => (
            <View key={role} style={s.sigBox}>
              <Text style={{ fontSize: 7, color: C.gray400, marginBottom: 30 }}>Name: _______________</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{role}</Text>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>ScrutMan — FIA LT54 Tyre Management System</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          <Text style={s.footerText}>{event.title}</Text>
        </View>

      </Page>
    </Document>
  );
}
