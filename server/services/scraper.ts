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
 * Fetches products from Rakuten and syncs them (creates/updates) in the local database.
 */
export async function syncRakutenProductsToDatabase(queryParams: Record<string, string | number> = { keyword: 'gadgets' }) {
  console.log('Starting Rakuten product synchronization...');
  const startTime = Date.now();

  const rakutenProducts = await fetchProductsFromRakutenAPI(queryParams);
  if (!rakutenProducts || rakutenProducts.length === 0) {
    console.log('No products fetched from Rakuten API. Sync finished.');
    return;
  }

  const dbProducts = transformRakutenDataToDbProducts(rakutenProducts);
  if (dbProducts.length === 0) {
    console.log('No valid products transformed. Sync finished.');
    return;
  }

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  console.log(`Attempting to sync ${dbProducts.length} products...`);

  for (const product of dbProducts) {
    if (!product.supplierSku) {
        console.warn('Skipping product due to missing supplierSku:', product.name);
        errorCount++;
        continue;
    }
    try {
      const existingProduct = await storage.getProductBySupplierSku(product.supplierSku);

      if (existingProduct) {
        // Product exists, update it (only update relevant fields like price, description, image)
        const { slug, supplierSku, ...updateData } = product; // Exclude slug and sku from update payload
        await storage.updateProductBySupplierSku(product.supplierSku, {
            ...updateData, // Only update fields that might change
            price: product.price,
            description: product.description,
            image: product.image,
            // Don't overwrite inventory unless Rakuten provides it
        });
        updatedCount++;
        // console.log(`Updated product: ${product.name} (SKU: ${product.supplierSku})`);
      } else {
        // Product does not exist, create it
        await storage.createProduct(product);
        createdCount++;
        // console.log(`Created new product: ${product.name} (SKU: ${product.supplierSku})`);
      }
    } catch (error) {
      console.error(`Error syncing product ${product.name} (SKU: ${product.supplierSku}):`, error);
      errorCount++;
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(
    `Rakuten product synchronization finished in ${duration.toFixed(2)}s. ` +
    `Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errorCount}`
  );
}