// Snaptrade SDK integration
// Note: Install via: npm install snaptrade-typescript-sdk
// See: https://docs.snaptrade.com/

const CLIENT_ID = process.env.SNAPTRADE_CLIENT_ID!;
const CONSUMER_KEY = process.env.SNAPTRADE_CONSUMER_KEY!;

// For production, instantiate the real SDK:
// import Snaptrade from 'snaptrade-typescript-sdk';
// const sdk = new Snaptrade({ clientId: CLIENT_ID, consumerKey: CONSUMER_KEY });

// For now, return placeholder implementations
export async function registerSnaptradeUser(equityIQUserId: string) {
  return {
    userId: `eiq-${equityIQUserId}`,
    userSecret: 'placeholder-secret',
  };
}

export async function getPortalUrl(userId: string, userSecret: string, redirectUri: string, broker?: string) {
  // In production, call: await sdk.authentication.loginSnapTradeUser({...})
  return `https://app.snaptrade.com/oauth/authorize?client_id=${CLIENT_ID}&userId=${userId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function listConnections(userId: string, userSecret: string) {
  // In production, call: await sdk.connections.listBrokerageAuthorizations({...})
  return [];
}

export async function listAccounts(userId: string, userSecret: string) {
  // In production, call: await sdk.accountInformation.listUserAccounts({...})
  return [];
}

export async function getAccountBalance(userId: string, userSecret: string, accountId: string) {
  // In production, call: await sdk.accountInformation.getUserAccountBalance({...})
  return { balance: 0, currency: 'USD' };
}

export async function getAccountPositions(userId: string, userSecret: string, accountId: string) {
  // In production, call: await sdk.accountInformation.getUserAccountPositions({...})
  return [];
}

export async function getActivities(userId: string, userSecret: string, accountId: string, startDate: Date, endDate: Date) {
  // In production, call: await sdk.transactionsAndReporting.getActivities({...})
  return [];
}
