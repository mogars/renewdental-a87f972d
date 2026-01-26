import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, User, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ChartRecordCardProps {
  id: string;
  recordDate: string;
  treatmentType: string;
  toothNumber?: string | null;
  description?: string | null;
  dentistName?: string | null;
  cost?: number | null;
  status?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

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

const ChartRecordCard = ({
  id,
  recordDate,
  treatmentType,
  toothNumber,
  description,
  dentistName,
  cost,
  status,
  onEdit,
  onDelete,
}: ChartRecordCardProps) => {
  return (
    <Card className="gradient-card border-border/50 shadow-card transition-all duration-200 hover:shadow-card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-semibold text-foreground">{treatmentType}</h4>
              {status && (
                <Badge variant="outline" className={getStatusColor(status)}>
                  {status}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {(() => {
                    try {
                      return format(new Date(recordDate), "MMM d, yyyy");
                    } catch {
                      return recordDate;
                    }
                  })()}
                </span>
              </div>
              {toothNumber && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Tooth:</span>
                  <span>{toothNumber}</span>
                </div>
              )}
              {dentistName && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{dentistName}</span>
                </div>
              )}
              {cost && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{cost.toFixed(2)}</span>
                </div>
              )}
            </div>

            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartRecordCard;
