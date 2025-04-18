import {
  users, products, categories, carts, cartItems, orders, orderItems, 
  addresses, referrals, referredUsers, productCategories,
  type User, type InsertUser, type Product, type InsertProduct,
  type Category, type InsertCategory, type Cart, type InsertCart,
  type CartItem, type InsertCartItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Address, type InsertAddress,
  type Referral, type InsertReferral
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, inArray, isNull, or, gt, lt, between, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

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
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
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
  sessionStore: session.SessionStore;
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
  sessionStore: session.SessionStore;
  
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
    let query = db.select().from(products);
    
    // Filter by category
    if (options.categoryId) {
      const productIds = await db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, options.categoryId));
      
      if (productIds.length > 0) {
        query = query.where(inArray(products.id, productIds.map(p => p.productId)));
      } else {
        return []; // No products in this category
      }
    }
    
    if (options.categorySlug) {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, options.categorySlug));
      
      if (category) {
        const productIds = await db
          .select({ productId: productCategories.productId })
          .from(productCategories)
          .where(eq(productCategories.categoryId, category.id));
        
        if (productIds.length > 0) {
          query = query.where(inArray(products.id, productIds.map(p => p.productId)));
        } else {
          return []; // No products in this category
        }
      } else {
        return []; // Category not found
      }
    }
    
    // Search by name or description
    if (options.search) {
      query = query.where(
        or(
          like(products.name, `%${options.search}%`),
          like(products.description, `%${options.search}%`)
        )
      );
    }
    
    // Filter by price range
    if (options.minPrice !== undefined) {
      query = query.where(gt(products.price, options.minPrice));
    }
    
    if (options.maxPrice !== undefined) {
      query = query.where(lt(products.price, options.maxPrice));
    }
    
    // Sorting
    if (options.sort) {
      switch (options.sort) {
        case 'price_asc':
          query = query.orderBy(products.price);
          break;
        case 'price_desc':
          query = query.orderBy(desc(products.price));
          break;
        case 'name_asc':
          query = query.orderBy(products.name);
          break;
        case 'name_desc':
          query = query.orderBy(desc(products.name));
          break;
        case 'newest':
          query = query.orderBy(desc(products.createdAt));
          break;
      }
    } else {
      // Default sort by newest
      query = query.orderBy(desc(products.createdAt));
    }
    
    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }
  
  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  
  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
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
  
  async deleteProduct(id: number): Promise<boolean> {
    await db.delete(productCategories).where(eq(productCategories.productId, id));
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return await db
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
          quantity: existingItem.quantity + itemData.quantity,
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
