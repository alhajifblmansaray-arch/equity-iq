import axios from 'axios';

const SNAPTRADE_API_BASE = 'https://api.snaptrade.com/api/v1';
const SNAPTRADE_CLIENT_ID = process.env.SNAPTRADE_CLIENT_ID!;
const SNAPTRADE_CONSUMER_KEY = process.env.SNAPTRADE_CONSUMER_KEY!;

interface SnaptradeAuth {
  userId: string;
  userSecret: string;
}

interface SnaptradeHolding {
  symbol: { symbol: string; currency?: { code: string } };
  quantity: number;
  price: number;
  currency?: { code: string };
}

interface SnaptradeTransaction {
  id: string;
  trade_date: string;
  settlement_date: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL';
  units: number;
  price: number;
  commission: number;
  net_proceeds: number;
  currency: string;
}

export class SnaptradeService {
  // Create a new Snaptrade user linked to EquityIQ user
  static async createUser(equityIQUserId: string): Promise<SnaptradeAuth> {
    try {
      const response = await axios.post(`${SNAPTRADE_API_BASE}/users`, {
        userId: `eiq-${equityIQUserId}`,
      }, {
        auth: { username: SNAPTRADE_CLIENT_ID, password: SNAPTRADE_CONSUMER_KEY },
      });
      return { userId: response.data.userId, userSecret: response.data.userSecret };
    } catch (error) {
      console.error('Snaptrade user creation failed:', error);
      throw error;
    }
  }

  // Get OAuth redirect URL for user to connect broker
  static getAuthURL(userId: string, userSecret: string, redirectUri: string): string {
    const params = new URLSearchParams({
      userId,
      userSecret,
      clientId: SNAPTRADE_CLIENT_ID,
      redirectUri,
    });
    return `${SNAPTRADE_API_BASE}/oauth/authorize?${params.toString()}`;
  }

  // Fetch all holdings for a Snaptrade user
  static async getHoldings(userId: string, userSecret: string): Promise<SnaptradeHolding[]> {
    try {
      const response = await axios.get(
        `${SNAPTRADE_API_BASE}/holdings`,
        {
          params: { userId, userSecret },
          auth: { username: SNAPTRADE_CLIENT_ID, password: SNAPTRADE_CONSUMER_KEY },
        }
      );
      return response.data.accounts.flatMap((acc: any) => acc.positions || []);
    } catch (error) {
      console.error('Snaptrade holdings fetch failed:', error);
      throw error;
    }
  }

  // Fetch transactions for a Snaptrade user
  static async getTransactions(userId: string, userSecret: string): Promise<SnaptradeTransaction[]> {
    try {
      const response = await axios.get(
        `${SNAPTRADE_API_BASE}/activities`,
        {
          params: { userId, userSecret },
          auth: { username: SNAPTRADE_CLIENT_ID, password: SNAPTRADE_CONSUMER_KEY },
        }
      );
      return response.data || [];
    } catch (error) {
      console.error('Snaptrade transactions fetch failed:', error);
      throw error;
    }
  }

  // Get account balances
  static async getAccounts(userId: string, userSecret: string) {
    try {
      const response = await axios.get(
        `${SNAPTRADE_API_BASE}/accounts`,
        {
          params: { userId, userSecret },
          auth: { username: SNAPTRADE_CLIENT_ID, password: SNAPTRADE_CONSUMER_KEY },
        }
      );
      return response.data || [];
    } catch (error) {
      console.error('Snaptrade accounts fetch failed:', error);
      throw error;
    }
  }
}
