import { useCartContext } from "@/contexts/CartContext";
import { X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

const CartPanel = () => {
  const { 
    isOpen, 
    closeCart, 
    cart, 
    isLoading, 
    subtotal, 
    updateCartItem, 
    removeCartItem 
  } = useCartContext();

  // Prevent scrolling when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close cart when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeCart();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50" onClick={handleBackdropClick}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
              <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Shopping cart</h2>
                  <div className="ml-3 h-7 flex items-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={closeCart}
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <span className="sr-only">Close panel</span>
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>

                <div className="mt-8">
                  {isLoading ? (
                    <div className="py-6 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : cart?.items.length ? (
                    <div className="flow-root">
                      <ul role="list" className="-my-6 divide-y divide-gray-200">
                        {cart.items.map(item => (
                          <li key={item.id} className="py-6 flex">
                            <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                              {item.product.image ? (
                                <img 
                                  src={item.product.image} 
                                  alt={item.product.name} 
                                  className="w-full h-full object-center object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>

                            <div className="ml-4 flex-1 flex flex-col">
                              <div>
                                <div className="flex justify-between text-base font-medium text-gray-900">
                                  <h3>
                                    <Link href={`/products/${item.product.slug}`}>
                                      {item.product.name}
                                    </Link>
                                  </h3>
                                  <p className="ml-4">{formatCurrency(item.product.price)}</p>
                                </div>
                              </div>
                              <div className="flex-1 flex items-end justify-between text-sm">
                                <div className="flex items-center border rounded-md">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="px-2 py-1 text-gray-600 hover:text-gray-800"
                                    onClick={() => updateCartItem({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </Button>
                                  <span className="px-2 py-1 text-gray-800">{item.quantity}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="px-2 py-1 text-gray-600 hover:text-gray-800"
                                    onClick={() => updateCartItem({ itemId: item.id, quantity: item.quantity + 1 })}
                                  >
                                    +
                                  </Button>
                                </div>

                                <div className="flex">
                                  <Button 
                                    variant="ghost"
                                    className="font-medium text-primary hover:text-blue-700"
                                    onClick={() => removeCartItem(item.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Start adding items to your cart to see them here.
                      </p>
                      <div className="mt-6">
                        <Button onClick={closeCart} className="inline-flex items-center">
                          Continue Shopping
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {cart?.items.length > 0 && (
                <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>{formatCurrency(subtotal)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
                  <div className="mt-6">
                    <Link href="/checkout">
                      <Button className="w-full" onClick={closeCart}>
                        Checkout
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-6 flex justify-center text-sm text-center text-gray-500">
                    <p>
                      or{" "}
                      <Button variant="link" onClick={closeCart} className="text-primary font-medium hover:text-blue-700">
                        Continue Shopping
                      </Button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPanel;
