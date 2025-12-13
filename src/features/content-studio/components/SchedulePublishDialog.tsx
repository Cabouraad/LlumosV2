import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar as CalendarIcon, Clock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ContentStudioItem } from '../types';

interface SchedulePublishDialogProps {
  open: boolean;
  onClose: () => void;
  item: ContentStudioItem | null;
}

export function SchedulePublishDialog({ open, onClose, item }: SchedulePublishDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [postStatus, setPostStatus] = useState<'draft' | 'publish'>('draft');
  const queryClient = useQueryClient();

  // Fetch CMS connections
  const { data: connections, isLoading: loadingConnections } = useQuery({
    queryKey: ['cms-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_connections')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!item || !selectedConnection) throw new Error('Missing required data');

      let scheduledAt: string | undefined;
      if (selectedDate) {
        const [hours, minutes] = selectedTime.split(':');
        const date = new Date(selectedDate);
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        scheduledAt = date.toISOString();
      }

      const { data, error } = await supabase.functions.invoke('wordpress-publish', {
        body: {
          contentStudioItemId: item.id,
          cmsConnectionId: selectedConnection,
          scheduledAt,
          postStatus,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.scheduled) {
        toast.success('Content scheduled!', {
          description: `Will be published on ${format(new Date(data.scheduledAt), 'PPP p')}`,
        });
      } else {
        toast.success('Content published!', {
          description: data.postUrl ? 'View on your site' : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['content-studio-items'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-publications'] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to publish', { description: error.message });
    },
  });

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [`${hour}:00`, `${hour}:30`];
  }).flat();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Schedule Publication
          </DialogTitle>
          <DialogDescription>
            {item?.topic_key ? `Publish "${item.topic_key}" to WordPress` : 'Schedule content for publication'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* WordPress Site Selection */}
          <div className="space-y-2">
            <Label>WordPress Site</Label>
            {loadingConnections ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading connections...
              </div>
            ) : connections && connections.length > 0 ? (
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {conn.site_url}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No WordPress sites connected. Connect one first.
              </p>
            )}
          </div>

          {/* Post Status */}
          <div className="space-y-2">
            <Label>Publish As</Label>
            <Select value={postStatus} onValueChange={(v) => setPostStatus(v as 'draft' | 'publish')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (review before publishing)</SelectItem>
                <SelectItem value="publish">Published (live immediately)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Date */}
          <div className="space-y-2">
            <Label>Schedule For (optional)</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-[110px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to publish immediately
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={!selectedConnection || publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {selectedDate ? 'Scheduling...' : 'Publishing...'}
              </>
            ) : selectedDate ? (
              'Schedule'
            ) : (
              'Publish Now'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
