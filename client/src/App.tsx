import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// Import components
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { Dashboard } from '@/components/Dashboard';
import { ProductManagement } from '@/components/ProductManagement';
import { TransactionPage } from '@/components/TransactionPage';
import { SalesHistory } from '@/components/SalesHistory';
import { HelpDialog } from '@/components/HelpDialog';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { AppFooter } from '@/components/AppFooter';

// Import types
import type { AuthResponse } from '../../server/src/schema';

function AppContent() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleAuthSuccess = (authResponse: AuthResponse) => {
    login(authResponse);
    toast.success(`Welcome ${authResponse.user.full_name}!`);
  };

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    toast.success('Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                🏪 POS System
              </CardTitle>
              <p className="text-gray-600">Point of Sale Management</p>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'login' | 'register')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <LoginForm onSuccess={handleAuthSuccess} />
                </TabsContent>
                
                <TabsContent value="register">
                  <RegisterForm 
                    onSuccess={handleAuthSuccess} 
                    onSwitchToLogin={() => setAuthMode('login')}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">🏪 POS System</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Welcome, {user?.full_name}
              </span>
              <HelpDialog />
              <Button variant="outline" onClick={handleLogout} size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
              <span className="text-lg">📊</span>
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
              <span className="text-lg">📦</span>
              <span className="text-xs sm:text-sm">Products</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
              <span className="text-lg">🛒</span>
              <span className="text-xs sm:text-sm">Sales</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3">
              <span className="text-lg">📈</span>
              <span className="text-xs sm:text-sm">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard 
              userId={user?.id || 0} 
              userName={user?.full_name || 'User'}
              onNavigateToProducts={() => setActiveTab('products')}
            />
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement userId={user?.id || 0} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionPage userId={user?.id || 0} />
          </TabsContent>

          <TabsContent value="history">
            <SalesHistory userId={user?.id || 0} />
          </TabsContent>
        </Tabs>
      </main>
      <AppFooter />
      <OfflineIndicator />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;