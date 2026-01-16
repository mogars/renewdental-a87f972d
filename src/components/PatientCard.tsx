import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";

interface PatientCardProps {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  insuranceProvider?: string | null;
}

const PatientCard = ({
  id,
  firstName,
  lastName,
  email,
  phone,
  dateOfBirth,
  insuranceProvider,
}: PatientCardProps) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Link to={`/patients/${id}`}>
      <Card className="group gradient-card border-border/50 shadow-card transition-all duration-300 hover:shadow-card-hover hover:border-primary/20 hover:-translate-y-1">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold text-lg">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {firstName} {lastName}
              </h3>
              
              <div className="mt-2 space-y-1.5">
                {email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{phone}</span>
                  </div>
                )}
                {dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{format(new Date(dateOfBirth), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>

              {insuranceProvider && (
                <div className="mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {insuranceProvider}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PatientCard;
