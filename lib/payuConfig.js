// Next.js auto-loads .env.local — no dotenv.config() call needed here.
export default {
  key: process.env.PAYU_MERCHANT_KEY,
  salt: process.env.PAYU_MERCHANT_SALT,
  baseUrl: process.env.PAYU_BASE_URL,
};
