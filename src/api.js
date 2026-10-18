export async function api(path, options = {}, retry = true) {
  const r = await fetch("/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });
  if (r.status === 401 && retry && !path.startsWith("/auth/")) {
    const refresh = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (refresh.ok) return api(path, options, false);
  }
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
export const money = (v) =>
  "Rs " +
  ((v || 0) / 100).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const date = (v) =>
  new Date(v).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" });
export const key = () => crypto.randomUUID();
