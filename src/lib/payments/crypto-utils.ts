import crypto from "crypto";

/**
 * CCAvenue AES-128-CBC encryption / decryption helper.
 * CCAvenue uses 16-byte MD5 key derivation from workingKey,
 * and a standard fixed 16-byte IV [0x00..0x0f].
 */
const CCAVENUE_IV = Buffer.from([
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
]);

export function encryptCCAvenue(plainText: string, workingKey: string): string {
  const m = crypto.createHash("md5");
  m.update(workingKey);
  const key = m.digest();

  const cipher = crypto.createCipheriv("aes-128-cbc", key, CCAVENUE_IV);
  let encoded = cipher.update(plainText, "utf8", "hex");
  encoded += cipher.final("hex");
  return encoded;
}

export function decryptCCAvenue(encText: string, workingKey: string): string {
  const m = crypto.createHash("md5");
  m.update(workingKey);
  const key = m.digest();

  const decipher = crypto.createDecipheriv("aes-128-cbc", key, CCAVENUE_IV);
  let decoded = decipher.update(encText, "hex", "utf8");
  decoded += decipher.final("utf8");
  return decoded;
}

/**
 * PayU SHA-512 Request Hash Calculation:
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
export function generatePayURequestHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  salt: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string {
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1 || ""}|${params.udf2 || ""}|${params.udf3 || ""}|${params.udf4 || ""}|${params.udf5 || ""}||||||${params.salt}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * PayU SHA-512 Response Hash Verification:
 * sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * or without additionalCharges:
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyPayUResponseHash(params: {
  status: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  key: string;
  salt: string;
  receivedHash: string;
  additionalCharges?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): boolean {
  let hashString: string;
  if (params.additionalCharges) {
    hashString = `${params.additionalCharges}|${params.salt}|${params.status}||||||${params.udf5 || ""}|${params.udf4 || ""}|${params.udf3 || ""}|${params.udf2 || ""}|${params.udf1 || ""}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${params.key}`;
  } else {
    hashString = `${params.salt}|${params.status}||||||${params.udf5 || ""}|${params.udf4 || ""}|${params.udf3 || ""}|${params.udf2 || ""}|${params.udf1 || ""}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${params.key}`;
  }
  const computed = crypto.createHash("sha512").update(hashString).digest("hex");
  return computed.toLowerCase() === params.receivedHash.toLowerCase();
}
