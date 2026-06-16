import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, NumberFormat, convertInchesToTwip,
  TableLayoutType, VerticalAlign,
} from "docx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/ScrutMan-RFID-Portal-Spesifikasjon.docx");

// ── Color palette ──────────────────────────────────────────────────────────────
const C = {
  primary:    "1A3A5C",  // dark navy
  accent:     "2563EB",  // blue
  green:      "16A34A",
  red:        "DC2626",
  amber:      "D97706",
  lightBlue:  "EFF6FF",
  lightGray:  "F8FAFC",
  midGray:    "64748B",
  white:      "FFFFFF",
  border:     "CBD5E1",
  headerBg:   "1A3A5C",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const pt = (n) => n * 2; // half-points

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: pt(18), after: pt(8) },
    shading: { type: ShadingType.SOLID, color: C.primary, fill: C.primary },
    run: { color: C.white, bold: true, size: pt(20) },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(15), color: C.primary })],
    spacing: { before: pt(14), after: pt(4) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.accent } },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(12), color: C.accent })],
    spacing: { before: pt(10), after: pt(3) },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: pt(11), color: "333333", ...opts })],
    spacing: { after: pt(4) },
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, size: pt(11), bold })],
    bullet: { level: 0 },
    spacing: { after: pt(3) },
  });
}

function callout(text, color = C.lightBlue, borderColor = C.accent) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text, size: pt(10), color: "1e3a5f", italics: true })],
            })],
            shading: { type: ShadingType.SOLID, color: color },
            borders: {
              left: { style: BorderStyle.THICK, size: 12, color: borderColor },
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
            },
            margins: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15), top: 80, bottom: 80 },
          }),
        ],
      }),
    ],
  });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ text: "", spacing: { after: pt(6) } })
  );
}

function tableHeader(cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: pt(10), color: C.white })],
          alignment: AlignmentType.LEFT,
        })],
        shading: { type: ShadingType.SOLID, color: C.primary },
        verticalAlign: VerticalAlign.CENTER,
        margins: { left: 80, right: 80, top: 60, bottom: 60 },
      })
    ),
  });
}

function tableRow(cells, shaded = false) {
  return new TableRow({
    children: cells.map((text) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: text ?? "—", size: pt(10), color: "222222" })],
        })],
        shading: shaded
          ? { type: ShadingType.SOLID, color: C.lightGray }
          : undefined,
        margins: { left: 80, right: 80, top: 50, bottom: 50 },
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border },
          top: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
      })
    ),
  });
}

function dataTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      tableHeader(headers),
      ...rows.map((r, i) => tableRow(r, i % 2 === 1)),
    ],
  });
}

// ── Cover page ─────────────────────────────────────────────────────────────────

function coverPage() {
  return [
    new Paragraph({
      children: [new TextRun({ text: "", size: pt(40) })],
      spacing: { after: pt(60) },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "ScrutMan",
        bold: true, size: pt(40), color: C.primary,
      })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({
        text: "RFID Portal Scanning System",
        bold: true, size: pt(24), color: C.accent,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(6) },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "Hardware- og programvarespesifikasjon",
        size: pt(14), color: C.midGray, italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(40) },
    }),

    // Divider line
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [new TableCell({
        children: [new Paragraph({ text: "" })],
        shading: { type: ShadingType.SOLID, color: C.accent },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                   left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        margins: { top: 60, bottom: 60 },
      })] })],
    }),

    ...spacer(2),

    new Paragraph({
      children: [new TextRun({ text: "Formål", bold: true, size: pt(12), color: C.primary })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({
        text: "Et plug-and-play portalskanning-system for motorsport. Fire RFID-antenner montert i " +
              "en portalramme leser RFID-chip i alle 4 dekk automatisk når bilen kjører igjennom. " +
              "Systemet sjekker opp mot registrerte dekk i ScrutMan og gir grønt eller rødt lys.",
        size: pt(11), color: "444444",
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(20) },
    }),

    ...spacer(6),

    new Paragraph({
      children: [new TextRun({ text: "Mai 2026  ·  Versjon 1.0  ·  FIA LT54", size: pt(10), color: C.midGray })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      pageBreakBefore: true,
      text: "",
    }),
  ];
}

// ── Main document ──────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullet-list",
      levels: [{
        level: 0,
        format: NumberFormat.BULLET,
        text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 260 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.2),
        },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "ScrutMan — RFID Portal Scanning System", size: pt(9), color: C.midGray }),
              new TextRun({ text: "  |  Konfidensielt", size: pt(9), color: C.midGray, italics: true }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Side ", size: pt(9), color: C.midGray }),
              new TextRun({ children: [PageNumber.CURRENT], size: pt(9), color: C.midGray }),
              new TextRun({ text: " av ", size: pt(9), color: C.midGray }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: pt(9), color: C.midGray }),
              new TextRun({ text: "    ·    ScrutMan FIA LT54 Tyre Management  ·  Mai 2026", size: pt(9), color: C.midGray }),
            ],
            alignment: AlignmentType.RIGHT,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
          }),
        ],
      }),
    },
    children: [

      // ── Cover ──────────────────────────────────────────────────────────────
      ...coverPage(),

      // ── 1. Overordnet systemoversikt ───────────────────────────────────────
      h1("1.  Overordnet systemoversikt"),
      ...spacer(),
      callout(
        "Filosofi: Plug-and-play. Sett opp teltet, koble til kabler, start appen — " +
        "systemet er live. Alt kommuniserer over lokalt nettverk (LAN). " +
        "Internett trengs kun for å synkronisere med ScrutMan-skyen.",
      ),
      ...spacer(),
      body("En bil kjører sakte gjennom portalrammen (5–10 km/h):"),
      bullet("Sone 1 (Read):  Antenne 1 og 2 fanger RFID-tag i alle 4 dekk"),
      bullet("Sone 2 (Verify):  Antenne 3 og 4 bekrefter avlesningene — nærmest null tapte tags"),
      bullet("Signal-lampe gir GRØNT (alle 4 OK) eller RØDT (ett eller flere feilet)"),
      ...spacer(),

      h2("Systemdiagram"),
      ...spacer(),
      dataTable(
        ["Komponent", "Rolle"],
        [
          ["4-port UHF RFID Reader", "Mottar signaler fra alle 4 antenner"],
          ["4× UHF Panel-antenne", "Leser RFID-chip i dekkene fra siden"],
          ["Windows Mini-PC", "Kjører ScrutMan Portal App, styrer lampen"],
          ["USB Relay-boks", "Kobler Windows-appen til signallampene"],
          ["2× LED Signal-lampe", "Grønn / Amber / Rød — synlig 30+ meter"],
          ["4G/5G-ruter eller Starlink", "Internett-opplink mot ScrutMan-sky"],
          ["Gigabit switch", "LAN-ryggrad: PC ↔ Reader ↔ Ruter"],
          ["Pop-up telt (6×3 m)", "Husrom for all utstyr og marshal"],
        ]
      ),

      ...spacer(2),

      // ── 2. Hardware – detaljert ────────────────────────────────────────────
      h1("2.  Hardware — Detaljert spesifikasjon"),

      // 2.1 Reader
      h2("2.1  UHF RFID Reader"),
      ...spacer(),
      callout(
        "Én 4-port reader håndterer alle fire antenner. " +
        "Det trengs altså kun én enhet — ikke fire separate lesere."
      ),
      ...spacer(),
      dataTable(
        ["Egenskap", "Spesifikasjon"],
        [
          ["Modell", "UHF RFID 4-port portalleser"],
          ["Referanse", "Alibaba — Custom UHF RFID Tag Parking Reader"],
          ["Standard", "EPC Gen2 / ISO 18000-6C (FIA LT54-kompatibel)"],
          ["Frekvens", "EU: 865–868 MHz / Global: 902–928 MHz"],
          ["Antenneporter", "4 porter (alle 4 antenner kobles til én reader)"],
          ["Grensesnitt", "RJ-45 Ethernet (TCP/IP) og/eller USB"],
          ["Output", "EPC-streng + RSSI + tidsstempel per tag-avlesning"],
          ["Antall", "1 stk"],
        ]
      ),

      ...spacer(2),

      // 2.2 Antenner
      h2("2.2  RFID-antenner"),
      ...spacer(),
      dataTable(
        ["Egenskap", "Spesifikasjon"],
        [
          ["Type", "Direktiv / panel-antenne, lineært polarisert"],
          ["Forsterkning", "8–12 dBi"],
          ["Leserekkevidde", "0,5–2 m (justeres via effektinnstillinger)"],
          ["Tilkobling", "RP-SMA eller N-type (matche reader)"],
          ["Montering", "Sidemontert på portalramme, 2 per side"],
          ["Plassering", "Ca. 45 cm fra bakken — dekkets navhøyde (FIA LT54)"],
          ["Antall", "4 stk"],
        ]
      ),
      ...spacer(),
      body("Montering — sidevisning av portalrammen:", { bold: true }),
      new Paragraph({
        children: [new TextRun({
          text:
            "  VENSTRE SIDE                  HØYRE SIDE\n" +
            "  ────────────                  ──────────\n" +
            "  [Ant 1] ──►              ◄── [Ant 2]    (Sone 1 — Read)\n" +
            "  [Ant 3] ──►              ◄── [Ant 4]    (Sone 2 — Verify)\n\n" +
            "  Bilen kjører venstre → høyre",
          font: "Courier New", size: pt(10), color: "333333",
        })],
        spacing: { before: pt(4), after: pt(8) },
      }),

      ...spacer(),

      // 2.3 Portalramme
      h2("2.3  Portalramme og telt"),
      ...spacer(),
      dataTable(
        ["Egenskap", "Spesifikasjon"],
        [
          ["Type", "Modulær aluminiumsramme med stativsøyler og tverrstang"],
          ["Bredde", "≥ 3 m (standard bilbredde + klaring)"],
          ["Høyde", "≥ 2 m"],
          ["Materiale", "Aluminium (ikke-metallisk fortrekkes for å unngå RF-interferens)"],
          ["Montering", "Verktøyfri klikk-/boltkobling, pakkes i bæreveske"],
          ["Telt", "6×3 m pop-up telt som huser hele stasjonen"],
        ]
      ),

      ...spacer(2),

      // 2.4 Signallampe
      h2("2.4  Signal-lampe (trafikklystarnet)"),
      ...spacer(),
      dataTable(
        ["Egenskap", "Spesifikasjon"],
        [
          ["Type", "Industriell LED-signaltårn — 3-farger (IP65)"],
          ["Farger brukt", "🟢 Grønn = PASS  ·  🔴 Rød = FAIL  ·  🟡 Amber = Scanning pågår"],
          ["Grensesnitt", "USB relay-boks (Sainsmart 4-kanal) ELLER nettverks-relay (Shelly Pro 2)"],
          ["Synlighet", "≥ 30 m, utendørs godkjent IP65"],
          ["Antall", "2 stk — én mot sjåfør, én mot marshal"],
        ]
      ),
      ...spacer(),
      callout(
        "Plug-and-play alternativ: Nettverksstyrte smart-reléer (f.eks. Shelly Pro 2) lar " +
        "Windows-appen styre lampene via HTTP — ingen seriell driver nødvendig.",
        "FFF7ED",
        C.amber,
      ),

      ...spacer(2),

      // 2.5 Windows PC
      h2("2.5  Windows Mini-PC (kontrollenhet)"),
      ...spacer(),
      dataTable(
        ["Egenskap", "Spesifikasjon"],
        [
          ["Formfaktor", "Mini-PC (Intel NUC, Beelink SER eller lignende)"],
          ["OS", "Windows 10 / 11 (64-bit)"],
          ["RAM", "8 GB minimum"],
          ["Lagring", "256 GB SSD"],
          ["Nettverk", "Gigabit Ethernet + Wi-Fi (dobbelt)"],
          ["Porter", "2× USB-A (reader + relay), 1× HDMI (skjerm)"],
          ["Strøm", "UPS-støttet (liten UPS eller powerbank for PC)"],
          ["Skjerm", "15–24\" for operatørvisning"],
        ]
      ),

      ...spacer(2),

      // 2.6 Nettverksutstyr
      h2("2.6  Nettverksutstyr"),
      ...spacer(),
      dataTable(
        ["Enhet", "Formål"],
        [
          ["4G/5G-ruter eller Starlink", "Internett-opplink for synkronisering med ScrutMan-sky"],
          ["Gigabit switch (8-port)", "LAN-ryggrad — kobler PC, reader og lamper"],
          ["Cat6 patchkabler (5 m og 10 m)", "Reader ↔ switch ↔ PC"],
          ["Wi-Fi Access Point (valgfritt)", "Gir tablets og mobiltelefoner tilgang for marshaler"],
        ]
      ),

      ...spacer(2),

      // 2.7 Kabler og strøm
      h2("2.7  Kabler og strøm"),
      ...spacer(),
      dataTable(
        ["Komponent", "Spesifikasjon"],
        [
          ["Antennekabler", "LMR-195 eller tilsvarende, RP-SMA, 3–5 m per kabel"],
          ["Grenuttak", "6-veis med overspenningsvern"],
          ["Skjøtekabel", "25 m tungbelastet (230V / 16A)"],
          ["Generator (valgfritt)", "1 kW bensin/inverter-type hvis ikke strøm på banen"],
        ]
      ),

      ...spacer(2),

      // ── 3. Innkjøpsliste ───────────────────────────────────────────────────
      h1("3.  Komplett innkjøpsliste"),
      ...spacer(),
      dataTable(
        ["#", "Komponent", "Antall", "Kilde / Merknad"],
        [
          ["1", "UHF RFID 4-port portalleser (EPC Gen2)", "1 stk", "Alibaba — Custom UHF RFID Parking Reader"],
          ["2", "UHF RFID panel-antenne, 8–12 dBi", "4 stk", "Samme leverandør som reader"],
          ["3", "Antennekabel LMR-195, RP-SMA, 5 m", "4 stk", "RF-kabelleverandør"],
          ["4", "Modulær aluminiumsportalramme (3 m bred)", "1 stk", "Eventsutstyr-leverandør"],
          ["5", "Pop-up telt 6×3 m", "1 stk", "Lokalt / nettbutikk"],
          ["6", "Industriell LED-signallampe IP65 (3-farger)", "2 stk", "Industriell leverandør"],
          ["7", "USB relay-boks 4-kanal (Sainsmart e.l.)", "1 stk", "Amazon / Kjell & Company"],
          ["8", "Mini-PC (Intel NUC eller Beelink SER)", "1 stk", "Lokal elektronikk-forhandler"],
          ["9", "15\" skjerm (operatørvisning)", "1 stk", "Lokal elektronikk-forhandler"],
          ["10", "4G/5G-ruter ELLER Starlink-pakke", "1 stk", "Telia / Starlink.com"],
          ["11", "Gigabit 8-port switch", "1 stk", "TP-Link / Netgear"],
          ["12", "Cat6 patchkabler (5 m + 10 m)", "4 stk", "Lokal / nettbutikk"],
          ["13", "Grenuttak (overspenningsvern) + 25 m skjøtekabel", "1 sett", "Lokal"],
          ["14", "UPS for PC (1000 VA)", "1 stk", "APC / Eaton"],
        ]
      ),

      ...spacer(2),

      // ── 4. Programvare ─────────────────────────────────────────────────────
      h1("4.  Programvare — Windows Desktop-applikasjon"),

      h2("4.1  Teknologianbefaling"),
      ...spacer(),
      callout(
        "Anbefalt: Electron + React. Gjenbruker eksisterende UI-kode fra ScrutMan-nettappen. " +
        "Enkel distribusjon som en installerbar Windows .exe med automatisk oppdatering.",
      ),
      ...spacer(),
      dataTable(
        ["Alternativ", "Teknologi", "Fordeler"],
        [
          ["A (anbefalt)", "Electron + React", "Gjenbruker React-kunnskap, web-UI, enkle oppdateringer"],
          ["B", "Tauri + React", "Lettere enn Electron, Rust-backend for serial/USB"],
          ["C", "WPF / .NET", "Native Windows, best serial/USB-støtte"],
        ]
      ),

      ...spacer(),
      h2("4.2  Kjernefunksjoner"),
      ...spacer(),
      bullet("Startnummer-input — operatøren taster/skanner startnummeret før bilen kjører inn"),
      bullet("RFID tag-lytter — åpner TCP-sokkel mot reader, mottar EPC-strenger i sanntid"),
      bullet("Dedupliceringsvindu — 2-sekunders vindu grupperer alle avlesninger fra én gjennomkjøring"),
      bullet("Lokal oppslag — sammenligner mottatte EPC-er mot dekkene sjåføren har registrert (lokal SQLite)"),
      bullet("Lampestyring — sender signal til USB-relé eller HTTP-endepunkt for å bytte lampefarge"),
      bullet("Operatørvisning — stor-font-resultat med startnr, sjåførnavn og hjulstatus"),
      bullet("Offline-modus — køer sesjoner lokalt og pusher til sky når tilkoblet"),
      bullet("Sync-bundle — laster ned full event-data (sjåfører + dekk) før sesjonsstart"),

      ...spacer(),
      h2("4.3  Skanneflyt"),
      ...spacer(),
      dataTable(
        ["Steg", "Handling", "Systemrespons"],
        [
          ["1", "Operatør taster startnummer", "System armerer — Amber lampe PÅ"],
          ["2", "Bilen kjører sakte igjennom (2–4 sek)", "Reader sender EPC-tags for alle 4 dekk"],
          ["3", "App deduplicerer EPC-er i tidsvinduet", "Unike EPC-er per hjulposisjon identifiseres"],
          ["4", "Oppslag mot sjåførens registrerte dekk", "Hvert hjul: match? → GRØNN / ingen match? → RØD"],
          ["5a", "Alle 4 hjul GRØNNE", "Grønn lampe ON (3 sek) — bilen slippes igjennom"],
          ["5b", "Minst 1 hjul RØDT", "Rød lampe ON — bilen stoppes, marshal varsles"],
          ["6", "Sesjon loggføres og synkes til sky", "ScrutMan rapport oppdateres"],
        ]
      ),

      ...spacer(),
      h2("4.4  Hjulposisjonsdeteksjon"),
      ...spacer(),
      body("Hjulposisjon utledes fra hvilken antennport signalet er sterkest (RSSI):"),
      ...spacer(),
      dataTable(
        ["Antennport", "Posisjon"],
        [
          ["Port 1 (Sone 1 Venstre)", "Foran-Venstre (FL)"],
          ["Port 2 (Sone 1 Høyre)", "Foran-Høyre (FR)"],
          ["Port 3 (Sone 2 Venstre)", "Bak-Venstre (RL)"],
          ["Port 4 (Sone 2 Høyre)", "Bak-Høyre (RR)"],
        ]
      ),

      ...spacer(2),

      // ── 5. Tilkoblingsmodi ─────────────────────────────────────────────────
      h1("5.  Tilkoblingsmodi"),
      ...spacer(),
      dataTable(
        ["Modus", "Beskrivelse", "Lamperesponstid"],
        [
          ["Online", "Live-sync til sky per skann", "< 1 sekund"],
          ["Offline (hurtigbuffer)", "Bruker sist synkronisert event-data fra lokal SQLite", "< 0,5 sekund"],
          ["Ettersynk", "Kølede sesjoner lastes opp når tilkobling gjenopprettes", "N/A"],
        ]
      ),
      ...spacer(),
      callout(
        "Internettforbindelse er IKKE nødvendig for selve skanning-operasjonen. " +
        "Sync-bundle lastes ned én gang før start. " +
        "Offline-modus er fullt funksjonelt og synkroniserer automatisk i bakgrunnen.",
        "F0FDF4",
        C.green,
      ),

      ...spacer(2),

      // ── 6. Oppsettguide ────────────────────────────────────────────────────
      h1("6.  Oppsett på stevnedagen"),
      ...spacer(),
      body("Estimert oppsett: 45 minutter med 2 personer.", { bold: true }),
      ...spacer(),
      dataTable(
        ["Steg", "Oppgave"],
        [
          ["1", "Reis telt (6×3 m) og plasser ved inngang/utgang av kjørebanen"],
          ["2", "Monter portalramme inne i teltet, sentrert i banen"],
          ["3", "Fest antenner på rammesøylene — 2 per side, navhøyde (ca. 45 cm)"],
          ["4", "Koble antennekabler til reader (porter 1–4)"],
          ["5", "Plasser reader i værtett boks på rammen eller teltfoten"],
          ["6", "Koble reader til switch via Cat6"],
          ["7", "Monter signallamper — én mot innkommende sjåfør, én mot marshal"],
          ["8", "Koble lamper til USB relay-boks på PC"],
          ["9", "Koble alt til strøm via grenuttak (generator eller strømnett)"],
          ["10", "Start Windows-PC og åpne ScrutMan Portal-appen"],
          ["11", "Synkroniser event-data fra sky (eller bruk hurtigbuffer)"],
          ["12", "Test med en RFID-testtag gjennom hver antennone — bekreft avlesning og lampe"],
        ]
      ),

      ...spacer(2),

      // ── 7. Hva som er bygget ───────────────────────────────────────────────
      h1("7.  Hva som allerede finnes i ScrutMan"),
      ...spacer(),
      body("Følgende er allerede implementert og klart til å motta data fra portalen:"),
      ...spacer(),
      dataTable(
        ["API / Funksjon", "Status", "Beskrivelse"],
        [
          ["POST /api/scan-sessions", "✅ Ferdig", "Mottar og lagrer skanresultater per heat"],
          ["GET /api/events/[id]/portal-lookup", "✅ Ferdig", "Returnerer sjåfør + registrerte dekk for et startnummer"],
          ["GET /api/events/[id]/sync-bundle", "✅ Ferdig", "Full offline-datapakke for pre-event synkronisering"],
          ["Dekkinspesjonsrapport (web)", "✅ Ferdig", "Per-heat tabeller med paginering og sortering"],
          ["Hendelses-PDF (Incident Report)", "✅ Ferdig", "PDF per feilet skannøkt"],
          ["Sluttrapport-PDF (Final Summary)", "✅ Ferdig", "Samlet PDF for hele arrangementet"],
          ["Heat-sporing", "✅ Ferdig", "Skannsesjonene er knyttet til heat"],
          ["Offline-arkitektur", "✅ Ferdig", "Lokal Node.js-tjeneste med SQLite-synk (scanner-node)"],
        ]
      ),
      ...spacer(),
      h2("Hva som gjenstår å bygge"),
      ...spacer(),
      bullet("Windows Desktop-app (Electron + React)"),
      bullet("RFID reader SDK-integrasjon (leverandør gir TCP-protokolldokumentasjon)"),
      bullet("USB relay-driver for lampestyring"),
      bullet("Installer og auto-oppdateringsmekanisme for Windows-appen"),

      ...spacer(2),

      // ── Footer note ────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({
          text: "Dokument: ScrutMan RFID Portal Hardware Specification  ·  Versjon 1.0  ·  Mai 2026",
          size: pt(9), color: C.midGray, italics: true,
        })],
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
        spacing: { before: pt(20) },
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT, buffer);
console.log(`✅  Word-dokument generert: ${OUT}`);
