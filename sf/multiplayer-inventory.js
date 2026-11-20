/** Online inventory is a read model. Only server receipts change balances,
 * food or HP. There is no local credit/prediction/reconciliation ledger. */
export function createMultiplayerInventory({ client, apply }) {
  client.subscribe((message) => {
    if (message.type === 'inventory') apply(message.inventory);
  });
  if (client.state.inventory) apply(client.state.inventory);
  return { suppress: (fn) => fn() };
}
