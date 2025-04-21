import axios from 'axios';
import * as cheerio from 'cheerio';
import { InsertProduct } from '../../shared/schema';
import { generateSlug } from '../utils';

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
export const getDeals = async (): Promise<InsertProduct[]> => {
  try {
    // In a real implementation, you would fetch data from multiple sources
    // const amazonProducts = await scrapeAmazon('https://www.amazon.com/deals');
    // return convertToDbProducts([...amazonProducts, ...otherSources]);
    
    // For demo purposes, use sample data
    return convertToDbProducts(sampleScrapedDeals);
  } catch (error) {
    console.error('Error getting deals:', error);
    return [];
  }
};