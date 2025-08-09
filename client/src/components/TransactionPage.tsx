import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import type { Product, CreateSaleInput, SaleItemInput } from '../../../server/src/schema';

interface TransactionPageProps {
  userId: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export function TransactionPage({ userId }: TransactionPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.products.getAll.query();
      // Filter out products with zero stock for sales
      setProducts(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const addToCart = () => {
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    const product = products.find((p: Product) => p.id.toString() === selectedProductId);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    if (product.stock_quantity < quantity) {
      toast.error(`Not enough stock. Only ${product.stock_quantity} available`);
      return;
    }

    // Check if product is already in cart
    const existingCartItem = cart.find((item: CartItem) => item.product.id === product.id);
    const totalQuantityInCart = existingCartItem ? existingCartItem.quantity + quantity : quantity;
    
    if (totalQuantityInCart > product.stock_quantity) {
      toast.error(`Cannot add ${quantity} more. Total would exceed available stock`);
      return;
    }

    if (existingCartItem) {
      setCart((prev: CartItem[]) =>
        prev.map((item: CartItem) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart((prev: CartItem[]) => [...prev, { product, quantity }]);
    }

    // Reset form
    setSelectedProductId('');
    setQuantity(1);
    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p: Product) => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock_quantity) {
      toast.error(`Cannot set quantity to ${newQuantity}. Only ${product.stock_quantity} available`);
      return;
    }

    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((total: number, item: CartItem) => total + (item.product.price * item.quantity), 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    
    try {
      const saleItems: SaleItemInput[] = cart.map((item: CartItem) => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const saleData: CreateSaleInput = { items: saleItems };
      
      await trpc.transactions.createSale.mutate(saleData);
      
      // Clear cart and reload products to update stock
      setCart([]);
      await loadProducts();
      
      toast.success('Sale processed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const availableProducts = products.filter((p: Product) => p.stock_quantity > 0);

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-[100px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[100px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">🛒 Process Sale</h2>
        <p className="text-muted-foreground">Add products to cart and process transactions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add to Cart Section */}
        <Card>
          <CardHeader>
            <CardTitle>Add Products to Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableProducts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No products available for sale. Please add products with stock first.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="product-select">Select Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger id="product-select">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product: Product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} - ${product.price.toFixed(2)} ({product.stock_quantity} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedProductId ? products.find((p: Product) => p.id.toString() === selectedProductId)?.stock_quantity || 1 : 1}
                    value={quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setQuantity(parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                <Button onClick={addToCart} className="w-full">
                  Add to Cart
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Shopping Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Shopping Cart
              <Badge variant="outline">{cart.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🛒</div>
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item: CartItem) => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ${item.product.price.toFixed(2)} each
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="font-medium">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
                </div>

                <Button
                  onClick={processSale}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isProcessing ? 'Processing...' : '💳 Process Sale'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Products Overview */}
      {availableProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {availableProducts.map((product: Product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-green-600">${product.price.toFixed(2)}</p>
                  </div>
                  <Badge variant="outline">
                    {product.stock_quantity} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}