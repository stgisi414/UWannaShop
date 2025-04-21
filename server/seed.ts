import { db } from './db';
import {
  users,
  categories,
  products,
  productCategories
} from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { getDeals } from './services/scraper';
import { generateSlug } from './utils';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function seed() {
  console.log('Seeding database...');
  
  // Seed categories
  console.log('Seeding categories...');
  const categoriesData = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
    { name: 'Clothing', slug: 'clothing', description: 'Apparel and fashion items' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Products for your home' },
    { name: 'Books', slug: 'books', description: 'Books and publications' }
  ];
  
  const insertedCategories = await db.insert(categories).values(categoriesData).returning();
  console.log(`Added ${insertedCategories.length} categories`);
  
  // Seed products
  console.log('Seeding products...');
  const productsData = [
    {
      name: 'Smartphone X',
      slug: 'smartphone-x',
      description: 'The latest smartphone with amazing features',
      price: 799.99,
      originalPrice: 899.99,
      inventory: 50,
      image: 'https://placehold.co/600x400?text=Smartphone+X',
      featured: true,
      isNew: true,
      rating: 4.5
    },
    {
      name: 'Laptop Pro',
      slug: 'laptop-pro',
      description: 'Powerful laptop for professionals',
      price: 1299.99,
      originalPrice: 1499.99,
      inventory: 30,
      image: 'https://placehold.co/600x400?text=Laptop+Pro',
      featured: true,
      isNew: false,
      rating: 4.8
    },
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium noise-cancelling headphones',
      price: 249.99,
      originalPrice: 299.99,
      inventory: 100,
      image: 'https://placehold.co/600x400?text=Wireless+Headphones',
      featured: true,
      isNew: false,
      rating: 4.6
    },
    {
      name: 'Casual T-Shirt',
      slug: 'casual-t-shirt',
      description: 'Comfortable casual t-shirt',
      price: 19.99,
      originalPrice: 24.99,
      inventory: 200,
      image: 'https://placehold.co/600x400?text=Casual+T-Shirt',
      featured: false,
      isNew: true,
      rating: 4.2
    },
    {
      name: 'Kitchen Blender',
      slug: 'kitchen-blender',
      description: 'High-performance kitchen blender',
      price: 89.99,
      originalPrice: 119.99,
      inventory: 75,
      image: 'https://placehold.co/600x400?text=Kitchen+Blender',
      featured: false,
      isNew: true,
      rating: 4.3
    },
    {
      name: 'Bestselling Novel',
      slug: 'bestselling-novel',
      description: 'The latest bestselling fiction novel',
      price: 14.99,
      originalPrice: 19.99,
      inventory: 150,
      image: 'https://placehold.co/600x400?text=Bestselling+Novel',
      featured: false,
      isNew: true,
      rating: 4.7
    }
  ];
  
  const insertedProducts = await db.insert(products).values(productsData).returning();
  console.log(`Added ${insertedProducts.length} products`);
  
  // Associate products with categories
  console.log('Associating products with categories...');
  const productCategoryAssociations = [
    { productId: insertedProducts[0].id, categoryId: insertedCategories[0].id }, // Smartphone -> Electronics
    { productId: insertedProducts[1].id, categoryId: insertedCategories[0].id }, // Laptop -> Electronics
    { productId: insertedProducts[2].id, categoryId: insertedCategories[0].id }, // Headphones -> Electronics
    { productId: insertedProducts[3].id, categoryId: insertedCategories[1].id }, // T-Shirt -> Clothing
    { productId: insertedProducts[4].id, categoryId: insertedCategories[2].id }, // Blender -> Home & Kitchen
    { productId: insertedProducts[5].id, categoryId: insertedCategories[3].id }, // Novel -> Books
  ];
  
  await db.insert(productCategories).values(productCategoryAssociations);
  console.log(`Created ${productCategoryAssociations.length} product-category associations`);
  
  // Seed admin user
  console.log('Seeding admin user...');
  const hashedPassword = await hashPassword('admin123');
  
  await db.insert(users).values({
    username: 'admin',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'admin'
  });
  
  console.log('Admin user created');
  
  // Seed products from web scraping
  try {
    console.log('Fetching and seeding products from web scraping...');
    
    // Get scraped deals
    const scrapedDeals = await getDeals();
    
    // Add rating property to each scraped product
    const scrapedProductsWithRating = scrapedDeals.map(product => ({
      ...product,
      rating: parseFloat((Math.random() * (5 - 3.8) + 3.8).toFixed(1)), // Random rating between 3.8 and 5.0
    }));
    
    // Insert the scraped products
    const insertedScrapedProducts = await db.insert(products).values(scrapedProductsWithRating).returning();
    console.log(`Added ${insertedScrapedProducts.length} products from web scraping`);
    
    // Associate scraped products with the Electronics category
    const scrapedProductCategoryAssociations = insertedScrapedProducts.map(product => ({
      productId: product.id,
      categoryId: insertedCategories[0].id // Electronics category
    }));
    
    await db.insert(productCategories).values(scrapedProductCategoryAssociations);
    console.log(`Created ${scrapedProductCategoryAssociations.length} product-category associations for scraped products`);
  
  } catch (error) {
    console.error('Error seeding scraped products:', error);
    // Continue with seeding process even if scraping fails
  }
  
  console.log('Database seeding completed successfully');
}

seed()
  .catch(error => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });