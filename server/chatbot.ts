import { Request, Response } from 'express';
import type { Express } from 'express';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { storage } from './storage';

// Initialize Gemini API client
let geminiModel: GenerativeModel | null = null;

if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-01-21" });
    console.log('Gemini AI client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini API client:', error);
  }
} else {
  console.warn('GEMINI_API_KEY not provided. Chatbot will use fallback responses.');
}

// Fallback responses for when the API is not available
const getFallbackResponse = (message: string): string => {
  const promptLower = message.toLowerCase();
  
  if (promptLower.includes('shipping') || promptLower.includes('delivery')) {
    return "We offer free shipping on all orders over $50. Standard delivery takes 3-5 business days, while express shipping (available for an additional fee) takes 1-2 business days.";
  } else if (promptLower.includes('return') || promptLower.includes('refund')) {
    return "Our return policy allows you to return items within 30 days of delivery for a full refund. Please visit our Returns page or contact customer service for assistance.";
  } else if (promptLower.includes('payment') || promptLower.includes('payment method')) {
    return "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and Apple Pay for payment.";
  } else if (promptLower.includes('order') && promptLower.includes('status')) {
    return "To check your order status, please log in to your account and visit the Orders section. If you need further assistance, our customer service team is available 24/7.";
  } else if (promptLower.includes('cart')) {
    return "You can view your cart by clicking on the cart icon in the top right corner of the page. From there, you can modify quantities or proceed to checkout.";
  } else if (promptLower.includes('product') || promptLower.includes('electronics')) {
    return "We have a wide selection of products across various categories. You can browse our catalog from the main shop page or use the search function to find specific items.";
  }
  
  return "I'm here to help with questions about our products, shipping, returns, and more. How can I assist you today?";
};

export const setupChatbotEndpoint = (app: Express) => {
  app.post('/api/chatbot', async (req: Request, res: Response) => {
    try {
      // Extract the user's message and frontend context from the request
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Gather server-side context (user info, etc.)
      const serverContext: any = {};
      
      // Add user info if authenticated
      if (req.isAuthenticated() && req.user) {
        const { password, ...userInfo } = req.user;
        serverContext.user = userInfo;
        
        // Get user's orders if relevant to the question
        if (message.toLowerCase().includes('order') || message.toLowerCase().includes('purchase')) {
          const orders = await storage.getOrders(req.user.id);
          serverContext.orders = orders;
        }
        
        // Get user's cart if relevant to the question
        if (message.toLowerCase().includes('cart')) {
          const cart = await storage.getCart(req.user.id);
          if (cart) {
            const cartItems = await storage.getCartItems(cart.id);
            serverContext.cart = {
              ...cart,
              items: cartItems
            };
          }
        }
      } else if (req.session?.id) {
        // For non-authenticated users, use session ID to get cart info
        const cart = await storage.getCart(null, req.session.id);
        if (cart) {
          const cartItems = await storage.getCartItems(cart.id);
          serverContext.cart = {
            ...cart,
            items: cartItems
          };
        }
      }
      
      // Fetch product data if the query seems to be about products
      if (message.toLowerCase().includes('product') || 
          message.toLowerCase().includes('price') ||
          message.toLowerCase().includes('item') ||
          message.toLowerCase().includes('stock')) {
        const featuredProducts = await storage.getFeaturedProducts(4);
        serverContext.featuredProducts = featuredProducts;
      }
      
      // Combine frontend and backend context
      const combinedContext = {
        message,
        frontend: context || {},
        backend: serverContext
      };
      
      // Format into a structured prompt for Gemini API
      const prompt = `
        You are an AI assistant for Express Store International, an e-commerce store. 
        Answer the following query from a customer using the context provided.
        
        CUSTOMER QUERY: ${message}
        
        CONTEXT:
        ${JSON.stringify(combinedContext, null, 2)}
        
        Keep your response friendly, helpful and concise. If you don't have enough information to answer correctly,
        say so and suggest how the customer might find the answer or offer to connect them with customer service.
        Don't mention that you're looking at JSON data, instead respond naturally as if you had this knowledge.
      `;
      
      let responseText: string;
      
      // Use Gemini API if available, otherwise use fallback responses
      if (geminiModel) {
        try {
          const result = await geminiModel.generateContent(prompt);
          responseText = result.response.text();
        } catch (geminiError) {
          console.error('Gemini API error:', geminiError);
          responseText = getFallbackResponse(message);
        }
      } else {
        responseText = getFallbackResponse(message);
      }
      
      // Return the response to the client
      res.json({ 
        response: responseText,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Chatbot error:', error);
      res.status(500).json({ error: 'An error occurred while processing your request' });
    }
  });
};
