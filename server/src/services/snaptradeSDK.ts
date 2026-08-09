import { Snaptrade, CommercialApiKeyAuth } from 'snaptrade-typescript-sdk';

const CLIENT_ID = process.env.SNAPTRADE_CLIENT_ID;
const CONSUMER_KEY = process.env.SNAPTRADE_CONSUMER_KEY;

export const snaptradeConfigured = Boolean(CLIENT_ID && CONSUMER_KEY);

// Built lazily so the server still boots when the keys are absent.
let client: Snaptrade<CommercialApiKeyAuth> | null = null;
function sdk(): Snaptrade<CommercialApiKeyAuth> {
  if (!snaptradeConfigured) {
    throw new Error('Snaptrade is not configured — set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY.');
  }
  if (!client) {
    client = new Snaptrade({
      auth: CommercialApiKeyAuth.create({ clientId: CLIENT_ID!, consumerKey: CONSUMER_KEY! }),
    });
  }
  return client;
}

/** Snaptrade's public id for an EquityIQ user. Prefixed so it never collides with another app's users. */
export function snaptradeUserIdFor(equityIQUserId: string): string {
  return `eiq_${equityIQUserId}`;
}

/** Creates the Snaptrade-side user. The secret is returned once, at registration, and must be stored. */
export async function registerUser(equityIQUserId: string): Promise<{ userId: string; userSecret: string }> {
  const res = await sdk().authentication.registerSnapTradeUser({
    userId: snaptradeUserIdFor(equityIQUserId),
  });
  const { userId, userSecret } = res.data;
  if (!userId || !userSecret) throw new Error('Snaptrade did not return a userId/userSecret.');
  return { userId, userSecret };
}

/** One-time URL for Snaptrade's connection portal. Read-only access — no trade execution. */
export async function getPortalUrl(
  userId: string,
  userSecret: string,
  redirectUri: string,
  broker?: string
): Promise<string> {
  const res = await sdk().authentication.loginSnapTradeUser({
    userId,
    userSecret,
    broker: broker || undefined,
    connectionType: 'read',
    customRedirect: redirectUri,
  });
  // The SDK returns a login-redirect payload; older/newer builds name the field differently.
  const data = res.data as Record<string, unknown>;
  const url = data?.redirectURI ?? data?.redirectUri ?? data?.redirectUrl;
  if (typeof url !== 'string') {
    throw new Error(`Snaptrade did not return a redirect URL (got: ${JSON.stringify(data).slice(0, 200)})`);
  }
  return url;
}

export async function listConnections(userId: string, userSecret: string) {
  const res = await sdk().connections.listBrokerageAuthorizations({ userId, userSecret });
  return res.data ?? [];
}

export async function listAccounts(userId: string, userSecret: string) {
  const res = await sdk().accountInformation.listUserAccounts({ userId, userSecret });
  return res.data ?? [];
}

export async function getAccountBalance(userId: string, userSecret: string, accountId: string) {
  const res = await sdk().accountInformation.getUserAccountBalance({ userId, userSecret, accountId });
  return res.data ?? [];
}

export async function getAccountPositions(userId: string, userSecret: string, accountId: string) {
  const res = await sdk().accountInformation.getUserAccountPositions({ userId, userSecret, accountId });
  return res.data ?? [];
}

export async function getActivities(
  userId: string,
  userSecret: string,
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  const res = await sdk().transactionsAndReporting.getActivities({
    userId,
    userSecret,
    accounts: accountId,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  });
  return res.data ?? [];
}

/** Removes the user (and every broker connection) on Snaptrade's side. */
export async function deleteUser(userId: string): Promise<void> {
  await sdk().authentication.deleteSnapTradeUser({ userId });
}
