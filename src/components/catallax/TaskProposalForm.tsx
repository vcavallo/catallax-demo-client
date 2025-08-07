import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useArbiterAnnouncements } from '@/hooks/useCatallax';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CATALLAX_KINDS, generateTaskId, formatFee } from '@/lib/catallax';

interface TaskProposalFormProps {
  onSuccess?: () => void;
}

export function TaskProposalForm({ onSuccess }: TaskProposalFormProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { data: arbiters = [] } = useArbiterAnnouncements();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    amount: '',
    detailsUrl: '',
    selectedArbiter: '',
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [deadline, setDeadline] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.selectedArbiter) return;

    const selectedArbiterData = arbiters.find(a => `${a.arbiterPubkey}:${a.d}` === formData.selectedArbiter);
    if (!selectedArbiterData) return;

    const content = {
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements,
      deadline: deadline ? Math.floor(deadline.getTime() / 1000) : undefined,
    };

    const tags: string[][] = [
      ['d', generateTaskId(formData.title)],
      ['p', user.pubkey],
      ['p', selectedArbiterData.arbiterPubkey],
      ['a', `33400:${selectedArbiterData.arbiterPubkey}:${selectedArbiterData.d}`],
      ['amount', formData.amount],
      ['t', 'catallax'],
      ['status', 'proposed'],
    ];

    if (formData.detailsUrl) {
      tags.push(['r', formData.detailsUrl]);
    }

    categories.forEach(category => {
      tags.push(['t', category]);
    });

    createEvent({
      kind: CATALLAX_KINDS.TASK_PROPOSAL,
      content: JSON.stringify(content),
      tags,
    }, {
      onSuccess: () => {
        setFormData({
          title: '',
          description: '',
          requirements: '',
          amount: '',
          detailsUrl: '',
          selectedArbiter: '',
        });
        setCategories([]);
        setDeadline(undefined);
        onSuccess?.();
      },
    });
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Please log in to create a task proposal.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Task Proposal</CardTitle>
        <CardDescription>
          Post a new task and select an arbiter to handle escrow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Build a responsive landing page"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the work to be done"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements *</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="Specific deliverable requirements and acceptance criteria"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount (sats) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="500000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Deadline (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arbiter">Select Arbiter *</Label>
            <Select
              value={formData.selectedArbiter}
              onValueChange={(value) => setFormData({ ...formData, selectedArbiter: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an arbiter for this task" />
              </SelectTrigger>
              <SelectContent>
                {arbiters.map((arbiter) => (
                  <SelectItem key={`${arbiter.arbiterPubkey}:${arbiter.d}`} value={`${arbiter.arbiterPubkey}:${arbiter.d}`}>
                    <div className="flex flex-col">
                      <span>{arbiter.content.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Fee: {formatFee(arbiter.feeType, arbiter.feeAmount)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {arbiters.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No arbiters available. Someone needs to create an arbiter service first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Task Categories</Label>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g., web development, design, writing"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <Button type="button" onClick={addCategory} variant="outline">
                Add
              </Button>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {categories.map((category) => (
                  <Badge key={category} variant="secondary" className="flex items-center gap-1">
                    {category}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeCategory(category)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="detailsUrl">Details URL (Optional)</Label>
            <Input
              id="detailsUrl"
              type="url"
              value={formData.detailsUrl}
              onChange={(e) => setFormData({ ...formData, detailsUrl: e.target.value })}
              placeholder="https://your-website.com/task-details"
            />
          </div>

          <Button 
            type="submit" 
            disabled={isPending || !formData.title || !formData.description || !formData.requirements || !formData.amount || !formData.selectedArbiter}
          >
            {isPending ? 'Publishing...' : 'Publish Task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}