export interface CustomProviderDefinition {
	id: string;
	name: string;
	baseUrl: string;
	models: Array<{
		id: string;
		displayName?: string;
	}>;
}

export function buildCustomModelId(
	providerId: string,
	modelId: string,
): string {
	return `custom:${providerId}/${modelId}`;
}

export function parseCustomModelId(
	modelString: string,
): { providerId: string; modelId: string } | null {
	if (!modelString.startsWith("custom:")) {
		return null;
	}

	const remainder = modelString.slice("custom:".length);
	const separatorIndex = remainder.indexOf("/");
	if (separatorIndex <= 0 || separatorIndex === remainder.length - 1) {
		return null;
	}

	const providerId = remainder.slice(0, separatorIndex);
	const modelId = remainder.slice(separatorIndex + 1);
	if (!providerId || !modelId) {
		return null;
	}

	return { providerId, modelId };
}
