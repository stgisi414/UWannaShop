import { syncRakutenProductsToDatabase } from '../server/services/scraper'; // Adjust path relative to the scripts directory
import { pool } from '../server/db'; // Import the pool to close the DB connection
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file at the project root
// Adjust the path if your .env file is located elsewhere
dotenv.config({ path: path.resolve(__dirname, '../.env') }); 

async function runSync() {
  console.log('Starting manual Rakuten sync...');
  try {
    // You can customize the query parameters passed to the API here
    // Example: Fetch 30 items with the keyword 'electronics'
    await syncRakutenProductsToDatabase({ keyword: 'electronics', hits: 30 }); 
    
    console.log('Manual Rakuten sync completed successfully.');
  } catch (error) {
    console.error('Manual Rakuten sync failed:', error);
    process.exitCode = 1; // Exit with an error code
  } finally {
    // IMPORTANT: Close the database pool to allow the script to exit
    await pool.end(); 
    console.log('Database pool closed.');
  }
}

// Execute the sync function
runSync();