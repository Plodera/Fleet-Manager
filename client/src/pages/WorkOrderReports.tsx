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

type GroupByOption = "maintenanceType" | "status" | "vehicle" | "month";
type ValuesOption = "count" | "totalHours";
type CrossTabOption = "none" | "maintenanceType";

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

  const [groupBy, setGroupBy] = useState<GroupByOption>("vehicle");
  const [valuesOption, setValuesOption] = useState<ValuesOption>("totalHours");
  const [crossTab, setCrossTab] = useState<CrossTabOption>("maintenanceType");
  const [summarySearch, setSummarySearch] = useState("");

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

  const groupByLabels: Record<GroupByOption, string> = {
    maintenanceType: t.workOrders.byMaintenanceType,
    status: t.workOrders.byStatus,
    vehicle: t.workOrders.byVehicle,
    month: t.workOrders.byMonth,
  };

  const valuesLabels: Record<ValuesOption, string> = {
    count: t.workOrders.count,
    totalHours: t.workOrders.totalHours,
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
        const fromDate = new Date(dateFrom).getTime();
        if (woDate < fromDate) return false;
      }
      if (dateTo) {
        const woDate = new Date(wo.date).getTime();
        const toDate = new Date(dateTo).getTime();
        if (woDate > toDate) return false;
      }
      if (statusFilter !== "all" && wo.status !== statusFilter) return false;
      if (typeFilter !== "all" && wo.maintenanceType !== typeFilter) return false;
      return true;
    });
  }, [workOrders, dateFrom, dateTo, statusFilter, typeFilter]);

  const getGroupKey = (wo: any): string => {
    switch (groupBy) {
      case "maintenanceType": return getMtLabel(wo.maintenanceType);
      case "status": return getStatusLabel(wo.status);
      case "vehicle": return wo.vehicle ? `${wo.vehicle.licensePlate} — ${wo.vehicle.make} ${wo.vehicle.model}` : "-";
      case "month": return wo.date ? format(new Date(wo.date), "yyyy-MM") : "-";
      default: return "-";
    }
  };

  const getGroupSortKey = (wo: any): string => {
    if (groupBy === "month" && wo.date) return format(new Date(wo.date), "yyyy-MM");
    return getGroupKey(wo);
  };

  const getGroupDisplayLabel = (key: string): string => {
    if (groupBy === "month" && key !== "-") {
      try {
        const [y, m] = key.split("-");
        return format(new Date(parseInt(y), parseInt(m) - 1, 1), "MMM yyyy");
      } catch { return key; }
    }
    return key;
  };

  const allMtTypes = useMemo(() => {
    if (!maintenanceTypeConfigs) return [];
    return maintenanceTypeConfigs.filter(mt => mt.isActive).map(mt => ({
      name: mt.name,
      label: language === "pt" ? mt.labelPt : mt.labelEn,
    }));
  }, [maintenanceTypeConfigs, language]);

  const uniqueMaintenanceTypes = useMemo(() => {
    if (!workOrders) return [];
    const types = new Set(workOrders.map(wo => wo.maintenanceType));
    return Array.from(types);
  }, [workOrders]);

  const summaryData = useMemo(() => {
    if (crossTab === "none") {
      const groups: Record<string, { label: string; value: number; sortKey: string }> = {};
      filteredWorkOrders.forEach(wo => {
        const key = getGroupKey(wo);
        const sortKey = getGroupSortKey(wo);
        if (!groups[key]) groups[key] = { label: getGroupDisplayLabel(key), value: 0, sortKey };
        if (valuesOption === "count") {
          groups[key].value += 1;
        } else {
          groups[key].value += getWorkOrderTotalMinutes(wo);
        }
      });
      const entries = Object.entries(groups).map(([key, g]) => ({
        key,
        label: groupBy === "month" ? getGroupDisplayLabel(key) : key,
        value: valuesOption === "count" ? g.value : g.value,
        displayValue: valuesOption === "count" ? String(g.value) : formatMinutesToHHMM(g.value),
        sortKey: g.sortKey,
      }));
      entries.sort((a, b) => groupBy === "month" ? a.sortKey.localeCompare(b.sortKey) : b.value - a.value);
      return entries;
    }
    return [];
  }, [filteredWorkOrders, groupBy, valuesOption, crossTab, maintenanceTypeConfigs, language, t]);

  const pivotData = useMemo(() => {
    if (crossTab !== "maintenanceType") return [];
    const groups: Record<string, { label: string; sortKey: string; byType: Record<string, number> }> = {};
    filteredWorkOrders.forEach(wo => {
      const key = getGroupKey(wo);
      const sortKey = getGroupSortKey(wo);
      if (!groups[key]) {
        groups[key] = {
          label: groupBy === "month" ? getGroupDisplayLabel(key) : key,
          sortKey,
          byType: {},
        };
      }
      const mtLabel = getMtLabel(wo.maintenanceType);
      if (!groups[key].byType[mtLabel]) groups[key].byType[mtLabel] = 0;
      if (valuesOption === "count") {
        groups[key].byType[mtLabel] += 1;
      } else {
        groups[key].byType[mtLabel] += getWorkOrderTotalMinutes(wo);
      }
    });
    const entries = Object.entries(groups).map(([key, g]) => ({
      key,
      label: g.label,
      sortKey: g.sortKey,
      byType: g.byType,
    }));
    entries.sort((a, b) => groupBy === "month" ? a.sortKey.localeCompare(b.sortKey) : a.label.localeCompare(b.label));
    return entries;
  }, [filteredWorkOrders, groupBy, valuesOption, crossTab, maintenanceTypeConfigs, language, t]);

  const filteredSummaryData = useMemo(() => {
    if (!summarySearch.trim()) return summaryData;
    const q = summarySearch.toLowerCase();
    return summaryData.filter(e => e.label.toLowerCase().includes(q));
  }, [summaryData, summarySearch]);

  const filteredPivotData = useMemo(() => {
    if (!summarySearch.trim()) return pivotData;
    const q = summarySearch.toLowerCase();
    return pivotData.filter(e => e.label.toLowerCase().includes(q));
  }, [pivotData, summarySearch]);

  const pivotMtColumns = useMemo(() => {
    const used = new Set<string>();
    pivotData.forEach(row => {
      Object.keys(row.byType).forEach(k => used.add(k));
    });
    const ordered = allMtTypes.filter(mt => used.has(mt.label)).map(mt => mt.label);
    used.forEach(label => {
      if (!ordered.includes(label)) ordered.push(label);
    });
    return ordered;
  }, [pivotData, allMtTypes]);

  const activeFieldOptions = fieldOptions.filter(f => selectedFields.includes(f.key));

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllFields = () => setSelectedFields(fieldOptions.map(f => f.key));
  const deselectAllFields = () => setSelectedFields([]);

  const handleGenerateReport = () => {
    if (reportMode === "detailed" && selectedFields.length === 0) {
      toast({ title: t.workOrders.workOrderReport, description: t.workOrders.noFieldsSelected, variant: "destructive" });
      return;
    }
    setShowReport(true);
  };

  const getFilterMeta = () => {
    const parts: string[] = [];
    if (dateFrom) parts.push(`${t.workOrders.dateFrom}: ${format(new Date(dateFrom), "dd/MM/yyyy")}`);
    if (dateTo) parts.push(`${t.workOrders.dateTo}: ${format(new Date(dateTo), "dd/MM/yyyy")}`);
    if (statusFilter !== "all") parts.push(`${t.workOrders.filterByStatus}: ${getStatusLabel(statusFilter)}`);
    if (typeFilter !== "all") parts.push(`${t.workOrders.filterByType}: ${getMtLabel(typeFilter)}`);
    return parts;
  };

  const getSummaryTableHtml = () => {
    if (crossTab === "maintenanceType") {
      const colTotals: Record<string, number> = {};
      pivotMtColumns.forEach(c => { colTotals[c] = 0; });
      const rows = filteredPivotData.map(row => {
        const cells = pivotMtColumns.map(col => {
          const val = row.byType[col] || 0;
          colTotals[col] = (colTotals[col] || 0) + val;
          return `<td style="text-align:right">${valuesOption === "count" ? (val || "") : formatMinutesToHHMM(val)}</td>`;
        }).join("");
        return `<tr><td>${row.label}</td>${cells}</tr>`;
      }).join("");
      const totalRow = pivotMtColumns.map(col => {
        const val = colTotals[col] || 0;
        return `<td style="text-align:right;font-weight:600">${valuesOption === "count" ? val : formatMinutesToHHMM(val)}</td>`;
      }).join("");
      return `
        <table>
          <thead><tr><th>${groupByLabels[groupBy]}</th>${pivotMtColumns.map(c => `<th style="text-align:right">${c}</th>`).join("")}</tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td style="font-weight:600">${t.workOrders.total}</td>${totalRow}</tr></tfoot>
        </table>
      `;
    } else {
      const totalVal = filteredSummaryData.reduce((s, e) => s + e.value, 0);
      const rows = filteredSummaryData.map(e =>
        `<tr><td>${e.label}</td><td style="text-align:right">${e.displayValue}</td></tr>`
      ).join("");
      const totalDisplay = valuesOption === "count" ? String(totalVal) : formatMinutesToHHMM(totalVal);
      return `
        <table>
          <thead><tr><th>${groupByLabels[groupBy]}</th><th style="text-align:right">${valuesLabels[valuesOption]}</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td style="font-weight:600">${t.workOrders.total}</td><td style="text-align:right;font-weight:600">${totalDisplay}</td></tr></tfoot>
        </table>
      `;
    }
  };

  const handlePrint = () => {
    const meta = getFilterMeta();
    let bodyContent = "";
    if (reportMode === "summary") {
      const displayCount = crossTab === "maintenanceType" ? filteredPivotData.length : filteredSummaryData.length;
      bodyContent = `
        <div class="total">${t.workOrders.totalWorkOrders}: ${filteredWorkOrders.length}${summarySearch.trim() ? ` (${displayCount} ${language === "pt" ? "mostrados" : "shown"})` : ""}</div>
        <div class="meta-summary">
          ${t.workOrders.groupBy}: ${groupByLabels[groupBy]} &nbsp;|&nbsp;
          ${t.workOrders.showValues}: ${valuesLabels[valuesOption]}
          ${crossTab !== "none" ? ` &nbsp;|&nbsp; ${t.workOrders.crossTabBy}: ${t.workOrders.byMaintenanceType}` : ""}
        </div>
        ${getSummaryTableHtml()}
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
          .meta { display: flex; gap: 20px; margin-bottom: 8px; color: #444; font-size: 11px; }
          .meta-summary { margin-bottom: 12px; color: #444; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
          th { background-color: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
          tfoot td { border-top: 2px solid #999; background: #f5f5f5; }
          .total { margin-top: 8px; font-weight: 600; font-size: 12px; margin-bottom: 8px; }
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
      if (crossTab === "maintenanceType") {
        const rows = filteredPivotData.map(row => {
          const obj: Record<string, any> = { [groupByLabels[groupBy]]: row.label };
          pivotMtColumns.forEach(col => {
            const val = row.byType[col] || 0;
            obj[col] = valuesOption === "count" ? (val || "") : formatMinutesToHHMM(val);
          });
          return obj;
        });
        const totalRow: Record<string, any> = { [groupByLabels[groupBy]]: t.workOrders.total };
        pivotMtColumns.forEach(col => {
          const total = filteredPivotData.reduce((s, r) => s + (r.byType[col] || 0), 0);
          totalRow[col] = valuesOption === "count" ? total : formatMinutesToHHMM(total);
        });
        rows.push(totalRow);
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, t.workOrders.summaryReport.substring(0, 31));
      } else {
        const rows = filteredSummaryData.map(e => ({
          [groupByLabels[groupBy]]: e.label,
          [valuesLabels[valuesOption]]: e.displayValue,
        }));
        const totalVal = filteredSummaryData.reduce((s, e) => s + e.value, 0);
        rows.push({
          [groupByLabels[groupBy]]: t.workOrders.total,
          [valuesLabels[valuesOption]]: valuesOption === "count" ? String(totalVal) : formatMinutesToHHMM(totalVal),
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, t.workOrders.summaryReport.substring(0, 31));
      }
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
    const isLandscape = reportMode === "detailed" || (crossTab === "maintenanceType" && pivotMtColumns.length > 3);
    const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text(`${t.workOrders.workOrderReport}${reportMode === "summary" ? ` - ${t.workOrders.summaryReport}` : ""}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    const meta = getFilterMeta();
    if (meta.length > 0) doc.text(meta.join("  |  "), 14, 26);

    let startY = meta.length > 0 ? 32 : 26;
    if (reportMode === "summary") {
      doc.text(`${t.workOrders.groupBy}: ${groupByLabels[groupBy]}  |  ${t.workOrders.showValues}: ${valuesLabels[valuesOption]}${crossTab !== "none" ? `  |  ${t.workOrders.crossTabBy}: ${t.workOrders.byMaintenanceType}` : ""}`, 14, startY);
      startY += 6;
    }
    doc.text(`${t.workOrders.totalWorkOrders}: ${filteredWorkOrders.length}`, 14, startY);
    doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), pageWidth - 14, 18, { align: "right" });
    startY += 6;

    if (reportMode === "summary") {
      if (crossTab === "maintenanceType") {
        const head = [groupByLabels[groupBy], ...pivotMtColumns];
        const body = filteredPivotData.map(row => [
          row.label,
          ...pivotMtColumns.map(col => {
            const val = row.byType[col] || 0;
            return valuesOption === "count" ? String(val || "") : formatMinutesToHHMM(val);
          }),
        ]);
        const totalRow = [t.workOrders.total, ...pivotMtColumns.map(col => {
          const total = filteredPivotData.reduce((s, r) => s + (r.byType[col] || 0), 0);
          return valuesOption === "count" ? String(total) : formatMinutesToHHMM(total);
        })];
        body.push(totalRow);
        autoTable(doc, {
          startY, head: [head], body, theme: "grid",
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.row.index === body.length - 1) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
        });
      } else {
        const body = filteredSummaryData.map(e => [e.label, e.displayValue]);
        const totalVal = filteredSummaryData.reduce((s, e) => s + e.value, 0);
        body.push([t.workOrders.total, valuesOption === "count" ? String(totalVal) : formatMinutesToHHMM(totalVal)]);
        autoTable(doc, {
          startY,
          head: [[groupByLabels[groupBy], valuesLabels[valuesOption]]],
          body,
          theme: "grid",
          headStyles: { fillColor: [60, 60, 60], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 1: { halign: "right" } },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.row.index === body.length - 1) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
        });
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h2 className="font-semibold text-lg">{t.workOrders.reportMode}</h2>
            </div>
            <Select value={reportMode} onValueChange={(v) => { setReportMode(v as "detailed" | "summary"); setShowReport(false); }}>
              <SelectTrigger data-testid="select-report-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed" data-testid="select-report-mode-detailed">{t.workOrders.detailedReport}</SelectItem>
                <SelectItem value="summary" data-testid="select-report-mode-summary">{t.workOrders.summaryReport}</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {reportMode === "summary" && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <h2 className="font-semibold text-lg">{t.workOrders.summaryOverview}</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.groupBy}</Label>
                  <Select value={groupBy} onValueChange={(v) => { setGroupBy(v as GroupByOption); setShowReport(false); }}>
                    <SelectTrigger data-testid="select-group-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehicle" data-testid="select-group-by-vehicle">{t.workOrders.byVehicle}</SelectItem>
                      <SelectItem value="maintenanceType" data-testid="select-group-by-type">{t.workOrders.byMaintenanceType}</SelectItem>
                      <SelectItem value="status" data-testid="select-group-by-status">{t.workOrders.byStatus}</SelectItem>
                      <SelectItem value="month" data-testid="select-group-by-month">{t.workOrders.byMonth}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.showValues}</Label>
                  <Select value={valuesOption} onValueChange={(v) => { setValuesOption(v as ValuesOption); setShowReport(false); }}>
                    <SelectTrigger data-testid="select-values">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count" data-testid="select-values-count">{t.workOrders.count}</SelectItem>
                      <SelectItem value="totalHours" data-testid="select-values-hours">{t.workOrders.totalHours}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t.workOrders.crossTabBy}</Label>
                  <Select value={crossTab} onValueChange={(v) => { setCrossTab(v as CrossTabOption); setShowReport(false); }}>
                    <SelectTrigger data-testid="select-cross-tab">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" data-testid="select-cross-tab-none">{t.workOrders.none}</SelectItem>
                      <SelectItem value="maintenanceType" data-testid="select-cross-tab-type">{t.workOrders.byMaintenanceType}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {reportMode === "detailed" && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                <h2 className="font-semibold text-lg">{t.workOrders.selectFields}</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFields} data-testid="button-select-all">
                  {t.workOrders.selectAll}
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllFields} data-testid="button-deselect-all">
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
          )}

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
          {showReport ? (
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

              {reportMode === "summary" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={t.workOrders.searchResults}
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    data-testid="input-summary-search"
                  />
                </div>
              )}

              {reportMode === "summary" ? (
                <Card className="overflow-visible" data-testid="summary-report-container">
                  <div className="overflow-x-auto">
                    {crossTab === "maintenanceType" ? (
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>{groupByLabels[groupBy]}</TableHead>
                            {pivotMtColumns.map(col => (
                              <TableHead key={col} className="text-right">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPivotData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={pivotMtColumns.length + 1} className="h-24 text-center text-muted-foreground">
                                {t.workOrders.noWorkOrders}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredPivotData.map((row, idx) => (
                              <TableRow key={idx} data-testid={`row-pivot-${idx}`}>
                                <TableCell className="font-medium">{row.label}</TableCell>
                                {pivotMtColumns.map(col => {
                                  const val = row.byType[col] || 0;
                                  return (
                                    <TableCell key={col} className="text-right">
                                      {valuesOption === "count"
                                        ? (val || "")
                                        : formatMinutesToHHMM(val)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                        {filteredPivotData.length > 0 && (
                          <tfoot>
                            <TableRow className="bg-muted/30 font-semibold">
                              <TableCell className="font-semibold">{t.workOrders.total}</TableCell>
                              {pivotMtColumns.map(col => {
                                const total = filteredPivotData.reduce((s, r) => s + (r.byType[col] || 0), 0);
                                return (
                                  <TableCell key={col} className="text-right font-semibold">
                                    {valuesOption === "count" ? total : formatMinutesToHHMM(total)}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </tfoot>
                        )}
                      </Table>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>{groupByLabels[groupBy]}</TableHead>
                            <TableHead className="text-right w-32">{valuesLabels[valuesOption]}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSummaryData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                {t.workOrders.noWorkOrders}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredSummaryData.map((entry, idx) => (
                              <TableRow key={idx} data-testid={`row-summary-${idx}`}>
                                <TableCell>{entry.label}</TableCell>
                                <TableCell className="text-right font-medium">{entry.displayValue}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                        {filteredSummaryData.length > 0 && (
                          <tfoot>
                            <TableRow className="bg-muted/30 font-semibold">
                              <TableCell className="font-semibold">{t.workOrders.total}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {valuesOption === "count"
                                  ? filteredSummaryData.reduce((s, e) => s + e.value, 0)
                                  : formatMinutesToHHMM(filteredSummaryData.reduce((s, e) => s + e.value, 0))}
                              </TableCell>
                            </TableRow>
                          </tfoot>
                        )}
                      </Table>
                    )}
                  </div>
                </Card>
              ) : (
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
              )}
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
    </div>
  );
}
