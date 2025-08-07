import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATALLAX_KINDS, type ResolutionType, type TaskProposal } from '@/lib/catallax';

interface TaskConclusionFormProps {
  task: TaskProposal;
  onSuccess?: () => void;
  payoutZapReceiptId?: string;
}

export function TaskConclusionForm({ task, onSuccess, payoutZapReceiptId }: TaskConclusionFormProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    resolutionDetails: '',
    resolution: '' as ResolutionType | '',
    payoutZapReceiptId: payoutZapReceiptId || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.resolution) return;

    // Step 1: Publish the task conclusion (kind 3402)
    const conclusionContent = {
      resolution_details: formData.resolutionDetails,
    };

    const conclusionTags: string[][] = [
      ['p', task.patronPubkey],
      ['resolution', formData.resolution],
      ['a', `33401:${task.patronPubkey}:${task.d}`],
      ['t', 'catallax'], // Add catallax tag for filtering
    ];

    if (task.arbiterPubkey) {
      conclusionTags.push(['p', task.arbiterPubkey]);
    }

    if (task.workerPubkey) {
      conclusionTags.push(['p', task.workerPubkey]);
    }

    if (formData.payoutZapReceiptId) {
      conclusionTags.push(['e', formData.payoutZapReceiptId]);
    }

    conclusionTags.push(['e', task.id]);

    console.log('Publishing task conclusion with tags:', conclusionTags);

    createEvent({
      kind: CATALLAX_KINDS.TASK_CONCLUSION,
      content: JSON.stringify(conclusionContent),
      tags: conclusionTags,
    }, {
      onSuccess: (conclusionEvent) => {
        console.log('✅ Task conclusion published successfully:', conclusionEvent);

        // Step 2: Update the task proposal status to "concluded"
        const taskContent = task.content;
        const taskTags: string[][] = [
          ['d', task.d],
          ['p', task.patronPubkey],
          ['amount', task.amount],
          ['t', 'catallax'],
          ['status', 'concluded'],
        ];

        if (task.arbiterPubkey) {
          taskTags.push(['p', task.arbiterPubkey]);
        }

        if (task.workerPubkey) {
          taskTags.push(['p', task.workerPubkey]);
        }

        if (task.arbiterService) {
          taskTags.push(['a', task.arbiterService]);
        }

        if (task.detailsUrl) {
          taskTags.push(['r', task.detailsUrl]);
        }

        if (task.zapReceiptId) {
          taskTags.push(['e', task.zapReceiptId, '', 'zap']);
        }

        // Add task categories
        task.categories.forEach(category => {
          if (category !== 'catallax') {
            taskTags.push(['t', category]);
          }
        });

        // Reference the conclusion event
        taskTags.push(['e', conclusionEvent.id, '', 'conclusion']);

        console.log('Publishing task proposal update with tags:', taskTags);

        createEvent({
          kind: CATALLAX_KINDS.TASK_PROPOSAL,
          content: JSON.stringify(taskContent),
          tags: taskTags,
          created_at: Math.floor(Date.now() / 1000),
        }, {
          onSuccess: (taskEvent) => {
            console.log('✅ Task proposal updated to concluded successfully:', taskEvent);
            console.log('✅ Both conclusion event AND task status update completed!');

            toast({
              title: 'Task Concluded!',
              description: `Task has been concluded with resolution: ${formData.resolution}`,
            });

            // Clear form and invalidate queries
            setFormData({
              resolutionDetails: '',
              resolution: '',
              payoutZapReceiptId: '',
            });

            // Force immediate refetch of all task queries
            queryClient.invalidateQueries({ queryKey: ['catallax'] });

            // Add a small delay to allow queries to refetch, then call onSuccess
            setTimeout(() => {
              onSuccess?.();
            }, 1500);
          },
          onError: (error) => {
            console.error('❌ Failed to update task proposal status:', error);
            toast({
              title: 'Partial Success',
              description: 'Task conclusion was published, but failed to update task status. Try refreshing the page.',
              variant: 'destructive',
            });
          },
        });
      },
      onError: (error) => {
        console.error('❌ Failed to publish task conclusion:', error);
        toast({
          title: 'Error',
          description: 'Failed to conclude task. Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Please log in to conclude this task.</p>
        </CardContent>
      </Card>
    );
  }

  // Check if user is authorized to conclude this task (arbiter or patron)
  const isAuthorized = user.pubkey === task.arbiterPubkey || user.pubkey === task.patronPubkey;

  if (!isAuthorized) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Only the arbiter or patron can conclude this task.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conclude Task</CardTitle>
        <CardDescription>
          Document the final resolution of "{task.content.title}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution *</Label>
            <Select
              value={formData.resolution}
              onValueChange={(value: ResolutionType) => setFormData({ ...formData, resolution: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select the task outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="successful">Successful - Work accepted, payment to worker</SelectItem>
                <SelectItem value="rejected">Rejected - Work not accepted, refund to patron</SelectItem>
                <SelectItem value="cancelled">Cancelled - Task cancelled before completion</SelectItem>
                <SelectItem value="abandoned">Abandoned - Worker abandoned task, refund to patron</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolutionDetails">Resolution Details *</Label>
            <Textarea
              id="resolutionDetails"
              value={formData.resolutionDetails}
              onChange={(e) => setFormData({ ...formData, resolutionDetails: e.target.value })}
              placeholder="Describe the task outcome, work quality, and resolution reasoning"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payoutZapReceiptId">Payout Zap Receipt ID (Optional)</Label>
            <Input
              id="payoutZapReceiptId"
              value={formData.payoutZapReceiptId}
              onChange={(e) => setFormData({ ...formData, payoutZapReceiptId: e.target.value })}
              placeholder="Event ID of the zap receipt for the payout transaction"
            />
            <p className="text-sm text-muted-foreground">
              Include the event ID of the zap receipt when payment is sent to worker or refund to patron
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Task Summary</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Title:</strong> {task.content.title}</p>
              <p><strong>Amount:</strong> {parseInt(task.amount).toLocaleString()} sats</p>
              <p><strong>Status:</strong> {task.status}</p>
              {task.workerPubkey && (
                <p><strong>Worker:</strong> {task.workerPubkey.slice(0, 16)}...</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || !formData.resolution || !formData.resolutionDetails}
          >
            {isPending ? 'Publishing...' : 'Conclude Task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}