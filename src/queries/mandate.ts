import type { MoveGateTransport } from '../client.js';
import { fetchObjectJson } from '../client.js';
import type { NetworkConfig } from '../constants.js';
import type { Mandate, MandateRegistryData } from '../types.js';
import { parseMandate, parseMandateRegistry } from '../bcs/structs.js';

export async function getMandate(client: MoveGateTransport, mandateId: string): Promise<Mandate> {
	const json = await fetchObjectJson(client, mandateId);
	return parseMandate(json);
}

export async function getMandateRegistry(
	client: MoveGateTransport,
	config: NetworkConfig,
): Promise<MandateRegistryData> {
	const json = await fetchObjectJson(client, config.mandateRegistry);
	return parseMandateRegistry(json);
}

export async function getMandatesByOwner(
	client: MoveGateTransport,
	config: NetworkConfig,
	ownerAddress: string,
): Promise<Mandate[]> {
	const result = await client.listOwnedObjects({
		owner: ownerAddress,
		type: `${config.packageId}::mandate::Mandate`,
	});
	const mandates: Mandate[] = [];
	for (const obj of result.objects) {
		if (!obj.objectId) continue;
		try {
			const json = await fetchObjectJson(client, obj.objectId);
			mandates.push(parseMandate(json));
		} catch {
			// Skip objects that can't be parsed
		}
	}
	return mandates;
}
