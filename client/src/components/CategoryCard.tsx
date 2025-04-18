import { Category } from "@shared/schema";
import { Link } from "wouter";

interface CategoryCardProps {
  category: Category;
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  return (
    <Link href={`/shop?categorySlug=${category.slug}`}>
      <div className="group cursor-pointer">
        <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
          {category.image ? (
            <img 
              src={category.image} 
              alt={category.name} 
              className="w-full h-full object-center object-cover group-hover:opacity-75" 
            />
          ) : (
            <div className="w-full h-full bg-gray-200"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent flex items-end p-4">
            <h3 className="text-lg font-medium text-white">{category.name}</h3>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
