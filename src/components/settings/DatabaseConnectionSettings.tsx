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
  mysqlHost: string;
  mysqlPort: string;
  mysqlDatabase: string;
  mysqlUser: string;
  mysqlPassword: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  awsApiUrl: import.meta.env.VITE_AWS_API_URL || "http://localhost:3001",
  mysqlHost: "localhost",
  mysqlPort: "3306",
  mysqlDatabase: "dental_clinic",
  mysqlUser: "root",
  mysqlPassword: "",
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
    const envUrl = import.meta.env.VITE_AWS_API_URL;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If saved is localhost but env says otherwise, prefer env (helps with deployment changes)
        if (parsed.awsApiUrl === "http://localhost:3001" && envUrl && envUrl !== "http://localhost:3001") {
          parsed.awsApiUrl = envUrl;
        }
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
      toast({ title: "Salvat", description: "Configurația MySQL a fost salvată local." });
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
              Status Conexiune
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
                <p className="font-medium text-sm">MySQL Database</p>
                <p className="text-xs text-muted-foreground">{config.awsApiUrl}</p>
              </div>
            </div>
            <StatusBadge status={mysqlStatus} />
          </div>
        </CardContent>
      </Card>

      {/* MySQL Configuration */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Configurare MySQL
          </h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">Adresa Bază de Date MySQL (IP/Host)</Label>
              <Input
                id="api-url"
                value={config.awsApiUrl.replace('http://', '').split(':')[0]}
                onChange={(e) => {
                  const host = e.target.value.trim();
                  // Automatically format as full API URL internally
                  const formatted = host.includes(':') ? `http://${host}` : `http://${host}:3001`;
                  setConfig(prev => ({ ...prev, awsApiUrl: formatted, mysqlHost: host }));
                }}
                placeholder="Ex: 63.180.248.80"
              />
              <p className="text-xs text-muted-foreground">
                Introdu adresa IP a serverului unde este găzduită baza de date.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mysql-host">Host</Label>
                <Input
                  id="mysql-host"
                  value={config.mysqlHost}
                  onChange={(e) => setConfig(prev => ({ ...prev, mysqlHost: e.target.value }))}
                  placeholder="localhost"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mysql-port">Port</Label>
                <Input
                  id="mysql-port"
                  value={config.mysqlPort}
                  onChange={(e) => setConfig(prev => ({ ...prev, mysqlPort: e.target.value }))}
                  placeholder="3306"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mysql-database">Database</Label>
              <Input
                id="mysql-database"
                value={config.mysqlDatabase}
                onChange={(e) => setConfig(prev => ({ ...prev, mysqlDatabase: e.target.value }))}
                placeholder="dental_clinic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mysql-user">User</Label>
              <Input
                id="mysql-user"
                value={config.mysqlUser}
                onChange={(e) => setConfig(prev => ({ ...prev, mysqlUser: e.target.value }))}
                placeholder="root"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mysql-password">Password</Label>
              <Input
                id="mysql-password"
                type="password"
                value={config.mysqlPassword}
                onChange={(e) => setConfig(prev => ({ ...prev, mysqlPassword: e.target.value }))}
                placeholder="••••••••"
              />
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
