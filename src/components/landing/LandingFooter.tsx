import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 bg-background/50 backdrop-blur-sm py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">Llumos</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              AI Search Visibility Platform
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Product</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link to="/demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Demo
              </Link>
              <Link to="/resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Resources
              </Link>
            </nav>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Solutions</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/solutions/saas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                SaaS
              </Link>
              <Link to="/solutions/ecommerce" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Ecommerce
              </Link>
              <Link to="/solutions/agencies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Agencies
              </Link>
            </nav>
          </div>

          {/* Free Tools */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Free Tools</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/free-checker" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                AI Visibility Checker
              </Link>
              <Link to="/tools/ai-competitor-finder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                AI Competitor Finder
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Legal</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/data-deletion" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Data Deletion
              </Link>
              <Link to="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Security
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Llumos. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/vs-competitors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Compare
            </Link>
            <Link to="/sitemap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
