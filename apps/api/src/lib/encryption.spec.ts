import { afterEach, describe, expect, it } from "vitest";

import { decryptApiKey, encryptApiKey } from "./encryption.js";

describe("encryption", () => {
	afterEach(() => {
		delete process.env.API_KEY_ENCRYPTION_SECRET;
	});

	it("encrypts and decrypts api keys", () => {
		process.env.API_KEY_ENCRYPTION_SECRET = "a".repeat(64);
		const plaintext = "sk-test-123";
		const encrypted = encryptApiKey(plaintext);

		expect(encrypted).not.toBe(plaintext);
		expect(decryptApiKey(encrypted)).toBe(plaintext);
	});

	it("throws with invalid secret length", () => {
		process.env.API_KEY_ENCRYPTION_SECRET = "a".repeat(10);
		expect(() => encryptApiKey("value")).toThrowError(
			"API_KEY_ENCRYPTION_SECRET must be a 32-byte hex string",
		);
	});
});
