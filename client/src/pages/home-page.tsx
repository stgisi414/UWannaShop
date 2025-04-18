import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ArrowRight, Truck, ShieldCheck, RefreshCw, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import { apiRequest } from '@/lib/queryClient';
import { Product, Category } from '@shared/schema';

const HomePage = () => {
  const [email, setEmail] = useState('');

  // Fetch featured products
  const { data: featuredProducts, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products/featured'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/products/featured');
      return res.json();
    }
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/categories');
      return res.json();
    }
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would submit to a newsletter API
    alert(`Thank you for subscribing with ${email}!`);
    setEmail('');
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-green-500 text-white py-12 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-1/2 md:pr-8">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Summer Collection 2025</h1>
              <p className="mt-3 text-lg">Discover our latest products with worldwide shipping and special discounts.</p>
              <div className="mt-6">
                <Link href="/shop">
                  <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100">
                    Shop Now
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-8 md:mt-0 md:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                alt="Summer collection products" 
                className="rounded-lg shadow-xl" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categoriesLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="aspect-w-1 aspect-h-1 animate-pulse rounded-lg bg-gray-200"></div>
              ))
            ) : categories && categories.length > 0 ? (
              categories.slice(0, 4).map(category => (
                <CategoryCard key={category.id} category={category} />
              ))
            ) : (
              <p className="col-span-4 text-center text-gray-500 py-12">No categories found.</p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" className="rounded-md text-gray-500 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-md text-gray-500 hover:text-gray-900">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
            {productsLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse space-y-4">
                  <div className="aspect-w-4 aspect-h-3 rounded-lg bg-gray-200"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))
            ) : featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <p className="col-span-4 text-center text-gray-500 py-12">No featured products found.</p>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <Link href="/shop">
              <Button variant="outline" className="inline-flex items-center">
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-12 mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">Why Shop With Us</h2>
            <p className="mt-4 text-xl text-gray-600">We prioritize customer satisfaction with our premium services.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary bg-opacity-10 text-primary mb-4">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Free Shipping</h3>
              <p className="mt-2 text-sm text-gray-500">Free shipping on all orders over $50</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-500 bg-opacity-10 text-green-500 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Secure Payments</h3>
              <p className="mt-2 text-sm text-gray-500">Protected by industry-leading security</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-amber-500 bg-opacity-10 text-amber-500 mb-4">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Easy Returns</h3>
              <p className="mt-2 text-sm text-gray-500">30-day easy return policy</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-500 bg-opacity-10 text-green-500 mb-4">
                <HeadphonesIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">24/7 Support</h3>
              <p className="mt-2 text-sm text-gray-500">Get help anytime via our chatbot</p>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Section */}
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-16 sm:px-12 sm:py-24 lg:px-16 text-center sm:text-left">
              <div className="max-w-xl mx-auto sm:mx-0">
                <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">Summer Sale Ends Soon!</h2>
                <p className="mt-4 text-xl text-gray-300">
                  Get up to 50% off on selected items. Use promo code SUMMER2025 at checkout.
                </p>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-8 justify-center sm:justify-start">
                  <Link href="/shop?filter=sale">
                    <Button variant="secondary" className="bg-white text-gray-900">
                      Browse Sale
                    </Button>
                  </Link>
                  <Button variant="outline" className="text-white border-white hover:bg-white hover:bg-opacity-10">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-gray-50 py-12 px-6 sm:py-16 sm:px-12 lg:flex lg:items-center lg:p-16">
            <div className="lg:w-0 lg:flex-1">
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
                Sign up for our newsletter
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-gray-500">
                Stay updated with our latest products, exclusive offers, and upcoming sales.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 lg:ml-8">
              <form onSubmit={handleNewsletterSubmit} className="sm:flex">
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-5 py-3 border border-gray-300 shadow-sm placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary rounded-md"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" className="mt-3 w-full sm:mt-0 sm:ml-3 sm:flex-shrink-0 sm:inline-flex sm:items-center sm:w-auto">
                  Subscribe
                </Button>
              </form>
              <p className="mt-3 text-sm text-gray-500">
                We care about your data. Read our{' '}
                <Link href="/privacy" className="font-medium text-primary underline">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
