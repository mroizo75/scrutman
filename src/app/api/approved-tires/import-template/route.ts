import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = [
    "manufacturer",
    "model",
    "size",
    "compound",
    "discipline",
    "subDiscipline",
    "fiaCode",
    "rfidChip",
    "barcodeSupplier",
    "maxNew",
    "maxTotal",
  ];

  const example = [
    "Maxxis",
    "R800 K71",
    "22x10-10",
    "Soft",
    "AUTOCROSS",
    "SB",
    "1",
    "Impinj Monza",
    "GS1",
    "6",
    "10",
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, "ApprovedTyres");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="approved-tyres-template.xlsx"',
    },
  });
}
