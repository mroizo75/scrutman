import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ApprovedTyres");

  ws.columns = [
    { header: "manufacturer",    key: "manufacturer",    width: 18 },
    { header: "model",           key: "model",           width: 18 },
    { header: "size",            key: "size",            width: 18 },
    { header: "compound",        key: "compound",        width: 18 },
    { header: "discipline",      key: "discipline",      width: 18 },
    { header: "subDiscipline",   key: "subDiscipline",   width: 18 },
    { header: "fiaCode",         key: "fiaCode",         width: 18 },
    { header: "rfidChip",        key: "rfidChip",        width: 18 },
    { header: "barcodeSupplier", key: "barcodeSupplier", width: 18 },
    { header: "maxNew",          key: "maxNew",          width: 18 },
    { header: "maxTotal",        key: "maxTotal",        width: 18 },
  ];

  // Style header row
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F7" } };
  });

  // Example row
  ws.addRow({
    manufacturer: "Maxxis",
    model: "R800 K71",
    size: "22x10-10",
    compound: "Soft",
    discipline: "AUTOCROSS",
    subDiscipline: "SB",
    fiaCode: "1",
    rfidChip: "Impinj Monza",
    barcodeSupplier: "GS1",
    maxNew: "6",
    maxTotal: "10",
  });

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="approved-tyres-template.xlsx"',
    },
  });
}
