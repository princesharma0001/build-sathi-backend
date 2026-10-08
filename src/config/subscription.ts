import './env'; // makes sure dotenv is loaded first

// Lifetime free quotations every seller gets. Override with FREE_QUOTATION_LIMIT in .env
export const FREE_QUOTATION_LIMIT = Number(
  process.env.FREE_QUOTATION_LIMIT || 10,
);