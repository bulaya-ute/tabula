import * as XLSX from 'xlsx';
import type { CellValue, FileData, OutputFormat } from '../types';

export async function readFile(file: File): Promise<FileData> {
  const buf = await file.arrayBuffer();
  const wb  = XLSX.read(buf, { type: 'array' });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<CellValue[]>(ws, { header: 1, defval: null });
  const [headerRow = [], ...dataRows] = aoa;
  const headers = headerRow.map(h => String(h ?? ''));
  return { file, headers, rows: dataRows, rowCount: dataRows.length };
}

export function download(aoa: CellValue[][], filename: string, format: OutputFormat) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
  } else {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}

export function normalise(v: CellValue): string {
  return String(v ?? '').trim().toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function stemName(file: File): string {
  return file.name.replace(/\.[^.]+$/, '');
}
