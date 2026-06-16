import ReactPDF, { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { createElement as h } from "react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/ScrutMan-Skjermbilder.pdf");

// ── Data ──────────────────────────────────────────────────────────────────────

const screens = [
  // Offentlig
  { id: 1,  role: "OFFENTLIG",      name: "Forside",                     url: "/",                                          desc: "Søk etter arrangement, liste over kommende stevner" },
  { id: 2,  role: "OFFENTLIG",      name: "Arrangementsside",             url: "/events/[id]",                               desc: "Info om stevnet, klubb, klasser, lenke til påmelding" },
  { id: 3,  role: "OFFENTLIG",      name: "Påmelding",                    url: "/events/[id]/register",                      desc: "Velg klasse, kjøretøy, send påmelding" },
  { id: 4,  role: "OFFENTLIG",      name: "Logg inn",                     url: "/login",                                     desc: "E-post + passord" },
  { id: 5,  role: "OFFENTLIG",      name: "Registrer konto",              url: "/register",                                  desc: "Opprett ny brukerkonto" },
  // Fører
  { id: 6,  role: "FØRER",          name: "Min profil",                   url: "/profile",                                   desc: "Navn, lisensnummer, personinfo, mine påmeldinger" },
  { id: 7,  role: "FØRER",          name: "Mine kjøretøy",                url: "/profile/vehicles",                          desc: "Legg til / rediger kjøretøy" },
  { id: 8,  role: "FØRER",          name: "Fører-dashboard",              url: "/athlete/dashboard",                         desc: "Oversikt over mine stevner og status" },
  { id: 9,  role: "FØRER",          name: "Mine dekk",                    url: "/athlete/dashboard/tires",                   desc: "Tabell med egne dekk, RFID, godkjenningsstatus, historikk" },
  // Innsjekk
  { id: 10, role: "INNSJEKK",       name: "Innsjekk — velg stevne",       url: "/dashboard/checkin",                         desc: "Liste over aktive stevner" },
  { id: 11, role: "INNSJEKK",       name: "Innsjekk — stevne",            url: "/dashboard/checkin/[id]",                    desc: "Sjekk inn deltakere, sanntidsliste, status per fører" },
  // Teknisk
  { id: 12, role: "TEKNISK",        name: "Teknisk kontroll",             url: "/dashboard/technical",                       desc: "Oversikt over biler til kontroll, status, merknader" },
  // Vektkontroll
  { id: 13, role: "VEKTKONTROLL",   name: "Vekt — velg stevne",           url: "/dashboard/weight-control",                  desc: "Liste over stevner" },
  { id: 14, role: "VEKTKONTROLL",   name: "Vektmåling",                   url: "/dashboard/weight-control/[id]",             desc: "Registrer vekt per bil, status grønn/rød" },
  { id: 15, role: "VEKTKONTROLL",   name: "Vektliste",                    url: "/dashboard/weight-control/[id]/list",        desc: "Liveoversikt alle målinger, CSV-eksport" },
  { id: 16, role: "VEKTKONTROLL",   name: "Vektrapporter",                url: "/dashboard/weight-control/[id]/reports",     desc: "Rapporter, PDF-nedlasting" },
  // Dekk-portal
  { id: 17, role: "DEKK-PORTAL",    name: "Tyre Scan Portal",             url: "/dashboard/tyre-scan-demo",                  desc: "Startnummer → arm system → 4 hjul skannes → grønn/rød lampe" },
  { id: 18, role: "DEKK-PORTAL",    name: "RFID-skanning (event)",        url: "/dashboard/events/[id]/rfid-scan",           desc: "Manuell RFID-skanning knyttet til stevne" },
  { id: 19, role: "DEKK-PORTAL",    name: "Dekk-rapport",                 url: "/dashboard/events/[id]/tyre-report",         desc: "Tabell per heat, PDF-nedlasting, incident-rapport" },
  { id: 20, role: "DEKK-PORTAL",    name: "Dekk (event)",                 url: "/dashboard/events/[id]/tires",               desc: "Alle dekk registrert for stevnet" },
  // Klubbadmin
  { id: 21, role: "KLUBBADMIN",     name: "Klubb-dashboard",              url: "/dashboard/club-admin",                      desc: "Oversikt over klubbens stevner, brukere og innstillinger" },
  { id: 22, role: "KLUBBADMIN",     name: "Arrangementer",                url: "/dashboard/events",                          desc: "Opprett og administrer stevner" },
  { id: 23, role: "KLUBBADMIN",     name: "Arrangement — klasser",        url: "/dashboard/events/[id]/classes",             desc: "Klasser og underdisipliner for stevnet" },
  { id: 24, role: "KLUBBADMIN",     name: "Påmeldinger",                  url: "/dashboard/events/[id]/registrations",       desc: "Godkjenn/avslå påmeldinger, endre status" },
  { id: 25, role: "KLUBBADMIN",     name: "Startliste",                   url: "/dashboard/events/[id]/startliste",          desc: "Generer og eksporter startliste" },
  { id: 26, role: "KLUBBADMIN",     name: "Vektgrenser",                  url: "/dashboard/events/[id]/weight-limits",       desc: "Sett vektgrenser per klasse for stevnet" },
  { id: 27, role: "KLUBBADMIN",     name: "Brukere",                      url: "/dashboard/users",                           desc: "Liste over klubbens brukere" },
  { id: 28, role: "KLUBBADMIN",     name: "Ny bruker",                    url: "/dashboard/users/new",                       desc: "Opprett bruker (admin, teknisk, vekt osv.)" },
  { id: 29, role: "KLUBBADMIN",     name: "Brukerdetalj",                 url: "/dashboard/users/[id]",                      desc: "Rediger bruker, endre rolle" },
  { id: 30, role: "KLUBBADMIN",     name: "Klubboversikt",                url: "/dashboard/clubs",                           desc: "Oversikt over klubber" },
  { id: 31, role: "KLUBBADMIN",     name: "Klubbdetalj",                  url: "/dashboard/clubs/[id]",                      desc: "Rediger klubbinfo" },
  { id: 32, role: "KLUBBADMIN",     name: "Klubbadministratorer",         url: "/dashboard/clubs/[id]/admins",               desc: "Hvem som er admin for klubben" },
  { id: 33, role: "KLUBBADMIN",     name: "Klasser",                      url: "/dashboard/clubs/classes",                   desc: "Administrer klasser på tvers" },
  // Forbund
  { id: 34, role: "FORBUNDSADMIN",  name: "Forbund-dashboard",            url: "/dashboard/federation",                      desc: "Statistikk, arrangementsoversikt, navigasjon" },
  { id: 35, role: "FORBUNDSADMIN",  name: "Godkjente dekk",               url: "/dashboard/federation/approved-tires",       desc: "Liste og import (Excel/CSV) av godkjente dekkmodeller" },
  { id: 36, role: "FORBUNDSADMIN",  name: "Dekkgrenser",                  url: "/dashboard/federation/tire-limits",          desc: "Maks antall dekk per klasse/disiplin" },
  { id: 37, role: "FORBUNDSADMIN",  name: "Forbundsadmins",               url: "/dashboard/federation/admins",               desc: "Inviter og administrer forbundsadministratorer" },
  // FIA
  { id: 38, role: "FIA-DELEGAT",    name: "FIA-dashboard",                url: "/dashboard/fia",                             desc: "Statistikk, status alle stevner og klubber" },
  { id: 39, role: "FIA-DELEGAT",    name: "FIA — stevner",                url: "/dashboard/fia/events",                      desc: "Oversikt over alle stevner på tvers av klubber" },
  { id: 40, role: "FIA-DELEGAT",    name: "FIA — klubber",                url: "/dashboard/fia/clubs",                       desc: "Oversikt over alle klubber" },
  { id: 41, role: "FIA-DELEGAT",    name: "FIA — godkjente dekk",         url: "/dashboard/fia/approved-tires",              desc: "FIA-lista over godkjente dekkmodeller (rediger/legg til)" },
  { id: 42, role: "FIA-DELEGAT",    name: "FIA — dekkoverføring",         url: "/dashboard/fia/tyre-assignments",            desc: "Offisiell overføring av dekk til fører (med dokumentasjon)" },
  { id: 43, role: "FIA-DELEGAT",    name: "FIA — underdisipliner",        url: "/dashboard/fia/sub-disciplines",             desc: "Administrer underdisipliner (SuperBuggy, 1600cc osv.)" },
  { id: 44, role: "FIA-DELEGAT",    name: "FIA — RFID-skanning",          url: "/dashboard/fia/rfid-scan",                   desc: "Håndskannervisning: grønn/gul/rød per EPC-skann" },
  // Superadmin
  { id: 45, role: "SUPERADMIN",     name: "Superadmin-dashboard",         url: "/dashboard/superadmin",                      desc: "Systemstatus, statistikk, navigasjon" },
  { id: 46, role: "SUPERADMIN",     name: "Forbund",                      url: "/dashboard/superadmin/federations",          desc: "Opprett og administrer forbund" },
  { id: 47, role: "SUPERADMIN",     name: "FIA-delegater",                url: "/dashboard/superadmin/fia-delegates",        desc: "Inviter og administrer FIA-delegater" },
  { id: 48, role: "SUPERADMIN",     name: "Hoved-dashboard",              url: "/dashboard",                                 desc: "Felles inngangspunkt etter innlogging (ruter etter rolle)" },
];

const roleColors = {
  "OFFENTLIG":     "#1e40af",
  "FØRER":         "#15803d",
  "INNSJEKK":      "#0369a1",
  "TEKNISK":       "#b45309",
  "VEKTKONTROLL":  "#7c3aed",
  "DEKK-PORTAL":   "#0f766e",
  "KLUBBADMIN":    "#be185d",
  "FORBUNDSADMIN": "#9a3412",
  "FIA-DELEGAT":   "#c2410c",
  "SUPERADMIN":    "#1f2937",
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  // Header strip
  headerStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 10,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.8,
  },
  screenNumber: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "Helvetica",
    marginRight: 6,
  },
  screenName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    flex: 1,
  },
  url: {
    fontSize: 9,
    color: "#64748b",
    fontFamily: "Helvetica-Oblique",
    marginTop: 2,
    marginBottom: 8,
  },
  desc: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 10,
    lineHeight: 1.5,
  },
  // Main sketch area
  sketchOuter: {
    flex: 1,
    border: "1pt solid #cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
  },
  // Simulated browser/app chrome
  chrome: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 3,
  },
  urlBar: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 4,
  },
  urlBarText: {
    fontSize: 8,
    color: "#64748b",
    fontFamily: "Helvetica",
  },
  // Canvas area
  canvas: {
    flex: 1,
    padding: 12,
  },
  // Dot grid
  gridRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  dot2: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#cbd5e1",
    marginRight: 14,
  },
  // Notes section at bottom
  notesSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    flexDirection: "row",
    gap: 12,
  },
  notesBox: {
    flex: 1,
  },
  notesLabel: {
    fontSize: 7,
    color: "#94a3b8",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  notesLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 10,
  },
  // Footer
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#cbd5e1",
    fontFamily: "Helvetica",
  },
});

// Generate dot grid rows
function DotGrid({ rows = 20, cols = 48 }) {
  return h(View, { style: styles.canvas },
    Array.from({ length: rows }, (_, r) =>
      h(View, { key: r, style: styles.gridRow },
        Array.from({ length: cols }, (_, c) =>
          h(View, { key: c, style: styles.dot2 })
        )
      )
    )
  );
}

function ScreenPage({ screen }) {
  const color = roleColors[screen.role] ?? "#1e293b";
  return h(Page, { size: "A4", orientation: "landscape", style: styles.page },

    // Header
    h(View, { style: styles.headerStrip },
      h(View, { style: { ...styles.badge, backgroundColor: color } },
        h(Text, { style: styles.badgeText }, screen.role)
      ),
      h(Text, { style: styles.screenNumber }, `#${screen.id} / 48`),
      h(Text, { style: styles.screenName }, screen.name),
    ),

    // URL + description
    h(Text, { style: styles.url }, screen.url),
    h(Text, { style: styles.desc }, screen.desc),

    // Sketch area
    h(View, { style: styles.sketchOuter },
      // Browser chrome
      h(View, { style: styles.chrome },
        h(View, { style: { ...styles.dot, backgroundColor: "#f87171" } }),
        h(View, { style: { ...styles.dot, backgroundColor: "#fbbf24" } }),
        h(View, { style: { ...styles.dot, backgroundColor: "#4ade80" } }),
        h(View, { style: styles.urlBar },
          h(Text, { style: styles.urlBarText }, `scrutman.no${screen.url}`)
        )
      ),
      // Dot grid canvas
      h(DotGrid, { rows: 19, cols: 58 }),
    ),

    // Notes
    h(View, { style: styles.notesSection },
      h(View, { style: styles.notesBox },
        h(Text, { style: styles.notesLabel }, "Innhold / elementer"),
        h(View, { style: styles.notesLine }),
        h(View, { style: styles.notesLine }),
        h(View, { style: styles.notesLine }),
      ),
      h(View, { style: styles.notesBox },
        h(Text, { style: styles.notesLabel }, "Handlinger / knapper"),
        h(View, { style: styles.notesLine }),
        h(View, { style: styles.notesLine }),
        h(View, { style: styles.notesLine }),
      ),
      h(View, { style: styles.notesBox },
        h(Text, { style: styles.notesLabel }, "Tilgang / rolle"),
        h(View, { style: styles.notesLine }),
        h(View, { style: styles.notesLine }),
        h(View, { style: styles.notesLine }),
      ),
    ),

    // Footer
    h(View, { style: styles.footer },
      h(Text, { style: styles.footerText }, `ScrutMan · Skjermbilder · Juni 2026`),
      h(Text, { style: styles.footerText }, `${screen.id} / 48`),
    )
  );
}

// Cover page
function CoverPage() {
  const roleList = [
    ["OFFENTLIG", 5, "#1e40af"],
    ["FØRER", 4, "#15803d"],
    ["INNSJEKK", 2, "#0369a1"],
    ["TEKNISK", 1, "#b45309"],
    ["VEKTKONTROLL", 4, "#7c3aed"],
    ["DEKK-PORTAL", 4, "#0f766e"],
    ["KLUBBADMIN", 13, "#be185d"],
    ["FORBUNDSADMIN", 4, "#9a3412"],
    ["FIA-DELEGAT", 7, "#c2410c"],
    ["SUPERADMIN", 4, "#1f2937"],
  ];
  return h(Page, { size: "A4", orientation: "landscape", style: { ...styles.page, justifyContent: "center", alignItems: "center" } },
    h(View, { style: { alignItems: "center", marginBottom: 32 } },
      h(Text, { style: { fontSize: 40, fontFamily: "Helvetica-Bold", color: "#1e293b", marginBottom: 8 } }, "ScrutMan"),
      h(Text, { style: { fontSize: 18, color: "#64748b", marginBottom: 4 } }, "Skjermbilder — Wireframe-hefte"),
      h(Text, { style: { fontSize: 11, color: "#94a3b8" } }, "48 skjermbilder · Juni 2026"),
    ),
    h(View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600 } },
      ...roleList.map(([role, count, color]) =>
        h(View, { key: role, style: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 6, padding: 8, minWidth: 160 } },
          h(View, { style: { width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 8 } }),
          h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1e293b", flex: 1 } }, role),
          h(Text, { style: { fontSize: 9, color: "#64748b" } }, `${count} sider`),
        )
      )
    ),
    h(Text, { style: { position: "absolute", bottom: 24, fontSize: 8, color: "#cbd5e1" } }, "Skriv ut og tegn på hvert ark — ett skjermbrilde per side")
  );
}

const docElement = h(Document, null,
  h(CoverPage),
  ...screens.map(s => h(ScreenPage, { key: s.id, screen: s }))
);

await ReactPDF.render(docElement, OUT);
console.log(`✅  PDF generert: ${OUT}`);
