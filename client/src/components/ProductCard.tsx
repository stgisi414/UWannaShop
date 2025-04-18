import { Product } from "@shared/schema";
import { Link } from "wouter";
import { Heart, Eye, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart, isAddingToCart } = useCartContext();

  const handleAddToCart = () => {
    addToCart({ productId: product.id, quantity: 1 });
  };

  return (
    <div className="group relative">
      <div className="aspect-w-4 aspect-h-3 bg-gray-200 rounded-lg overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-center object-cover group-hover:opacity-75"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-gray-400" />
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex space-x-1">
          <Button variant="ghost" size="icon" className="bg-white bg-opacity-80 p-1.5 rounded-full text-gray-600 hover:text-red-500">
            <Heart className="h-4 w-4" />
          </Button>
          <Link href={`/products/${product.slug}`}>
            <Button variant="ghost" size="icon" className="bg-white bg-opacity-80 p-1.5 rounded-full text-gray-600 hover:text-primary">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        {product.isNew && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">NEW</Badge>
          </div>
        )}
        
        {product.originalPrice && product.originalPrice > product.price && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">SALE</Badge>
          </div>
        )}
        
        {product.inventory === 0 && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="bg-gray-500 hover:bg-gray-600">OUT OF STOCK</Badge>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            <Link href={`/products/${product.slug}`}>
              <span className="absolute inset-0" aria-hidden="true"></span>
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {product.categories ? product.categories[0]?.name : "Uncategorized"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
          {product.originalPrice && product.originalPrice > product.price && (
            <p className="mt-1 text-sm text-gray-500 line-through">{formatCurrency(product.originalPrice)}</p>
          )}
        </div>
      </div>
      
      <Button 
        className="mt-4 w-full"
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
          "Add to Cart"
        )}
      </Button>
    </div>
  );
};

export default ProductCard;
