const S3_BASE_URL =
  process.env.EXPO_PUBLIC_S3_ASSET_BASE_URL || "";

export function getAssetUrl(key?: string | null) {
  if (!key) return "";

  if (
    key.startsWith("http://") ||
    key.startsWith("https://")
  ) {
    return key;
  }

  const normalizedKey = key.replace(/^\/+/, "");

  const encodedKey = normalizedKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${S3_BASE_URL}/${encodedKey}`;
}