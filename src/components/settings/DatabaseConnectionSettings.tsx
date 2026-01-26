import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface DatabaseConfig {
  useAwsBackend: boolean;
  awsApiUrl: string;
  cognitoRegion: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  useAwsBackend: false,
  awsApiUrl: "http://localhost:3001",
  cognitoRegion: "us-east-1",
  cognitoUserPoolId: "",
  cognitoClientId: "",
};

const DatabaseConnectionSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<DatabaseConfig>(DEFAULT_CONFIG);
  const [awsStatus, setAwsStatus] = useState<"checking" | "connected" | "error">("checking");
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "error">("checking");

  // Fetch saved config from app_settings
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ["database-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "database_config")
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(data.value) } as DatabaseConfig;
        } catch {
          return DEFAULT_CONFIG;
        }
      }
      return DEFAULT_CONFIG;
    },
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, [savedConfig]);

  // Check connection status
  const checkConnections = async () => {
    // Check Supabase/Cloud connection
    setSupabaseStatus("checking");
    try {
      const { error } = await supabase.from("app_settings").select("key").limit(1);
      setSupabaseStatus(error ? "error" : "connected");
    } catch {
      setSupabaseStatus("error");
    }

    // Check AWS backend connection
    setAwsStatus("checking");
    try {
      const response = await fetch(`${config.awsApiUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      setAwsStatus(response.ok ? "connected" : "error");
    } catch {
      setAwsStatus("error");
    }
  };

  useEffect(() => {
    checkConnections();
  }, [config.awsApiUrl]);

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "database_config",
          value: JSON.stringify(config),
          description: "Database connection configuration",
        }, { onConflict: "key" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["database-config"] });
      toast({ title: "Salvat", description: "Configurația bazei de date a fost actualizată." });
    },
    onError: () => {
      toast({ title: "Eroare", description: "Nu s-a putut salva configurația.", variant: "destructive" });
    },
  });

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
        <Badge variant="default" className="gap-1">
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backend Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label className="text-base">Folosește Backend AWS</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Activează pentru a folosi Express/RDS în loc de Lovable Cloud
          </p>
        </div>
        <Switch
          checked={config.useAwsBackend}
          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, useAwsBackend: checked }))}
        />
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Status Conexiuni
            </h4>
            <Button variant="ghost" size="sm" onClick={checkConnections}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Verifică
            </Button>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">Lovable Cloud</p>
                <p className="text-xs text-muted-foreground">Baza de date principală</p>
              </div>
              <StatusBadge status={supabaseStatus} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">AWS Backend</p>
                <p className="text-xs text-muted-foreground">Express + RDS</p>
              </div>
              <StatusBadge status={awsStatus} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Backend Activ:</span>
            <Badge variant={config.useAwsBackend ? "default" : "secondary"}>
              {config.useAwsBackend ? "AWS RDS" : "Lovable Cloud"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AWS Configuration */}
      {config.useAwsBackend && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Configurare AWS
            </h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aws-api-url">API URL</Label>
                <Input
                  id="aws-api-url"
                  value={config.awsApiUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, awsApiUrl: e.target.value }))}
                  placeholder="http://localhost:3001"
                />
                <p className="text-xs text-muted-foreground">
                  Adresa serverului Express
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognito-region">Cognito Region</Label>
                <Input
                  id="cognito-region"
                  value={config.cognitoRegion}
                  onChange={(e) => setConfig(prev => ({ ...prev, cognitoRegion: e.target.value }))}
                  placeholder="us-east-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognito-user-pool">User Pool ID</Label>
                <Input
                  id="cognito-user-pool"
                  value={config.cognitoUserPoolId}
                  onChange={(e) => setConfig(prev => ({ ...prev, cognitoUserPoolId: e.target.value }))}
                  placeholder="eu-central-1_XXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognito-client-id">Client ID</Label>
                <Input
                  id="cognito-client-id"
                  value={config.cognitoClientId}
                  onChange={(e) => setConfig(prev => ({ ...prev, cognitoClientId: e.target.value }))}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lovable Cloud Info */}
      {!config.useAwsBackend && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Lovable Cloud
            </h4>
            <div className="grid gap-3">
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Project ID</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {import.meta.env.VITE_SUPABASE_PROJECT_ID || "coxtweuxzsohlsqatjaf"}
                </code>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <StatusBadge status={supabaseStatus} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        {saveMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Salvează Configurația
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Modificările necesită reîncărcarea paginii pentru a intra în vigoare.
      </p>
    </div>
  );
};

export default DatabaseConnectionSettings;
