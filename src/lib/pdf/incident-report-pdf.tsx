import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { WheelResult, ScanSession, EventInfo } from "./tyre-report-pdf";

// ── Styles ────────────────────────────────────────────────────────────────────

const C = {
  red:       "#dc2626",
  redBg:     "#fef2f2",
  redBorder: "#fca5a5",
  green:     "#16a34a",
  greenBg:   "#f0fdf4",
  greenBdr:  "#86efac",
  amber:     "#d97706",
  primary:   "#1d4ed8",
  gray50:    "#f9fafb",
  gray100:   "#f3f4f6",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray600:   "#4b5563",
  gray700:   "#374151",
  gray900:   "#111827",
  white:     "#ffffff",
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

  // ── INCIDENT banner ──
  incidentBanner: {
    backgroundColor: C.red,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  bannerLeft: {},
  bannerTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.white },
  bannerSub:   { fontSize: 8,  color: "#fecaca", marginTop: 2 },
  bannerRight: { alignItems: "flex-end" },
  bannerCase:  { fontSize: 7,  color: "#fecaca" },
  bannerDate:  { fontSize: 7,  color: "#fecaca", marginTop: 2 },

  // ── Info row ──
  infoRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  infoBox: {
    flex: 1, borderWidth: 1, borderColor: C.gray200,
    borderRadius: 5, padding: 8, backgroundColor: C.gray50,
  },
  infoLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.gray400, textTransform: "uppercase", marginBottom: 3 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.gray900 },
  infoSub:   { fontSize: 8, color: C.gray600, marginTop: 1 },

  // ── Driver box ──
  driverBox: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: C.redBorder,
    borderRadius: 6,
    backgroundColor: C.redBg,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  startNum: {
    width: 48, height: 48,
    borderRadius: 6,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  startNumText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.white },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.red },
  driverMeta: { fontSize: 8,  color: C.gray700, marginTop: 2 },
  driverLicense: { fontSize: 7, color: C.gray400, marginTop: 3, fontFamily: "Helvetica-Oblique" },
  resultBadge: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultFail: { backgroundColor: C.red },
  resultText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.white },

  // ── Section title ──
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.gray600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
    marginTop: 10,
  },

  // ── Wheel grid ──
  wheelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  wheelCell: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  wheelPass: { backgroundColor: C.greenBg,  borderColor: C.greenBdr },
  wheelFail: { backgroundColor: C.redBg,    borderColor: C.redBorder },
  dot:   { width: 10, height: 10, borderRadius: 5, marginTop: 1, flexShrink: 0 },
  dotGreen: { backgroundColor: C.green },
  dotRed:   { backgroundColor: C.red },
  wheelPos:    { fontSize: 7,  fontFamily: "Helvetica-Bold", color: C.gray400, textTransform: "uppercase", marginBottom: 1 },
  wheelStatus: { fontSize: 8,  fontFamily: "Helvetica-Bold" },
  wheelPass_:  { color: C.green },
  wheelFail_:  { color: C.red },
  wheelDetail: { fontSize: 7,  color: C.red, marginTop: 1 },
  wheelTyre:   { fontSize: 7,  color: C.gray600, marginTop: 1 },
  wheelRfid:   { fontSize: 6,  color: C.gray400, fontFamily: "Helvetica-Oblique", marginTop: 1 },

  // ── Failure summary ──
  failBox: {
    borderWidth: 1.5, borderColor: C.redBorder,
    borderRadius: 6, backgroundColor: C.redBg,
    padding: 10, marginBottom: 10,
  },
  failTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.red, marginBottom: 6 },
  failRow: { flexDirection: "row", gap: 8, marginBottom: 5 },
  failPos: {
    width: 28, fontSize: 7, fontFamily: "Helvetica-Bold",
    color: C.white, backgroundColor: C.red,
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2,
    textAlign: "center",
  },
  failDetail: { flex: 1, fontSize: 8, color: C.gray700 },

  // ── Notes ──
  notesBox: {
    borderWidth: 1, borderColor: C.gray200,
    borderRadius: 5, backgroundColor: C.gray50,
    padding: 8, marginBottom: 10,
  },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.gray400, textTransform: "uppercase", marginBottom: 4 },
  notesText:  { fontSize: 8, color: C.gray700, fontFamily: "Helvetica-Oblique" },

  // ── Regulation box ──
  regBox: {
    borderWidth: 1, borderColor: "#fde68a",
    borderRadius: 5, backgroundColor: "#fffbeb",
    padding: 8, marginBottom: 12,
  },
  regText: { fontSize: 7.5, color: C.amber },

  // ── Signature block ──
  sigSection: { marginTop: 16 },
  sigTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gray600, textTransform: "uppercase", marginBottom: 12 },
  sigRow: { flexDirection: "row", gap: 16 },
  sigBox: { flex: 1, alignItems: "center" },
  sigLine: { borderBottomWidth: 1, borderBottomColor: C.gray400, width: "100%", marginBottom: 4 },
  sigLabel: { fontSize: 7, color: C.gray600, textAlign: "center" },

  // ── Driver acknowledgement ──
  ackBox: {
    borderWidth: 1, borderColor: C.gray200,
    borderRadius: 5, padding: 8, marginTop: 10,
    backgroundColor: C.gray50,
  },
  ackTitle: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.gray600, textTransform: "uppercase", marginBottom: 5 },
  ackRow: { flexDirection: "row", gap: 20, marginTop: 4 },
  ackField: { flex: 1 },
  ackLine: { borderBottomWidth: 1, borderBottomColor: "#d1d5db", marginBottom: 3 },
  ackLabel: { fontSize: 6.5, color: C.gray400 },

  // ── Footer ──
  footer: {
    position: "absolute", bottom: 20, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: C.gray200,
    paddingTop: 5, flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: C.gray400 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseWheels(raw: string): WheelResult[] {
  try { return JSON.parse(raw); } catch { return []; }
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncidentReportPdf({
  session,
  event,
}: {
  session: ScanSession;
  event: EventInfo;
}) {
  const wheels = parseWheels(session.wheelResults);
  const failedWheels = wheels.filter((w) => w.outcome === "RED");
  const classLabel = session.subDiscipline ?? session.registration?.class?.name ?? "—";
  const licenseNum = session.registration?.user?.licenseNumber ?? "—";
  const shortId = session.id.slice(-8).toUpperCase();

  return (
    <Document
      title={`Incident Report — #${session.startNumber} ${session.driverName} — Heat ${session.heat}`}
      author="ScrutMan FIA LT54 Tyre Management"
      subject="Official Tyre Inspection Incident Report"
    >
      <Page size="A4" style={s.page}>

        {/* ── Incident banner ── */}
        <View style={s.incidentBanner}>
          <View style={s.bannerLeft}>
            <Text style={s.bannerTitle}>TYRE INSPECTION — INCIDENT REPORT</Text>
            <Text style={s.bannerSub}>FIA LT54 Tyre Verification · Official Document</Text>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.bannerCase}>Case ref: INC-{shortId}</Text>
            <Text style={s.bannerDate}>Generated: {fmtDateTime(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* ── Event + heat info ── */}
        <View style={s.infoRow}>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Event</Text>
            <Text style={s.infoValue}>{event.title}</Text>
            <Text style={s.infoSub}>{fmtDate(event.startDate)}{event.location ? `  ·  ${event.location}` : ""}</Text>
          </View>
          <View style={[s.infoBox, { flex: 0, width: 80 }]}>
            <Text style={s.infoLabel}>Heat</Text>
            <Text style={s.infoValue}>{session.heat}</Text>
          </View>
          <View style={[s.infoBox, { flex: 0, width: 120 }]}>
            <Text style={s.infoLabel}>Inspection time</Text>
            <Text style={s.infoValue}>{fmtDateTime(session.createdAt)}</Text>
          </View>
        </View>

        {/* ── Driver / vehicle block ── */}
        <View style={s.driverBox}>
          <View style={s.startNum}>
            <Text style={s.startNumText}>#{session.startNumber}</Text>
          </View>
          <View style={s.driverInfo}>
            <Text style={s.driverName}>{session.driverName}</Text>
            <Text style={s.driverMeta}>
              {classLabel}{session.vehicleName ? `  ·  ${session.vehicleName}` : ""}
            </Text>
            <Text style={s.driverLicense}>
              License: {licenseNum}
              {session.scannedBy.name ? `  ·  Inspector: ${session.scannedBy.name}` : ""}
              {event.club ? `  ·  Club: ${event.club.name}` : ""}
              {"\n"}Scan registered: {fmtDateTime(session.createdAt)}
            </Text>
          </View>
          <View style={[s.resultBadge, s.resultFail]}>
            <Text style={s.resultText}>FAIL</Text>
          </View>
        </View>

        {/* ── All 4 wheel results ── */}
        <Text style={s.sectionTitle}>Wheel-by-Wheel Scan Results</Text>
        <View style={s.wheelGrid}>
          {wheels.map((w) => (
            <View key={w.pos} style={[s.wheelCell, w.outcome === "GREEN" ? s.wheelPass : s.wheelFail]}>
              <View style={[s.dot, w.outcome === "GREEN" ? s.dotGreen : s.dotRed]} />
              <View style={{ flex: 1 }}>
                <Text style={s.wheelPos}>{w.label}</Text>
                <Text style={[s.wheelStatus, w.outcome === "GREEN" ? s.wheelPass_ : s.wheelFail_]}>
                  {w.outcome === "GREEN" ? "Identity confirmed" : w.resultLabel}
                </Text>
                {w.outcome === "RED" && w.detail ? (
                  <Text style={s.wheelDetail}>{w.detail}</Text>
                ) : null}
                {w.manufacturer ? (
                  <Text style={s.wheelTyre}>{w.manufacturer} {w.model}{w.serialNumber ? ` · ${w.serialNumber}` : ""}</Text>
                ) : null}
                {w.rfidEpc ? (
                  <Text style={s.wheelRfid}>EPC: {w.rfidEpc}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* ── Failure summary ── */}
        {failedWheels.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Failure Details ({failedWheels.length} wheel{failedWheels.length > 1 ? "s" : ""})</Text>
            <View style={s.failBox}>
              <Text style={s.failTitle}>The following wheel positions failed RFID identity verification:</Text>
              {failedWheels.map((w) => (
                <View key={w.pos} style={s.failRow}>
                  <Text style={s.failPos}>{w.pos}</Text>
                  <Text style={s.failDetail}>
                    {w.label}: {w.resultLabel}
                    {w.detail ? `\n${w.detail}` : ""}
                    {w.rfidEpc ? `\nRFID EPC read: ${w.rfidEpc}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Inspector notes ── */}
        <Text style={s.sectionTitle}>Inspector Notes</Text>
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>Observations / Actions taken</Text>
          <Text style={s.notesText}>{session.notes || "No notes recorded."}</Text>
        </View>

        {/* ── FIA regulation reference ── */}
        <View style={s.regBox}>
          <Text style={s.regText}>
            ⚠  Regulation reference: FIA LT54 — Tyre Barcodes and RFID Tags. Any tyre whose RFID EPC does not match
            the driver&apos;s registered tyre list must be immediately removed from the vehicle pending review by the
            Technical Delegate. The driver may not start until the matter is resolved.
          </Text>
        </View>

        {/* ── Signatures ── */}
        <View style={s.sigSection} wrap={false}>
          <Text style={s.sigTitle}>Official Signatures</Text>
          <View style={s.sigRow}>
            {["Technical Inspector", "FIA Delegate", "Race Director"].map((role) => (
              <View key={role} style={s.sigBox}>
                <Text style={{ fontSize: 7, color: C.gray400, marginBottom: 22 }}>Name: _______________</Text>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>{role} · Signature</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Driver acknowledgement ── */}
        <View style={s.ackBox} wrap={false}>
          <Text style={s.ackTitle}>Driver Acknowledgement</Text>
          <Text style={{ fontSize: 7.5, color: C.gray700, marginBottom: 8 }}>
            I, the undersigned driver (Start #{session.startNumber}), acknowledge receipt of this incident report
            and understand the nature of the infringement as described above.
          </Text>
          <View style={s.ackRow}>
            <View style={s.ackField}>
              <View style={s.ackLine} />
              <Text style={s.ackLabel}>Driver signature</Text>
            </View>
            <View style={[s.ackField, { flex: 0, width: 120 }]}>
              <View style={s.ackLine} />
              <Text style={s.ackLabel}>Date / Time</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>ScrutMan — FIA LT54 Tyre Management System</Text>
          <Text style={s.footerText}>CONFIDENTIAL — Official use only · Case ref: INC-{shortId}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
