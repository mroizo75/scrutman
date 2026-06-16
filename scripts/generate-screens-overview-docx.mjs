import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, convertInchesToTwip, TableLayoutType,
  VerticalAlign, HeadingLevel, PageOrientation,
} from "docx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/ScrutMan-Skjermbilder-Oversikt.docx");

const pt = (n) => n * 2;

// ── Role colours (match PDF) ──────────────────────────────────────────────────
const ROLES = {
  "OFFENTLIG":     { color: "1e40af", light: "EFF6FF", label: "🌐 Offentlig" },
  "FØRER":         { color: "15803d", light: "F0FDF4", label: "👤 Fører" },
  "INNSJEKK":      { color: "0369a1", light: "F0F9FF", label: "🏁 Innsjekk" },
  "TEKNISK":       { color: "b45309", light: "FFFBEB", label: "🔧 Teknisk kontroll" },
  "VEKTKONTROLL":  { color: "7c3aed", light: "F5F3FF", label: "⚖️ Vektkontroll" },
  "DEKK-PORTAL":   { color: "0f766e", light: "F0FDFA", label: "🚗 Dekk-portal" },
  "KLUBBADMIN":    { color: "be185d", light: "FDF2F8", label: "🏢 Klubbadmin" },
  "FORBUNDSADMIN": { color: "9a3412", light: "FFF7ED", label: "🏛️ Forbundsadmin" },
  "FIA-DELEGAT":   { color: "c2410c", light: "FFF7ED", label: "🔴 FIA-delegat" },
  "SUPERADMIN":    { color: "1f2937", light: "F8FAFC", label: "⚙️ Superadmin" },
};

const screens = [
  { id: 1,  role: "OFFENTLIG",     name: "Forside",                   url: "/",                                        desc: "Søk etter arrangement, liste over kommende stevner" },
  { id: 2,  role: "OFFENTLIG",     name: "Arrangementsside",          url: "/events/[id]",                             desc: "Info om stevnet, klubb, klasser, lenke til påmelding" },
  { id: 3,  role: "OFFENTLIG",     name: "Påmelding",                 url: "/events/[id]/register",                   desc: "Velg klasse, kjøretøy, send påmelding" },
  { id: 4,  role: "OFFENTLIG",     name: "Logg inn",                  url: "/login",                                   desc: "E-post + passord" },
  { id: 5,  role: "OFFENTLIG",     name: "Registrer konto",           url: "/register",                                desc: "Opprett ny brukerkonto" },
  { id: 6,  role: "FØRER",         name: "Min profil",                url: "/profile",                                 desc: "Navn, lisensnummer, personinfo, mine påmeldinger" },
  { id: 7,  role: "FØRER",         name: "Mine kjøretøy",             url: "/profile/vehicles",                       desc: "Legg til / rediger kjøretøy" },
  { id: 8,  role: "FØRER",         name: "Fører-dashboard",           url: "/athlete/dashboard",                      desc: "Oversikt over mine stevner og status" },
  { id: 9,  role: "FØRER",         name: "Mine dekk",                 url: "/athlete/dashboard/tires",                desc: "Tabell med egne dekk, RFID, godkjenningsstatus, historikk" },
  { id: 10, role: "INNSJEKK",      name: "Innsjekk — velg stevne",   url: "/dashboard/checkin",                       desc: "Liste over aktive stevner" },
  { id: 11, role: "INNSJEKK",      name: "Innsjekk — stevne",        url: "/dashboard/checkin/[id]",                  desc: "Sjekk inn deltakere, sanntidsliste, status per fører" },
  { id: 12, role: "TEKNISK",       name: "Teknisk kontroll",          url: "/dashboard/technical",                    desc: "Oversikt over biler til kontroll, status, merknader" },
  { id: 13, role: "VEKTKONTROLL",  name: "Vekt — velg stevne",       url: "/dashboard/weight-control",                desc: "Liste over stevner" },
  { id: 14, role: "VEKTKONTROLL",  name: "Vektmåling",               url: "/dashboard/weight-control/[id]",           desc: "Registrer vekt per bil, status grønn/rød" },
  { id: 15, role: "VEKTKONTROLL",  name: "Vektliste",                url: "/dashboard/weight-control/[id]/list",      desc: "Liveoversikt alle målinger, CSV-eksport" },
  { id: 16, role: "VEKTKONTROLL",  name: "Vektrapporter",            url: "/dashboard/weight-control/[id]/reports",   desc: "Rapporter, PDF-nedlasting" },
  { id: 17, role: "DEKK-PORTAL",   name: "Tyre Scan Portal",          url: "/dashboard/tyre-scan-demo",               desc: "Startnummer → arm system → 4 hjul skannes → grønn/rød lampe" },
  { id: 18, role: "DEKK-PORTAL",   name: "RFID-skanning (event)",     url: "/dashboard/events/[id]/rfid-scan",        desc: "Manuell RFID-skanning knyttet til stevne" },
  { id: 19, role: "DEKK-PORTAL",   name: "Dekk-rapport",              url: "/dashboard/events/[id]/tyre-report",      desc: "Tabell per heat, PDF-nedlasting, incident-rapport" },
  { id: 20, role: "DEKK-PORTAL",   name: "Dekk (event)",              url: "/dashboard/events/[id]/tires",            desc: "Alle dekk registrert for stevnet" },
  { id: 21, role: "KLUBBADMIN",    name: "Klubb-dashboard",           url: "/dashboard/club-admin",                   desc: "Oversikt over klubbens stevner, brukere og innstillinger" },
  { id: 22, role: "KLUBBADMIN",    name: "Arrangementer",             url: "/dashboard/events",                       desc: "Opprett og administrer stevner" },
  { id: 23, role: "KLUBBADMIN",    name: "Arrangement — klasser",    url: "/dashboard/events/[id]/classes",           desc: "Klasser og underdisipliner for stevnet" },
  { id: 24, role: "KLUBBADMIN",    name: "Påmeldinger",               url: "/dashboard/events/[id]/registrations",   desc: "Godkjenn/avslå påmeldinger, endre status" },
  { id: 25, role: "KLUBBADMIN",    name: "Startliste",                url: "/dashboard/events/[id]/startliste",       desc: "Generer og eksporter startliste" },
  { id: 26, role: "KLUBBADMIN",    name: "Vektgrenser",               url: "/dashboard/events/[id]/weight-limits",   desc: "Sett vektgrenser per klasse for stevnet" },
  { id: 27, role: "KLUBBADMIN",    name: "Brukere",                   url: "/dashboard/users",                        desc: "Liste over klubbens brukere" },
  { id: 28, role: "KLUBBADMIN",    name: "Ny bruker",                 url: "/dashboard/users/new",                    desc: "Opprett bruker (admin, teknisk, vekt osv.)" },
  { id: 29, role: "KLUBBADMIN",    name: "Brukerdetalj",              url: "/dashboard/users/[id]",                   desc: "Rediger bruker, endre rolle" },
  { id: 30, role: "KLUBBADMIN",    name: "Klubboversikt",             url: "/dashboard/clubs",                        desc: "Oversikt over klubber" },
  { id: 31, role: "KLUBBADMIN",    name: "Klubbdetalj",               url: "/dashboard/clubs/[id]",                   desc: "Rediger klubbinfo" },
  { id: 32, role: "KLUBBADMIN",    name: "Klubbadministratorer",      url: "/dashboard/clubs/[id]/admins",            desc: "Hvem som er admin for klubben" },
  { id: 33, role: "KLUBBADMIN",    name: "Klasser",                   url: "/dashboard/clubs/classes",                desc: "Administrer klasser på tvers" },
  { id: 34, role: "FORBUNDSADMIN", name: "Forbund-dashboard",         url: "/dashboard/federation",                   desc: "Statistikk, arrangementsoversikt, navigasjon" },
  { id: 35, role: "FORBUNDSADMIN", name: "Godkjente dekk",            url: "/dashboard/federation/approved-tires",   desc: "Liste og import (Excel/CSV) av godkjente dekkmodeller" },
  { id: 36, role: "FORBUNDSADMIN", name: "Dekkgrenser",               url: "/dashboard/federation/tire-limits",      desc: "Maks antall dekk per klasse/disiplin" },
  { id: 37, role: "FORBUNDSADMIN", name: "Forbundsadmins",            url: "/dashboard/federation/admins",            desc: "Inviter og administrer forbundsadministratorer" },
  { id: 38, role: "FIA-DELEGAT",   name: "FIA-dashboard",             url: "/dashboard/fia",                          desc: "Statistikk, status alle stevner og klubber" },
  { id: 39, role: "FIA-DELEGAT",   name: "FIA — stevner",            url: "/dashboard/fia/events",                   desc: "Oversikt over alle stevner på tvers av klubber" },
  { id: 40, role: "FIA-DELEGAT",   name: "FIA — klubber",            url: "/dashboard/fia/clubs",                    desc: "Oversikt over alle klubber" },
  { id: 41, role: "FIA-DELEGAT",   name: "FIA — godkjente dekk",    url: "/dashboard/fia/approved-tires",            desc: "FIA-lista over godkjente dekkmodeller (rediger/legg til)" },
  { id: 42, role: "FIA-DELEGAT",   name: "FIA — dekkoverføring",    url: "/dashboard/fia/tyre-assignments",          desc: "Offisiell overføring av dekk til fører (med dokumentasjon)" },
  { id: 43, role: "FIA-DELEGAT",   name: "FIA — underdisipliner",   url: "/dashboard/fia/sub-disciplines",           desc: "Administrer underdisipliner (SuperBuggy, 1600cc osv.)" },
  { id: 44, role: "FIA-DELEGAT",   name: "FIA — RFID-skanning",     url: "/dashboard/fia/rfid-scan",                 desc: "Håndskannervisning: grønn/gul/rød per EPC-skann" },
  { id: 45, role: "SUPERADMIN",    name: "Superadmin-dashboard",     url: "/dashboard/superadmin",                   desc: "Systemstatus, statistikk, navigasjon" },
  { id: 46, role: "SUPERADMIN",    name: "Forbund",                   url: "/dashboard/superadmin/federations",      desc: "Opprett og administrer forbund" },
  { id: 47, role: "SUPERADMIN",    name: "FIA-delegater",             url: "/dashboard/superadmin/fia-delegates",    desc: "Inviter og administrer FIA-delegater" },
  { id: 48, role: "SUPERADMIN",    name: "Hoved-dashboard",           url: "/dashboard",                              desc: "Felles inngangspunkt etter innlogging (ruter etter rolle)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function gap() {
  return new Paragraph({ text: "", spacing: { after: pt(4) } });
}

function coloredHeader(title, color) {
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: pt(13), color: "FFFFFF" })],
    shading: { type: ShadingType.SOLID, color },
    spacing: { before: pt(16), after: 0 },
    indent: { left: convertInchesToTwip(0.1), right: convertInchesToTwip(0.1) },
  });
}

function roleTable(roleKey, roleScreens) {
  const { color, light } = ROLES[roleKey];

  const headerRow = new TableRow({
    tableHeader: true,
    children: ["#", "Skjerm", "URL", "Beskrivelse"].map((t, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: t, bold: true, size: pt(9), color: "FFFFFF" })],
        })],
        shading: { type: ShadingType.SOLID, color },
        width: { size: [4, 22, 28, 46][i], type: WidthType.PERCENTAGE },
        margins: { left: 80, right: 80, top: 60, bottom: 60 },
        verticalAlign: VerticalAlign.CENTER,
      })
    ),
  });

  const dataRows = roleScreens.map((s, i) =>
    new TableRow({
      children: [
        // #
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(s.id), size: pt(9), bold: true, color: color })] })],
          shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: light } : undefined,
          margins: { left: 80, right: 80, top: 50, bottom: 50 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
        // Name
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: s.name, size: pt(9), bold: true })] })],
          shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: light } : undefined,
          margins: { left: 80, right: 80, top: 50, bottom: 50 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
        // URL
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: s.url, size: pt(8), color: "64748B", font: "Courier New" })] })],
          shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: light } : undefined,
          margins: { left: 80, right: 80, top: 50, bottom: 50 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
        // Desc
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: s.desc, size: pt(9), color: "374151" })] })],
          shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: light } : undefined,
          margins: { left: 80, right: 80, top: 50, bottom: 50 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

// ── Access matrix ─────────────────────────────────────────────────────────────

function accessMatrix() {
  const cols = ["Fører", "Innsjekk", "Teknisk", "Vekt", "Dekk", "Klubb", "Forbund", "FIA", "Super"];
  const rows = [
    ["Forside / offentlig",   "✅","✅","✅","✅","✅","✅","✅","✅","✅"],
    ["Min profil / kjøretøy", "✅","✅","✅","✅","✅","✅","✅","✅","✅"],
    ["Mine dekk",             "✅","","","","","","","",""],
    ["Innsjekk",              "","✅","","","","✅","","✅","✅"],
    ["Teknisk kontroll",      "","","✅","","","✅","","✅","✅"],
    ["Vektkontroll",          "","","","✅","","✅","","✅","✅"],
    ["Dekk-portal / rapport", "","","✅","","✅","✅","","✅","✅"],
    ["Arrangementer (admin)",  "","","","","","✅","✅","✅","✅"],
    ["Brukere / klubber",     "","","","","","✅","✅","✅","✅"],
    ["Godkjente dekk",        "","","","","","","✅","✅","✅"],
    ["FIA-oversikt",          "","","","","","","","✅","✅"],
    ["Forbundsadmin",         "","","","","","","✅","","✅"],
    ["Superadmin",            "","","","","","","","","✅"],
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "Skjerm", bold: true, size: pt(8), color: "FFFFFF" })] })],
        shading: { type: ShadingType.SOLID, color: "1e293b" },
        width: { size: 28, type: WidthType.PERCENTAGE },
        margins: { left: 80, right: 80, top: 60, bottom: 60 },
      }),
      ...cols.map(c => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, size: pt(7), color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: "1e293b" },
        width: { size: Math.floor(72 / cols.length), type: WidthType.PERCENTAGE },
        margins: { left: 40, right: 40, top: 60, bottom: 60 },
      })),
    ],
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: row[0], size: pt(8), bold: true })] })],
          shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: "F8FAFC" } : undefined,
          margins: { left: 80, right: 80, top: 50, bottom: 50 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
        ...row.slice(1).map(cell => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: pt(9), color: cell === "✅" ? "15803d" : "CBD5E1" })], alignment: AlignmentType.CENTER })],
          shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: "F8FAFC" } : undefined,
          margins: { left: 40, right: 40, top: 50, bottom: 50 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        })),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

// ── Summary stats table ───────────────────────────────────────────────────────

function summaryTable() {
  const data = [
    ["🌐 Offentlig",     "5",  "1e40af"],
    ["👤 Fører",         "4",  "15803d"],
    ["🏁 Innsjekk",      "2",  "0369a1"],
    ["🔧 Teknisk",       "1",  "b45309"],
    ["⚖️ Vektkontroll",  "4",  "7c3aed"],
    ["🚗 Dekk-portal",   "4",  "0f766e"],
    ["🏢 Klubbadmin",    "13", "be185d"],
    ["🏛️ Forbundsadmin", "4",  "9a3412"],
    ["🔴 FIA-delegat",   "7",  "c2410c"],
    ["⚙️ Superadmin",    "4",  "1f2937"],
  ];

  const rows = [];
  for (let i = 0; i < data.length; i += 2) {
    const left = data[i];
    const right = data[i + 1];
    rows.push(new TableRow({
      children: [left, right].filter(Boolean).map(([label, count, color]) =>
        new TableCell({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `  ${label}`, bold: true, size: pt(10), color }),
              new TextRun({ text: `  —  ${count} sider`, size: pt(10), color: "64748B" }),
            ],
          })],
          shading: { type: ShadingType.SOLID, color: "F8FAFC" },
          margins: { left: 100, right: 100, top: 80, bottom: 80 },
          borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        })
      ),
    }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows,
  });
}

// ── Group screens by role ─────────────────────────────────────────────────────

const grouped = {};
for (const s of screens) {
  if (!grouped[s.role]) grouped[s.role] = [];
  grouped[s.role].push(s);
}

// ── Document ──────────────────────────────────────────────────────────────────

const children = [
  // ── Cover / intro ──────────────────────────────────────────────────────────
  new Paragraph({
    children: [new TextRun({ text: "ScrutMan", bold: true, size: pt(36), color: "1e293b" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(6) },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Skjermbilder — Oversikt", size: pt(18), color: "2563EB" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(4) },
  }),
  new Paragraph({
    children: [new TextRun({ text: "48 skjermbilder · 9 brukerroller · Juni 2026", size: pt(10), color: "94a3b8", italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(24) },
  }),

  // Summary table
  summaryTable(),
  gap(), gap(),

  // ── Access matrix ──────────────────────────────────────────────────────────
  new Paragraph({
    children: [new TextRun({ text: "Tilgangsoversikt — hvem ser hva", bold: true, size: pt(13), color: "1e293b" })],
    spacing: { before: pt(14), after: pt(6) },
    border: { bottom: { style: BorderStyle.THICK, size: 6, color: "2563EB" } },
  }),
  accessMatrix(),
  gap(), gap(),
];

// ── Per-role sections ─────────────────────────────────────────────────────────

for (const [roleKey, roleScreens] of Object.entries(grouped)) {
  const { color, label } = ROLES[roleKey];
  children.push(coloredHeader(`${label}  (${roleScreens.length} skjermbilder)`, color));
  children.push(gap());
  children.push(roleTable(roleKey, roleScreens));
  children.push(gap(), gap());
}

// ── Footer note ───────────────────────────────────────────────────────────────
children.push(
  new Paragraph({
    children: [new TextRun({ text: `ScrutMan · Skjermbilder-oversikt · Juni 2026 · Tilhørende wireframe-hefte: ScrutMan-Skjermbilder.pdf`, size: pt(8), color: "CBD5E1", italics: true })],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } },
    spacing: { before: pt(14) },
  })
);

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: {
          top:    convertInchesToTwip(1),
          right:  convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left:   convertInchesToTwip(1.2),
        },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          children: [
            new TextRun({ text: "ScrutMan", bold: true, size: pt(9), color: "2563EB" }),
            new TextRun({ text: "  —  Skjermbilder Oversikt", size: pt(9), color: "94a3b8" }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } },
        }),
      ]}),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          children: [
            new TextRun({ text: "Side ", size: pt(9), color: "94a3b8" }),
            new TextRun({ children: [PageNumber.CURRENT], size: pt(9), color: "94a3b8" }),
            new TextRun({ text: "  av  ", size: pt(9), color: "94a3b8" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: pt(9), color: "94a3b8" }),
            new TextRun({ text: "    ·    scrutman.no    ·    48 skjermbilder", size: pt(9), color: "94a3b8" }),
          ],
          alignment: AlignmentType.RIGHT,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } },
        }),
      ]}),
    },
    children,
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`✅  Word-dokument generert: ${OUT}`);
