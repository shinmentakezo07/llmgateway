import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
	const secret = process.env.API_KEY_ENCRYPTION_SECRET;
	if (!secret) {
		throw new Error("API_KEY_ENCRYPTION_SECRET is not configured");
	}

	const key = Buffer.from(secret, "hex");
	if (key.length !== 32) {
		throw new Error("API_KEY_ENCRYPTION_SECRET must be a 32-byte hex string");
	}

	return key;
}

export function encryptApiKey(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptApiKey(ciphertext: string): string {
	const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
	if (!ivHex || !tagHex || !encryptedHex) {
		throw new Error("Invalid encrypted API key format");
	}

	const key = getEncryptionKey();
	const iv = Buffer.from(ivHex, "hex");
	const tag = Buffer.from(tagHex, "hex");
	const encrypted = Buffer.from(encryptedHex, "hex");

	const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	const decrypted = Buffer.concat([
		decipher.update(encrypted),
		decipher.final(),
	]);

	return decrypted.toString("utf8");
}
