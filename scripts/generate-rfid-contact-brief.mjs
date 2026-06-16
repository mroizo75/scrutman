import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, convertInchesToTwip, TableLayoutType,
  VerticalAlign,
} from "docx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/ScrutMan-RFID-Kontaktbrev.docx");

const C = {
  navy:      "1A3A5C",
  blue:      "2563EB",
  green:     "16A34A",
  red:       "DC2626",
  amber:     "D97706",
  lightBlue: "EFF6FF",
  lightGray: "F8FAFC",
  midGray:   "64748B",
  white:     "FFFFFF",
  border:    "CBD5E1",
  greenBg:   "F0FDF4",
  redBg:     "FEF2F2",
};

const pt = (n) => n * 2;

function gap(n = 1) {
  return Array.from({ length: n }, () =>
    new Paragraph({ text: "", spacing: { after: pt(5) } })
  );
}

function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(16), color: C.navy })],
    spacing: { before: pt(14), after: pt(5) },
    border: { bottom: { style: BorderStyle.THICK, size: 6, color: C.blue } },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(12), color: C.blue })],
    spacing: { before: pt(10), after: pt(4) },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: pt(11), color: "222222", ...opts })],
    spacing: { after: pt(4) },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: pt(11), color: "222222" })],
    bullet: { level: 0 },
    spacing: { after: pt(3) },
  });
}

function infoBox(lines, bg = C.lightBlue, borderColor = C.blue) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      children: lines.map((l) => new Paragraph({
        children: [new TextRun({ text: l, size: pt(10), color: "1e3a5f" })],
        spacing: { after: pt(2) },
      })),
      shading: { type: ShadingType.SOLID, color: bg },
      borders: {
        left:   { style: BorderStyle.THICK, size: 14, color: borderColor },
        top:    { style: BorderStyle.NONE },
        right:  { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
      },
      margins: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15), top: 80, bottom: 80 },
    })] })],
  });
}

function thead(cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text, bold: true, size: pt(10), color: C.white })],
        alignment: AlignmentType.LEFT,
      })],
      shading: { type: ShadingType.SOLID, color: C.navy },
      verticalAlign: VerticalAlign.CENTER,
      margins: { left: 80, right: 80, top: 60, bottom: 60 },
    })),
  });
}

function trow(cells, shade = false) {
  return new TableRow({
    children: cells.map((text) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: text ?? "—", size: pt(10), color: "222222" })],
      })],
      shading: shade ? { type: ShadingType.SOLID, color: C.lightGray } : undefined,
      margins: { left: 80, right: 80, top: 50, bottom: 50 },
      borders: {
        bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border },
        top: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
    })),
  });
}

function dtable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [thead(headers), ...rows.map((r, i) => trow(r, i % 2 === 1))],
  });
}

// ── Diagram as monospace text block ───────────────────────────────────────────

function diagramBlock(lines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      children: lines.map((line) => new Paragraph({
        children: [new TextRun({ text: line, font: "Courier New", size: pt(9), color: "1e3a5f" })],
        spacing: { after: 0 },
      })),
      shading: { type: ShadingType.SOLID, color: "F0F4FF" },
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: C.blue },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue },
        left:   { style: BorderStyle.SINGLE, size: 4, color: C.blue },
        right:  { style: BorderStyle.SINGLE, size: 4, color: C.blue },
      },
      margins: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2), top: 100, bottom: 100 },
    })] })],
  });
}

// ── Document ──────────────────────────────────────────────────────────────────

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
          children: [new TextRun({ text: "ScrutMan — RFID Portal System  |  Partner Inquiry", size: pt(9), color: C.midGray })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
        }),
      ]}),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          children: [
            new TextRun({ text: "Side ", size: pt(9), color: C.midGray }),
            new TextRun({ children: [PageNumber.CURRENT], size: pt(9), color: C.midGray }),
            new TextRun({ text: "  ·  ScrutMan AS  ·  FIA LT54 Tyre RFID Management System  ·  Mai 2026", size: pt(9), color: C.midGray }),
          ],
          alignment: AlignmentType.RIGHT,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
        }),
      ]}),
    },
    children: [

      // ── Page 1: Contact letter ─────────────────────────────────────────────

      new Paragraph({
        children: [new TextRun({ text: "ScrutMan", bold: true, size: pt(28), color: C.navy })],
        alignment: AlignmentType.LEFT,
      }),
      new Paragraph({
        children: [new TextRun({ text: "FIA LT54 Tyre RFID Portal System", size: pt(13), color: C.blue })],
        spacing: { after: pt(4) },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Partner Inquiry — Fixed UHF RFID Portal Reader", bold: true, size: pt(12), color: C.midGray })],
        spacing: { after: pt(20) },
      }),

      ...gap(),
      infoBox([
        "To: Zebra Technologies / Impinj — European Sales & Partner Team",
        "Subject: Fixed 4-port UHF RFID portal reader for motorsport scrutineering application",
        "From: ScrutMan — FIA-compliant tyre management platform",
      ]),
      ...gap(2),

      h1("1.  Who We Are"),
      body(
        "ScrutMan is a digital scrutineering management platform built for motorsport clubs and federations " +
        "operating under FIA regulations. The system handles driver registration, tyre compliance (FIA Technical " +
        "List No. 54), event management, and technical inspection workflows."
      ),
      body(
        "We are building a physical RFID portal scanning station that integrates with our cloud platform. " +
        "We are looking for the correct Zebra / Impinj reseller or partner in Europe (Norway/Scandinavia) " +
        "who can supply and support fixed UHF RFID portal hardware for this application."
      ),

      ...gap(),
      h1("2.  What We Need — Summary"),

      ...gap(),
      infoBox([
        "⚠  We do NOT need handheld scanners.",
        "⚠  We do NOT need inventory management software (ItemSense / Zebra DNA for warehouses).",
        "✅  We need a fixed 4-port UHF RFID reader with 4 directional antennas for a drive-through portal.",
        "✅  We need EU/ETSI band (865–868 MHz) certified hardware.",
        "✅  We need access to the reader SDK to integrate with our own application.",
      ], "FFFBEB", C.amber),

      ...gap(2),
      h1("3.  Application Description"),
      body(
        "The portal is a pop-up tent installation set up at motorsport venues. A car drives slowly (5–10 km/h) " +
        "through a frame fitted with 4 UHF RFID antennas. The system reads the RFID chips embedded in all 4 tyres " +
        "simultaneously, validates them against the driver's registered tyre set in our platform, and triggers a " +
        "green or red signal lamp within 2–3 seconds."
      ),
      body("The FIA mandates UHF EPC Gen2 / SGTIN-96 tags (860–960 MHz) on all competition tyres per Technical List No. 54."),

      ...gap(),
      h1("4.  Technical Requirements"),
      ...gap(),
      dtable(
        ["Requirement", "Specification"],
        [
          ["Reader type", "Fixed 4-port UHF RFID reader (e.g. Zebra FX9600-4 or Impinj R700)"],
          ["Frequency", "EU/ETSI band: 865–868 MHz (ETSI EN 302 208)"],
          ["Protocol", "EPC Class 1 Gen2 / ISO 18000-6C"],
          ["Antenna ports", "4 ports (one per tyre / wheel position)"],
          ["Interface", "Ethernet (RJ-45) + SDK access (REST, TCP or native SDK)"],
          ["Power", "PoE or PoE+ preferred (reduces cabling at venue)"],
          ["Environment", "IP53 or better — outdoor tent, weather exposure"],
          ["Antennas", "4× directional panel antennas, 8–12 dBi, EU-certified"],
          ["SDK", "Access to reader SDK for custom application integration (Node.js / .NET)"],
          ["Quantity (initial)", "1 complete portal kit (reader + 4 antennas + cables)"],
        ]
      ),

      ...gap(2),
      h1("5.  What We Are NOT Looking For"),
      bullet("Handheld RFID scanners (Zebra RFD40, RFD90 or similar)"),
      bullet("Warehouse/logistics inventory management software (ItemSense, Zebra DNA, Impinj Platform)"),
      bullet("US-band only (FCC 902–928 MHz) hardware — must support EU ETSI band"),
      bullet("Cloud-managed enterprise RFID platforms — we have our own application"),

      ...gap(2),
      h1("6.  Integration Approach"),
      body(
        "We have already built the server-side platform (Next.js, MySQL, REST API). " +
        "The Windows desktop application (Electron + React) will connect to the reader via SDK, " +
        "receive EPC strings per antenna port, validate against our API, and control a signal lamp via USB relay. " +
        "We need the reader SDK documentation and ideally a demo unit or evaluation kit."
      ),

      ...gap(2),
      h1("7.  Request"),
      body("We would appreciate:", { bold: true }),
      bullet("Contact details for the correct authorised reseller / partner for Norway or Scandinavia"),
      bullet("Confirmation of product availability for EU ETSI band (865–868 MHz)"),
      bullet("Datasheet and SDK documentation for the recommended portal reader model"),
      bullet("Pricing indication for: 1× reader + 4× antennas + antenna cables"),
      bullet("Information about evaluation / demo kit options"),

      ...gap(2),
      infoBox([
        "Preferred models to quote:",
        "  • Zebra FX9600-4 (4-port, EU/WR variant: FX9600-42325A50-WR)",
        "  • Impinj R700 (EU variant, 865–868 MHz)",
        "  • Or equivalent 4-port fixed UHF reader you recommend for portal/drive-through use",
      ], C.lightBlue, C.blue),

      // Page break before diagram page
      new Paragraph({ pageBreakBefore: true, text: "" }),

      // ── Page 2: System diagram ─────────────────────────────────────────────

      new Paragraph({
        children: [new TextRun({ text: "System Architecture Diagram", bold: true, size: pt(18), color: C.navy })],
        spacing: { after: pt(4) },
        border: { bottom: { style: BorderStyle.THICK, size: 6, color: C.blue } },
      }),
      new Paragraph({
        children: [new TextRun({ text: "ScrutMan RFID Portal — for reference when contacting hardware partners", size: pt(10), color: C.midGray, italics: true })],
        spacing: { after: pt(16) },
      }),

      h2("A.  Physical Portal Layout (top view)"),
      ...gap(),
      diagramBlock([
        "                                                                   ",
        "   ┌─────────────────────────────────────────────────────────┐    ",
        "   │              POP-UP TENT  (6 × 3 m)                    │    ",
        "   │                                                         │    ",
        "   │  LEFT SIDE                         RIGHT SIDE           │    ",
        "   │  ─────────                         ──────────           │    ",
        "   │  [ANT 1]──┐                    ┌──[ANT 2]              │    ",
        "   │  [ANT 3]──┤  ← PORTAL FRAME →  ├──[ANT 4]             │    ",
        "   │           │  ┌──────────────┐  │                       │    ",
        "   │           └──│  car drives  │──┘                       │    ",
        "   │              │  through →   │                          │    ",
        "   │              └──────────────┘                          │    ",
        "   │                                                         │    ",
        "   │    ANT 1+2 = ZONE 1 (Read)    ANT 3+4 = ZONE 2 (Verify)│    ",
        "   │                                                         │    ",
        "   │              🟢 / 🔴  SIGNAL LAMP                      │    ",
        "   │                                                         │    ",
        "   │   [Zebra FX9600 / Impinj R700]   [Windows Mini-PC]     │    ",
        "   │                                                         │    ",
        "   └─────────────────────────────────────────────────────────┘    ",
        "                                                                   ",
        "   Antenna hub height: ~45 cm (tyre sidewall / FIA LT54 label)    ",
        "   Car speed: 5–10 km/h through portal                            ",
      ]),

      ...gap(2),
      h2("B.  Antenna Port Assignment"),
      ...gap(),
      dtable(
        ["Antenna Port", "Physical Position", "Reads"],
        [
          ["Port 1", "Zone 1 — Left side of portal", "Front-Left tyre (FL)"],
          ["Port 2", "Zone 1 — Right side of portal", "Front-Right tyre (FR)"],
          ["Port 3", "Zone 2 — Left side of portal", "Rear-Left tyre (RL)"],
          ["Port 4", "Zone 2 — Right side of portal", "Rear-Right tyre (RR)"],
        ]
      ),
      ...gap(),
      body("RSSI (signal strength) from each port is used to determine wheel position. Zone 2 (ports 3+4) acts as verification — reducing missed reads to near zero.", { italics: true }),

      ...gap(2),
      h2("C.  System Connection Diagram"),
      ...gap(),
      diagramBlock([
        "                                                                          ",
        "  ┌───────────────────────────────────────────────────────────────────┐  ",
        "  │   PORTAL FRAME                                                    │  ",
        "  │                                                                   │  ",
        "  │   [Ant 1] ──┐                                                    │  ",
        "  │   [Ant 2] ──┤── RP-SMA/N-type cable ──► [Zebra FX9600 / R700]   │  ",
        "  │   [Ant 3] ──┤                              4-port UHF Reader      │  ",
        "  │   [Ant 4] ──┘                              EU: 865–868 MHz        │  ",
        "  │                                            EPC Gen2 / ISO 18000-6C│  ",
        "  │                                                    │               │  ",
        "  │                                             Cat6 Ethernet          │  ",
        "  │                                                    │               │  ",
        "  │                                         ┌──────────▼──────────┐   │  ",
        "  │                                         │  Gigabit Switch      │   │  ",
        "  │                                         └──────┬───────┬───────┘   │  ",
        "  │                                                │       │            │  ",
        "  │                                     Cat6       │       │  Cat6      │  ",
        "  │                          ┌──────────▼────┐    │    ┌──▼──────────┐ │  ",
        "  │                          │ Windows PC     │    │    │ 4G/5G Router│ │  ",
        "  │                          │ Mini-PC        │    │    │ or Starlink │ │  ",
        "  │                          │                │    │    └──────┬──────┘ │  ",
        "  │                          │ ScrutMan       │    │           │ Internet│  ",
        "  │                          │ Portal App     │    │    ┌──────▼──────┐ │  ",
        "  │                          │ (Electron)     │    │    │ ScrutMan    │ │  ",
        "  │                          └──────┬─────────┘    │    │ Cloud API   │ │  ",
        "  │                                 │ USB           │    │ (Next.js)   │ │  ",
        "  │                          ┌──────▼─────────┐    │    └─────────────┘ │  ",
        "  │                          │ USB Relay Box  │    │                    │  ",
        "  │                          │ (4-channel)    │    │                    │  ",
        "  │                          └──────┬─────────┘    │                    │  ",
        "  │                                 │ 230V relay    │                    │  ",
        "  │                    ┌────────────┴────────────┐  │                    │  ",
        "  │                    │   🟢 / 🟡 / 🔴           │  │                    │  ",
        "  │                    │   LED Signal Lamp (×2)   │  │                    │  ",
        "  │                    │   IP65, visible 30+ m    │  │                    │  ",
        "  │                    └──────────────────────────┘  │                    │  ",
        "  │                                                   │                    │  ",
        "  └───────────────────────────────────────────────────────────────────────┘  ",
        "                                                                              ",
      ]),

      ...gap(2),
      h2("D.  Software Flow (for SDK integration reference)"),
      ...gap(),
      diagramBlock([
        "                                                                     ",
        "  Operator enters start number                                       ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  System arms  →  Amber lamp ON                                     ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  Car drives through portal (2–4 seconds)                           ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  Reader SDK callback per tag read:                                  ",
        "  { epc: 'E280117000000100…', rssi: -52.4, antenna: 1 }             ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  App deduplicates EPC reads within 2-second window                 ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  For each wheel (FL / FR / RL / RR):                               ",
        "    EPC in driver's registered tyre list?                            ",
        "    └─ YES + status ACTIVE  →  GREEN                                 ",
        "    └─ NO / unknown EPC     →  RED                                   ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  All 4 GREEN  →  Green lamp ON  →  Car passes                      ",
        "  Any RED      →  Red lamp ON   →  Marshal stops car                 ",
        "         │                                                           ",
        "         ▼                                                           ",
        "  POST /api/scan-sessions  →  logged in ScrutMan cloud               ",
        "  Incident PDF generated if FAIL                                     ",
        "                                                                     ",
      ]),

      ...gap(2),
      h2("E.  Approved RFID Chip Types (FIA Technical List No. 54)"),
      body("The tyre RFID labels already in the field contain chips from this approved list:"),
      ...gap(),
      dtable(
        ["Manufacturer", "Approved Models"],
        [
          ["Impinj", "Monza 4, Monza 750, Monza R6P, M730"],
          ["Alien Technology", "Higgs-3, Higgs-9"],
          ["NXP Semiconductors", "UCODE 7xm-1K, UCODE 8, UCODE 9xe"],
        ]
      ),
      ...gap(),
      body("All above are EPC Gen2 / SGTIN-96 compatible — readable by any EU-certified UHF reader operating on 865–868 MHz.", { italics: true }),

    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`✅  Kontaktbrev generert: ${OUT}`);
