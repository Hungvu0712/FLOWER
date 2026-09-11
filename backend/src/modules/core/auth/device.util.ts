import type { Request } from "express";

// Rút gọn user-agent thành tên thiết bị dễ đọc cho màn "quản lý thiết bị" — không cần thư viện ngoài.
export function friendlyDeviceName(userAgent = ""): string {
  if (!userAgent) return "Unknown device";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown OS";

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Unknown browser";

  return `${browser} trên ${os}`;
}

export interface RequestMeta {
  userAgent: string;
  deviceName: string;
  ipAddress: string;
}

export function requestMeta(req: Request): RequestMeta {
  const userAgent = req.headers["user-agent"] || "";
  return { userAgent, deviceName: friendlyDeviceName(userAgent), ipAddress: req.ip || "" };
}
