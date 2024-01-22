import crypto from "crypto";

export function hashToUUID(inputString: string): string {
  // Create an MD5 hash of the input string
  const hash = crypto.createHash("md5").update(inputString).digest("hex");

  // Format the hash as a UUID (8-4-4-4-12)
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(
    12,
    16
  )}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}