import type { ServerEvent, InventorySnapshot } from './types/network.ts';
interface InventoryBridgeOptions {
  client: {
    state: { inventory?: InventorySnapshot };
    subscribe: (listener: (message: ServerEvent) => void) => unknown;
  };
  apply: (snapshot: InventorySnapshot) => void;
}
/** Online inventory is a read model. Only server receipts change balances,
 * food or HP. There is no local credit/prediction/reconciliation ledger. */
export function createMultiplayerInventory({ client, apply }: InventoryBridgeOptions) {
  client.subscribe((message) => {
    if (message.type === 'inventory') apply(message.inventory);
  });
  if (client.state.inventory) apply(client.state.inventory);
  return { suppress: <T>(fn: () => T): T => fn() };
}
