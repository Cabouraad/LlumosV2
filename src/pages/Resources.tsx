import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Calendar, Clock, BookOpen, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { getAllBlogPosts, getPostsByCategory } from '@/data/blog-posts';
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SEOHelmet, structuredDataGenerators } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'Case Studies', label: 'Case Studies' },
  { id: 'AI Optimization Guides', label: 'AI Optimization Guides' },
  { id: 'News', label: 'News' },
];

const getPostImage = (index: number) => {
  const images = [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop',
  ];
  return images[index % images.length];
};

const NewsletterCard = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="col-span-1"
  >
    <Card className="h-full bg-gradient-to-br from-violet-500 to-blue-500 text-white p-6 flex flex-col justify-center border-0">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-6 w-6" />
        <Sparkles className="h-5 w-5" />
      </div>
      <h3 className="text-xl font-bold mb-2">
        Join 5,000+ Marketers Mastering AI Search
      </h3>
      <p className="text-white/80 text-sm mb-4">
        Get weekly insights on AI visibility, optimization tips, and industry news delivered to your inbox.
      </p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 flex-1"
        />
        <Button variant="secondary" size="sm" className="shrink-0 bg-white text-violet-600 hover:bg-white/90">
          Subscribe
        </Button>
      </div>
      <p className="text-xs text-white/60 mt-3">
        No spam. Unsubscribe anytime.
      </p>
    </Card>
  </motion.div>
);

interface BlogCardProps {
  post: {
    slug: string;
    title: string;
    description: string;
    category: string;
    publishedAt: string;
    readTime: number;
  };
  index: number;
}

const BlogCard = ({ post, index }: BlogCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
  >
    <Link to={`/resources/${post.slug}`}>
      <Card className="group h-full overflow-hidden bg-white/5 border-white/10 hover:border-violet-500/50 transition-all duration-300">
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={getPostImage(index)}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        
        <div className="p-5">
          <Badge 
            className="mb-3 text-xs font-medium rounded-full px-3 py-1 bg-violet-500/10 text-violet-400 border-violet-500/20"
          >
            {post.category}
          </Badge>
          
          <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-violet-400 transition-colors">
            {post.title}
          </h3>
          
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {post.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </time>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{post.readTime} min read</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  </motion.div>
);

const Resources = () => {
  const allPosts = getAllBlogPosts();
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') {
      return allPosts;
    }
    return getPostsByCategory(selectedCategory);
  }, [allPosts, selectedCategory]);

  useEffect(() => {
    if (typeof window !== 'undefined' && allPosts.length > 0) {
      // @ts-ignore
      window.snapSaveState = () => ({
        __PRELOADED_STATE__: { posts: allPosts }
      });
    }
  }, [allPosts]);
  
  const postsWithNewsletter = useMemo(() => {
    const result: (typeof filteredPosts[0] | 'newsletter')[] = [];
    filteredPosts.forEach((post, index) => {
      result.push(post);
      if (index === 3) {
        result.push('newsletter');
      }
    });
    if (filteredPosts.length < 4 && filteredPosts.length > 0) {
      result.push('newsletter');
    }
    return result;
  }, [filteredPosts]);

  return (
    <>
      <SEOHelmet
        title="AI Search Marketing & GEO Guides | The Llumos Resource Hub"
        description="Master the new era of search. Read expert guides, case studies, and strategies for Generative Engine Optimization (GEO) and increasing brand visibility in LLMs."
        keywords="AI search marketing, GEO guides, Generative Engine Optimization, AI visibility strategies, LLM brand visibility"
        canonicalPath="/resources"
        structuredData={[
          structuredDataGenerators.website(),
          structuredDataGenerators.breadcrumb([
            { name: "Home", url: "/" },
            { name: "Resources", url: "/resources" }
          ])
        ]}
      />

      <MarketingLayout>
        <div className="container mx-auto px-4 py-12 pt-28 max-w-7xl">
          {/* Hero Section */}
          <section className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                AI Search Resources & Insights
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Expert guides, case studies, and proven strategies to help you track and improve your brand visibility on AI-powered search engines.
              </p>
            </motion.div>
          </section>

          {/* Featured Article */}
          <section className="mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Link to="/blog/how-to-optimize-for-chatgpt-search">
                <Card className="group overflow-hidden bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20 hover:border-violet-500/40 transition-all duration-300">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <Badge className="mb-2 bg-violet-500/10 text-violet-400 border-violet-500/20">Featured Guide</Badge>
                      <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-violet-400 transition-colors">
                        How to Optimize for ChatGPT Search: The 2025 GEO Guide
                      </h2>
                      <p className="text-muted-foreground">
                        Learn the 5 core strategies of Generative Engine Optimization (GEO) to get cited by ChatGPT, Perplexity, and Gemini.
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          </section>

          {/* Category Filter Tabs */}
          <section className="mb-10">
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`rounded-full px-5 ${
                    selectedCategory === category.id 
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 border-0' 
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </section>

          {/* Posts Grid */}
          <section>
            <h2 className="sr-only">Articles</h2>
            
            {postsWithNewsletter.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {postsWithNewsletter.map((item, index) => {
                  if (item === 'newsletter') {
                    return <NewsletterCard key="newsletter" />;
                  }
                  return (
                    <BlogCard 
                      key={item.slug} 
                      post={item} 
                      index={index} 
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                <p className="text-muted-foreground mb-6">
                  No articles in this category yet. Check back soon!
                </p>
                <Button variant="outline" onClick={() => setSelectedCategory('all')} className="border-white/10">
                  View All Articles
                </Button>
              </div>
            )}
          </section>

          {/* CTA Section */}
          <section className="mt-20 text-center">
            <Card className="p-12 bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-violet-500/20">
              <Badge className="mb-4 bg-violet-500/10 text-violet-400 border-violet-500/20">Free Forever Plan</Badge>
              <h2 className="text-3xl font-bold mb-4">
                Ready to Track Your AI Search Performance?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start with our Free plan — track 5 prompts weekly on ChatGPT. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  asChild
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0"
                >
                  <Link to="/signup" className="flex items-center gap-2">
                    Start Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="border-white/10 hover:bg-white/5">
                  <Link to="/free-checker">Get Free Visibility Report</Link>
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </MarketingLayout>
    </>
  );
};

export default Resources;
