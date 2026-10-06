import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCsv } from "@/lib/utils";
import { toast } from "sonner";

type ExportDropdownProps = {
  title: string;
  filename: string;
  headers: string[];
  rows: unknown[][];
};

export function ExportDropdown({ title, filename, headers, rows }: ExportDropdownProps) {
  function exportExcel() {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = headers.map((header, column) => ({
      wch: Math.min(
        48,
        Math.max(
          header.length + 2,
          ...rows.map((row) => String(row[column] ?? "").split("\n")[0].length + 2),
        ),
      ),
    }));
    worksheet["!autofilter"] = {
      ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(1, rows.length + 1)}`,
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  function exportPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Allow pop-ups to open the printable report.");
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    const tableRows = rows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`)
      .join("");
    const emptyRow =
      rows.length === 0
        ? `<tr><td colspan="${headers.length}" class="empty">No records match the selected filters.</td></tr>`
        : "";

    printWindow.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: landscape; margin: 16mm; }
            body { color: #172033; font: 12px/1.5 Arial, "Noto Sans Myanmar", sans-serif; }
            h1 { margin: 0; color: #142b4a; font-size: 24px; }
            .meta { margin: 4px 0 20px; color: #5d6879; }
            table { width: 100%; border-collapse: collapse; table-layout: auto; }
            th { background: #183b5b; color: white; text-align: left; }
            th, td { border: 1px solid #d6dce5; padding: 8px; vertical-align: top; }
            tbody tr:nth-child(even) { background: #f1f5f9; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            .empty { text-align: center; color: #5d6879; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="meta">${rows.length} ${rows.length === 1 ? "record" : "records"} · Generated ${escapeHtml(new Date().toLocaleString())}</p>
          <table>
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>${tableRows}${emptyRow}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="flex items-center gap-1.5">
          <Download className="size-3.5" />
          Export
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => downloadCsv(`${filename}.csv`, headers, rows)}>
          <FileText />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportExcel}>
          <FileSpreadsheet />
          Export Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportPdf}>
          <FileText />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
