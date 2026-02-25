import { describe, expect, it } from "vitest";

import { parseModelInput } from "./parse-model-input.js";

describe("parseModelInput", () => {
	it("parses custom:<providerId>/<modelId> model strings", () => {
		const result = parseModelInput(
			"custom:550e8400-e29b-41d4-a716-446655440000/llama3.2:latest",
		);

		expect(result).toEqual({
			requestedModel: "llama3.2:latest",
			requestedProvider: "custom",
			customProviderName: "550e8400-e29b-41d4-a716-446655440000",
		});
	});

	it("throws for malformed custom model string", () => {
		expect(() => parseModelInput("custom:missing-separator")).toThrowError(
			"Invalid custom model format. Use custom:<providerId>/<modelId>",
		);
	});

	it("supports model names containing slashes in custom format", () => {
		const result = parseModelInput(
			"custom:my-provider/meta-llama/Llama-3.1-8B",
		);

		expect(result).toEqual({
			requestedModel: "meta-llama/Llama-3.1-8B",
			requestedProvider: "custom",
			customProviderName: "my-provider",
		});
	});
});
