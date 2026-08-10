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

/**
 * Full activity history for one account.
 *
 * Note: transactionsAndReporting.getActivities is 410 Gone on this account tier,
 * as are getAllUserHoldings/getUserHoldings. The per-account endpoint below is
 * the one that still works. It paginates, so walk until we've seen `total`.
 */
export async function getAccountActivities(userId: string, userSecret: string, accountId: string) {
  const PAGE = 1000;
  const all: any[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const res = await sdk().accountInformation.getAccountActivities({
      userId,
      userSecret,
      accountId,
      offset,
      limit: PAGE,
    } as any);

    const body = res.data as any;
    const rows: any[] = body?.data ?? [];
    all.push(...rows);

    const total = body?.pagination?.total;
    if (rows.length < PAGE || (typeof total === 'number' && all.length >= total)) break;
    if (offset > 50_000) break; // hard stop; nobody has 50k activities
  }

  return all;
}

/** Unlinks a single brokerage, leaving the user's other connections intact. */
export async function removeConnection(userId: string, userSecret: string, authorizationId: string): Promise<void> {
  await sdk().connections.removeBrokerageAuthorization({ userId, userSecret, authorizationId });
}

/** Removes the user (and every broker connection) on Snaptrade's side. */
export async function deleteUser(userId: string): Promise<void> {
  await sdk().authentication.deleteSnapTradeUser({ userId });
}
