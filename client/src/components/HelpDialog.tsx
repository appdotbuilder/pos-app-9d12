import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HelpDialog() {
  const features = [
    {
      icon: '📊',
      title: 'Dashboard',
      description: 'View key metrics including total products, low stock alerts, daily revenue, and recent transactions.',
    },
    {
      icon: '📦',
      title: 'Product Management',
      description: 'Add, edit, and delete products. Monitor stock levels and get alerts when inventory is low.',
    },
    {
      icon: '🛒',
      title: 'Process Sales',
      description: 'Add products to cart, specify quantities, and complete sales transactions. Stock levels update automatically.',
    },
    {
      icon: '📈',
      title: 'Sales History',
      description: 'View detailed transaction history, filter by date, and track daily revenue performance.',
    },
  ];

  const quickTips = [
    'Use the low stock alerts on the dashboard to know when to restock products',
    'The sales page shows available stock for each product to prevent overselling',
    'Filter sales history by date to analyze performance trends',
    'Products with zero stock will not appear in the sales interface',
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          ❓ Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🏪 POS System Help
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Features Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Features Overview</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {features.map((feature) => (
                <Card key={feature.title} className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-lg">{feature.icon}</span>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div>
            <h3 className="text-lg font-semibold mb-3">💡 Quick Tips</h3>
            <div className="space-y-2">
              {quickTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Badge variant="outline" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-blue-900">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-3">⌨️ Keyboard Shortcuts</h3>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Focus search/input</span>
                <Badge variant="outline">Tab</Badge>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Submit forms</span>
                <Badge variant="outline">Enter</Badge>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Close dialogs</span>
                <Badge variant="outline">Esc</Badge>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Navigate tabs</span>
                <Badge variant="outline">←→</Badge>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div>
            <h3 className="text-lg font-semibold mb-3">🚀 Getting Started</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Add Products</p>
                  <p className="text-sm text-muted-foreground">
                    Go to Products tab and add your inventory items with prices and stock quantities
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Process Sales</p>
                  <p className="text-sm text-muted-foreground">
                    Use the Sales tab to select products, add them to cart, and complete transactions
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Monitor Performance</p>
                  <p className="text-sm text-muted-foreground">
                    Track sales and inventory levels using the Dashboard and History tabs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}