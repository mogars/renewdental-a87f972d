import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CheckCircle2, XCircle, RefreshCw, Database } from "lucide-react";

interface DatabaseConfig {
  awsApiUrl: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  awsApiUrl: import.meta.env.VITE_AWS_API_URL || "http://localhost:3001",
};

const STORAGE_KEY = "mysql_database_config";

const DatabaseConnectionSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<DatabaseConfig>(DEFAULT_CONFIG);
  const [mysqlStatus, setMysqlStatus] = useState<"checking" | "connected" | "error">("checking");
  const [isSaving, setIsSaving] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch {
        setConfig(DEFAULT_CONFIG);
      }
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  // Check MySQL backend connection
  const checkConnection = async () => {
    setMysqlStatus("checking");
    try {
      const response = await fetch(`${config.awsApiUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      setMysqlStatus(response.ok ? "connected" : "error");
    } catch {
      setMysqlStatus("error");
    }
  };

  useEffect(() => {
    checkConnection();
  }, [config.awsApiUrl]);

  // Save configuration to localStorage
  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast({ title: "Salvat", description: "Configurația a fost salvată local." });
    } catch {
      toast({ title: "Eroare", description: "Nu s-a putut salva configurația.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const StatusBadge = ({ status }: { status: "checking" | "connected" | "error" }) => {
    if (status === "checking") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificare...
        </Badge>
      );
    }
    if (status === "connected") {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Conectat
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Deconectat
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Conexiune Server Bază de Date
            </h4>
            <Button variant="ghost" size="sm" onClick={checkConnection}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Verifică
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Server baza de date</p>
                <p className="text-xs text-muted-foreground">{config.awsApiUrl}</p>
              </div>
            </div>
            <StatusBadge status={mysqlStatus} />
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Configurare Conexiune
          </h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">Server Backend (IP, Host sau URL)</Label>
              <Input
                id="api-url"
                value={config.awsApiUrl}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  let formatted = val;

                  // If it's just an IP or host (no protocol), and no port, add default http and port
                  if (val && !val.includes("://")) {
                    if (!val.includes(":")) {
                      formatted = `http://${val}:3001`;
                    } else {
                      formatted = `http://${val}`;
                    }
                  }

                  setConfig({ awsApiUrl: formatted });
                }}
                placeholder="Ex: 192.168.1.15, localhost sau http://cloud-server.com:3001"
              />
              <div className="mt-2 p-2 rounded bg-muted/30 border border-dashed text-[11px] font-mono break-all">
                <span className="text-muted-foreground mr-1">URL Final:</span>
                <span className="text-primary">{config.awsApiUrl}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Poți introduce doar IP-ul (ex: 63.180.248.80) sau un URL complet.
                Dacă introduci doar IP/host, vom folosi automat portul default :3001.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Salvează Configurația
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Configurația este salvată local. Serverul Express trebuie configurat separat.
      </p>
    </div>
  );
};

export default DatabaseConnectionSettings;
