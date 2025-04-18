import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useCartContext } from "@/contexts/CartContext";
import { 
  Loader2, 
  Heart, 
  ShoppingCart, 
  Check, 
  ChevronRight, 
  Star, 
  StarHalf, 
  Truck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ProductDetailPage = () => {
  const [location] = useLocation();
  const slug = location.split("/products/")[1];
  const [quantity, setQuantity] = useState(1);
  const { addToCart, isAddingToCart } = useCartContext();

  // Fetch product details
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/slug/${slug}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/products/slug/${slug}`);
      return res.json();
    }
  });

  const handleAddToCart = () => {
    if (product) {
      addToCart({ productId: product.id, quantity });
    }
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
        <p className="text-gray-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/shop">Return to Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-8">
          <ol className="flex items-center space-x-1 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-900">Home</Link>
            </li>
            <li><ChevronRight className="h-4 w-4" /></li>
            <li>
              <Link href="/shop" className="hover:text-gray-900">Shop</Link>
            </li>
            <li><ChevronRight className="h-4 w-4" /></li>
            <li className="font-medium text-gray-900">{product.name}</li>
          </ol>
        </nav>

        {/* Product Overview */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product Image */}
          <div className="lg:max-w-lg lg:self-end">
            <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-center object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <ShoppingCart className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <div className="flex justify-between">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.name}</h1>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                <Heart className="h-6 w-6" />
              </Button>
            </div>
            
            {/* Product badges */}
            <div className="mt-3 flex space-x-2">
              {product.isNew && (
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">NEW</Badge>
              )}
              {product.originalPrice && product.originalPrice > product.price && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">SALE</Badge>
              )}
              {product.featured && (
                <Badge variant="default" className="bg-primary hover:bg-blue-700">FEATURED</Badge>
              )}
            </div>

            {/* Price */}
            <div className="mt-3 flex items-center">
              <p className="text-3xl text-gray-900 font-bold">{formatCurrency(product.price)}</p>
              {product.originalPrice && product.originalPrice > product.price && (
                <p className="ml-3 text-lg text-gray-500 line-through">{formatCurrency(product.originalPrice)}</p>
              )}
            </div>

            {/* Rating */}
            <div className="mt-3 flex items-center">
              <div className="flex items-center">
                {[...Array(Math.floor(product.rating || 0))].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
                {product.rating && product.rating % 1 !== 0 && (
                  <StarHalf className="h-5 w-5 text-yellow-400 fill-current" />
                )}
                {[...Array(5 - Math.ceil(product.rating || 0))].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-gray-300" />
                ))}
              </div>
              <p className="ml-2 text-sm text-gray-500">{product.rating || 0} out of 5 stars</p>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="sr-only">Product Description</h2>
              <p className="text-base text-gray-700">{product.description}</p>
            </div>

            {/* In stock indicator */}
            <div className="mt-6 flex items-center">
              {product.inventory > 0 ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <p className="ml-2 text-sm text-gray-700">In stock and ready to ship</p>
                </>
              ) : (
                <>
                  <span className="h-5 w-5 text-red-500">×</span>
                  <p className="ml-2 text-sm text-gray-700">Out of stock</p>
                </>
              )}
            </div>

            {/* Shipping info */}
            <div className="mt-4 flex items-center">
              <Truck className="h-5 w-5 text-gray-400" />
              <p className="ml-2 text-sm text-gray-700">Free shipping on orders over $50</p>
            </div>

            {/* Quantity selector */}
            <div className="mt-8">
              <div className="flex items-center">
                <h2 className="text-sm font-medium text-gray-900 mr-3">Quantity:</h2>
                <div className="flex items-center border rounded-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2 py-1 text-gray-600 hover:text-gray-800"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="px-4 py-1 text-gray-800">{quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2 py-1 text-gray-600 hover:text-gray-800"
                    onClick={increaseQuantity}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Add to cart */}
            <div className="mt-8 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleAddToCart}
                disabled={isAddingToCart || product.inventory === 0}
              >
                {isAddingToCart ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></span>
                    Adding...
                  </span>
                ) : product.inventory === 0 ? (
                  "Out of Stock"
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        {/* Product tabs */}
        <div className="mt-16 pt-10 border-t border-gray-200">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start border-b mb-6">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="text-gray-700">
              <div className="prose max-w-none">
                <p>{product.description}</p>
                <p className="mt-4">
                  Our premium products are designed with quality and durability in mind. 
                  We source the finest materials to ensure our customers receive products 
                  that exceed their expectations.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="details" className="text-gray-700">
              <div className="prose max-w-none">
                <ul className="list-disc pl-5 space-y-2">
                  <li>High-quality materials</li>
                  <li>Expertly crafted</li>
                  <li>Industry-leading warranty</li>
                  <li>Designed for everyday use</li>
                  <li>Easy maintenance</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="shipping" className="text-gray-700">
              <div className="prose max-w-none">
                <h3 className="text-lg font-medium">Shipping Information</h3>
                <p className="mt-2">
                  We offer free standard shipping on all orders over $50. Orders typically 
                  ship within 1-2 business days and arrive within 3-5 business days.
                </p>
                
                <h3 className="text-lg font-medium mt-6">Return Policy</h3>
                <p className="mt-2">
                  We accept returns within 30 days of delivery for a full refund. Items must be 
                  unused and in their original packaging to qualify for a return.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
