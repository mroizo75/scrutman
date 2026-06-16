import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, convertInchesToTwip, TableLayoutType,
  VerticalAlign,
} from "docx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/ScrutMan-Rolle-Hierarki.docx");

const pt = (n) => n * 2;

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES = [
  {
    key: "SUPERADMIN",
    label: "SUPERADMIN",
    emoji: "⚙️",
    color: "1f2937",
    light: "F8FAFC",
    tier: 1,
    subtitle: "Systemeier",
    creates: ["FEDERATION_ADMIN", "FIA_DELEGATE", "CLUBADMIN"],
    access: "Full tilgang til alt",
    screens: ["Alle skjermbilder", "Administrer forbund", "Administrer FIA-delegater", "Administrer klubber"],
    features: [
      "Opprett / slett forbund",
      "Opprett / slett FIA-delegater",
      "Opprett / slett klubber",
      "Full lese- og skrivetilgang overalt",
      "Systemstatistikk og oversikt",
    ],
  },
  {
    key: "FEDERATION_ADMIN",
    label: "FEDERATION_ADMIN",
    emoji: "🏛️",
    color: "9a3412",
    light: "FFF7ED",
    tier: 2,
    subtitle: "Forbundsadministrator",
    creates: ["FIA_DELEGATE (innen eget forbund)", "CLUBADMIN (innen eget forbund)"],
    access: "Eget forbund + alle klubber i forbundet",
    screens: ["Forbund-dashboard", "Godkjente dekk", "Dekkgrenser", "Forbundsadmins", "Alle arrangementer i forbundet"],
    features: [
      "Administrer godkjent dekkliste (Excel-import)",
      "Sett dekkgrenser per klasse/disiplin",
      "Administrer underdisipliner",
      "Inviter og administrer FIA-delegater",
      "Opprett klubber i eget forbund",
      "Se alle arrangementer i forbundet",
    ],
  },
  {
    key: "FIA_DELEGATE",
    label: "FIA_DELEGATE",
    emoji: "🔴",
    color: "c2410c",
    light: "FFF7ED",
    tier: 2,
    subtitle: "FIA-delegat (tverrklubb)",
    creates: [],
    access: "Lese + skrive i ALLE klubber og arrangementer",
    screens: ["FIA-dashboard", "FIA — alle stevner", "FIA — alle klubber", "FIA — godkjente dekk", "FIA — dekkoverføring", "FIA — underdisipliner", "FIA — RFID-skanning"],
    features: [
      "Lese- og skrivetilgang til alle klubber",
      "Offisiell dekkoverføring til fører (med dokumentasjon)",
      "Administrer godkjent dekkliste",
      "Administrer underdisipliner",
      "RFID-skanning av dekk",
      "Se alle hendelsesrapporter på tvers",
      "Teknisk vurdering av dekk",
    ],
  },
  {
    key: "CLUBADMIN",
    label: "CLUBADMIN",
    emoji: "🏢",
    color: "be185d",
    light: "FDF2F8",
    tier: 3,
    subtitle: "Klubbadministrator",
    creates: ["TECHNICAL_INSPECTOR", "WEIGHT_CONTROLLER", "RACE_OFFICIAL", "ATHLETE"],
    access: "Kun egen klubb",
    screens: ["Klubb-dashboard", "Arrangementer (CRUD)", "Klasser og underdisipliner", "Påmeldinger", "Startliste", "Vektgrenser", "Brukere", "Innsjekk", "Dekk-portal", "Alle rapporter"],
    features: [
      "Opprett og administrer stevner",
      "Inviter og administrer alle brukere i klubben",
      "Godkjenn/avslå påmeldinger",
      "Eksporter startlister",
      "Sett vektgrenser per klasse",
      "Tilgang til alle rapporter for egen klubb",
      "Administrer klasser",
    ],
  },
  {
    key: "TECHNICAL_INSPECTOR",
    label: "TECHNICAL_INSPECTOR",
    emoji: "🔧",
    color: "b45309",
    light: "FFFBEB",
    tier: 4,
    subtitle: "Teknisk inspektør",
    creates: [],
    access: "Teknisk kontroll i tildelte stevner",
    screens: ["Teknisk kontroll-dashboard", "Dekk-portal / RFID-skanning", "Dekk-rapport", "RFID-skanning (event)"],
    features: [
      "Teknisk kjøretøyinspeksjon",
      "RFID-skanning av dekk i portal",
      "Se og laste ned dekk-rapporter",
      "Offisiell dekkoverføring (begrenset)",
      "Incident PDF-rapport",
      "Godkjenn / avvis kjøretøy",
    ],
  },
  {
    key: "WEIGHT_CONTROLLER",
    label: "WEIGHT_CONTROLLER",
    emoji: "⚖️",
    color: "7c3aed",
    light: "F5F3FF",
    tier: 4,
    subtitle: "Vektkontrollør",
    creates: [],
    access: "Vektkontroll i tildelte stevner",
    screens: ["Vektmåling", "Vektliste", "Vektrapporter"],
    features: [
      "Registrer vektmåling per kjøretøy",
      "Se liveoversikt over alle målinger",
      "Last ned og eksporter vektrapporter (CSV/PDF)",
      "Grønn/rød-status per bil",
    ],
  },
  {
    key: "RACE_OFFICIAL",
    label: "RACE_OFFICIAL",
    emoji: "🏁",
    color: "0369a1",
    light: "F0F9FF",
    tier: 4,
    subtitle: "Løpsfunksjonær",
    creates: [],
    access: "Innsjekk og startliste i tildelte stevner",
    screens: ["Innsjekk — stevne", "Innsjekk — velg stevne"],
    features: [
      "Sjekk inn deltakere ved ankomst",
      "Se sanntidsliste over innsjekket status",
      "Se startliste",
    ],
  },
  {
    key: "ATHLETE",
    label: "ATHLETE",
    emoji: "👤",
    color: "15803d",
    light: "F0FDF4",
    tier: 5,
    subtitle: "Fører / utøver",
    creates: [],
    access: "Kun egne data",
    screens: ["Min profil", "Mine kjøretøy", "Fører-dashboard", "Mine dekk", "Offentlige arrangementer", "Påmelding"],
    features: [
      "Registrere og administrere egne dekk",
      "Se RFID-godkjenningsstatus per dekk",
      "Kjøpe og selge dekk (overføring til annen fører)",
      "Melde seg på stevner",
      "Se egne påmeldinger og status",
      "Administrere egne kjøretøy",
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function gap(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ text: "", spacing: { after: pt(4) } }));
}

function sectionTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(13), color: "1e293b" })],
    spacing: { before: pt(16), after: pt(6) },
    border: { bottom: { style: BorderStyle.THICK, size: 6, color: "2563EB" } },
  });
}

// ── Role card ─────────────────────────────────────────────────────────────────

function roleCard(role) {
  const { color, light } = role;

  // Header row
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `${role.emoji}  ${role.label}`, bold: true, size: pt(13), color: "FFFFFF" }),
              new TextRun({ text: `  —  Tier ${role.tier}`, size: pt(9), color: "FFFFFF", italics: true }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: role.subtitle, size: pt(10), color: "FFFFFF", italics: true })],
            spacing: { after: 0 },
          }),
        ],
        shading: { type: ShadingType.SOLID, color },
        columnSpan: 2,
        margins: { left: 120, right: 120, top: 80, bottom: 80 },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        },
      }),
    ],
  });

  // Access row
  const accessRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "Scope", bold: true, size: pt(9), color: color })] })],
        shading: { type: ShadingType.SOLID, color: light },
        margins: { left: 100, right: 60, top: 60, bottom: 60 },
        width: { size: 18, type: WidthType.PERCENTAGE },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: role.access, size: pt(9), color: "374151" })] })],
        shading: { type: ShadingType.SOLID, color: light },
        margins: { left: 80, right: 80, top: 60, bottom: 60 },
        width: { size: 82, type: WidthType.PERCENTAGE },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
    ],
  });

  // Creates row (only if has creates)
  const createsRows = role.creates.length > 0 ? [new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "Oppretter", bold: true, size: pt(9), color: color })] })],
        margins: { left: 100, right: 60, top: 60, bottom: 60 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: role.creates.join("  ·  "), size: pt(9), color: "374151" })] })],
        margins: { left: 80, right: 80, top: 60, bottom: 60 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
    ],
  })] : [];

  // Features
  const featureRows = role.features.map((f, i) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [i === 0 ? new TextRun({ text: "Tilgang", bold: true, size: pt(9), color: color }) : new TextRun({ text: "", size: pt(9) })] })],
        shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: light } : undefined,
        margins: { left: 100, right: 60, top: 40, bottom: 40 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: `✓  ${f}`, size: pt(9), color: "374151" })] })],
        shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: light } : undefined,
        margins: { left: 80, right: 80, top: 40, bottom: 40 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
    ],
  }));

  // Screens
  const screenRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "Skjermer", bold: true, size: pt(9), color: color })] })],
        shading: { type: ShadingType.SOLID, color: light },
        margins: { left: 100, right: 60, top: 50, bottom: 50 },
        borders: { bottom: { style: BorderStyle.NONE }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: role.screens.join("  ·  "), size: pt(8), color: "64748b", italics: true })] })],
        shading: { type: ShadingType.SOLID, color: light },
        margins: { left: 80, right: 80, top: 50, bottom: 50 },
        borders: { bottom: { style: BorderStyle.NONE }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, accessRow, ...createsRows, ...featureRows, screenRow],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color },
      bottom: { style: BorderStyle.SINGLE, size: 4, color },
      left: { style: BorderStyle.SINGLE, size: 4, color },
      right: { style: BorderStyle.SINGLE, size: 4, color },
      insideH: { style: BorderStyle.NONE },
      insideV: { style: BorderStyle.NONE },
    },
  });
}

// ── Hierarchy ASCII art as styled table ───────────────────────────────────────

function hierarchyDiagram() {
  const lines = [
    "                        ┌───────────────────┐                           ",
    "                        │   ⚙️  SUPERADMIN    │  Tier 1                  ",
    "                        │   Systemeier       │  Full tilgang             ",
    "                        └─────────┬─────────┘                           ",
    "              ┌──────────────────-┼──────────────────┐                  ",
    "              │                  │                   │                  ",
    "   ┌──────────▼──────────┐       │       ┌───────────▼──────────┐       ",
    "   │ 🏛️  FEDERATION_ADMIN │       │       │   🔴  FIA_DELEGATE   │ Tier 2",
    "   │ Forbundsadministrator│       │       │   Tverrklubb-tilgang │       ",
    "   └──────────┬──────────┘       │       └───────────┬──────────┘       ",
    "              │                  │                   │                  ",
    "              │       ┌──────────▼──────────┐        │ lese+skrive      ",
    "              └──────▶│   🏢  CLUBADMIN      │◀───────┘ alle klubber     ",
    "                      │   Klubbadministrator │  Tier 3                  ",
    "                      └──────────┬──────────┘                           ",
    "          ┌───────────────────┬──┴──────────────────┐                   ",
    "          │                   │                     │                  ",
    "┌─────────▼─────────┐ ┌───────▼──────┐ ┌───────────▼──────────┐  T.4   ",
    "│ 🔧 TECH_INSPECTOR  │ │ ⚖️ WEIGHT     │ │ 🏁 RACE_OFFICIAL      │        ",
    "│ Teknisk inspektør  │ │ CONTROLLER   │ │ Løpsfunksjonær       │        ",
    "│ Dekk-portal, RFID  │ │ Vektkontroll │ │ Innsjekk, startliste │        ",
    "└────────────────────┘ └──────────────┘ └──────────────────────┘        ",
    "                                                                          ",
    "                        ┌─────────────────┐                              ",
    "                        │  👤  ATHLETE     │  Tier 5                     ",
    "                        │  Fører/utøver   │  Kun egne data               ",
    "                        │  Mine dekk,     │                              ",
    "                        │  min profil,    │                              ",
    "                        │  kjøretøy       │                              ",
    "                        └─────────────────┘                              ",
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      children: lines.map(line => new Paragraph({
        children: [new TextRun({ text: line, font: "Courier New", size: pt(8.5), color: "1e3a5f" })],
        spacing: { after: 0, before: 0 },
      })),
      shading: { type: ShadingType.SOLID, color: "EFF6FF" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "2563EB" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "2563EB" },
        left: { style: BorderStyle.SINGLE, size: 6, color: "2563EB" },
        right: { style: BorderStyle.SINGLE, size: 6, color: "2563EB" },
      },
      margins: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2), top: 120, bottom: 120 },
    })] })],
  });
}

// ── Inheritance table ─────────────────────────────────────────────────────────

function inheritanceTable() {
  const rows = [
    ["SUPERADMIN",        "FEDERATION_ADMIN", "FIA_DELEGATE", "CLUBADMIN", "TECH_INSPECTOR", "WEIGHT_CONTROLLER", "RACE_OFFICIAL", "ATHLETE"],
    ["FEDERATION_ADMIN",  "—",                "✅ (eget forbund)", "✅ (eget forbund)", "—", "—", "—", "—"],
    ["FIA_DELEGATE",      "—",                "—",           "—",          "—",             "—",                "—",             "—"],
    ["CLUBADMIN",         "—",                "—",           "—",          "✅",             "✅",                "✅",            "✅"],
    ["TECH_INSPECTOR",    "—",                "—",           "—",          "—",             "—",                "—",             "—"],
    ["WEIGHT_CONTROLLER", "—",                "—",           "—",          "—",             "—",                "—",             "—"],
    ["RACE_OFFICIAL",     "—",                "—",           "—",          "—",             "—",                "—",             "—"],
    ["ATHLETE",           "—",                "—",           "—",          "—",             "—",                "—",             "—"],
  ];

  const header = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "Kan opprette →", bold: true, size: pt(8), color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: "1e293b" },
        margins: { left: 60, right: 60, top: 60, bottom: 60 },
        width: { size: 20, type: WidthType.PERCENTAGE },
      }),
      ...rows[0].map(col => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, size: pt(7), color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: "1e293b" },
        margins: { left: 40, right: 40, top: 60, bottom: 60 },
        width: { size: Math.floor(80 / rows[0].length), type: WidthType.PERCENTAGE },
      })),
    ],
  });

  const dataRows = rows.slice(1).map((row, ri) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: row[0], bold: true, size: pt(8), color: "1e293b" })] })],
        shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: "F8FAFC" } : undefined,
        margins: { left: 80, right: 60, top: 50, bottom: 50 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      }),
      ...row.slice(1).map((cell) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: cell, size: pt(8), color: cell === "✅" || cell.startsWith("✅") ? "15803d" : "CBD5E1" })], alignment: AlignmentType.CENTER })],
        shading: ri % 2 === 1 ? { type: ShadingType.SOLID, color: "F8FAFC" } : undefined,
        margins: { left: 40, right: 40, top: 50, bottom: 50 },
        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      })),
    ],
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [header, ...dataRows],
  });
}

// ── Document ──────────────────────────────────────────────────────────────────

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: {
          top:    convertInchesToTwip(0.9),
          right:  convertInchesToTwip(0.9),
          bottom: convertInchesToTwip(0.9),
          left:   convertInchesToTwip(1.0),
        },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        children: [
          new TextRun({ text: "ScrutMan", bold: true, size: pt(9), color: "2563EB" }),
          new TextRun({ text: "  —  Rolle & tilgangshierarki", size: pt(9), color: "94a3b8" }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } },
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        children: [
          new TextRun({ text: "Side ", size: pt(9), color: "94a3b8" }),
          new TextRun({ children: [PageNumber.CURRENT], size: pt(9), color: "94a3b8" }),
          new TextRun({ text: "  ·  ScrutMan Rolle & Hierarki  ·  Juni 2026", size: pt(9), color: "94a3b8" }),
        ],
        alignment: AlignmentType.RIGHT,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } },
      })] }),
    },
    children: [
      // Cover
      new Paragraph({
        children: [new TextRun({ text: "ScrutMan", bold: true, size: pt(32), color: "1e293b" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: pt(4) },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Rolle & tilgangshierarki", size: pt(16), color: "2563EB" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: pt(4) },
      }),
      new Paragraph({
        children: [new TextRun({ text: "8 brukerroller · 5 tier-nivåer · Juni 2026", size: pt(10), color: "94a3b8", italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: pt(20) },
      }),

      // Hierarchy diagram
      sectionTitle("Hierarki — visuell oversikt"),
      ...gap(),
      hierarchyDiagram(),
      ...gap(2),

      // Who creates whom
      sectionTitle("Hvem kan opprette hvem"),
      ...gap(),
      inheritanceTable(),
      ...gap(2),

      // Role cards
      sectionTitle("Rollebeskrivelser — detaljert"),
      ...gap(),
      ...ROLES.flatMap(role => [roleCard(role), ...gap(2)]),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`✅  Hierarki-dokument generert: ${OUT}`);
