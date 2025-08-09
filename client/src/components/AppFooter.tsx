import { Badge } from '@/components/ui/badge';

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>© {currentYear} POS System</span>
            <Badge variant="outline" className="text-xs">
              v1.0.0
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Built with ❤️ and modern web technologies
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <span>🔒 Secure Authentication</span>
            <span>📱 Mobile Responsive</span>
            <span>⚡ Real-time Updates</span>
            <span>📊 Advanced Analytics</span>
          </div>
        </div>
      </div>
    </footer>
  );
}