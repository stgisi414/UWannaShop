import { pgTable, text, serial, integer, boolean, timestamp, json, real, pgEnum, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: userRoleEnum("role").default('user').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  stripeCustomerId: text("stripe_customer_id"),
});

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  referrals: many(referrals, { relationName: "referrer" }),
}));

// Addresses
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  isDefault: boolean("is_default").default(false),
  type: text("type").notNull(), // shipping or billing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Address relations
export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

// Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Category relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(productCategories),
}));

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  originalPrice: real("original_price"),
  image: text("image"),
  inventory: integer("inventory").default(0).notNull(),
  featured: boolean("featured").default(false),
  isNew: boolean("is_new").default(false),
  rating: real("rating"),
  supplierSku: text("supplier_sku").unique(),
  categoryId: integer("category_id").references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product relations
export const productsRelations = relations(products, ({ many }) => ({
  categories: many(productCategories),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

// Product Categories (Junction table)
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (t) => ({
  uniqueIdx: uniqueIndex('product_category_idx').on(t.productId, t.categoryId),
}));

// Product Categories relations
export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

// Cart
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text("session_id"), // For guest carts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cart relations
export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

// Cart Items
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cart Items relations
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").default('pending').notNull(),
  total: real("total").notNull(),
  shippingAddressId: integer("shipping_address_id").references(() => addresses.id),
  billingAddressId: integer("billing_address_id").references(() => addresses.id),
  paymentIntentId: text("payment_intent_id"),
  paymentStatus: paymentStatusEnum("payment_status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Order relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
  }),
  billingAddress: one(addresses, {
    fields: [orders.billingAddressId],
    references: [addresses.id],
  }),
  items: many(orderItems),
}));

// Order Items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text("name").notNull(), // Store name at time of purchase
  price: real("price").notNull(), // Store price at time of purchase
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Order Items relations
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Referrals
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id),
  code: text("code").notNull().unique(),
  usageCount: integer("usage_count").default(0).notNull(),
  maxUses: integer("max_uses"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Referral relations
export const referralsRelations = relations(referrals, ({ one, many }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referredUsers: many(referredUsers),
}));

// Referred Users
export const referredUsers = pgTable("referred_users", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referrals.id),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Referred Users relations
export const referredUsersRelations = relations(referredUsers, ({ one }) => ({
  referral: one(referrals, {
    fields: [referredUsers.referralId],
    references: [referrals.id],
  }),
  user: one(users, {
    fields: [referredUsers.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true, role: true, stripeCustomerId: true });

export const insertAddressSchema = createInsertSchema(addresses)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertCategorySchema = createInsertSchema(categories)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertProductSchema = createInsertSchema(products)
  .omit({ id: true, createdAt: true, updatedAt: true, rating: true })
  .extend({
    categories: z.array(z.number()).optional(),
  });

export const insertCartSchema = createInsertSchema(carts)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertCartItemSchema = createInsertSchema(cartItems)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertOrderSchema = createInsertSchema(orders)
  .omit({ id: true, createdAt: true, updatedAt: true, status: true, paymentStatus: true });

export const insertOrderItemSchema = createInsertSchema(orderItems)
  .omit({ id: true, createdAt: true });

export const insertReferralSchema = createInsertSchema(referrals)
  .omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
