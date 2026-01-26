import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";

interface ChartRecord {
  id: string;
  record_date: string;
  treatment_type: string;
  tooth_number?: string | null;
  description?: string | null;
  dentist_name?: string | null;
  cost?: number | null;
  status?: string | null;
}

interface ColumnHeader {
  key: string;
  label: string;
}

interface ChartRecordsTableProps {
  records: ChartRecord[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const defaultHeaders: ColumnHeader[] = [
  { key: "date", label: "Date" },
  { key: "service", label: "Service" },
  { key: "billing", label: "Billing" },
  { key: "additional", label: "Additional Infos" },
];

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success border-success/20";
    case "scheduled":
      return "bg-primary/10 text-primary border-primary/20";
    case "in-progress":
      return "bg-warning/10 text-warning border-warning/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const ChartRecordsTable = ({
  records,
  onEdit,
  onDelete,
}: ChartRecordsTableProps) => {
  const [headers, setHeaders] = useState<ColumnHeader[]>(defaultHeaders);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleHeaderDoubleClick = (key: string, currentLabel: string) => {
    setEditingHeader(key);
    setEditValue(currentLabel);
  };

  const handleHeaderSave = (key: string) => {
    setHeaders((prev) =>
      prev.map((h) => (h.key === key ? { ...h, label: editValue } : h))
    );
    setEditingHeader(null);
    setEditValue("");
  };

  const handleHeaderCancel = () => {
    setEditingHeader(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter") {
      handleHeaderSave(key);
    } else if (e.key === "Escape") {
      handleHeaderCancel();
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {headers.map((header) => (
                <TableHead
                  key={header.key}
                  className="font-semibold text-foreground border-r border-border last:border-r-0 min-w-[120px]"
                >
                  {editingHeader === header.key ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, header.key)}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleHeaderSave(header.key)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleHeaderCancel}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      onDoubleClick={() =>
                        handleHeaderDoubleClick(header.key, header.label)
                      }
                      className="cursor-pointer hover:text-primary transition-colors"
                      title="Double-click to edit"
                    >
                      {header.label}
                    </span>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-[80px] text-center font-semibold text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  No chart records yet
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => (
                <TableRow
                  key={record.id}
                  className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                >
                  {/* Date Column */}
                  <TableCell className="border-r border-border font-medium">
                    {format(new Date(record.record_date), "MMM d, yyyy")}
                  </TableCell>

                  {/* Service Column */}
                  <TableCell className="border-r border-border">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{record.treatment_type}</span>
                      {record.dentist_name && (
                        <span className="text-xs text-muted-foreground">
                          {record.dentist_name}
                        </span>
                      )}
                      {record.tooth_number && (
                        <span className="text-xs text-muted-foreground">
                          Tooth #{record.tooth_number}
                        </span>
                      )}
                      {record.status && (
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(record.status)} w-fit text-xs`}
                        >
                          {record.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Billing Column */}
                  <TableCell className="border-r border-border">
                    {record.cost ? (
                      <span className="font-medium">
                        ${record.cost.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Additional Infos Column */}
                  <TableCell className="border-r border-border">
                    <div className="flex flex-col gap-1 text-sm">
                      {record.description ? (
                        <span className="text-muted-foreground line-clamp-2">
                          {record.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(record.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(record.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ChartRecordsTable;
