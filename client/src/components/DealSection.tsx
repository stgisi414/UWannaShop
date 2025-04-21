import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product } from '@shared/schema';
import { Link } from 'wouter';
import { Loader2, AlertTriangle } from 'lucide-react';
import ProductCard from './ProductCard';

// Component to display deals from web scraping
const DealSection = () => {
  // Fetch deals using React Query
  const { data: deals, isLoading, error } = useQuery<Product[]>({
    queryKey: ['/api/products/deals'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !deals) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium">Unable to load deals</h3>
        <p className="text-muted-foreground mt-1">
          We couldn't fetch the latest deals. Please try again later.
        </p>
      </div>
    );
  }

  if (deals.length === 0) {
    return null; // Don't show the section if there are no deals
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Today's Best Deals</h2>
            <p className="text-gray-600 mt-2">Discover the latest deals scraped from top retailers</p>
          </div>
          <Link href="/shop">
            <a className="text-primary hover:underline font-medium">View all deals</a>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {deals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default DealSection;