import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// In ES modules, __dirname is not defined, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define a type for the configuration object for better type safety
interface AppConfig {
  port: string | number;
  databaseUrl: string | undefined;
  sessionSecret: string;
  stripeSecretKey: string | undefined;
  stripePublishableKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  rakuten: {
    appId: string | undefined;
    affiliateId: string | undefined;
  };
  wholesale2b?: {
    apiKey: string | undefined;
    productApiEndpoint: string | undefined;
  };
}

// Load configuration from environment variables
export const config: AppConfig = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET || 'your-default-session-secret',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  rakuten: {
    appId: process.env.RAKUTEN_APP_ID,
    affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
  },
  wholesale2b: {
    apiKey: process.env.WHOLESALE2B_API_KEY,
    productApiEndpoint: process.env.WHOLESALE2B_API_ENDPOINT,
  },
};

// Basic validation
if (!config.databaseUrl) {
  console.warn('Warning: DATABASE_URL environment variable is not set.');
}

if (!config.sessionSecret || config.sessionSecret === 'your-default-session-secret') {
  console.warn('Warning: SESSION_SECRET is not set or uses the default value. Please set a strong secret in your environment variables.');
}

// Add more validation as needed for other critical variables like API keys
if (!config.stripeSecretKey || !config.stripePublishableKey) {
    console.warn('Warning: Stripe keys (SECRET or PUBLISHABLE) are not set. Payment processing will not function correctly.');
}

// You might want to add similar warnings for Rakuten and Wholesale2B keys if they are essential for your application
// Example:
if (!config.wholesale2b?.apiKey) {
    console.warn('Warning: WHOLESALE2B_API_KEY is not set. Wholesale2B product sync might fail.');
}
