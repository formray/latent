import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

interface DevProcess {
  name: string;
  command: string;
  args: string[];
}

const processes: DevProcess[] = [
  {
    name: "web",
    command: npmCommand,
    args: [
      "--workspace",
      "@latent/web",
      "run",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "5173",
      "--strictPort",
    ],
  },
  {
    name: "macos-helper",
    command: npmCommand,
    args: ["run", "macos-camera-helper"],
  },
];

const children = new Set<ChildProcessWithoutNullStreams>();
let shuttingDown = false;

console.log("Starting Latent macOS development stack:");
console.log("- web app: http://127.0.0.1:5173/");
console.log("- macOS camera helper: http://127.0.0.1:5174/");
console.log("");

for (const item of processes) {
  start(item);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", 0);
});

function start(item: DevProcess): void {
  const child = spawn(item.command, item.args, {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);
  pipeWithPrefix(child.stdout, item.name);
  pipeWithPrefix(child.stderr, item.name);

  child.once("error", (err) => {
    console.error(`[${item.name}] failed to start: ${err.message}`);
    void shutdown("SIGTERM", 1);
  });

  child.once("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 0}`;
    console.error(`[${item.name}] stopped unexpectedly with ${reason}`);
    void shutdown("SIGTERM", code ?? 1);
  });
}

function pipeWithPrefix(stream: NodeJS.ReadableStream, name: string): void {
  let buffered = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk: string) => {
    buffered += chunk;
    let newlineIndex = buffered.indexOf("\n");
    while (newlineIndex !== -1) {
      writePrefixedLine(name, buffered.slice(0, newlineIndex));
      buffered = buffered.slice(newlineIndex + 1);
      newlineIndex = buffered.indexOf("\n");
    }
  });

  stream.on("end", () => {
    if (buffered.length > 0) writePrefixedLine(name, buffered);
  });
}

function writePrefixedLine(name: string, line: string): void {
  if (line.trim().length === 0) {
    console.log("");
    return;
  }
  console.log(`[${name}] ${line}`);
}

async function shutdown(signal: NodeJS.Signals, exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    stopChild(child, signal);
  }

  setTimeout(() => {
    for (const child of children) {
      stopChild(child, "SIGKILL");
    }
    process.exit(exitCode);
  }, 2_500).unref();

  if (children.size === 0) {
    process.exit(exitCode);
  }
}

function stopChild(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") {
      child.kill(signal);
    } else {
      process.kill(-child.pid, signal);
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== "ESRCH") {
      console.error(`Failed to stop child process ${child.pid}: ${nodeErr.message}`);
    }
  }
}
