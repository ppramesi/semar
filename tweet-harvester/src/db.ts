import pgPromise, { IDatabase } from "pg-promise";

export type ScrapeAccount = {
  id: string;
  name: string;
}

export class Database {
  pg: IDatabase<any>;
  constructor() {
    const pgp = pgPromise();
    this.pg = pgp({
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      port: Number(process.env.POSTGRES_PORT),
      max: 20,
    });
    this.pg.connect();
  }

  async fetchScrapeAccounts() {
    try {
      const result = await this.pg.manyOrNone<ScrapeAccount>('SELECT * FROM scrape_accounts;');
      return result;
    } catch (error) {
      console.error('Error fetching scrape accounts:', error);
      throw error;
    }
  }

  async ensureScrapeAccountsTable() {
    await this.pg.none("CREATE TABLE IF NOT EXISTS scrape_accounts (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, account_name TEXT);");
  }
}