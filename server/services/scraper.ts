import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { InsertProduct, Product } from '@shared/schema';
import { generateSlug } from '../utils';
import { storage } from '../storage';
import { config } from '../config';

// Define the interface for scraped products
export interface ScrapedProduct {
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  image?: string;
  url: string;
  source: string;
}

// Common utility function to format price strings to numbers
export const formatPrice = (price: string): number => {
  const cleanPrice = price.replace(/[^\d.]/g, '');
  return parseFloat(cleanPrice) || 0;
};

// Sample scraper for Amazon - not used in sample data version but here for reference
const scrapeAmazon = async (url: string): Promise<ScrapedProduct[]> => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const products: ScrapedProduct[] = [];

    $('.s-result-item').each((i, el) => {
      const name = $(el).find('h2 span').text().trim();
      const priceText = $(el).find('.a-price .a-offscreen').first().text().trim();
      const price = formatPrice(priceText);
      
      const originalPriceText = $(el).find('.a-text-price .a-offscreen').first().text().trim();
      const originalPrice = formatPrice(originalPriceText);
      
      const image = $(el).find('img.s-image').attr('src') || '';
      const url = 'https://www.amazon.com' + ($(el).find('a.a-link-normal').attr('href') || '');
      
      if (name && price > 0) {
        products.push({
          name,
          price,
          originalPrice: originalPrice > price ? originalPrice : undefined,
          description: `${name} - Great deal from Amazon.`,
          image,
          url,
          source: 'Amazon'
        });
      }
    });
    
    return products;
  } catch (error) {
    console.error('Error scraping Amazon:', error);
    return [];
  }
};

// Our sample data to avoid actual web scraping which could violate terms of service
export const sampleScrapedDeals: ScrapedProduct[] = [
  {
    name: "Apple AirPods Pro (2nd Generation)",
    price: 189.99,
    originalPrice: 249.99,
    description: "Apple AirPods Pro with USB-C Charging, Active Noise Cancellation, Transparency Mode, Adaptive Audio, Personalized Spatial Audio",
    image: "https://m.media-amazon.com/images/I/51gStsSfFxL._AC_SL1500_.jpg",
    url: "https://www.amazon.com/Apple-Generation-Cancellation-Transparency-Personalized/dp/B0CHX3QBFK/",
    source: "Amazon"
  },
  {
    name: "Samsung 32-Inch ViewFinity S6 Monitor",
    price: 199.99,
    originalPrice: 349.99,
    description: "SAMSUNG 32-Inch ViewFinity S6 Computer Monitor, 4K UHD, IPS Panel, HDR10, Eye Saver Mode, Height Adjustable Stand",
    image: "https://m.media-amazon.com/images/I/71tZqLf-xAL._AC_SL1500_.jpg",
    url: "https://www.amazon.com/SAMSUNG-ViewFinity-Computer-Adjustable-LS32C601EUNXZA/dp/B0CPBDVV4W/",
    source: "Amazon"
  },
  {
    name: "Sony WH-1000XM5 Wireless Headphones",
    price: 328.00,
    originalPrice: 399.99,
    description: "Sony WH-1000XM5 Wireless Noise Canceling Headphones with Auto Noise Canceling Optimizer and Crystal Clear Hands-Free Calling",
    image: "https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg",
    url: "https://www.amazon.com/Sony-WH-1000XM5-Canceling-Headphones-Optimizer/dp/B09XS7JWHH/",
    source: "Amazon"
  },
  {
    name: "LG 27-Inch UltraGear Gaming Monitor",
    price: 196.99,
    originalPrice: 249.99,
    description: "LG 27-Inch UltraGear QHD Gaming Monitor with IPS 1ms, G-SYNC Compatible, AMD FreeSync Premium, HDR 10",
    image: "https://m.media-amazon.com/images/I/61frwPsMZhL._AC_SL1500_.jpg",
    url: "https://www.amazon.com/LG-27GP850-B-Ultragear-Compatible-Adjustable/dp/B093MTSTKD/",
    source: "Best Buy"
  },
  {
    name: "ASUS ROG Strix G16 Gaming Laptop",
    price: 1299.99,
    originalPrice: 1499.99,
    description: "ASUS ROG Strix G16 Gaming Laptop with GeForce RTX 4070, Intel Core i9, 16GB DDR5, 1TB SSD",
    image: "https://m.media-amazon.com/images/I/71AmKW4yuDL._AC_SL1500_.jpg",
    url: "https://www.amazon.com/ASUS-Display-GeForce-i9-13980HX-G614JI-AS94/dp/B0BYZ18T7B/",
    source: "Best Buy"
  }
];

// Map sources to categories
export const sourceToCategory: Record<string, number> = {
  'Amazon': 1, // Electronics
  'Best Buy': 1, // Electronics
  'eBay': 1, // Electronics
  'Walmart': 1, // Electronics
  // Add more mappings as needed
};

// Function to convert scraped products to database format
export const convertToDbProducts = (products: ScrapedProduct[]): InsertProduct[] => {
  return products.map(product => ({
    name: product.name,
    slug: generateSlug(product.name),
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    image: product.image,
    inventory: Math.floor(Math.random() * 100) + 10, // Random inventory between 10-110
    featured: Math.random() > 0.7, // 30% chance of being featured
    isNew: Math.random() > 0.8, // 20% chance of being new
    categories: [sourceToCategory[product.source] || 1], // Default to Electronics if no mapping
  }));
};

// Main function to get deals
export const getDeals = async (): Promise<Product[]> => {
  try {
    // Fetch products from your database instead of scraping/syncing here
    const productsFromDb = await storage.getProducts({ limit: 20, sort: 'newest' }); // Example fetch
    return productsFromDb; // Return products already synced
  } catch (error) {
    console.error('Error getting deals from storage:', error);
    return [];
  }
};

// --- Rakuten API Integration ---

// Environment Variables (Load from .env or config)
// Ensure these are set in your environment or config/index.ts
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || config.rakuten?.appId;
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || config.rakuten?.affiliateId;
const RAKUTEN_API_BASE_URL = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706'; // Example endpoint

// Interface for Rakuten API Item (adjust based on actual response)
interface RakutenItem {
  Item: {
    itemCode: string;
    itemName: string;
    itemPrice: number;
    itemCaption: string;
    mediumImageUrls?: { imageUrl: string }[];
    shopName?: string;
    reviewAverage?: string;
    // Add other fields you might need
  };
}

/**
 * Fetches products from the Rakuten API.
 * @param queryParams Parameters for the Rakuten API search (e.g., { keyword: 'electronics', genreId: 101 })
 * @returns Raw product data array from Rakuten API.
 */
export async function fetchProductsFromRakutenAPI(queryParams: Record<string, string | number>): Promise<RakutenItem[]> {
  if (!RAKUTEN_APP_ID || !RAKUTEN_AFFILIATE_ID) {
    console.error('Rakuten API credentials (RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID) are not configured.');
    // Attempt to gracefully handle missing config in config file or .env
    if (!config.rakuten?.appId || !config.rakuten?.affiliateId) {
        console.error("Check your config file (e.g., server/config.ts) or .env for RAKUTEN_APP_ID and RAKUTEN_AFFILIATE_ID.");
    }
    return [];
  }

  const params = {
    applicationId: RAKUTEN_APP_ID,
    affiliateId: RAKUTEN_AFFILIATE_ID,
    format: 'json',
    ...queryParams,
  };

  try {
    console.log(`Fetching products from Rakuten API with params: ${JSON.stringify(queryParams)}`);
    const response = await axios.get<{ Items: RakutenItem[] }>(RAKUTEN_API_BASE_URL, { params });

    if (response.status === 200 && response.data && response.data.Items) {
      console.log(`Successfully fetched ${response.data.Items.length} items from Rakuten.`);
      return response.data.Items;
    } else {
      console.error('Rakuten API returned unexpected response:', response.status, response.data);
      return [];
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(`Error fetching from Rakuten API: ${error.message}`, {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config ? { url: error.config.url, params: error.config.params } : undefined, // Avoid logging sensitive headers
      });
    } else {
      console.error('An unexpected error occurred while fetching from Rakuten API:', error);
    }
    return [];
  }
}

/**
 * Transforms Rakuten product data into the database schema format.
 * @param rakutenProductList Array of raw product data from Rakuten API.
 * @returns Array of products formatted for database insertion/update.
 */
export function transformRakutenDataToDbProducts(rakutenProductList: RakutenItem[]): InsertProduct[] {
  return rakutenProductList.map((rakutenItem): InsertProduct | null => {
    const item = rakutenItem.Item;
    if (!item || !item.itemCode || !item.itemName || !item.itemPrice) {
        console.warn('Skipping Rakuten item due to missing essential data:', rakutenItem);
        return null; // Skip items with missing essential data
    }

    const imageUrl = item.mediumImageUrls && item.mediumImageUrls.length > 0
      ? item.mediumImageUrls[0].imageUrl.replace('?_ex=128x128', '') // Remove size constraint if present
      : undefined; // Or provide a default placeholder image URL

    // Basic category mapping (Needs refinement based on your categories and Rakuten's genres)
    const categoryId = 1; // Default to 'Electronics' or map based on genreId/shopName if available

    return {
      name: item.itemName,
      slug: generateSlug(item.itemName + '-' + item.itemCode.split(':')[0]), // Add part of SKU for uniqueness
      description: item.itemCaption,
      price: item.itemPrice,
      // originalPrice: undefined, // Rakuten API might not provide this directly
      image: imageUrl,
      inventory: 50, // Default inventory, Rakuten API usually doesn't provide stock level
      featured: false, // Default
      isNew: true, // Default
      // rating: item.reviewAverage ? parseFloat(item.reviewAverage) : undefined, // Optional: Add rating if needed in schema
      supplierSku: item.itemCode, // Crucial: Map Rakuten's unique identifier
      // categories: [categoryId], // Assign category ID - enable if your schema uses productCategories join table
      categoryId: categoryId, // Assign category ID - enable if your schema has categoryId directly on products
      // Ensure all required fields from InsertProduct are present
    };
  }).filter((product): product is InsertProduct => product !== null); // Filter out nulls
}

/**
 * Syncs products from Rakuten API to the database using upsert logic.
 * Checks if a product with the same supplierSku exists. Updates if found, creates if not.
 * @param queryParams Parameters for the Rakuten API search.
 */
export async function syncRakutenProductsToDatabase(queryParams: Record<string, string | number> = { keyword: 'gadgets' }) {
  console.log("Starting Rakuten product sync...");
  const rakutenItems = await fetchProductsFromRakutenAPI(queryParams);
  if (!rakutenItems || rakutenItems.length === 0) {
    console.log("No products fetched from Rakuten API. Sync finished.");
    return;
  }

  const dbProducts = transformRakutenDataToDbProducts(rakutenItems).filter(p => p !== null) as InsertProduct[];
  console.log(`Transformed ${dbProducts.length} Rakuten products for database sync.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of dbProducts) {
    if (!product.supplierSku) {
        console.warn("Skipping product due to missing supplierSku:", product.name);
        skippedCount++;
        continue;
    }
    try {
      const existingProduct = await storage.getProductBySupplierSku(product.supplierSku);

      if (existingProduct) {
        // Update existing product
        // Only update fields that might change: price, inventory, description, image, etc.
        // Keep slug, createdAt, etc.
        const updateData: Partial<InsertProduct> = {
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          inventory: product.inventory, // Update inventory if provided by API
          categoryId: product.categoryId, // Update category if needed
        };
        // We need the ID to update, so fetch it first or modify update logic
        await storage.updateProduct(existingProduct.id, updateData);
        // OR use updateProductBySupplierSku if implemented
        // await storage.updateProductBySupplierSku(product.supplierSku, updateData);
        updatedCount++;
        console.log(`Updated product (SKU: ${product.supplierSku}): ${product.name}`);
      } else {
        // Create new product
        await storage.createProduct(product);
        createdCount++;
        console.log(`Created new product (SKU: ${product.supplierSku}): ${product.name}`);
      }
    } catch (error) {
      console.error(`Error syncing product (SKU: ${product.supplierSku}): ${product.name}`, error);
      skippedCount++;
    }
  }

  console.log(`Rakuten product sync finished. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
}

// --- Wholesale2B API Integration ---

// Environment Variables (Load from .env or config)
const WHOLESALE2B_API_KEY = process.env.WHOLESALE2B_API_KEY || config.wholesale2b?.apiKey;
// Example: Adjust endpoint based on Wholesale2B documentation for product catalog
const WHOLESALE2B_API_ENDPOINT = process.env.WHOLESALE2B_API_ENDPOINT || config.wholesale2b?.productApiEndpoint || 'https://api.wholesale2b.com/v1/products'; // Example endpoint

// Interface for Wholesale2B API Product Item (Hypothetical - adjust based on actual API response)
interface Wholesale2BItem {
  sku: string; // Supplier SKU
  product_name: string;
  description: string;
  wholesale_price?: number; // Price you pay
  msrp?: number; // Suggested retail price
  map_price?: number; // Minimum advertised price
  images: string[]; // Array of image URLs
  stock_quantity?: number;
  category?: string; // Wholesale2B category name
  // Add other fields as needed (e.g., brand, weight, dimensions)
}

/**
 * Fetches products from the Wholesale2B API.
 * @param queryParams Parameters for the Wholesale2B API (e.g., { limit: 100, category: 'electronics' })
 * @returns Raw product data array from Wholesale2B API.
 */
export async function fetchProductsFromWholesale2BAPI(queryParams: Record<string, string | number> = { limit: 50 }): Promise<Wholesale2BItem[]> {
  if (!WHOLESALE2B_API_KEY) {
    console.error('Wholesale2B API Key (WHOLESALE2B_API_KEY) is not configured.');
    if (!config.wholesale2b?.apiKey) {
        console.error("Check your config file (e.g., server/config.ts) or .env for WHOLESALE2B_API_KEY.");
    }
    return [];
  }
  if (!WHOLESALE2B_API_ENDPOINT) {
      console.error('Wholesale2B API Endpoint (WHOLESALE2B_API_ENDPOINT) is not configured.');
      if (!config.wholesale2b?.productApiEndpoint) {
          console.error("Check your config file (e.g., server/config.ts) or .env for WHOLESALE2B_API_ENDPOINT.");
      }
      return [];
  }


  const configAxios = {
    headers: {
      // Adjust authorization based on Wholesale2B documentation (e.g., 'Authorization': `Bearer ${WHOLESALE2B_API_KEY}`)
      'X-Api-Key': WHOLESALE2B_API_KEY,
    },
    params: queryParams,
  };

  try {
    console.log(`Fetching products from Wholesale2B API with params: ${JSON.stringify(queryParams)}`);
    // Adjust response structure based on actual API (e.g., response.data.products)
    const response = await axios.get<{ products: Wholesale2BItem[] }>(WHOLESALE2B_API_ENDPOINT, configAxios);

    if (response.status === 200 && response.data && response.data.products) {
      console.log(`Successfully fetched ${response.data.products.length} items from Wholesale2B.`);
      return response.data.products;
    } else {
      console.error('Wholesale2B API returned unexpected response:', response.status, response.data);
      return [];
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(`Error fetching from Wholesale2B API: ${error.message}`, {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config ? { url: error.config.url, params: error.config.params, headers: 'Headers hidden' } : undefined,
      });
    } else {
      console.error('An unexpected error occurred while fetching from Wholesale2B API:', error);
    }
    return [];
  }
}

/**
 * Transforms Wholesale2B product data into the database schema format.
 * @param w2bProductList Array of raw product data from Wholesale2B API.
 * @returns Array of products formatted for database insertion/update.
 */
export function transformWholesale2BDataToDbProducts(w2bProductList: Wholesale2BItem[]): InsertProduct[] {
  return w2bProductList.map((w2bItem): InsertProduct | null => {
    if (!w2bItem || !w2bItem.sku || !w2bItem.product_name || !(w2bItem.msrp || w2bItem.map_price || w2bItem.wholesale_price)) {
        console.warn('Skipping Wholesale2B item due to missing essential data (SKU, Name, or Price):', w2bItem);
        return null; // Skip items with missing essential data
    }

    const imageUrl = w2bItem.images && w2bItem.images.length > 0 ? w2bItem.images[0] : undefined;

    // Determine the selling price. Prioritize MAP, then MSRP, then wholesale price + markup (e.g., 30%)
    let sellingPrice = 0;
    if (w2bItem.map_price && w2bItem.map_price > 0) {
      sellingPrice = w2bItem.map_price;
    } else if (w2bItem.msrp && w2bItem.msrp > 0) {
      sellingPrice = w2bItem.msrp;
    } else if (w2bItem.wholesale_price && w2bItem.wholesale_price > 0) {
      sellingPrice = w2bItem.wholesale_price * 1.3; // Example: 30% markup on wholesale
    } else {
       console.warn(`Skipping W2B item ${w2bItem.sku} due to zero or missing price fields.`);
       return null; // Skip if no valid price can be determined
    }
     sellingPrice = parseFloat(sellingPrice.toFixed(2)); // Ensure 2 decimal places


    // TODO: Implement category mapping from w2bItem.category to your database category IDs
    const categoryId = 1; // Default to 'Electronics' or map based on w2bItem.category

    return {
      name: w2bItem.product_name,
      slug: generateSlug(`${w2bItem.product_name}-${w2bItem.sku}`), // Append SKU to slug for uniqueness
      description: w2bItem.description || w2bItem.product_name, // Use name if description is empty
      price: sellingPrice,
      originalPrice: (w2bItem.msrp && w2bItem.msrp > sellingPrice) ? w2bItem.msrp : undefined, // Show MSRP as original if higher than selling price
      image: imageUrl,
      inventory: w2bItem.stock_quantity ?? 0, // Use provided stock or default to 0
      featured: false, // Default
      isNew: true, // Default
      supplierSku: w2bItem.sku, // Map Wholesale2B SKU
      // categories: [categoryId], // Assign category ID - Enable if using productCategories join table
      categoryId: categoryId // Assuming direct categoryId link based on schema.ts
    };
  }).filter(p => p !== null) as InsertProduct[]; // Filter out nulls from skipped items
}


/**
 * Syncs products from Wholesale2B API to the database using upsert logic.
 * Checks if a product with the same supplierSku exists. Updates if found, creates if not.
 * @param queryParams Parameters for the Wholesale2B API product fetch.
 */
export async function syncWholesale2BProductsToDatabase(queryParams: Record<string, string | number> = { limit: 50 }) {
  console.log("Starting Wholesale2B product sync...");
  const w2bItems = await fetchProductsFromWholesale2BAPI(queryParams);
  if (!w2bItems || w2bItems.length === 0) {
    console.log("No products fetched from Wholesale2B API. Sync finished.");
    return;
  }

  const dbProducts = transformWholesale2BDataToDbProducts(w2bItems);
  console.log(`Transformed ${dbProducts.length} Wholesale2B products for database sync.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of dbProducts) {
    // The check for supplierSku already happened in the transformer, but double-check just in case.
    if (!product.supplierSku) {
        console.warn("Critical Error: Product missing supplierSku during sync phase:", product.name);
        skippedCount++;
        continue;
    }
    try {
      const existingProduct = await storage.getProductBySupplierSku(product.supplierSku);

      if (existingProduct) {
        // Update existing product
        const updateData: Partial<InsertProduct> = {
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          inventory: product.inventory,
          categoryId: product.categoryId, // Update category if needed
        };
        // Use updateProductBySupplierSku for efficiency if available and reliable
        await storage.updateProductBySupplierSku(product.supplierSku, updateData);
        updatedCount++;
        console.log(`Updated product (SKU: ${product.supplierSku}): ${product.name}`);
      } else {
        // Create new product
        await storage.createProduct(product);
        createdCount++;
        console.log(`Created new product (SKU: ${product.supplierSku}): ${product.name}`);
      }
    } catch (error) {
      console.error(`Error syncing product (SKU: ${product.supplierSku}): ${product.name}`, error);
      skippedCount++;
    }
  }

  console.log(`Wholesale2B product sync finished. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
}


// --- Triggering Sync Functions ---
/*
 * It's recommended to run sync functions like syncRakutenProductsToDatabase() and syncWholesale2BProductsToDatabase()
 * as background jobs or scheduled tasks (e.g., using cron, BullMQ, node-schedule, or a cloud provider's service like AWS Lambda + EventBridge).
 * This prevents blocking API requests and allows for regular updates.
 *
 * Example (using node-schedule):
 * import schedule from 'node-schedule';
 *
 * // Schedule Rakuten sync to run daily at 2 AM
 * schedule.scheduleJob('0 2 * * *', () => {
 *   console.log('Running scheduled Rakuten product sync...');
 *   syncRakutenProductsToDatabase({ keyword: 'electronics', hits: 100 }) // Adjust params as needed
 *     .catch(error => console.error('Scheduled Rakuten sync failed:', error));
 * });
 *
 * // Schedule Wholesale2B sync to run daily at 3 AM
 * schedule.scheduleJob('0 3 * * *', () => {
 *   console.log('Running scheduled Wholesale2B product sync...');
 *   syncWholesale2BProductsToDatabase({ limit: 200 }) // Adjust params as needed
 *     .catch(error => console.error('Scheduled Wholesale2B sync failed:', error));
 * });
 *
 * You would typically place this scheduling logic in your main server setup file (e.g., server/index.ts)
 * after initializing the database and other services.
 */

// --- End Triggering Sync Functions ---