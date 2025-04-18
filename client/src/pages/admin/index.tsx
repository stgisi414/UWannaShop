import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Loader2, Package, ShoppingCart, Users, DollarSign, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

const AdminIndex = () => {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Mock dashboard data (in real implementation, this would fetch from API)
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      // This would be a real API call in production
      // For now, we'll return simulated data
      return {
        totalSales: 24895.80,
        totalOrders: 253,
        totalProducts: 189,
        totalUsers: 587,
        recentOrders: [
          { id: 1053, customer: "Jane Smith", date: "2023-05-15", total: 128.99, status: "delivered" },
          { id: 1052, customer: "Michael Johnson", date: "2023-05-14", total: 76.50, status: "shipped" },
          { id: 1051, customer: "James Williams", date: "2023-05-14", total: 212.75, status: "processing" }
        ],
        lowStockProducts: [
          { id: 42, name: "Wireless Headphones", stock: 3, price: 129.99 },
          { id: 18, name: "Smart Watch Series 6", stock: 5, price: 249.99 },
          { id: 73, name: "Ultrabook Pro 16\"", stock: 2, price: 1499.99 }
        ]
      };
    },
    enabled: !!(user && user.role === 'admin')
  });

  if (!user || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-500 mb-6">You don't have permission to access the admin dashboard.</p>
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage your store, products, orders, and users</p>
        </div>

        {/* Quick stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Sales</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(dashboardData?.totalSales || 0)}</h3>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{dashboardData?.totalOrders || 0}</h3>
                </div>
                <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Products</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{dashboardData?.totalProducts || 0}</h3>
                </div>
                <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{dashboardData?.totalUsers || 0}</h3>
                </div>
                <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-500">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/products">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Manage Products
                </CardTitle>
                <CardDescription>
                  Add, edit, or remove products from your inventory
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full">
                  Go to Products
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Manage Orders
                </CardTitle>
                <CardDescription>
                  View and process customer orders
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full">
                  Go to Orders
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Manage Users
                </CardTitle>
                <CardDescription>
                  View and manage customer accounts
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full">
                  Go to Users
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </Link>
        </div>

        {/* Recent activity and reports */}
        <Tabs defaultValue="recent_orders">
          <TabsList>
            <TabsTrigger value="recent_orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="low_stock">Low Stock Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent_orders">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Latest orders that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left font-medium">Order ID</th>
                        <th className="py-3 px-4 text-left font-medium">Customer</th>
                        <th className="py-3 px-4 text-left font-medium">Date</th>
                        <th className="py-3 px-4 text-left font-medium">Amount</th>
                        <th className="py-3 px-4 text-left font-medium">Status</th>
                        <th className="py-3 px-4 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.recentOrders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">#{order.id}</td>
                          <td className="py-3 px-4">{order.customer}</td>
                          <td className="py-3 px-4">{order.date}</td>
                          <td className="py-3 px-4">{formatCurrency(order.total)}</td>
                          <td className="py-3 px-4">
                            <span className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 
                                order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'}
                            `}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="ml-auto">
                  View All Orders
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="low_stock">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Products</CardTitle>
                <CardDescription>
                  Products that need restocking soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left font-medium">Product ID</th>
                        <th className="py-3 px-4 text-left font-medium">Name</th>
                        <th className="py-3 px-4 text-left font-medium">Price</th>
                        <th className="py-3 px-4 text-left font-medium">Stock</th>
                        <th className="py-3 px-4 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData?.lowStockProducts.map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">#{product.id}</td>
                          <td className="py-3 px-4">{product.name}</td>
                          <td className="py-3 px-4">{formatCurrency(product.price)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock <= 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {product.stock} left
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="ml-auto">
                  View All Products
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminIndex;
