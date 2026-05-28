/**
 * FIA Technical List No. 54 — Tyre Barcodes and RFID Tags
 * Source: FIA SPORT, 26.11.2025
 */

/** First digit of FIA Interleaved 2/5 barcode → manufacturer(s) */
export const FIA_MANUFACTURER_CODES: Record<number, string[]> = {
  0: ["Michelin", "Nankang", "Nexen", "SESS Tyres"],
  1: ["Avon / Nova Tyres", "Hoosier", "MRF"],
  2: ["Dunlop (SRI)", "Falken"],
  3: ["Maxsport", "Silverstone"],
  4: ["Toyo"],
  5: ["Pirelli"],
  6: ["Yokohama", "Sailun"],
  7: ["Baracatt Motorsport", "DMack", "Goodyear", "Kuhmo"],
  8: ["Bridgestone", "GITI"],
  9: ["Extreme Tyres", "Hankook"],
};

/** Reverse lookup: manufacturer name → FIA code */
export const MANUFACTURER_TO_FIA_CODE: Record<string, number> = Object.entries(
  FIA_MANUFACTURER_CODES
).reduce(
  (acc, [code, names]) => {
    names.forEach((name) => {
      acc[name.toLowerCase()] = Number(code);
    });
    return acc;
  },
  {} as Record<string, number>
);

/** Approved RFID chip models per FIA LT54 */
export const FIA_RFID_CHIP_MODELS = [
  "Impinj Monza 4",
  "Impinj Monza 750",
  "Impinj Monza R6P",
  "Impinj M730",
  "Alien Higgs-3",
  "Alien Higgs-9",
  "NXP UCODE 7xm-1K",
  "NXP UCODE 8",
  "NXP UCODE 9xe",
] as const;

/** Approved barcode suppliers per FIA LT54 */
export const FIA_BARCODE_SUPPLIERS = [
  "Seriplastica",
  "Transfer Gomma Srl",
  "Polymeric Labels Limited",
  "TIP Sérigraphie",
] as const;

/** RFID frequency range per LT54 */
export const FIA_RFID_FREQUENCY = "860–960 MHz (UHF EPC Gen2)";

/** RFID encoding standard */
export const FIA_RFID_PROTOCOL = "EPC Gen2 / SGTIN-96";

/** Barcode format */
export const FIA_BARCODE_FORMAT = "Interleaved 2 of 5";

/** Valid barcode digit lengths (single and double) */
export const FIA_BARCODE_LENGTHS = [8, 10] as const;

/**
 * Validate an FIA barcode:
 * - 8 or 10 digits
 * - Numeric only
 * - First digit must be 0–9 (all valid)
 */
export function validateFiaBarcode(code: string): {
  valid: boolean;
  error?: string;
  manufacturerCode?: number;
  manufacturers?: string[];
} {
  if (!/^\d{8,10}$/.test(code)) {
    return {
      valid: false,
      error: "FIA strekkode må være 8 eller 10 siffer (Interleaved 2/5)",
    };
  }
  const firstDigit = parseInt(code[0]);
  const manufacturers = FIA_MANUFACTURER_CODES[firstDigit];
  return {
    valid: true,
    manufacturerCode: firstDigit,
    manufacturers,
  };
}

/**
 * Validate an EPC hex string (RFID tag from UHF reader).
 * Standard EPC96 = 24 hex chars. Accept 20–32 hex chars for flexibility.
 */
export function validateEpcHex(epc: string): { valid: boolean; error?: string } {
  const cleaned = epc.trim().toUpperCase().replace(/\s/g, "");
  if (!/^[0-9A-F]+$/.test(cleaned)) {
    return { valid: false, error: "EPC-kode må inneholde kun hex-tegn (0-9, A-F)" };
  }
  if (cleaned.length < 20 || cleaned.length > 32) {
    return {
      valid: false,
      error: `EPC-kode er ${cleaned.length} hex-tegn. Forventet 20–32 (typisk 24 for SGTIN-96)`,
    };
  }
  return { valid: true };
}

/** Normalise EPC hex to uppercase without spaces */
export function normaliseEpc(epc: string): string {
  return epc.trim().toUpperCase().replace(/\s/g, "");
}
