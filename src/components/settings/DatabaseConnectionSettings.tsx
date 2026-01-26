import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { config, getActiveBackend } from "@/config/api";

const DatabaseConnectionSettings = () => {
  const activeBackend = getActiveBackend();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Backend Activ:</span>
        <Badge variant={activeBackend === 'aws' ? 'default' : 'secondary'}>
          {activeBackend === 'aws' ? 'AWS RDS' : 'Lovable Cloud'}
        </Badge>
      </div>

      {activeBackend === 'supabase' ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Lovable Cloud Configuration
            </h4>
            <div className="grid gap-3">
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">URL</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all">
                  {config.supabase.url || 'Not configured'}
                </code>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Project ID</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {import.meta.env.VITE_SUPABASE_PROJECT_ID || 'Not configured'}
                </code>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Anon Key (truncated)</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {config.supabase.anonKey 
                    ? `${config.supabase.anonKey.substring(0, 20)}...${config.supabase.anonKey.substring(config.supabase.anonKey.length - 10)}`
                    : 'Not configured'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              AWS Configuration
            </h4>
            <div className="grid gap-3">
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">API URL</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all">
                  {config.awsApiUrl || 'Not configured'}
                </code>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Cognito Region</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {config.cognito.region || 'Not configured'}
                </code>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Cognito User Pool ID</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {config.cognito.userPoolId || 'Not configured'}
                </code>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-xs text-muted-foreground">Cognito Client ID</span>
                <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                  {config.cognito.clientId || 'Not configured'}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Aceste setări sunt configurate prin variabile de mediu și nu pot fi modificate din interfață.
      </p>
    </div>
  );
};

export default DatabaseConnectionSettings;
