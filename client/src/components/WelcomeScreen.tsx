import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WelcomeScreenProps {
  onStartSetup: () => void;
  userName: string;
}

export function WelcomeScreen({ onStartSetup, userName }: WelcomeScreenProps) {
  const steps = [
    {
      icon: '📦',
      title: 'Add Products',
      description: 'Start by adding your first products to the inventory',
      action: 'Add Product'
    },
    {
      icon: '🛒',
      title: 'Process Sales',
      description: 'Use the sales interface to record transactions',
      action: 'Make Sale'
    },
    {
      icon: '📊',
      title: 'Track Performance',
      description: 'Monitor your business with the dashboard and reports',
      action: 'View Dashboard'
    }
  ];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6 text-center">
        {/* Welcome Header */}
        <div className="space-y-3">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to your POS System!
          </h1>
          <p className="text-lg text-muted-foreground">
            Hello {userName}, let's get your business up and running
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative hover:shadow-md transition-shadow">
              <div className="absolute -top-2 -left-2">
                <Badge className="w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
              </div>
              <CardHeader className="pt-6">
                <div className="text-3xl mb-2">{step.icon}</div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <Button 
            onClick={onStartSetup}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            🚀 Get Started
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Click "Get Started" to add your first product and begin using the system
          </p>
        </div>

        {/* Quick Stats Preview */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-xs text-muted-foreground">Products</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$0.00</div>
            <div className="text-xs text-muted-foreground">Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-xs text-muted-foreground">Sales</div>
          </div>
        </div>
      </div>
    </div>
  );
}