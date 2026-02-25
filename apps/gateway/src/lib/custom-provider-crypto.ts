import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

export function decryptCustomProviderKey(ciphertext: string): string {
	const secret = process.env.API_KEY_ENCRYPTION_SECRET;
	if (!secret) {
		return ciphertext;
	}

	const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
	if (!ivHex || !tagHex || !encryptedHex) {
		return ciphertext;
	}

	try {
		const key = Buffer.from(secret, "hex");
		if (key.length !== 32) {
			return ciphertext;
		}
		const decipher = crypto.createDecipheriv(
			ALGORITHM,
			key,
			Buffer.from(ivHex, "hex"),
		);
		decipher.setAuthTag(Buffer.from(tagHex, "hex"));
		const result = Buffer.concat([
			decipher.update(Buffer.from(encryptedHex, "hex")),
			decipher.final(),
		]);
		return result.toString("utf8");
	} catch {
		return ciphertext;
	}
}
