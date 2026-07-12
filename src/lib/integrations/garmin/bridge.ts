import { spawn } from "child_process";
import path from "path";

export type GarminBridgeLoginResult = {
  ok: boolean;
  status?: "CONNECTED";
  tokenPayload?: Record<string, string>;
  profile?: Record<string, unknown>;
  errorCode?: string;
  message?: string;
};

export type GarminBridgeRecord = {
  endpointKey: string;
  dataDomain: string;
  methodName: string;
  recordDate?: string | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  requestParameters?: Record<string, unknown>;
  payload: unknown;
};

export type GarminBridgeSyncResult = {
  ok: boolean;
  records?: GarminBridgeRecord[];
  errors?: Array<{
    endpointKey?: string;
    dataDomain?: string;
    methodName?: string;
    errorCode: string;
    message: string;
  }>;
  fetchedAt?: string;
  errorCode?: string;
  message?: string;
};

export async function runGarminLogin(input: {
  email: string;
  password: string;
  mfaCode?: string;
}): Promise<GarminBridgeLoginResult> {
  return runBridge<GarminBridgeLoginResult>("login", input);
}

export async function runGarminSync(input: {
  tokenPayload: Record<string, string>;
  startDate: string;
  endDate: string;
  maxDays: number;
  registry: unknown[];
}): Promise<GarminBridgeSyncResult> {
  return runBridge<GarminBridgeSyncResult>("sync", input);
}

export async function runGarminRegistryDrift() {
  return runBridge<Record<string, unknown>>("registry-drift", {});
}

function runBridge<T>(command: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const python = process.env.GARMIN_PYTHON_BIN?.trim() || "python3";
    const script = process.env.GARMIN_BRIDGE_PATH?.trim()
      || path.join(process.cwd(), "scripts", "garmin_bridge.py");
    const child = spawn(python, [script, command], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    });
    let stdout = "";
    let stderr = "";
    const timeoutMs = Number.parseInt(process.env.GARMIN_REQUEST_TIMEOUT_SECONDS ?? "30", 10) * 1000;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Garmin Bridge Timeout."));
    }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Garmin Bridge fehlgeschlagen (${code}): ${sanitizeStderr(stderr)}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as T);
      } catch {
        reject(new Error("Garmin Bridge lieferte keine gültige JSON-Antwort."));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function sanitizeStderr(value: string): string {
  return value.replace(/\s+/g, " ").slice(0, 500);
}
