import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { FileText, Printer, Download, Filter, CheckSquare, BarChart3, FileSpreadsheet, Search } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";

interface FieldOption {
  key: string;
  label: string;
  getValue: (wo: any) => string;
}

function parseTimeToMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(":");
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatMinutesToHHMM(totalMinutes: number): string {
  if (totalMinutes <= 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getWorkOrderTotalMinutes(wo: any): number {
  if (!wo.items || wo.items.length === 0) return 0;
  return wo.items.reduce((sum: number, item: any) => {
    const start = parseTimeToMinutes(item.startTime || "");
    const end = parseTimeToMinutes(item.endTime || "");
    const diff = end >= start ? end - start : 0;
    return sum + diff;
  }, 0);
}

export default function WorkOrderReports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [reportMode, setReportMode] = useState<"detailed" | "summary">("detailed");
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "jobNo", "date", "equipment", "maintenanceType", "status"
  ]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showReport, setShowReport] = useState(false);

  const [summarySearch, setSummarySearch] = useState("");
  const [summaryDateFrom, setSummaryDateFrom] = useState("");
  const [summaryDateTo, setSummaryDateTo] = useState("");
  const [summaryFind, setSummaryFind] = useState("all");

  const { data: workOrders, isLoading, isError } = useQuery<any[]>({
    queryKey: [api.workOrders.list.path],
  });

  const { data: maintenanceTypeConfigs } = useQuery<any[]>({
    queryKey: [api.maintenanceTypeConfigs.list.path],
  });

  const getMtLabel = (typeName: string) => {
    const mtConfig = maintenanceTypeConfigs?.find(m => m.name === typeName);
    return mtConfig ? (language === "pt" ? mtConfig.labelPt : mtConfig.labelEn) : typeName;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: t.workOrders.open,
      in_progress: t.workOrders.inProgress,
      completed: t.workOrders.completed,
    };
    return labels[status] || status;
  };

  const fieldOptions: FieldOption[] = useMemo(() => [
    { key: "jobNo", label: t.workOrders.jobNo, getValue: (wo) => wo.jobNo || "-" },
    { key: "date", label: t.workOrders.date, getValue: (wo) => wo.date ? format(new Date(wo.date), "dd/MM/yyyy") : "-" },
    { key: "equipment", label: t.workOrders.equipment, getValue: (wo) => wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model}` : "-" },
    { key: "equipmentNo", label: t.workOrders.equipmentNo, getValue: (wo) => wo.vehicle?.licensePlate || "-" },
    { key: "maintenanceType", label: t.workOrders.maintenanceType, getValue: (wo) => getMtLabel(wo.maintenanceType) },
    { key: "shift", label: t.workOrders.shift, getValue: (wo) => wo.shift?.name || "-" },
    { key: "status", label: t.workOrders.status, getValue: (wo) => getStatusLabel(wo.status) },
    { key: "createdBy", label: t.workOrders.createdBy, getValue: (wo) => wo.createdBy?.fullName || "-" },
    { key: "workItemCount", label: t.workOrders.workItemCount, getValue: (wo) => String(wo.items?.length || 0) },
    { key: "subEquipment", label: t.workOrders.subEquipment, getValue: (wo) => {
      if (!wo.items || wo.items.length === 0) return "-";
      return wo.items.map((item: any) => item.subEquipment?.name || item.subEquipmentName || "-").join(", ");
    }},
    { key: "activityType", label: t.workOrders.activityType, getValue: (wo) => {
      if (!wo.items || wo.items.length === 0) return "-";
      return wo.items.map((item: any) => item.activityType?.name || item.activityTypeName || "-").filter((v: string) => v !== "-").join(", ") || "-";
    }},
    { key: "description", label: t.workOrders.description, getValue: (wo) => {
      if (!wo.items || wo.items.length === 0) return "-";
      return wo.items.flatMap((item: any) =>
        Array.isArray(item.descriptions) ? item.descriptions : [item.description || ""]
      ).filter(Boolean).join("; ") || "-";
    }},
    { key: "startTime", label: t.workOrders.startTime, getValue: (wo) => {
      if (!wo.items || wo.items.length === 0) return "-";
      return wo.items.map((item: any) => item.startTime || "-").join(", ");
    }},
    { key: "endTime", label: t.workOrders.endTime, getValue: (wo) => {
      if (!wo.items || wo.items.length === 0) return "-";
      return wo.items.map((item: any) => item.endTime || "-").join(", ");
    }},
  ], [t, language, maintenanceTypeConfigs]);

  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter(wo => {
      if (dateFrom) {
        const woDate = new Date(wo.date).getTime();
        if (woDate < new Date(dateFrom).getTime()) return false;
      }
      if (dateTo) {
        const woDate = new Date(wo.date).getTime();
        if (woDate > new Date(dateTo).getTime()) return false;
      }
      if (statusFilter !== "all" && wo.status !== statusFilter) return false;
      if (typeFilter !== "all" && wo.maintenanceType !== typeFilter) return false;
      return true;
    });
  }, [workOrders, dateFrom, dateTo, statusFilter, typeFilter]);

  const summaryFilteredWOs = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter(wo => {
      if (summaryDateFrom) {
        const woDate = new Date(wo.date).getTime();
        if (woDate < new Date(summaryDateFrom).getTime()) return false;
      }
      if (summaryDateTo) {
        const woDate = new Date(wo.date).getTime();
        if (woDate > new Date(summaryDateTo).getTime()) return false;
      }
      if (summaryFind !== "all" && wo.maintenanceType !== summaryFind) return false;
      return true;
    });
  }, [workOrders, summaryDateFrom, summaryDateTo, summaryFind]);

  const mtColumns = useMemo(() => {
    if (!maintenanceTypeConfigs) return [];
    return maintenanceTypeConfigs
      .filter(mt => mt.isActive)
      .map(mt => ({
        name: mt.name,
        label: language === "pt" ? mt.labelPt : mt.labelEn,
      }));
  }, [maintenanceTypeConfigs, language]);

  const pivotData = useMemo(() => {
    const vehicles: Record<number, { licensePlate: string; name: string; byType: Record<string, number> }> = {};
    summaryFilteredWOs.forEach(wo => {
      if (!wo.vehicle) return;
      const vid = wo.vehicleId || wo.vehicle.id;
      if (!vehicles[vid]) {
        vehicles[vid] = {
          licensePlate: wo.vehicle.licensePlate || "-",
          name: `${wo.vehicle.make} ${wo.vehicle.model}`,
          byType: {},
        };
      }
      const mtName = wo.maintenanceType;
      if (!vehicles[vid].byType[mtName]) vehicles[vid].byType[mtName] = 0;
      vehicles[vid].byType[mtName] += getWorkOrderTotalMinutes(wo);
    });
    return Object.entries(vehicles)
      .map(([id, v]) => ({ id: Number(id), ...v }))
      .sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
  }, [summaryFilteredWOs]);

  const filteredPivotData = useMemo(() => {
    if (!summarySearch.trim()) return pivotData;
    const q = summarySearch.toLowerCase();
    return pivotData.filter(v =>
      v.licensePlate.toLowerCase().includes(q) || v.name.toLowerCase().includes(q)
    );
  }, [pivotData, summarySearch]);

  const uniqueMaintenanceTypes = useMemo(() => {
    if (!workOrders) return [];
    return Array.from(new Set(workOrders.map(wo => wo.maintenanceType)));
  }, [workOrders]);

  const activeFieldOptions = fieldOptions.filter(f => selectedFields.includes(f.key));

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleGenerateReport = () => {
    if (reportMode === "detailed" && selectedFields.length === 0) {
      toast({ title: t.workOrders.workOrderReport, description: t.workOrders.noFieldsSelected, variant: "destructive" });
      return;
    }
    setShowReport(true);
  };

  const getFilterMeta = () => {
    const parts: string[] = [];
    if (reportMode === "summary") {
      if (summaryDateFrom) parts.push(`${t.workOrders.dateFrom}: ${format(new Date(summaryDateFrom), "dd/MM/yyyy")}`);
      if (summaryDateTo) parts.push(`${t.workOrders.dateTo}: ${format(new Date(summaryDateTo), "dd/MM/yyyy")}`);
      if (summaryFind !== "all") parts.push(`${t.workOrders.filterByType}: ${getMtLabel(summaryFind)}`);
    } else {
      if (dateFrom) parts.push(`${t.workOrders.dateFrom}: ${format(new Date(dateFrom), "dd/MM/yyyy")}`);
      if (dateTo) parts.push(`${t.workOrders.dateTo}: ${format(new Date(dateTo), "dd/MM/yyyy")}`);
      if (statusFilter !== "all") parts.push(`${t.workOrders.filterByStatus}: ${getStatusLabel(statusFilter)}`);
      if (typeFilter !== "all") parts.push(`${t.workOrders.filterByType}: ${getMtLabel(typeFilter)}`);
    }
    return parts;
  };

  const handlePrint = () => {
    const meta = getFilterMeta();
    let bodyContent = "";
    if (reportMode === "summary") {
      const headerCols = mtColumns.map(c => `<th style="text-align:right;font-size:10px;padding:4px 6px">${c.label}</th>`).join("");
      const dataRows = filteredPivotData.map(row => {
        const cells = mtColumns.map(col => {
          const val = row.byType[col.name] || 0;
          return `<td style="text-align:right;padding:4px 6px">${formatMinutesToHHMM(val)}</td>`;
        }).join("");
        return `<tr><td style="padding:4px 6px">${row.licensePlate}</td><td style="padding:4px 6px">${row.name}</td>${cells}</tr>`;
      }).join("");
      const totalCells = mtColumns.map(col => {
        const total = filteredPivotData.reduce((s, r) => s + (r.byType[col.name] || 0), 0);
        return `<td style="text-align:right;font-weight:600;padding:4px 6px">${formatMinutesToHHMM(total)}</td>`;
      }).join("");
      bodyContent = `
        <table>
          <thead>
            <tr style="background:#4a7c59;color:white">
              <th style="padding:4px 6px">${t.workOrders.equipmentNo}</th>
              <th style="padding:4px 6px">${t.workOrders.equipmentName}</th>
              ${headerCols}
            </tr>
          </thead>
          <tbody>${dataRows}</tbody>
          <tfoot>
            <tr style="background:#f0f0f0">
              <td colspan="2" style="font-weight:600;padding:4px 6px">${t.workOrders.total}</td>
              ${totalCells}
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      const printContent = reportRef.current;
      if (!printContent) return;
      bodyContent = `
        <div class="total">${t.workOrders.totalRecords}: ${filteredWorkOrders.length}</div>
        ${printContent.querySelector("table")?.outerHTML || ""}
      `;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>${t.workOrders.workOrderReport}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .subtitle { color: #666; margin-bottom: 16px; font-size: 13px; }
          .meta { display: flex; gap: 20px; margin-bottom: 12px; color: #444; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; text-align: left; font-size: 11px; }
          th { background-color: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
          tfoot td { border-top: 2px solid #999; }
          .total { margin-top: 8px; font-weight: 600; font-size: 12px; }
        </style>
      </head><body>
        <h1>${t.workOrders.workOrderReport}${reportMode === "summary" ? ` - ${t.workOrders.summaryReport}` : ""}</h1>
        <div class="subtitle">${t.workOrders.reportSubtitle}</div>
        <div class="meta">${meta.map(m => `<span>${m}</span>`).join("")}</div>
        ${bodyContent}
        <div style="margin-top: 20px; color: #999; font-size: 10px;">${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    if (reportMode === "summary") {
      const rows = filteredPivotData.map(row => {
        const obj: Record<string, any> = {
          [t.workOrders.equipmentNo]: row.licensePlate,
          [t.workOrders.equipmentName]: row.name,
        };
        mtColumns.forEach(col => {
          obj[col.label] = formatMinutesToHHMM(row.byType[col.name] || 0);
        });
        return obj;
      });
      const totalRow: Record<string, any> = {
        [t.workOrders.equipmentNo]: t.workOrders.total,
        [t.workOrders.equipmentName]: "",
      };
      mtColumns.forEach(col => {
        const total = filteredPivotData.reduce((s, r) => s + (r.byType[col.name] || 0), 0);
        totalRow[col.label] = formatMinutesToHHMM(total);
      });
      rows.push(totalRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, t.workOrders.summaryReport.substring(0, 31));
    } else {
      const rows = filteredWorkOrders.map(wo =>
        activeFieldOptions.reduce((obj: Record<string, string>, f) => {
          obj[f.label] = f.getValue(wo);
          return obj;
        }, {})
      );
      const ws = XLSX.utils.json_to_sheet(rows, { header: activeFieldOptions.map(f => f.label) });
      XLSX.utils.book_append_sheet(wb, ws, t.workOrders.workOrderReport.substring(0, 31));
    }
    XLSX.writeFile(wb, `work_order_report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text(`${t.workOrders.workOrderReport}${reportMode === "summary" ? ` - ${t.workOrders.summaryReport}` : ""}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    const meta = getFilterMeta();
    if (meta.length > 0) doc.text(meta.join("  |  "), 14, 26);
    doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth - 14, 18, { align: "right" });
    let startY = meta.length > 0 ? 32 : 26;

    if (reportMode === "summary") {
      const head = [t.workOrders.equipmentNo, t.workOrders.equipmentName, ...mtColumns.map(c => c.label)];
      const body = filteredPivotData.map(row => [
        row.licensePlate,
        row.name,
        ...mtColumns.map(col => formatMinutesToHHMM(row.byType[col.name] || 0)),
      ]);
      const totalRow = [
        t.workOrders.total, "",
        ...mtColumns.map(col => {
          const total = filteredPivotData.reduce((s, r) => s + (r.byType[col.name] || 0), 0);
          return formatMinutesToHHMM(total);
        }),
      ];
      body.push(totalRow);
      autoTable(doc, {
        startY, head: [head], body, theme: "grid",
        headStyles: { fillColor: [74, 124, 89], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 10, right: 10 },
        didParseCell: (data: any) => {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
      });
    } else {
      autoTable(doc, {
        startY,
        head: [activeFieldOptions.map(f => f.label)],
        body: filteredWorkOrders.map(wo => activeFieldOptions.map(f => f.getValue(wo))),
        theme: "grid",
        headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 10, right: 10 },
      });
    }
    doc.save(`work_order_report_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
  };

  if (isLoading && !isError) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.workOrders.workOrderReport}
        description={t.workOrders.reportSubtitle}
        icon={<BarChart3 className="w-5 h-5 text-primary" />}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={reportMode} onValueChange={(v) => { setReportMode(v as "detailed" | "summary"); setShowReport(false); }}>
          <SelectTrigger className="w-40" data-testid="select-report-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="detailed" data-testid="select-report-mode-detailed">{t.workOrders.detailedReport}</SelectItem>
            <SelectItem value="summary" data-testid="select-report-mode-summary">{t.workOrders.summaryReport}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reportMode === "summary" ? (
        <div className="space-y-4">
          <Card className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" className="text-xs font-semibold px-3 py-1 bg-green-700 hover:bg-green-700" data-testid="badge-summary-label">
                {t.workOrders.summaryReport.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1 flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  className="h-8 text-sm"
                  placeholder={t.workOrders.searchResults}
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  data-testid="input-summary-search"
                />
              </div>
              <Input
                type="date"
                className="h-8 text-sm w-36"
                value={summaryDateFrom}
                onChange={(e) => setSummaryDateFrom(e.target.value)}
                data-testid="input-summary-date-from"
              />
              <Input
                type="date"
                className="h-8 text-sm w-36"
                value={summaryDateTo}
                onChange={(e) => setSummaryDateTo(e.target.value)}
                data-testid="input-summary-date-to"
              />
              <Select value={summaryFind} onValueChange={setSummaryFind}>
                <SelectTrigger className="h-8 text-sm w-40" data-testid="select-summary-find">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.workOrders.allTypes}</SelectItem>
                  {uniqueMaintenanceTypes.map(type => (
                    <SelectItem key={type} value={type}>{getMtLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-report">
              <Printer className="w-4 h-4 mr-2" />
              {t.workOrders.printReport}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-export-excel">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {t.workOrders.exportExcel}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} data-testid="button-export-pdf">
              <Download className="w-4 h-4 mr-2" />
              {t.workOrders.exportPdf}
            </Button>
          </div>

          <Card className="overflow-visible" data-testid="summary-report-container">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-700">
                    <TableHead className="text-white font-semibold text-xs">{t.workOrders.equipmentNo}</TableHead>
                    <TableHead className="text-white font-semibold text-xs">{t.workOrders.equipmentName}</TableHead>
                    {mtColumns.map(col => (
                      <TableHead key={col.name} className="text-white font-semibold text-xs text-right">{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPivotData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={mtColumns.length + 2} className="h-24 text-center text-muted-foreground">
                        {t.workOrders.noWorkOrders}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPivotData.map((row, idx) => (
                      <TableRow key={row.id} className={idx % 2 === 0 ? "bg-yellow-50/50" : ""} data-testid={`row-pivot-${idx}`}>
                        <TableCell className="text-sm font-medium">{row.licensePlate}</TableCell>
                        <TableCell className="text-sm">{row.name}</TableCell>
                        {mtColumns.map(col => (
                          <TableCell key={col.name} className="text-sm text-right">
                            {formatMinutesToHHMM(row.byType[col.name] || 0)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {filteredPivotData.length > 0 && (
                  <tfoot>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="font-semibold text-sm">{t.workOrders.total}</TableCell>
                      {mtColumns.map(col => {
                        const total = filteredPivotData.reduce((s, r) => s + (r.byType[col.name] || 0), 0);
                        return (
                          <TableCell key={col.name} className="text-right font-semibold text-sm">
                            {formatMinutesToHHMM(total)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                <h2 className="font-semibold text-lg">{t.workOrders.selectFields}</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedFields(fieldOptions.map(f => f.key))} data-testid="button-select-all">
                  {t.workOrders.selectAll}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedFields([])} data-testid="button-deselect-all">
                  {t.workOrders.deselectAll}
                </Button>
              </div>
              <div className="space-y-2">
                {fieldOptions.map(field => (
                  <div key={field.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                      data-testid={`checkbox-field-${field.key}`}
                    />
                    <Label htmlFor={`field-${field.key}`} className="text-sm cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                <h2 className="font-semibold text-lg">{t.workOrders.filterByStatus}</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.dateFrom}</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-date-from" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.dateTo}</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-date-to" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.filterByStatus}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.workOrders.allStatuses}</SelectItem>
                      <SelectItem value="open">{t.workOrders.open}</SelectItem>
                      <SelectItem value="in_progress">{t.workOrders.inProgress}</SelectItem>
                      <SelectItem value="completed">{t.workOrders.completed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.filterByType}</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger data-testid="select-type-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.workOrders.allTypes}</SelectItem>
                      {uniqueMaintenanceTypes.map(type => (
                        <SelectItem key={type} value={type}>{getMtLabel(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Button className="w-full" onClick={handleGenerateReport} disabled={isLoading} data-testid="button-generate-report">
              <FileText className="w-4 h-4 mr-2" />
              {t.workOrders.generateReport}
            </Button>
          </div>

          <div className="lg:col-span-2">
            {showReport && selectedFields.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-lg">{t.workOrders.workOrderReport}</h2>
                    <Badge variant="secondary" data-testid="badge-total-records">
                      {t.workOrders.totalRecords}: {filteredWorkOrders.length}
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-report">
                      <Printer className="w-4 h-4 mr-2" />
                      {t.workOrders.printReport}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-export-excel">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {t.workOrders.exportExcel}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPdf} data-testid="button-export-pdf">
                      <Download className="w-4 h-4 mr-2" />
                      {t.workOrders.exportPdf}
                    </Button>
                  </div>
                </div>
                <Card className="overflow-visible">
                  <div ref={reportRef} className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-center w-12">#</TableHead>
                          {activeFieldOptions.map(field => (
                            <TableHead key={field.key}>{field.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWorkOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={activeFieldOptions.length + 1} className="h-24 text-center text-muted-foreground" data-testid="text-no-results">
                              {t.workOrders.noWorkOrders}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredWorkOrders.map((wo, idx) => (
                            <TableRow key={wo.id} data-testid={`row-report-${wo.id}`}>
                              <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                              {activeFieldOptions.map(field => (
                                <TableCell key={field.key} data-testid={`cell-${wo.id}-${field.key}`}>
                                  {field.key === "status" ? (
                                    <Badge variant={wo.status === "completed" ? "secondary" : wo.status === "in_progress" ? "default" : "outline"} data-testid={`badge-status-${wo.id}`}>
                                      {field.getValue(wo)}
                                    </Badge>
                                  ) : field.key === "maintenanceType" ? (
                                    <Badge variant="outline" data-testid={`badge-mt-${wo.id}`}>
                                      {field.getValue(wo)}
                                    </Badge>
                                  ) : (
                                    field.getValue(wo)
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-state">{t.workOrders.workOrderReport}</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  {t.workOrders.reportSubtitle}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
