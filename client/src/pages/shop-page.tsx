import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Product, Category } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

const ShopPage = () => {
  const [location, setLocation] = useLocation();
  
  // Parse URL parameters
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const initialSearch = searchParams.get("search") || "";
  const initialCategorySlug = searchParams.get("categorySlug") || "";
  const initialCategoryId = searchParams.get("categoryId") || "";
  const initialSort = (searchParams.get("sort") || "newest") as "price_asc" | "price_desc" | "name_asc" | "name_desc" | "newest";
  const initialMinPrice = Number(searchParams.get("minPrice")) || 0;
  const initialMaxPrice = Number(searchParams.get("maxPrice")) || 1000;
  
  // Filter states
  const [search, setSearch] = useState(initialSearch);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [sort, setSort] = useState(initialSort);
  const [priceRange, setPriceRange] = useState<[number, number]>([initialMinPrice, initialMaxPrice]);
  
  // Fetch products with filters
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products', search, categorySlug, categoryId, sort, priceRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categorySlug) params.append("categorySlug", categorySlug);
      if (categoryId) params.append("categoryId", categoryId);
      if (sort) params.append("sort", sort);
      if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString());
      if (priceRange[1] < 1000) params.append("maxPrice", priceRange[1].toString());
      
      const res = await apiRequest("GET", `/api/products?${params.toString()}`);
      return res.json();
    }
  });
  
  // Fetch categories for filter
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      return res.json();
    }
  });
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (categorySlug) params.append("categorySlug", categorySlug);
    if (categoryId) params.append("categoryId", categoryId);
    if (sort) params.append("sort", sort);
    if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString());
    if (priceRange[1] < 1000) params.append("maxPrice", priceRange[1].toString());
    
    setLocation(`/shop${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
  }, [search, categorySlug, categoryId, sort, priceRange, setLocation]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The search is already updated in state, this just prevents form submission
  };
  
  const handleReset = () => {
    setSearch("");
    setCategorySlug("");
    setCategoryId("");
    setSort("newest");
    setPriceRange([0, 1000]);
  };
  
  const handleCategoryChange = (id: string, slug: string) => {
    setCategoryId(id);
    setCategorySlug(slug);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shop All Products</h1>
            {categorySlug && categories && (
              <p className="text-sm text-gray-500 mt-1">
                Browsing: {categories.find(c => c.slug === categorySlug)?.name || categorySlug}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-grow md:w-64">
              <Input 
                type="search" 
                placeholder="Search products..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </form>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:flex items-center gap-1">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden md:inline">Filters</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Shop Filters</SheetTitle>
                  <SheetDescription>
                    Refine your product search with these filters.
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-4 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Price Range</h3>
                    <div className="space-y-4">
                      <Slider
                        value={priceRange}
                        min={0}
                        max={1000}
                        step={10}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                      />
                      <div className="flex items-center justify-between">
                        <span>{formatCurrency(priceRange[0])}</span>
                        <span>{formatCurrency(priceRange[1])}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Accordion type="single" collapsible defaultValue="categories">
                    <AccordionItem value="categories">
                      <AccordionTrigger>Categories</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-1">
                          {categories?.map((category) => (
                            <div key={category.id} className="flex items-center">
                              <Checkbox 
                                id={`category-${category.id}`} 
                                checked={categorySlug === category.slug}
                                onCheckedChange={() => handleCategoryChange(
                                  category.id.toString(), 
                                  category.slug
                                )}
                              />
                              <Label
                                htmlFor={`category-${category.id}`}
                                className="ml-2 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {category.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
                  <div className="pt-4 space-y-4">
                    <Button onClick={handleReset} variant="outline" className="w-full">
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Sort Controls */}
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200">
          <p className="text-sm text-gray-500">
            {isLoading 
              ? "Loading products..." 
              : products?.length 
                ? `Showing ${products.length} ${products.length === 1 ? 'product' : 'products'}`
                : "No products found"}
          </p>
          
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as typeof sort)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="name_asc">Name: A to Z</SelectItem>
              <SelectItem value="name_desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 gap-x-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your search or filter criteria</p>
            <Button variant="outline" className="mt-4" onClick={handleReset}>
              Reset All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
