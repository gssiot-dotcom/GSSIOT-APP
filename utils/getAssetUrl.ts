const S3_BASE_URL = process.env.EXPO_PUBLIC_S3_ASSET_BASE_URL || "";

export function getAssetUrl(key?: string | null) {
  if (!key) return "";

  const raw = String(key).trim();

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return encodeURI(raw);
  }

  const baseUrl = S3_BASE_URL.replace(/\/+$/, "");
  const normalizedKey = raw.replace(/^\/+/, "");

  return `${baseUrl}/${normalizedKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}