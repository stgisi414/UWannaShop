import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCartContext } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Address } from "@shared/schema";

// Make sure to load Stripe outside of a component's render to avoid recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

// Checkout form schema
const checkoutSchema = z.object({
  shippingAddressId: z.string().optional(),
  billingAddressId: z.string().optional(),
  shippingAddress: z.object({
    addressLine1: z.string().min(1, "Address is required"),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  }).optional(),
  billingAddress: z.object({
    addressLine1: z.string().min(1, "Address is required"),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    country: z.string().min(1, "Country is required"),
  }).optional(),
  sameAsBilling: z.boolean().default(true),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// CheckoutForm component (to be used inside Elements)
const CheckoutForm = ({ clientSecret }: { clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [_, navigate] = useLocation();
  const { cart, subtotal, clearCart } = useCartContext();
  const { user } = useAuth();

  // Fetch user addresses
  const { data: addresses } = useQuery<Address[]>({
    queryKey: ['/api/addresses'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/addresses');
      return res.json();
    },
    enabled: !!user,
  });

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      sameAsBilling: true,
      notes: "",
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      clearCart();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment Error",
        description: "Stripe has not been properly initialized",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formValues = form.getValues();
      
      // Create the order first
      const shippingAddressId = formValues.shippingAddressId || null;
      const billingAddressId = formValues.sameAsBilling 
        ? shippingAddressId 
        : (formValues.billingAddressId || null);
      
      const orderData = {
        total: subtotal,
        shippingAddressId: shippingAddressId ? parseInt(shippingAddressId) : null,
        billingAddressId: billingAddressId ? parseInt(billingAddressId) : null,
      };
      
      const order = await createOrderMutation.mutateAsync(orderData);

      // Then confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/orders",
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Thank you for your purchase!",
        });
        
        // Navigate to order confirmation
        navigate("/orders");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during checkout",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Shipping Information</h3>
        
        {addresses && addresses.length > 0 && (
          <Form {...form}>
            <FormField
              control={form.control}
              name="shippingAddressId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select a shipping address</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an address" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {addresses
                        .filter(address => address.type === 'shipping')
                        .map(address => (
                          <SelectItem key={address.id} value={address.id.toString()}>
                            {address.addressLine1}, {address.city}, {address.state}
                          </SelectItem>
                        ))}
                      <SelectItem value="new">+ Add new address</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        )}
        
        {/* Display address form fields if needed */}
        
        <h3 className="text-lg font-medium mt-8">Billing Information</h3>
        
        <Form {...form}>
          <FormField
            control={form.control}
            name="sameAsBilling"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                </FormControl>
                <FormLabel>Same as shipping address</FormLabel>
              </FormItem>
            )}
          />
        </Form>
        
        {!form.watch("sameAsBilling") && addresses && addresses.length > 0 && (
          <Form {...form}>
            <FormField
              control={form.control}
              name="billingAddressId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select a billing address</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an address" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {addresses
                        .filter(address => address.type === 'billing')
                        .map(address => (
                          <SelectItem key={address.id} value={address.id.toString()}>
                            {address.addressLine1}, {address.city}, {address.state}
                          </SelectItem>
                        ))}
                      <SelectItem value="new">+ Add new address</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        )}
        
        <h3 className="text-lg font-medium mt-8">Order Notes</h3>
        
        <Form {...form}>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Special instructions for delivery"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
        
        <h3 className="text-lg font-medium mt-8">Payment Details</h3>
        
        <div className="space-y-4">
          <PaymentElement />
          
          <div className="mt-2 text-sm text-gray-500">
            Your payment information is encrypted and secure.
          </div>
        </div>
      </div>
      
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <span className="flex items-center">
            <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
            Processing...
          </span>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {formatCurrency(subtotal)}
          </>
        )}
      </Button>
    </form>
  );
};

// Main Checkout Page component
const CheckoutPage = () => {
  const [clientSecret, setClientSecret] = useState("");
  const { cart, subtotal, itemCount } = useCartContext();
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if cart is empty
  useEffect(() => {
    if (cart && cart.items.length === 0) {
      navigate("/cart");
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Add items before checking out.",
      });
    }
  }, [cart, navigate, toast]);

  // Create Payment Intent when component mounts
  useEffect(() => {
    if (subtotal > 0) {
      const createPaymentIntent = async () => {
        try {
          const response = await apiRequest("POST", "/api/create-payment-intent", {
            total: subtotal,
          });
          const data = await response.json();
          setClientSecret(data.clientSecret);
        } catch (error) {
          console.error("Error creating payment intent:", error);
          toast({
            title: "Payment Error",
            description: "Could not initialize payment. Please try again.",
            variant: "destructive",
          });
        }
      };

      createPaymentIntent();
    }
  }, [subtotal, toast]);

  if (!clientSecret || !cart || cart.items.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Main Content */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Order</CardTitle>
                <CardDescription>
                  Fill in your shipping, billing, and payment details to complete your purchase.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm clientSecret={clientSecret} />
                </Elements>
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div className="mt-10 lg:mt-0 lg:col-span-5">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="h-full w-full object-cover object-center"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100">
                              <ShoppingCart className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.product.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Order Totals */}
                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between text-gray-500">
                    <p>Subtotal</p>
                    <p>{formatCurrency(subtotal)}</p>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <p>Shipping</p>
                    <p>{subtotal >= 50 ? 'Free' : formatCurrency(10)}</p>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <p>Tax</p>
                    <p>{formatCurrency(subtotal * 0.1)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-4 font-semibold">
                    <p>Total</p>
                    <p>{formatCurrency(subtotal + (subtotal >= 50 ? 0 : 10) + (subtotal * 0.1))}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 rounded-b-lg">
                <div className="w-full space-y-2">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Secure checkout</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Free shipping on orders over $50</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">30-day returns</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
