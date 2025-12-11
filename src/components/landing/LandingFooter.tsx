import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 bg-background/50 backdrop-blur-sm py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">Llumos</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Llumos. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
