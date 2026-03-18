import type { MoveGateTransport } from '../client.js';
import { fetchObjectJson } from '../client.js';
import type { NetworkConfig } from '../constants.js';
import type { FeeConfig, ProtocolTreasuryData } from '../types.js';
import { parseFeeConfig, parseTreasury } from '../bcs/structs.js';

export async function getFeeConfig(
	client: MoveGateTransport,
	config: NetworkConfig,
): Promise<FeeConfig> {
	const json = await fetchObjectJson(client, config.feeConfig);
	return parseFeeConfig(json);
}

export async function getTreasuryBalance(
	client: MoveGateTransport,
	config: NetworkConfig,
): Promise<ProtocolTreasuryData> {
	const json = await fetchObjectJson(client, config.protocolTreasury);
	return parseTreasury(json);
}
