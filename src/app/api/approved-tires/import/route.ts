import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FIA_ROLES } from "@/lib/auth";
import * as XLSX from "xlsx";

async function requireFiaOrFedAdmin() {
  const cookieStore = await cookies();
  const userData = cookieStore.get("user");
  if (!userData) return null;
  const user = JSON.parse(userData.value);
  return (FIA_ROLES as readonly string[]).includes(user.role) ? user : null;
}

interface ImportRow {
  manufacturer?: string;
  model?: string;
  size?: string;
  compound?: string;
  discipline?: string;
  subDiscipline?: string;
  fiaCode?: string | number;
  rfidChip?: string;
  barcodeSupplier?: string;
  maxNew?: string | number;
  maxTotal?: string | number;
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: ImportRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [idx, row] of rows.entries()) {
    const rowNum = idx + 2;
    const manufacturer = String(row.manufacturer ?? "").trim();
    const model = String(row.model ?? "").trim();
    const size = String(row.size ?? "").trim();
    const compound = String(row.compound ?? "").trim() || null;
    const disciplineRaw = String(row.discipline ?? "").trim().toUpperCase();
    const subDisciplineCode = String(row.subDiscipline ?? "").trim().toUpperCase();
    const euRegRef = String(row.fiaCode ?? "").trim() || null;
    const rfidChipModel = String(row.rfidChip ?? "").trim() || null;
    const barcodeSupplier = String(row.barcodeSupplier ?? "").trim() || null;
    const fiaManufacturerCode = row.fiaCode ? Number(row.fiaCode) : null;

    if (!manufacturer || !model || !size) {
      errors.push(`Row ${rowNum}: manufacturer, model and size are required`);
      skipped++;
      continue;
    }

    const validCategories = [
      "AUTOCROSS", "BILCROSS", "RACING", "RALLYCROSS", "DRIFTING",
      "TIME_ATTACK", "DRAG_RACING", "CIRCUIT", "HILLCLIMB", "OTHER",
    ];
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
