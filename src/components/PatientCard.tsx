import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface PatientCardProps {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

const PatientCard = ({
  id,
  firstName,
  lastName,
  phone,
}: PatientCardProps) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Link to={`/patients/${id}`}>
      <Card className="group gradient-card border-border/50 shadow-card transition-all duration-300 hover:shadow-card-hover hover:border-primary/20 hover:-translate-y-0.5">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-medium text-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {firstName} {lastName}
              </h3>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.location.href = `tel:${phone}`;
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 hover:text-primary transition-colors w-fit"
                >
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="hover:underline">{phone}</span>
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PatientCard;
