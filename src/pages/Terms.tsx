import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { SEOHelmet } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { motion } from 'framer-motion';

export default function Terms() {
  return (
    <>
      <SEOHelmet
        title="Terms of Service"
        description="Read the Llumos Terms of Service for our AI search visibility tracking platform."
        keywords="Llumos terms of service, terms and conditions, user agreement, AI visibility terms"
        noIndex={true}
        canonicalPath="/terms"
      />
      <MarketingLayout>
        <div className="container mx-auto px-4 py-12 pt-28 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button variant="outline" asChild className="mb-8 border-white/10 hover:bg-white/5">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to Home
              </Link>
            </Button>
            
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
            
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-muted-foreground mb-8">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="mb-4 text-muted-foreground">
                  By accessing or using the Llumos Free Brand Visibility Checker service ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                  If you do not agree to these Terms, please do not use our Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                <p className="mb-4 text-muted-foreground">
                  The Free Brand Visibility Checker is a complimentary service that analyzes your brand's presence 
                  across AI platforms including ChatGPT, Gemini, and Perplexity. We provide:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li>AI visibility analysis across multiple platforms</li>
                  <li>Brand mention detection and scoring</li>
                  <li>Competitive positioning insights</li>
                  <li>Email delivery of analysis results</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
                <p className="mb-4 text-muted-foreground">When using our Service, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li>Provide accurate and complete information</li>
                  <li>Use the Service only for legitimate business purposes</li>
                  <li>Not attempt to circumvent any limitations or restrictions</li>
                  <li>Not use the Service to violate any laws or regulations</li>
                  <li>Not reverse engineer or attempt to extract our algorithms</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Free Service Limitations</h2>
                <p className="mb-4 text-muted-foreground">
                  The Free Brand Visibility Checker is provided as a limited, complimentary service:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li>Analysis is based on a sample of AI platform responses</li>
                  <li>Results are estimates and may not reflect complete market conditions</li>
                  <li>Service availability is not guaranteed and may be limited</li>
                  <li>No service level agreements or uptime guarantees apply</li>
                  <li>We reserve the right to limit usage to prevent abuse</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
                <p className="mb-4 text-muted-foreground">
                  The Service, including all content, features, and functionality, is owned by Llumos, Inc. and is protected by
                  copyright, trademark, and other intellectual property laws.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Data and Privacy</h2>
                <p className="mb-4 text-muted-foreground">
                  Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to
                  collection and processing of your data as described in our Privacy Policy.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
                <p className="mb-4 text-muted-foreground">
                  <strong>The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied.</strong>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. Contact Information</h2>
                <p className="mb-4 text-muted-foreground">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <p><strong>Email:</strong> info@llumos.app</p>
                  <p><strong>Website:</strong> https://llumos.app</p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </MarketingLayout>
    </>
  );
}
