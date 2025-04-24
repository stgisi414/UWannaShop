import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET || 'your-default-session-secret',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // Add other configurations as needed

  rakuten: {
    appId: process.env.RAKUTEN_APP_ID,
    affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
  },
};

// Basic validation (optional but recommended)
if (!config.databaseUrl) {
  console.warn('DATABASE_URL environment variable is not set.');
  // Depending on your setup, you might want to throw an error here
}
if (!config.sessionSecret || config.sessionSecret === 'your-default-session-secret') {
    console.warn('SESSION_SECRET environment variable is not set or using default. Please set a strong secret.');
}
// Add checks for Stripe keys if used
