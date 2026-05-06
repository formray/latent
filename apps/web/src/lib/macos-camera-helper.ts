const HELPER_BASE_URL = "http://127.0.0.1:5174";

export interface MacosCameraHelperServiceStatus {
  disabled: boolean;
  pids: number[];
  suspendedPids: number[];
  runningPids: number[];
}

export interface MacosCameraHelperStatus {
  ok: true;
  platform: string;
  uid: number;
  services: {
    ptpcamerad: MacosCameraHelperServiceStatus;
    icdd: MacosCameraHelperServiceStatus;
  };
}

export interface MacosCameraHelperResponse {
  status: MacosCameraHelperStatus;
}

export function canUseMacosCameraHelper(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const host = window.location.hostname;
  return (
    (host === "localhost" || host === "127.0.0.1") &&
    /Mac/i.test(navigator.userAgent)
  );
}

export async function getMacosCameraHelperStatus(
  signal?: AbortSignal,
): Promise<MacosCameraHelperStatus> {
  const response = await fetch(
    `${HELPER_BASE_URL}/status`,
    signal ? { signal } : undefined,
  );
  if (!response.ok) throw new Error(`Helper status failed: ${response.status}`);
  const body = (await response.json()) as MacosCameraHelperResponse;
  return body.status;
}

export async function releaseMacosCameraServices(): Promise<MacosCameraHelperStatus> {
  const response = await fetch(`${HELPER_BASE_URL}/release`, { method: "POST" });
  if (!response.ok) throw new Error(`Helper release failed: ${response.status}`);
  const body = (await response.json()) as MacosCameraHelperResponse;
  return body.status;
}

export async function restoreMacosCameraServices(): Promise<MacosCameraHelperStatus> {
  const response = await fetch(`${HELPER_BASE_URL}/restore`, { method: "POST" });
  if (!response.ok) throw new Error(`Helper restore failed: ${response.status}`);
  const body = (await response.json()) as MacosCameraHelperResponse;
  return body.status;
}
