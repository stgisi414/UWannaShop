import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupChatbotEndpoint } from "./chatbot";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import Stripe from "stripe";
import {
  insertProductSchema,
  insertCategorySchema,
  insertAddressSchema,
  insertCartItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertReferralSchema
} from "@shared/schema";

// Initialize Stripe
const stripeApiKey = process.env.STRIPE_SECRET_KEY || "sk_test_your_key";
const stripe = new Stripe(stripeApiKey, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Set up chatbot endpoint
  setupChatbotEndpoint(app);
  
  // Middleware for requiring authentication
  const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
  
  // Middleware for requiring admin role
  const requireAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };
  
  // Helper for error handling Zod validation
  const handleZodError = (error: any, res) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    throw error;
  };
  
  // Product routes
  app.get("/api/products", async (req, res, next) => {
    try {
      const {
        categoryId,
        categorySlug,
        search,
        minPrice,
        maxPrice,
        sort,
        limit,
        offset
      } = req.query;
      
      const products = await storage.getProducts({
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        categorySlug: categorySlug as string,
        search: search as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sort: sort as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      res.json(products);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/products/featured", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
      const featuredProducts = await storage.getFeaturedProducts(limit);
      res.json(featuredProducts);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/products/:id", async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/products/slug/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const product = await storage.getProductBySlug(slug);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/products", requireAdmin, async (req, res, next) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.put("/api/products/:id", requireAdmin, async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(productId, productData);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.delete("/api/products/:id", requireAdmin, async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      const success = await storage.deleteProduct(productId);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Category routes
  app.get("/api/categories", async (req, res, next) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/categories/:id", async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategoryById(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/categories/slug/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug;
      const category = await storage.getCategoryBySlug(slug);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/categories", requireAdmin, async (req, res, next) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.put("/api/categories/:id", requireAdmin, async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id);
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(categoryId, categoryData);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.delete("/api/categories/:id", requireAdmin, async (req, res, next) => {
    try {
      const categoryId = parseInt(req.params.id);
      const success = await storage.deleteCategory(categoryId);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Cart routes
  app.get("/api/cart", async (req, res, next) => {
    try {
      let cart;
      
      if (req.isAuthenticated()) {
        // Get user's cart
        cart = await storage.getCart(req.user.id);
      } else if (req.session.id) {
        // Get guest cart by session ID
        cart = await storage.getCart(null, req.session.id);
      }
      
      if (!cart) {
        return res.json({ items: [] });
      }
      
      const cartItems = await storage.getCartItems(cart.id);
      
      res.json({
        id: cart.id,
        items: cartItems
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/cart", async (req, res, next) => {
    try {
      // Create or get an existing cart
      let cart;
      
      if (req.isAuthenticated()) {
        // Check if user already has a cart
        cart = await storage.getCart(req.user.id);
        
        if (!cart) {
          // Create new cart for user
          cart = await storage.createCart({ userId: req.user.id });
        }
      } else if (req.session.id) {
        // Check if session already has a cart
        cart = await storage.getCart(null, req.session.id);
        
        if (!cart) {
          // Create new cart for session
          cart = await storage.createCart({ sessionId: req.session.id });
        }
      } else {
        return res.status(400).json({ message: "Failed to identify user or session" });
      }
      
      // Add item to cart
      const itemData = insertCartItemSchema.parse({
        ...req.body,
        cartId: cart.id
      });
      
      const cartItem = await storage.addItemToCart(itemData);
      const cartItems = await storage.getCartItems(cart.id);
      
      res.status(201).json({
        id: cart.id,
        items: cartItems
      });
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.put("/api/cart/items/:id", async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.id);
      const { quantity } = req.body;
      
      if (quantity === undefined || quantity < 1) {
        return res.status(400).json({ message: "Valid quantity required" });
      }
      
      const updatedItem = await storage.updateCartItemQuantity(itemId, quantity);
      
      // Get the complete updated cart
      let cart;
      
      if (req.isAuthenticated()) {
        cart = await storage.getCart(req.user.id);
      } else if (req.session.id) {
        cart = await storage.getCart(null, req.session.id);
      }
      
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
      
      const cartItems = await storage.getCartItems(cart.id);
      
      res.json({
        id: cart.id,
        items: cartItems
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/cart/items/:id", async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.id);
      const success = await storage.removeCartItem(itemId);
      
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      // Get the updated cart
      let cart;
      
      if (req.isAuthenticated()) {
        cart = await storage.getCart(req.user.id);
      } else if (req.session.id) {
        cart = await storage.getCart(null, req.session.id);
      }
      
      if (!cart) {
        return res.json({ items: [] });
      }
      
      const cartItems = await storage.getCartItems(cart.id);
      
      res.json({
        id: cart.id,
        items: cartItems
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/cart", async (req, res, next) => {
    try {
      let cart;
      
      if (req.isAuthenticated()) {
        cart = await storage.getCart(req.user.id);
      } else if (req.session.id) {
        cart = await storage.getCart(null, req.session.id);
      }
      
      if (cart) {
        await storage.clearCart(cart.id);
      }
      
      res.json({ items: [] });
    } catch (error) {
      next(error);
    }
  });
  
  // Address routes
  app.get("/api/addresses", requireAuth, async (req, res, next) => {
    try {
      const addresses = await storage.getAddresses(req.user.id);
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/addresses", requireAuth, async (req, res, next) => {
    try {
      const addressData = insertAddressSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const address = await storage.createAddress(addressData);
      res.status(201).json(address);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.put("/api/addresses/:id", requireAuth, async (req, res, next) => {
    try {
      const addressId = parseInt(req.params.id);
      const addressData = insertAddressSchema.partial().parse(req.body);
      
      // Ensure users can only modify their own addresses
      const existingAddress = await storage.getAddressById(addressId);
      
      if (!existingAddress) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      if (existingAddress.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this address" });
      }
      
      const address = await storage.updateAddress(addressId, addressData);
      res.json(address);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.delete("/api/addresses/:id", requireAuth, async (req, res, next) => {
    try {
      const addressId = parseInt(req.params.id);
      
      // Ensure users can only delete their own addresses
      const existingAddress = await storage.getAddressById(addressId);
      
      if (!existingAddress) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      if (existingAddress.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this address" });
      }
      
      const success = await storage.deleteAddress(addressId);
      
      if (!success) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  
  // Order routes
  app.get("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const orders = await storage.getOrders(req.user.id);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/orders/:id", requireAuth, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Ensure users can only access their own orders (unless admin)
      if (order.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }
      
      const orderItems = await storage.getOrderItems(orderId);
      
      res.json({
        ...order,
        items: orderItems
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Stripe Payment Intent creation
  app.post("/api/create-payment-intent", requireAuth, async (req, res, next) => {
    try {
      const { total } = req.body;
      
      if (!total || typeof total !== 'number' || total <= 0) {
        return res.status(400).json({ message: "Valid total amount required" });
      }
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Convert to cents
        currency: "usd",
        payment_method_types: ["card"],
        metadata: {
          userId: req.user.id.toString()
        }
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Create order
  app.post("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const order = await storage.createOrder(orderData);
      
      // Create order items from cart items
      const cart = await storage.getCart(req.user.id);
      
      if (cart) {
        const cartItems = await storage.getCartItems(cart.id);
        
        for (const item of cartItems) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          });
        }
        
        // Clear the cart after creating order
        await storage.clearCart(cart.id);
      }
      
      // Get complete order with items
      const orderItems = await storage.getOrderItems(order.id);
      
      res.status(201).json({
        ...order,
        items: orderItems
      });
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  // Webhook for Stripe events (payment succeeded, etc.)
  app.post("/api/webhook", async (req, res, next) => {
    let event;
    
    try {
      // Verify the event came from Stripe
      const signature = req.headers["stripe-signature"];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (endpointSecret && signature) {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          endpointSecret
        );
      } else {
        // For development without webhook secret
        event = req.body;
      }
      
      // Handle the event
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          
          // Find the order with this payment intent ID and update its status
          // This would typically involve looking up the order and updating it
          // For simplicity in this example, we'll just log it
          console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
          
          // In a real implementation, you would update the order status
          // await storage.updateOrderByPaymentIntentId(paymentIntent.id, { status: 'paid' });
          
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });
  
  // Admin routes
  app.get("/api/admin/orders", requireAdmin, async (req, res, next) => {
    try {
      // In a real implementation, you would fetch all orders for admin view
      // This is a simplified implementation
      res.json([]);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/admin/orders/:id", requireAdmin, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const order = await storage.updateOrderStatus(orderId, status);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      next(error);
    }
  });
  
  // Referral routes
  app.post("/api/referrals", requireAuth, async (req, res, next) => {
    try {
      const referralData = insertReferralSchema.parse({
        ...req.body,
        referrerId: req.user.id
      });
      
      const referral = await storage.createReferral(referralData);
      res.status(201).json(referral);
    } catch (error) {
      handleZodError(error, res);
      next(error);
    }
  });
  
  app.get("/api/referrals/:code", async (req, res, next) => {
    try {
      const code = req.params.code;
      const referral = await storage.getReferralByCode(code);
      
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      
      res.json(referral);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/referrals/:code/redeem", requireAuth, async (req, res, next) => {
    try {
      const code = req.params.code;
      const referral = await storage.getReferralByCode(code);
      
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      
      // Check if referral has expired
      if (referral.expiresAt && new Date(referral.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Referral code has expired" });
      }
      
      // Check if referral has reached maximum uses
      if (referral.maxUses && referral.usageCount >= referral.maxUses) {
        return res.status(400).json({ message: "Referral code has reached maximum uses" });
      }
      
      // Check that user isn't referring themselves
      if (referral.referrerId === req.user.id) {
        return res.status(400).json({ message: "Cannot use your own referral code" });
      }
      
      // Track the referral use
      await storage.trackReferral(referral.id, req.user.id);
      
      res.json({ success: true, message: "Referral code successfully redeemed" });
    } catch (error) {
      next(error);
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
