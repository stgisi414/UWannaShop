import {
  users, products, categories, carts, cartItems, orders, orderItems, 
  addresses, referrals, referredUsers, productCategories,
  type User, type InsertUser, type Product, type InsertProduct,
  type Category, type InsertCategory, type Cart, type InsertCart,
  type CartItem, type InsertCartItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Address, type InsertAddress,
  type Referral, type InsertReferral
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, like, desc, inArray, isNull, or, gt, lt, between, sql, SQL } from "drizzle-orm";
import session, { type Store } from "express-session";
import * as connectPgModule from "connect-pg-simple";

const connectPg = connectPgModule.default || connectPgModule;
const PostgresSessionStore = connectPg(session);

// Define the storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  
  // Product methods
  getProducts(options?: GetProductsOptions): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductBySupplierSku(sku: string): Promise<Product | undefined>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  updateProductBySupplierSku(sku: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Cart methods
  getCart(userId: number | null, sessionId?: string): Promise<Cart | undefined>;
  createCart(cart: InsertCart): Promise<Cart>;
  getCartItems(cartId: number): Promise<(CartItem & { product: Product })[]>;
  addItemToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: number, quantity: number): Promise<CartItem>;
  removeCartItem(id: number): Promise<boolean>;
  clearCart(cartId: number): Promise<boolean>;
  
  // Order methods
  getOrders(userId: number): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updatePaymentStatus(id: number, paymentStatus: string, paymentIntentId?: string): Promise<Order | undefined>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  
  // Address methods
  getAddresses(userId: number): Promise<Address[]>;
  getAddressById(id: number): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, address: Partial<Address>): Promise<Address | undefined>;
  deleteAddress(id: number): Promise<boolean>;
  
  // Referral methods
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  trackReferral(referralId: number, userId: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export interface GetProductsOptions {
  categoryId?: number;
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
  limit?: number;
  offset?: number;
}
export class DatabaseStorage implements IStorage {
  // Assuming 'Store' will be imported from 'express-session' at the top level
  sessionStore: Store; 

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
  
  // Product methods
  async getProducts(options: GetProductsOptions = {}): Promise<Product[]> {
    let baseQuery = db.select().from(products);
    // Define the type alias based on the initial query
    type ProductSelectQuery = typeof baseQuery; 
    const conditions: SQL[] = [];
    
    // Filter by categoryId
    if (options.categoryId) {
      const productIdsResult = await db.select({ productId: productCategories.productId }).from(productCategories).where(eq(productCategories.categoryId, options.categoryId));
      const productIds = productIdsResult.map(p => p.productId);
      if (productIds.length > 0) {
        conditions.push(inArray(products.id, productIds));
      } else {
        return []; // No products in this category
      }
    }
    
    // Filter by categorySlug
    if (options.categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, options.categorySlug));
      
      if (category) {
        const productIdsResult = await db.select({ productId: productCategories.productId }).from(productCategories).where(eq(productCategories.categoryId, category.id));
        const productIds = productIdsResult.map(p => p.productId);
        
        if (productIds.length > 0) {
          conditions.push(inArray(products.id, productIds));
        } else {
          return []; // No products for this category slug
        }
      } else {
        return []; // Category not found
      }
    }
    
    // Search by name or description
    if (options.search) {
      conditions.push(
        or(
          like(products.name, `%${options.search}%`),
          like(products.description, `%${options.search}%`)
        )! // Added '!' to assert non-null result for or()
      );
    }
    
    // Filter by price range
    if (options.minPrice !== undefined) {
      conditions.push(gt(products.price, options.minPrice));
    }
    if (options.maxPrice !== undefined) {
      conditions.push(lt(products.price, options.maxPrice));
    }

    // Start final query with assertion
    let finalQuery = baseQuery as ProductSelectQuery; 
    
    // Apply conditions and re-assert type
    if (conditions.length > 0) {
      finalQuery = finalQuery.where(and(...conditions)) as ProductSelectQuery; 
    }

    // Apply sorting and re-assert type
    const sortMap = {
        'price_asc': products.price,
        'price_desc': desc(products.price),
        'name_asc': products.name,
        'name_desc': desc(products.name),
        'newest': desc(products.createdAt),
    };
    finalQuery = finalQuery.orderBy(sortMap[options.sort ?? 'newest']) as ProductSelectQuery;
    
    // Apply Pagination and re-assert type
    if (options.limit) {
      finalQuery = finalQuery.limit(options.limit) as ProductSelectQuery;
    }
    if (options.offset) {
      finalQuery = finalQuery.offset(options.offset) as ProductSelectQuery;
    }
    
    // Execute the final query
    return await finalQuery;
  }
  
  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  
  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product;
  }
  
  async getProductBySupplierSku(sku: string): Promise<Product | undefined> {
    if (!products.supplierSku) {
      console.error("Developer Error: 'supplierSku' field is not defined on the 'products' schema object. Make sure it's added in shared/schema.ts");
      return undefined;
    }
    const [product] = await db.select().from(products).where(eq(products.supplierSku, sku));
    return product;
  }
  
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.featured, true))
      .limit(limit);
  }
  
  async createProduct(productData: InsertProduct): Promise<Product> {
    const { categories: categoryIds, ...productInsertData } = productData;
    
    // Create the product
    const [product] = await db.insert(products).values(productInsertData).returning();
    
    // Associate with categories if provided
    if (categoryIds && categoryIds.length > 0) {
      await db.insert(productCategories).values(
        categoryIds.map(categoryId => ({
          productId: product.id,
          categoryId
        }))
      );
    }
    
    return product;
  }
  
  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const { categories: categoryIds, ...productUpdateData } = productData;
    
    // Update the product
    const [updatedProduct] = await db
      .update(products)
      .set({ ...productUpdateData, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    
    // Update categories if provided
    if (categoryIds) {
      // Delete existing associations
      await db
        .delete(productCategories)
        .where(eq(productCategories.productId, id));
      
      // Create new associations
      if (categoryIds.length > 0) {
        await db.insert(productCategories).values(
          categoryIds.map(categoryId => ({
            productId: id,
            categoryId
          }))
        );
      }
    }
    
    return updatedProduct;
  }
  
  async updateProductBySupplierSku(sku: string, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    if (!products.supplierSku) {
      console.error("Developer Error: 'supplierSku' field is not defined on the 'products' schema object. Make sure it's added in shared/schema.ts");
      return undefined;
    }
    const [updatedProduct] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.supplierSku, sku))
      .returning();
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    await db.delete(productCategories).where(eq(productCategories.productId, id));
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }
  
  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }
  
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(productCategories).where(eq(productCategories.categoryId, id));
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Cart methods
  async getCart(userId: number | null, sessionId?: string): Promise<Cart | undefined> {
    if (userId) {
      const [cart] = await db
        .select()
        .from(carts)
        .where(eq(carts.userId, userId));
      return cart;
    } else if (sessionId) {
      const [cart] = await db
        .select()
        .from(carts)
        .where(eq(carts.sessionId, sessionId));
      return cart;
    }
    return undefined;
  }
  
  async createCart(cartData: InsertCart): Promise<Cart> {
    const [cart] = await db.insert(carts).values(cartData).returning();
    return cart;
  }
  
  async getCartItems(cartId: number): Promise<(CartItem & { product: Product })[]> {
    const results = await db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        product: products
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cartId));

    // Fix: Filter out items where the product is null due to left join potentially not finding a match
    return results.filter(item => item.product !== null) as (CartItem & { product: Product })[];
  }
  
  async addItemToCart(itemData: InsertCartItem): Promise<CartItem> {
    // Check if the item already exists in the cart
    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, itemData.cartId),
          eq(cartItems.productId, itemData.productId)
        )
      );
    
    if (existingItem) {
      // Update quantity if item exists
      const [updatedItem] = await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + (itemData.quantity ?? 1),
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Add new item if it doesn't exist
      const [newItem] = await db
        .insert(cartItems)
        .values(itemData)
        .returning();
      return newItem;
    }
  }
  
  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem> {
    const [updatedItem] = await db
      .update(cartItems)
      .set({
        quantity,
        updatedAt: new Date()
      })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }
  
  async removeCartItem(id: number): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(eq(cartItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  async clearCart(cartId: number): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(eq(cartItems.cartId, cartId));
    return true;
  }
  
  // Order methods
  async getOrders(userId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }
  
  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return order;
  }
  
  async createOrder(orderData: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(orderData)
      .returning();
    return order;
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: status as any,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
  
  async updatePaymentStatus(id: number, paymentStatus: string, paymentIntentId?: string): Promise<Order | undefined> {
    const updateData: any = {
      paymentStatus: paymentStatus as any,
      updatedAt: new Date()
    };
    
    if (paymentIntentId) {
      updateData.paymentIntentId = paymentIntentId;
    }
    
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
  
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }
  
  async createOrderItem(itemData: InsertOrderItem): Promise<OrderItem> {
    const [orderItem] = await db
      .insert(orderItems)
      .values(itemData)
      .returning();
    return orderItem;
  }
  
  // Address methods
  async getAddresses(userId: number): Promise<Address[]> {
    return await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId));
  }
  
  async getAddressById(id: number): Promise<Address | undefined> {
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, id));
    return address;
  }
  
  async createAddress(addressData: InsertAddress): Promise<Address> {
    // If this is set as default, unset any existing default address for this user and type
    if (addressData.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(addresses.userId, addressData.userId),
            eq(addresses.type, addressData.type)
          )
        );
    }
    
    const [address] = await db
      .insert(addresses)
      .values(addressData)
      .returning();
    return address;
  }
  
  async updateAddress(id: number, addressData: Partial<Address>): Promise<Address | undefined> {
    // If this is set as default, unset any existing default address for this user and type
    if (addressData.isDefault) {
      const [existingAddress] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, id));
      
      if (existingAddress) {
        await db
          .update(addresses)
          .set({ isDefault: false })
          .where(
            and(
              eq(addresses.userId, existingAddress.userId),
              eq(addresses.type, existingAddress.type),
              sql`${addresses.id} <> ${id}`
            )
          );
      }
    }
    
    const [updatedAddress] = await db
      .update(addresses)
      .set({
        ...addressData,
        updatedAt: new Date()
      })
      .where(eq(addresses.id, id))
      .returning();
    return updatedAddress;
  }
  
  async deleteAddress(id: number): Promise<boolean> {
    const result = await db
      .delete(addresses)
      .where(eq(addresses.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Referral methods
  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db
      .insert(referrals)
      .values(referralData)
      .returning();
    return referral;
  }
  
  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.code, code));
    return referral;
  }
  
  async trackReferral(referralId: number, userId: number): Promise<boolean> {
    // Increment usage count for referral
    await db
      .update(referrals)
      .set({
        usageCount: sql`${referrals.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(referrals.id, referralId));
    
    // Create referred user record
    await db
      .insert(referredUsers)
      .values({
        referralId,
        userId
      });
    
    return true;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
