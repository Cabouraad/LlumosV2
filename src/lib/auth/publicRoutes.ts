export const PUBLIC_ROUTES = [
  '/',
  '/free-checker', 
  '/auth',
  '/auth/callback',
  '/auth/processing',
  '/signin',
  '/signup',
  '/pricing',
  '/features',
  '/resources',
  '/privacy',
  '/terms',
  '/demo',
  '/data-deletion'
];

export function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  
  // Check prefix matches for dynamic routes
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/resources/')) return true;
  if (pathname.startsWith('/blog/')) return true;
  if (pathname.startsWith('/features/')) return true;
  if (pathname.startsWith('/tools/')) return true;
  if (pathname.startsWith('/plans/')) return true;
  if (pathname.startsWith('/solutions/')) return true;
  if (pathname.startsWith('/compare/')) return true;
  
  return false;
}