import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calendar } from 'lucide-react';
import { blogPosts } from '@/data/blog-posts';

interface RelatedArticlesProps {
  currentSlug?: string;
  category?: string;
  maxArticles?: number;
  title?: string;
  className?: string;
}

/**
 * RelatedArticles Component
 * 
 * Displays related blog articles for internal linking.
 * Can filter by category or show random recent articles.
 * 
 * @param currentSlug - The slug of the current article to exclude
 * @param category - Optional category to filter by
 * @param maxArticles - Maximum number of articles to display (default: 3)
 */
export const RelatedArticles = ({ 
  currentSlug,
  category,
  maxArticles = 3,
  title = 'Related Articles',
  className = ''
}: RelatedArticlesProps) => {
  // Filter and sort articles
  let relatedArticles = blogPosts
    .filter(post => post.slug !== currentSlug)
    .filter(post => !category || post.category === category);
  
  // If filtering by category returns too few, fall back to all articles
  if (relatedArticles.length < maxArticles) {
    relatedArticles = blogPosts
      .filter(post => post.slug !== currentSlug);
  }

  // Sort by date (most recent first) and limit
  relatedArticles = relatedArticles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, maxArticles);

  if (relatedArticles.length === 0) {
    return null;
  }

  return (
    <section className={`py-16 px-4 bg-muted/30 ${className}`}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Continue learning about AI search visibility and GEO optimization.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {relatedArticles.map((article) => (
            <Link key={article.slug} to={`/blog/${article.slug}`} className="group">
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50 overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <time dateTime={article.publishedAt}>
                      {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </time>
                    {article.category && (
                      <>
                        <span>•</span>
                        <span className="text-primary">{article.category}</span>
                      </>
                    )}
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {article.description}
                  </CardDescription>
                  <div className="mt-4 flex items-center text-primary font-medium">
                    Read more
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View all articles
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RelatedArticles;
