import ExcelJS from "exceljs";

export interface SheetDef {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number>[];
}

export async function downloadWorkbook(filename: string, sheets: SheetDef[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Code Reset";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    ws.columns = sheet.columns;
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" },
    };
    ws.addRows(sheet.rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
