import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LandingFooter } from './LandingFooter';

interface MarketingLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function MarketingLayout({ children, showFooter = true }: MarketingLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/30 via-background to-blue-950/20 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text">
                Llumos
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link 
                to="/features" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link 
                to="/pricing" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link 
                to="/resources" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                Resources
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link 
                to="/signin" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                Login
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 group-hover:w-full transition-all duration-300" />
              </Link>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all"
                asChild
              >
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            isMenuOpen ? "max-h-64 pb-4" : "max-h-0"
          )}>
            <nav className="flex flex-col gap-4">
              <Link 
                to="/features" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                to="/pricing" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/resources" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Resources
              </Link>
              <Link 
                to="/signin" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 w-fit"
                asChild
              >
                <Link to="/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        {children}
      </main>

      {/* Footer */}
      {showFooter && <LandingFooter />}
    </div>
  );
}
