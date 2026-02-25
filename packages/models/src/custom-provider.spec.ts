import { describe, expect, it } from "vitest";

import { buildCustomModelId, parseCustomModelId } from "./custom-provider.js";

describe("custom provider model helpers", () => {
	it("builds and parses model ids", () => {
		const built = buildCustomModelId("provider-1", "llama3.2:latest");
		expect(built).toBe("custom:provider-1/llama3.2:latest");
		expect(parseCustomModelId(built)).toEqual({
			providerId: "provider-1",
			modelId: "llama3.2:latest",
		});
	});

	it("parses model names that contain slashes", () => {
		expect(
			parseCustomModelId("custom:provider-1/meta-llama/Llama-3.1-8B"),
		).toEqual({
			providerId: "provider-1",
			modelId: "meta-llama/Llama-3.1-8B",
		});
	});

	it("returns null for invalid inputs", () => {
		expect(parseCustomModelId("openai/gpt-4o")).toBeNull();
		expect(parseCustomModelId("custom:no-slash")).toBeNull();
		expect(parseCustomModelId("custom:/model")).toBeNull();
		expect(parseCustomModelId("custom:provider/")).toBeNull();
	});
});
