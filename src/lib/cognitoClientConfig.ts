import { config } from "@/config/api";
import { supabase } from "@/integrations/supabase/client";

export interface CognitoClientConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

const STORAGE_KEY = "cognito_client_config_v1";

let cached: CognitoClientConfig | null = null;
let inFlight: Promise<CognitoClientConfig> | null = null;

function readFromStorage(): CognitoClientConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CognitoClientConfig>;
    if (!parsed.clientId || !parsed.region) return null;
    return {
      userPoolId: parsed.userPoolId || "",
      clientId: parsed.clientId,
      region: parsed.region,
    };
  } catch {
    return null;
  }
}

function writeToStorage(cfg: CognitoClientConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

function fromViteEnv(): CognitoClientConfig | null {
  const clientId = config.cognito.clientId;
  const region = config.cognito.region;
  const userPoolId = config.cognito.userPoolId;

  if (!clientId || !region) return null;
  return { clientId, region, userPoolId };
}

async function fetchFromBackend(): Promise<CognitoClientConfig> {
  const { data, error } = await supabase.functions.invoke("public-config");
  if (error) throw error;

  const cfg = (data as any)?.cognito as Partial<CognitoClientConfig> | undefined;
  if (!cfg?.clientId || !cfg?.region) {
    throw new Error("Missing Cognito configuration");
  }

  return {
    userPoolId: cfg.userPoolId || "",
    clientId: cfg.clientId,
    region: cfg.region,
  };
}

export async function getCognitoClientConfig(): Promise<CognitoClientConfig> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const envCfg = fromViteEnv();
    if (envCfg) {
      cached = envCfg;
      writeToStorage(envCfg);
      return envCfg;
    }

    const stored = readFromStorage();
    if (stored) {
      cached = stored;
      return stored;
    }

    const fetched = await fetchFromBackend();
    cached = fetched;
    writeToStorage(fetched);
    return fetched;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
