import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { SEOHelmet } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { motion } from 'framer-motion';

export default function DataDeletion() {
  return (
    <>
      <SEOHelmet
        title="Data Deletion Policy"
        description="Request deletion of your personal data from Llumos. Learn about our GDPR-compliant process."
        keywords="Llumos data deletion, delete my data, GDPR deletion, data removal, right to erasure"
        noIndex={true}
        canonicalPath="/data-deletion"
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
            
            <h1 className="text-4xl font-bold mb-8">Data Deletion Policy</h1>
            
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-muted-foreground mb-8">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">1. Your Right to Data Deletion</h2>
                <p className="mb-4 text-muted-foreground">
                  At Llumos, we respect your right to control your personal data. You have the right to request the deletion of your personal information from our systems at any time. This right is also known as the "right to erasure" or "right to be forgotten" under various data protection regulations including GDPR and CCPA.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">2. What Data Can Be Deleted</h2>
                <p className="mb-4 text-muted-foreground">Upon your request, we can delete:</p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li><strong className="text-foreground">Account Information:</strong> Your email address, name, and login credentials</li>
                  <li><strong className="text-foreground">Organization Data:</strong> Company name, domain, and business context information</li>
                  <li><strong className="text-foreground">Usage Data:</strong> Prompts, visibility scores, and AI analysis results</li>
                  <li><strong className="text-foreground">Subscription Data:</strong> Payment history and subscription records (subject to legal retention requirements)</li>
                  <li><strong className="text-foreground">Analytics Data:</strong> Usage patterns and interaction history</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">3. How to Request Data Deletion</h2>
                <p className="mb-4 text-muted-foreground">You can request deletion of your data through the following methods:</p>
                
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="font-semibold text-foreground mb-2">Option 1: Self-Service Account Deletion</h3>
                    <p className="text-muted-foreground">
                      If you have an active account, you can delete your account directly from your account settings. Navigate to Settings → Account → Delete Account. This will initiate an immediate deletion of your account and all associated data.
                    </p>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="font-semibold text-foreground mb-2">Option 2: Email Request</h3>
                    <p className="text-muted-foreground">
                      Send an email to <strong>privacy@llumos.app</strong> with the subject line "Data Deletion Request". Include your registered email address and any relevant account identifiers. We will verify your identity and process your request.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">4. Deletion Process & Timeline</h2>
                <p className="mb-4 text-muted-foreground">Once we receive your deletion request:</p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li><strong className="text-foreground">Acknowledgment:</strong> We will confirm receipt of your request within 48 hours</li>
                  <li><strong className="text-foreground">Verification:</strong> We may need to verify your identity to protect against unauthorized deletion requests</li>
                  <li><strong className="text-foreground">Processing:</strong> Data deletion will be completed within 30 days of verification</li>
                  <li><strong className="text-foreground">Confirmation:</strong> You will receive confirmation once deletion is complete</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">5. Data Retention Exceptions</h2>
                <p className="mb-4 text-muted-foreground">
                  Certain data may be retained even after a deletion request due to legal or business requirements:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li><strong className="text-foreground">Legal Obligations:</strong> Financial records required for tax and accounting purposes (typically 7 years)</li>
                  <li><strong className="text-foreground">Fraud Prevention:</strong> Information necessary to prevent fraud or abuse</li>
                  <li><strong className="text-foreground">Legal Claims:</strong> Data required for establishing, exercising, or defending legal claims</li>
                  <li><strong className="text-foreground">Aggregated Data:</strong> Anonymized, aggregated data that cannot identify you may be retained for analytics</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">6. Third-Party Data</h2>
                <p className="mb-4 text-muted-foreground">
                  When you request data deletion, we will also notify relevant third-party service providers (such as payment processors and email services) to delete your data from their systems where applicable. However, these providers may have their own data retention policies and legal obligations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">7. Backup Systems</h2>
                <p className="mb-4 text-muted-foreground">
                  Your data may persist in backup systems for a limited period after deletion from our primary systems. These backups are encrypted and automatically purged within 90 days. During this period, backup data is not accessible or used for any operational purposes.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">8. Effects of Data Deletion</h2>
                <p className="mb-4 text-muted-foreground">Please be aware that deleting your data will result in:</p>
                <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  <li>Permanent loss of access to your account and all associated data</li>
                  <li>Loss of visibility history, reports, and optimization recommendations</li>
                  <li>Cancellation of any active subscriptions</li>
                  <li>Inability to recover deleted data after the process is complete</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
                <p className="mb-4 text-muted-foreground">
                  If you have any questions about this data deletion policy or need assistance with a deletion request, please contact us:
                </p>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <p><strong>Email:</strong> privacy@llumos.app</p>
                  <p><strong>General Inquiries:</strong> info@llumos.app</p>
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
