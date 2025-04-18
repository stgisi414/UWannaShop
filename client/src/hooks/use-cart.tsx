import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: number;
  items: CartItem[];
}

export const useCart = () => {
  const { toast } = useToast();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ["/api/cart"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/cart");
      return res.json();
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: number; quantity?: number }) => {
      const res = await apiRequest("POST", "/api/cart", { productId, quantity });
      return res.json();
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(["/api/cart"], updatedCart);
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding to cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      const res = await apiRequest("PUT", `/api/cart/items/${itemId}`, { quantity });
      return res.json();
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(["/api/cart"], updatedCart);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeCartItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest("DELETE", `/api/cart/items/${itemId}`);
      return res.json();
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(["/api/cart"], updatedCart);
      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/cart");
      return res.json();
    },
    onSuccess: (emptyCart) => {
      queryClient.setQueryData(["/api/cart"], emptyCart);
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error clearing cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate totals
  const cartItems = cart?.items || [];
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return {
    cart,
    isLoading,
    itemCount,
    subtotal,
    addToCart: addToCartMutation.mutate,
    updateCartItem: updateCartItemMutation.mutate,
    removeCartItem: removeCartItemMutation.mutate,
    clearCart: clearCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isUpdatingCart: updateCartItemMutation.isPending,
    isRemovingItem: removeCartItemMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
  };
};
