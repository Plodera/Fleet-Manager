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
import { FileText, Printer, Download, Filter, CheckSquare } from "lucide-react";
import { format } from "date-fns";

interface FieldOption {
  key: string;
  label: string;
  getValue: (wo: any) => string;
}

export default function WorkOrderReports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedFields, setSelectedFields] = useState<string[]>([
    "jobNo", "date", "equipment", "maintenanceType", "status"
  ]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showReport, setShowReport] = useState(false);

  const { data: workOrders, isLoading } = useQuery<any[]>({
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

  const activeFieldOptions = fieldOptions.filter(f => selectedFields.includes(f.key));

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(fieldOptions.map(f => f.key));
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  const handleGenerateReport = () => {
    if (selectedFields.length === 0) {
      toast({ title: t.workOrders.workOrderReport, description: t.workOrders.noFieldsSelected, variant: "destructive" });
      return;
    }
    setShowReport(true);
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.workOrders.workOrderReport}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .subtitle { color: #666; margin-bottom: 16px; font-size: 13px; }
          .meta { display: flex; gap: 20px; margin-bottom: 12px; color: #444; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
          th { background-color: #f5f5f5; font-weight: 600; }
          tr:nth-child(even) { background-color: #fafafa; }
          .total { margin-top: 8px; font-weight: 600; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${t.workOrders.workOrderReport}</h1>
        <div class="subtitle">${t.workOrders.reportSubtitle}</div>
        <div class="meta">
          ${dateFrom ? `<span>${t.workOrders.dateFrom}: ${format(new Date(dateFrom), "dd/MM/yyyy")}</span>` : ""}
          ${dateTo ? `<span>${t.workOrders.dateTo}: ${format(new Date(dateTo), "dd/MM/yyyy")}</span>` : ""}
          ${statusFilter !== "all" ? `<span>${t.workOrders.filterByStatus}: ${getStatusLabel(statusFilter)}</span>` : ""}
          ${typeFilter !== "all" ? `<span>${t.workOrders.filterByType}: ${getMtLabel(typeFilter)}</span>` : ""}
        </div>
        <div class="total">${t.workOrders.totalRecords}: ${filteredWorkOrders.length}</div>
        ${printContent.querySelector("table")?.outerHTML || ""}
        <div style="margin-top: 20px; color: #999; font-size: 10px;">
          ${format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCsv = () => {
    if (activeFieldOptions.length === 0 || filteredWorkOrders.length === 0) return;

    const headers = activeFieldOptions.map(f => f.label);
    const rows = filteredWorkOrders.map(wo =>
      activeFieldOptions.map(f => {
        const val = f.getValue(wo);
        return `"${val.replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `work_order_report_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueMaintenanceTypes = useMemo(() => {
    if (!workOrders) return [];
    const types = new Set(workOrders.map(wo => wo.maintenanceType));
    return Array.from(types);
  }, [workOrders]);

  if (isLoading) {
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
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-report-title">{t.workOrders.workOrderReport}</h1>
        <p className="text-muted-foreground" data-testid="text-report-subtitle">{t.workOrders.reportSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
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

          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <h2 className="font-semibold text-lg">{t.workOrders.filterByStatus}</h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">{t.workOrders.dateFrom}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{t.workOrders.dateTo}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">{t.workOrders.filterByStatus}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger data-testid="select-type-filter">
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-report">
                    <Printer className="w-4 h-4 mr-2" />
                    {t.workOrders.printReport}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCsv} data-testid="button-export-csv">
                    <Download className="w-4 h-4 mr-2" />
                    {t.workOrders.exportCsv}
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
                                  <Badge
                                    variant={wo.status === "completed" ? "secondary" : wo.status === "in_progress" ? "default" : "outline"}
                                    data-testid={`badge-status-${wo.id}`}
                                  >
                                    {field.getValue(wo)}
                                  </Badge>
                                ) : field.key === "maintenanceType" ? (
                                  <Badge
                                    variant="outline"
                                    data-testid={`badge-mt-${wo.id}`}
                                  >
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
    </div>
  );
}
