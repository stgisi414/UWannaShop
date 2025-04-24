import { useState, useRef, useEffect } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCartContext } from "@/contexts/CartContext";

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your Express Store assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const { user } = useAuth();
  const { cart } = useCartContext();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenChat = () => setIsOpen(true);
  const handleCloseChat = () => setIsOpen(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      // Gather frontend context to send to the API
      const frontendContext = {
        location,
        isAuthenticated: !!user,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Get user's timezone
        cart: cart ? {
          itemCount: cart.items.length,
          items: cart.items.map(item => ({
            id: item.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          }))
        } : null
      };
      
      // Send message to backend
      const response = await apiRequest("POST", "/api/chatbot", {
        message: inputValue,
        context: frontendContext
      });
      
      const data = await response.json();
      
      // Add bot response
      const botMessage: Message = {
        id: Date.now() + 1,
        text: data.response,
        sender: 'bot',
        timestamp: new Date(data.timestamp || Date.now())
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message to chatbot:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "I'm sorry, I encountered an error while processing your request. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed right-6 bottom-6 z-50">
      {isOpen ? (
        <div className="flex flex-col bg-white rounded-lg shadow-xl max-w-sm w-full h-96 mb-4 border border-gray-200">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary to-green-500 rounded-t-lg">
            <h3 className="text-lg font-medium text-white">Customer Support</h3>
            <Button variant="ghost" size="icon" onClick={handleCloseChat} className="text-white hover:text-gray-200">
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex items-start ${message.sender === 'user' ? 'justify-end' : ''}`}>
                  {message.sender === 'bot' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`${
                    message.sender === 'user'
                      ? 'bg-primary text-white rounded-lg py-2 px-3 max-w-[85%]'
                      : 'ml-3 bg-gray-100 rounded-lg py-2 px-3 max-w-[85%]'
                  }`}>
                    <p className={`text-sm ${message.sender === 'user' ? 'text-white' : 'text-gray-800'}`}>
                      {message.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex">
              <Input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:ring-primary focus:border-primary"
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="bg-primary text-white py-2 px-4 border border-transparent rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={isLoading || !inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <Button
          onClick={handleOpenChat}
          className="h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-white focus:outline-none hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default ChatbotWidget;
