import { useCartContext } from "@/contexts/CartContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, X, CreditCard, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const CartPage = () => {
  const { 
    cart, 
    isLoading, 
    itemCount, 
    subtotal, 
    updateCartItem, 
    removeCartItem, 
    clearCart,
    isUpdatingCart,
    isRemovingItem,
    isClearingCart
  } = useCartContext();

  const handleUpdateQuantity = (itemId: number, quantity: number) => {
    updateCartItem({ itemId, quantity });
  };

  const handleRemoveItem = (itemId: number) => {
    removeCartItem(itemId);
  };

  const handleClearCart = () => {
    clearCart();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-16 w-16 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h1>
          <p className="text-gray-500 mb-8">Looks like you haven't added any products to your cart yet.</p>
          <Button asChild>
            <Link href="/shop">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="border-t border-gray-200">
              {cart.items.map((item) => (
                <div key={item.id} className="py-6 flex border-b border-gray-200">
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
                          onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          disabled={isUpdatingCart || item.quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="px-4 py-1 text-gray-800">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 py-1 text-gray-600 hover:text-gray-800"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={isUpdatingCart}
                        >
                          +
                        </Button>
                      </div>

                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isRemovingItem}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={isClearingCart}
                className="text-red-500 border-red-500 hover:bg-red-50"
              >
                {isClearingCart ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                    Clearing...
                  </span>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Clear Cart
                  </>
                )}
              </Button>
              <Link href="/shop">
                <Button variant="ghost" className="ml-2">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-8 lg:mt-0 lg:col-span-4">
            <div className="bg-gray-50 rounded-lg px-4 py-6 sm:p-6 lg:p-8">
              <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-base font-medium text-gray-900">Subtotal</div>
                  <div className="text-base font-medium text-gray-900">{formatCurrency(subtotal)}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Shipping</div>
                  <div className="text-sm text-gray-600">Calculated at checkout</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Tax</div>
                  <div className="text-sm text-gray-600">Calculated at checkout</div>
                </div>
                
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-base font-medium text-gray-900">Order total</div>
                  <div className="text-base font-medium text-gray-900">{formatCurrency(subtotal)}</div>
                </div>
              </div>
              
              <div className="mt-6">
                <Link href="/checkout">
                  <Button className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Checkout
                  </Button>
                </Link>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  We accept all major credit cards, PayPal, and Apple Pay
                </p>
              </div>
            </div>
            
            <div className="mt-6 bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              <div className="p-4 flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Secure Checkout</h3>
                  <p className="text-xs text-gray-500">Your payment information is encrypted</p>
                </div>
              </div>
              
              <div className="p-4 flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Free Shipping</h3>
                  <p className="text-xs text-gray-500">On orders over $50</p>
                </div>
              </div>
              
              <div className="p-4 flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">30-Day Returns</h3>
                  <p className="text-xs text-gray-500">Simple, easy return process</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
