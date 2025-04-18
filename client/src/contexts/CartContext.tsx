import { createContext, useContext, ReactNode } from "react";
import { useCart } from "@/hooks/use-cart";
import { CartItem } from "@/hooks/use-cart";

interface CartContextValue {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cart: { items: CartItem[] } | undefined;
  isLoading: boolean;
  itemCount: number;
  subtotal: number;
  addToCart: (params: { productId: number; quantity?: number }) => void;
  updateCartItem: (params: { itemId: number; quantity: number }) => void;
  removeCartItem: (itemId: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const {
    cart,
    isLoading,
    itemCount,
    subtotal,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
  } = useCart();

  // State for cart visibility
  const [isOpen, setIsOpen] = React.useState(false);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  return (
    <CartContext.Provider
      value={{
        isOpen,
        openCart,
        closeCart,
        cart,
        isLoading,
        itemCount,
        subtotal,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
};
