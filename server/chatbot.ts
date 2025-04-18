import { Request, Response } from 'express';
import { storage } from './storage';

// This would be replaced with the real Gemini API client
// but for now we'll simulate it
interface GeminiClient {
  generateContent(prompt: string): Promise<GeminiResponse>;
}

interface GeminiResponse {
  text(): Promise<string>;
}

class MockGeminiClient implements GeminiClient {
  async generateContent(prompt: string): Promise<GeminiResponse> {
    // Simple logic to generate a response based on the prompt
    let response = "I'm sorry, I don't have enough context to answer that question.";
    
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('shipping') || promptLower.includes('delivery')) {
      response = "We offer free shipping on all orders over $50. Standard delivery takes 3-5 business days, while express shipping (available for an additional fee) takes 1-2 business days.";
    } else if (promptLower.includes('return') || promptLower.includes('refund')) {
      response = "Our return policy allows you to return items within 30 days of delivery for a full refund. Please visit our Returns page or contact customer service for assistance.";
    } else if (promptLower.includes('payment') || promptLower.includes('payment method')) {
      response = "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and Apple Pay for payment.";
    } else if (promptLower.includes('order') && promptLower.includes('status')) {
      response = "I can see you have an active order. Your order #12345 is currently being processed and should ship within 24 hours. Would you like more details?";
    } else if (promptLower.includes('cart')) {
      response = "Based on your current session, you have 2 items in your cart: Wireless Headphones ($129.99) and Smart Watch Series 6 ($249.99). Your cart total is $379.98. Would you like to proceed to checkout?";
    } else if (promptLower.includes('product') || promptLower.includes('headphone') || promptLower.includes('watch')) {
      response = "We have several top-rated electronics products including our bestselling Wireless Headphones ($129.99) which feature 30-hour battery life and noise cancellation. Would you like me to recommend similar products?";
    }
    
    return {
      text: async () => response
    };
  }
}

// In production, this would be initialized with actual API credentials
const geminiClient = process.env.GEMINI_API_KEY 
  ? null // Real client would be initialized here
  : new MockGeminiClient();

export const setupChatbotEndpoint = (app: Express.Application) => {
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
      } else if (req.session.id) {
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
      
      // Call Gemini API (or mock for development)
      if (!geminiClient) {
        return res.status(503).json({ error: 'Chatbot service is currently unavailable' });
      }
      
      const geminiResponse = await geminiClient.generateContent(prompt);
      const responseText = await geminiResponse.text();
      
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
