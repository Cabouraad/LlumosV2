import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { SEOHelmet } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { motion } from 'framer-motion';

export default function Privacy() {
  return (
    <>
      <SEOHelmet
        title="Privacy Policy"
        description="Learn how Llumos collects, uses, and protects your data. Our privacy policy explains our data practices for AI search visibility tracking."
        keywords="Llumos privacy policy, data protection, privacy, GDPR, data security"
        canonicalPath="/privacy"
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-muted-foreground mb-8">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
                <p className="mb-4 text-muted-foreground">
                  When you use our Free Brand Visibility Checker, we collect the following information:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li><strong className="text-foreground">Contact Information:</strong> Email address and company domain</li>
                  <li><strong className="text-foreground">Usage Data:</strong> Information about how you interact with our service</li>
                  <li><strong className="text-foreground">Technical Data:</strong> IP address, browser type, and device information</li>
                  <li><strong className="text-foreground">Analysis Results:</strong> AI platform responses and visibility scores</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                <p className="mb-4 text-muted-foreground">We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li>Provide you with AI visibility analysis and reports</li>
                  <li>Send you your requested analysis results via email</li>
                  <li>Improve our services and develop new features</li>
                  <li>Communicate with you about our services (with your consent)</li>
                  <li>Comply with legal obligations and protect our rights</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
                <p className="mb-4 text-muted-foreground">
                  We do not sell, trade, or otherwise transfer your personal information to third parties, except:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li><strong className="text-foreground">Service Providers:</strong> Trusted third-party services to deliver our services</li>
                  <li><strong className="text-foreground">Legal Requirements:</strong> When required by law</li>
                  <li><strong className="text-foreground">Business Transfers:</strong> In the event of a merger or acquisition</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
                <p className="mb-4 text-muted-foreground">
                  We implement appropriate security measures to protect your personal information, including:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication measures</li>
                  <li>Secure data processing and storage practices</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
                <p className="mb-4 text-muted-foreground">Depending on your location, you may have the following rights:</p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li><strong className="text-foreground">Access:</strong> Request access to your personal information</li>
                  <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong className="text-foreground">Portability:</strong> Request a copy of your data</li>
                </ul>
                <p className="mb-4 text-muted-foreground">
                  To exercise these rights, contact us at info@llumos.app
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Contact Us</h2>
                <p className="mb-4 text-muted-foreground">
                  If you have any questions about this privacy policy or our data practices, please contact us at:
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
