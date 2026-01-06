/**
 * Local AI Authority Page
 * Setup wizard, scan progress, and results dashboard
 */

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Sparkles, Crown, ArrowLeft } from 'lucide-react';
import { useLocalAuthority } from '@/hooks/useLocalAuthority';
import { LocalAuthorityWizard } from '@/components/local-authority/LocalAuthorityWizard';
import { ScanProgress } from '@/components/local-authority/ScanProgress';
import { LocalAuthorityResults } from '@/components/local-authority/LocalAuthorityResults';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function LocalAuthority() {
  const navigate = useNavigate();
  const {
    step,
    formData,
    scanStage,
    scanError,
    promptCounts,
    result,
    cached,
    isEligible,
    ineligibleMessage,
    setStep,
    updateForm,
    reset,
    validateStep,
    startScan,
    rerunScan,
  } = useLocalAuthority();

  const [isRerunning, setIsRerunning] = useState(false);

  const handleRerun = async (force = false) => {
    setIsRerunning(true);
    try {
      await rerunScan(force);
    } finally {
      setIsRerunning(false);
    }
  };

  const isScanning = ['creating_profile', 'generating_prompts', 'creating_run', 'executing_scan'].includes(scanStage);
  const hasResults = scanStage === 'complete' && result;

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                      Local AI Authority
                      <Badge variant="secondary" className="font-normal">
                        Beta
                      </Badge>
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      Measure how AI recommends your local business
                    </p>
                  </div>
                </div>
              </div>
              {hasResults && (
                <Button variant="outline" onClick={reset}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  New Scan
                </Button>
              )}
            </div>

            {/* Plan Gate */}
            {!isEligible ? (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <CardTitle>Upgrade Required</CardTitle>
                  </div>
                  <CardDescription>
                    Local AI Authority is available on Growth, Pro, and Agency plans.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UpgradePrompt
                    feature="Local AI Authority"
                    reason={ineligibleMessage || 'This feature requires a higher plan tier.'}
                  />
                </CardContent>
              </Card>
            ) : hasResults ? (
              /* Results Dashboard */
              <LocalAuthorityResults
                profile={result.profile}
                run={result.run}
                score={result.score}
                highlights={result.highlights}
                top_competitors={result.top_competitors}
                sample_responses={result.sample_responses}
                confidence={result.confidence}
                cached={cached}
                onRerun={handleRerun}
                isRerunning={isRerunning}
              />
            ) : isScanning || scanStage === 'error' ? (
              /* Scan Progress */
              <Card>
                <CardContent className="pt-6">
                  <ScanProgress
                    stage={scanStage}
                    error={scanError}
                    promptCounts={promptCounts}
                  />
                  {scanStage === 'error' && (
                    <div className="flex justify-center gap-3 mt-6">
                      <Button variant="outline" onClick={reset}>
                        Start Over
                      </Button>
                      <Button onClick={() => startScan()}>
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Setup Wizard */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Set Up Your Local Profile
                  </CardTitle>
                  <CardDescription>
                    Tell us about your business and service area to run a comprehensive local AI scan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LocalAuthorityWizard
                    step={step}
                    formData={formData}
                    onStepChange={setStep}
                    onFormUpdate={updateForm}
                    onStartScan={() => startScan()}
                    validateStep={validateStep}
                    isScanning={isScanning}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
