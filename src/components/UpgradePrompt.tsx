import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Clock } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  reason: string;
  isTrialExpired?: boolean;
  daysRemainingInTrial?: number;
  isFreeTier?: boolean;
}

export function UpgradePrompt({ feature, reason, isTrialExpired, daysRemainingInTrial, isFreeTier }: UpgradePromptProps) {
  const navigate = useNavigate();
  
  const handleUpgrade = () => {
    // Navigate to pricing page or trigger checkout
    navigate('/pricing');
  };

  // Free tier specific prompt
  if (isFreeTier) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-800 dark:text-blue-300">
              Unlock More Features
            </CardTitle>
            <Badge variant="outline" className="ml-auto border-blue-600 text-blue-700 dark:text-blue-300">
              Free Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            {reason}
          </p>
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            Upgrade to Starter for just $39/month to unlock:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>25 prompts tracked daily (vs 5 weekly)</li>
              <li>ChatGPT + Perplexity tracking</li>
              <li>Real-time updates</li>
              <li>7-day free trial included</li>
            </ul>
          </div>
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Zap className="w-4 h-4 mr-2" />
            Start Free Trial
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isTrialExpired) {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            <CardTitle className="text-lg text-red-800 dark:text-red-300">Trial Expired</CardTitle>
            <Badge variant="destructive" className="ml-auto">
              Expired
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Your free trial has ended. Upgrade now to continue using all Llumos features.
          </p>
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-lg text-amber-800 dark:text-amber-300">
            Upgrade Required
          </CardTitle>
          {daysRemainingInTrial && daysRemainingInTrial > 0 && (
            <Badge variant="outline" className="ml-auto border-amber-600 text-amber-700 dark:text-amber-300">
              {daysRemainingInTrial} days left in trial
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-amber-700 dark:text-amber-300 mb-4">
          {reason}
        </p>
        <Button 
          onClick={handleUpgrade}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Zap className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}