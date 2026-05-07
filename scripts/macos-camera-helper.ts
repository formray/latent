import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HOST = "127.0.0.1";
const PORT = Number(process.env.LATENT_CAMERA_HELPER_PORT ?? 5174);
const SERVICES = ["ptpcamerad", "icdd"] as const;
const SERVICE_LABELS: Record<ServiceName, string> = {
  ptpcamerad: "com.apple.ptpcamerad",
  icdd: "com.apple.icdd",
};

type ServiceName = (typeof SERVICES)[number];

interface CommandResult {
  command: string;
  ok: boolean;
  stdout: string;
  stderr: string;
}

interface ServiceStatus {
  disabled: boolean;
  pids: number[];
  suspendedPids: number[];
  runningPids: number[];
}

interface HelperStatus {
  ok: true;
  platform: NodeJS.Platform;
  uid: number;
  services: Record<ServiceName, ServiceStatus>;
}

interface HelperResponse {
  status: HelperStatus;
  commands?: CommandResult[];
}

async function main(): Promise<void> {
  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });
  server.listen(PORT, HOST, () => {
    console.log(`Latent macOS camera helper listening at http://${HOST}:${PORT}`);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!originAllowed(req.headers.origin)) {
    writeJson(res, 403, { ok: false, error: "Origin not allowed" });
    return;
  }

  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/status") {
      writeJson(res, 200, { status: await getStatus() });
      return;
    }

    if (req.method === "POST" && req.url === "/release") {
      const commands = await releaseCameraServices();
      writeJson(res, 200, { status: await getStatus(), commands } satisfies HelperResponse);
      return;
    }

    if (req.method === "POST" && req.url === "/restore") {
      const commands = await restoreCameraServices();
      writeJson(res, 200, { status: await getStatus(), commands } satisfies HelperResponse);
      return;
    }

    writeJson(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    writeJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function releaseCameraServices(): Promise<CommandResult[]> {
  return runCommands([
    ["launchctl", ["disable", launchctlTarget("com.apple.ptpcamerad")], false],
    ["launchctl", ["disable", launchctlTarget("com.apple.icdd")], false],
    ["killall", ["-STOP", ...SERVICES], true],
  ]);
}

async function restoreCameraServices(): Promise<CommandResult[]> {
  return runCommands([
    ["killall", ["-CONT", ...SERVICES], true],
    ["launchctl", ["enable", launchctlTarget("com.apple.ptpcamerad")], false],
    ["launchctl", ["enable", launchctlTarget("com.apple.icdd")], false],
  ]);
}

async function runCommands(
  commands: Array<[file: string, args: string[], allowFailure: boolean]>,
): Promise<CommandResult[]> {
  const results: CommandResult[] = [];
  for (const [file, args, allowFailure] of commands) {
    const result = await runCommand(file, args, allowFailure);
    results.push(result);
  }
  return results;
}

async function runCommand(
  file: string,
  args: string[],
  allowFailure: boolean,
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args);
    return {
      command: formatCommand(file, args),
      ok: true,
      stdout,
      stderr,
    };
  } catch (err) {
    const failure = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    if (!allowFailure) throw err;
    return {
      command: formatCommand(file, args),
      ok: false,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? failure.message ?? "",
    };
  }
}

async function getStatus(): Promise<HelperStatus> {
  if (process.platform !== "darwin") {
    return {
      ok: true,
      platform: process.platform,
      uid: process.getuid?.() ?? -1,
      services: emptyServiceStatuses(),
    };
  }
  const [disabled, processes] = await Promise.all([readDisabledServices(), readProcesses()]);
  return {
    ok: true,
    platform: process.platform,
    uid: process.getuid?.() ?? -1,
    services: Object.fromEntries(
      SERVICES.map((name) => {
        const matches = processes.filter((item) => item.name === name);
        return [
          name,
          {
            disabled: disabled.has(SERVICE_LABELS[name]),
            pids: matches.map((item) => item.pid),
            suspendedPids: matches
              .filter((item) => item.stat.includes("T"))
              .map((item) => item.pid),
            runningPids: matches
              .filter((item) => !item.stat.includes("T"))
              .map((item) => item.pid),
          },
        ];
      }),
    ) as Record<ServiceName, ServiceStatus>,
  };
}

async function readDisabledServices(): Promise<Set<string>> {
  const { stdout } = await execFileAsync("launchctl", ["print-disabled", launchctlDomain()]);
  return parseDisabledServices(stdout);
}

async function readProcesses(): Promise<Array<{ name: ServiceName; pid: number; stat: string }>> {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,stat=,args="]);
  return parseCameraProcesses(stdout);
}

export function parseDisabledServices(output: string): Set<string> {
  const disabled = new Set<string>();
  for (const line of output.split("\n")) {
    const match = line.match(/"([^"]+)"\s*=>\s*disabled/);
    if (match) disabled.add(match[1]!);
  }
  return disabled;
}

export function parseCameraProcesses(
  output: string,
): Array<{ name: ServiceName; pid: number; stat: string }> {
  const processes: Array<{ name: ServiceName; pid: number; stat: string }> = [];
  for (const line of output.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    const stat = match[2]!;
    const args = match[3]!;
    if (args.includes("/usr/libexec/ptpcamerad") || args.endsWith("ptpcamerad")) {
      processes.push({ name: "ptpcamerad", pid, stat });
    } else if (args.includes("/Image Capture/Support/icdd") || args.endsWith("/icdd")) {
      processes.push({ name: "icdd", pid, stat });
    }
  }
  return processes;
}

function emptyServiceStatuses(): Record<ServiceName, ServiceStatus> {
  return {
    ptpcamerad: { disabled: false, pids: [], suspendedPids: [], runningPids: [] },
    icdd: { disabled: false, pids: [], suspendedPids: [], runningPids: [] },
  };
}

function launchctlDomain(): string {
  return `gui/${process.getuid?.() ?? 501}`;
}

function launchctlTarget(service: string): string {
  return `${launchctlDomain()}/${service}`;
}

function formatCommand(file: string, args: string[]): string {
  return [file, ...args].join(" ");
}

function setCors(res: ServerResponse, origin: string | undefined): void {
  if (originAllowed(origin) && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

