import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { decryptApiKey, encryptApiKey } from "@/lib/encryption.js";
import { getActiveUserOrganizationIds } from "@/utils/authorization.js";

import { and, db, eq, tables } from "@llmgateway/db";

import type { ServerTypes } from "@/vars.js";

export const customProviders = new OpenAPIHono<ServerTypes>();

const providerSchema = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	baseUrl: z.string(),
	description: z.string().nullable(),
	isEnabled: z.boolean(),
	roundRobinIndex: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const providerKeySchema = z.object({
	id: z.string(),
	displayName: z.string().nullable(),
	isEnabled: z.boolean(),
	isHealthy: z.boolean(),
	lastFailedAt: z.date().nullable(),
	failureCount: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const providerModelSchema = z.object({
	id: z.string(),
	providerId: z.string(),
	modelId: z.string(),
	displayName: z.string().nullable(),
	isEnabled: z.boolean(),
	isManual: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const createSchema = z.object({
	projectId: z.string().min(1),
	name: z.string().min(1).max(100),
	baseUrl: z.string().url(),
	description: z.string().optional(),
});

async function verifyProjectAccess(userId: string, projectId: string) {
	const organizationIds = await getActiveUserOrganizationIds(userId);
	const project = await db.query.project.findFirst({
		where: and(
			eq(tables.project.id, projectId),
			eq(tables.project.status, "active"),
		),
	});

	if (!project || !organizationIds.includes(project.organizationId)) {
		throw new HTTPException(404, { message: "Project not found" });
	}

	return project;
}

const createProvider = createRoute({
	method: "post",
	path: "/",
	request: {
		body: { content: { "application/json": { schema: createSchema } } },
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ provider: providerSchema }) },
			},
			description: "Provider created",
		},
	},
});

customProviders.openapi(createProvider, async (c) => {
	const user = c.get("user");
	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const payload = c.req.valid("json");
	await verifyProjectAccess(user.id, payload.projectId);
	const [provider] = await db
		.insert(tables.customProvider)
		.values({
			projectId: payload.projectId,
			name: payload.name,
			baseUrl: payload.baseUrl.replace(/\/$/, ""),
			description: payload.description,
		})
		.returning();

	return c.json({ provider });
});

const listProviders = createRoute({
	method: "get",
	path: "/",
	request: { query: z.object({ projectId: z.string().min(1) }) },
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						providers: z.array(
							providerSchema.extend({
								keys: z.array(providerKeySchema),
								models: z.array(providerModelSchema),
							}),
						),
					}),
				},
			},
			description: "Provider list",
		},
	},
});

customProviders.openapi(listProviders, async (c) => {
	const user = c.get("user");
	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const { projectId } = c.req.valid("query");
	await verifyProjectAccess(user.id, projectId);

	const providers = await db.query.customProvider.findMany({
		where: eq(tables.customProvider.projectId, projectId),
		with: {
			keys: true,
			models: true,
		},
	});

	return c.json({ providers });
});

const addKey = createRoute({
	method: "post",
	path: "/{id}/keys",
	request: {
		params: z.object({ id: z.string() }),
		body: {
			content: {
				"application/json": {
					schema: z.object({
						projectId: z.string(),
						apiKey: z.string().min(1),
						displayName: z.string().optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ key: providerKeySchema }) },
			},
			description: "Key created",
		},
	},
});

customProviders.openapi(addKey, async (c) => {
	const user = c.get("user");
	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const payload = c.req.valid("json");
	const { id } = c.req.valid("param");
	await verifyProjectAccess(user.id, payload.projectId);

	const provider = await db.query.customProvider.findFirst({
		where: and(
			eq(tables.customProvider.id, id),
			eq(tables.customProvider.projectId, payload.projectId),
		),
	});

	if (!provider) {
		throw new HTTPException(404, { message: "Provider not found" });
	}

	const [key] = await db
		.insert(tables.customProviderKey)
		.values({
			providerId: provider.id,
			displayName: payload.displayName,
			encryptedKey: encryptApiKey(payload.apiKey),
		})
		.returning();

	return c.json({ key });
});

const fetchModels = createRoute({
	method: "post",
	path: "/{id}/fetch-models",
	request: {
		params: z.object({ id: z.string() }),
		body: {
			content: {
				"application/json": {
					schema: z.object({ projectId: z.string() }),
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						models: z.array(
							z.object({ id: z.string(), object: z.string().optional() }),
						),
					}),
				},
			},
			description: "Fetched models",
		},
	},
});

customProviders.openapi(fetchModels, async (c) => {
	const user = c.get("user");
	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const { projectId } = c.req.valid("json");
	const { id } = c.req.valid("param");
	await verifyProjectAccess(user.id, projectId);

	const provider = await db.query.customProvider.findFirst({
		where: and(
			eq(tables.customProvider.id, id),
			eq(tables.customProvider.projectId, projectId),
		),
		with: { keys: true },
	});

	if (!provider) {
		throw new HTTPException(404, { message: "Provider not found" });
	}

	const key = provider.keys.find((item) => item.isEnabled);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (key) {
		headers.Authorization = `Bearer ${decryptApiKey(key.encryptedKey)}`;
	}

	try {
		const response = await fetch(`${provider.baseUrl}/v1/models`, { headers });
		if (!response.ok) {
			throw new HTTPException(502, {
				message: `Provider returned ${response.status}`,
			});
		}

		const data = (await response.json()) as {
			data?: Array<{ id: string; object?: string }>;
		};
		return c.json({ models: data.data ?? [] });
	} catch (error) {
		if (error instanceof HTTPException) {
			throw error;
		}
		throw new HTTPException(502, {
			message: "Failed to reach provider endpoint",
		});
	}
});

const saveModels = createRoute({
	method: "put",
	path: "/{id}/models",
	request: {
		params: z.object({ id: z.string() }),
		body: {
			content: {
				"application/json": {
					schema: z.object({
						projectId: z.string(),
						models: z.array(
							z.object({
								modelId: z.string(),
								displayName: z.string().optional(),
								isEnabled: z.boolean().default(true),
								isManual: z.boolean().default(false),
							}),
						),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ models: z.array(providerModelSchema) }),
				},
			},
			description: "Saved models",
		},
	},
});

customProviders.openapi(saveModels, async (c) => {
	const user = c.get("user");
	if (!user) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}

	const payload = c.req.valid("json");
	const { id } = c.req.valid("param");
	await verifyProjectAccess(user.id, payload.projectId);

	const provider = await db.query.customProvider.findFirst({
		where: and(
			eq(tables.customProvider.id, id),
			eq(tables.customProvider.projectId, payload.projectId),
		),
	});

	if (!provider) {
		throw new HTTPException(404, { message: "Provider not found" });
	}

	for (const model of payload.models) {
		await db
			.insert(tables.customProviderModel)
			.values({ providerId: provider.id, ...model })
			.onConflictDoUpdate({
				target: [
					tables.customProviderModel.providerId,
					tables.customProviderModel.modelId,
				],
				set: {
					displayName: model.displayName,
					isEnabled: model.isEnabled,
					isManual: model.isManual,
					updatedAt: new Date(),
				},
			});
	}

	const models = await db.query.customProviderModel.findMany({
		where: eq(tables.customProviderModel.providerId, provider.id),
	});
	return c.json({ models });
});
