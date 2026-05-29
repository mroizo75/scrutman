import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FIA_ROLES } from "@/lib/auth";
import ExcelJS from "exceljs";

async function requireFiaOrFedAdmin() {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return null;
  const user = JSON.parse(userData.value);
  return (FIA_ROLES as readonly string[]).includes(user.role) ? user : null;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    // RichText: { richText: [...] }
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("").trim();
    // Hyperlink: { text, hyperlink }
    if ("text" in v) return String((v as { text: unknown }).text ?? "").trim();
    // Formula result: { formula, result }
    if ("result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "").trim();
  }
  return String(v).trim();
}

export async function POST(req: NextRequest) {
  const actor = await requireFiaOrFedAdmin();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Only .xlsx, .xls or .csv files are accepted" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  // ExcelJS type definitions don't reflect Node.js Buffer<ArrayBufferLike> correctly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(Buffer.from(arrayBuffer) as any);

  const ws = wb.worksheets[0];
  if (!ws) {
    return NextResponse.json({ error: "No worksheet found in file" }, { status: 400 });
  }

  // Build column-index map from header row
  const headerRow = ws.getRow(1);
  const colMap: Record<string, number> = {};
  headerRow.eachCell((cell, colNum) => {
    const key = cellStr(cell).toLowerCase().trim();
    if (key) colMap[key] = colNum;
  });

  const get = (row: ExcelJS.Row, name: string): string =>
    colMap[name] ? cellStr(row.getCell(colMap[name])) : "";

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  const validCategories = [
    "AUTOCROSS", "BILCROSS", "RACING", "RALLYCROSS", "DRIFTING",
    "TIME_ATTACK", "DRAG_RACING", "CIRCUIT", "HILLCLIMB", "OTHER",
  ];

  const rows: { row: ExcelJS.Row; rowNum: number }[] = [];
  ws.eachRow((row, rowNum) => { if (rowNum > 1) rows.push({ row, rowNum }); });

  for (const { row, rowNum } of rows) {
    const manufacturer = get(row, "manufacturer");
    const model        = get(row, "model");
    const size         = get(row, "size");
    const compound     = get(row, "compound") || null;
    const disciplineRaw = get(row, "discipline").toUpperCase();
    const subDisciplineCode = get(row, "subdiscipline").toUpperCase();
    const fiaCodeRaw   = get(row, "fiacode");
    const euRegRef     = fiaCodeRaw || null;
    const rfidChipModel    = get(row, "rfidchip") || null;
    const barcodeSupplier  = get(row, "barcodesupplier") || null;
    const fiaManufacturerCode = fiaCodeRaw ? Number(fiaCodeRaw) : null;

    if (!manufacturer || !model || !size) {
      errors.push(`Row ${rowNum}: manufacturer, model and size are required`);
      skipped++;
      continue;
    }

    if (disciplineRaw && !validCategories.includes(disciplineRaw)) {
      errors.push(`Row ${rowNum}: unknown discipline "${disciplineRaw}"`);
      skipped++;
      continue;
    }

    const disciplines = disciplineRaw ? JSON.stringify([disciplineRaw]) : JSON.stringify([]);

    let subDisciplineId: string | null = null;
    if (subDisciplineCode) {
      const sub = await prisma.subDiscipline.findFirst({
        where: { shortCode: subDisciplineCode },
      });
      if (sub) subDisciplineId = sub.id;
      else errors.push(`Row ${rowNum}: sub-discipline "${subDisciplineCode}" not found — skipping link`);
    }

    const existing = await prisma.approvedTire.findFirst({
      where: { manufacturer, model, size, disciplines },
    });

    if (existing) {
      await prisma.approvedTire.update({
        where: { id: existing.id },
        data: { compound, euRegRef, rfidChipModel, barcodeSupplier, fiaManufacturerCode, subDisciplineId },
      });
      updated++;
    } else {
      await prisma.approvedTire.create({
        data: {
          manufacturer,
          model,
          size,
          compound,
          disciplines,
          euRegRef,
          rfidChipModel,
          barcodeSupplier,
          fiaManufacturerCode,
          subDisciplineId,
          approvedById: actor.id,
        },
      });
      imported++;
    }
  }

  return NextResponse.json({ imported, updated, skipped, errors });
}
