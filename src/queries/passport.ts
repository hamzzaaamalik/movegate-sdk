import type { MoveGateTransport } from '../client.js';
import { fetchObjectJson } from '../client.js';
import type { NetworkConfig } from '../constants.js';
import type { AgentPassport, AgentRegistryData } from '../types.js';
import { parsePassport, parseAgentRegistry } from '../bcs/structs.js';

export async function getPassport(
	client: MoveGateTransport,
	passportId: string,
): Promise<AgentPassport> {
	const json = await fetchObjectJson(client, passportId);
	return parsePassport(json);
}

export async function getAgentRegistry(
	client: MoveGateTransport,
	config: NetworkConfig,
): Promise<AgentRegistryData> {
	const json = await fetchObjectJson(client, config.agentRegistry);
	return parseAgentRegistry(json);
}

export async function hasPassport(
	client: MoveGateTransport,
	config: NetworkConfig,
	agentAddress: string,
): Promise<boolean> {
	const passportId = await getPassportIdByAgent(client, config, agentAddress);
	return passportId !== null;
}

export async function getPassportIdByAgent(
	client: MoveGateTransport,
	config: NetworkConfig,
	agentAddress: string,
): Promise<string | null> {
	// Get the passport_index table ID from the registry
	const registryJson = await fetchObjectJson(client, config.agentRegistry);

	const passportIndex = registryJson.passport_index;
	if (!passportIndex || typeof passportIndex !== 'object') return null;

	const indexObj = passportIndex as Record<string, unknown>;
	const tableId = indexObj.id;
	if (typeof tableId !== 'string' || !tableId) return null;

	// List dynamic fields to find the agent's entry
	try {
		const fields = await client.listDynamicFields({ parentId: tableId });
		for (const field of fields.dynamicFields) {
			if (field.$kind !== 'DynamicField') continue;
			// Get the field object to check the value
			const fieldObj = await client.getObject({
				objectId: field.fieldId,
				include: { json: true },
			});

			const fieldJson = fieldObj.object?.json;
			if (!fieldJson || typeof fieldJson !== 'object') continue;

			const fieldData = fieldJson as Record<string, unknown>;
			const name = fieldData.name;
			if (typeof name === 'string' && name === agentAddress) {
				const value = fieldData.value;
				return typeof value === 'string' ? value : null;
			}
		}
		return null;
	} catch {
		return null;
	}
}
