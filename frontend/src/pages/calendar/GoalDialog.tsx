import * as React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DailyGoal, CalendarColor } from './types';

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: Partial<DailyGoal> & { text: string; date: string; priority?: string; category?: string; color?: CalendarColor; notes?: string; targetTime?: number; }) => void;
  goal?: DailyGoal | null;
}

export function GoalDialog({ open, onOpenChange, onSave, goal }: GoalDialogProps) {
  const [text, setText] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = React.useState('medium');
  const [category, setCategory] = React.useState('personal');
  const [color, setColor] = React.useState<CalendarColor>('blue');
  const [notes, setNotes] = React.useState('');
  const [targetTime, setTargetTime] = React.useState(60); 
  const [categories, setCategories] = React.useState(['personal', 'work', 'education', 'health', 'financial']);

  React.useEffect(() => {
    if (goal) {
      setText(goal.text);
      setDate(goal.date);
      setPriority(goal.priority || 'medium');
      setCategory(goal.category || 'personal');
      setColor(goal.color || 'blue');
      setNotes(goal.notes || '');
      const timeMatch = goal.notes?.match(/Target time: (\d+) minutes/);
      if (timeMatch) {
        setTargetTime(parseInt(timeMatch[1]));
      } else {
        setTargetTime(60);
      }
    } else {
      setText('');
      setDate(new Date().toISOString().split('T')[0]);
      setPriority('medium');
      setCategory('personal');
      setNotes('');
      setTargetTime(60);
    }
  }, [goal, open]);

  const handleSave = () => {
    const notesWithTime = notes ? `${notes}\n\nTarget time: ${targetTime} minutes` : `Target time: ${targetTime} minutes`;
    
    onSave({ 
      id: goal?.id, 
      text, 
      date,
      priority,
      category,
      color,
      notes: notesWithTime,
      targetTime
    });
    onOpenChange(false);
  };

  const dialogTitle = goal ? "Edit Goal" : "Add New Goal";
  const dialogDescription = goal ? "Edit the details of your existing goal." : "Create a new goal with detailed tracking options.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-text">Goal Title</Label>
            <Input
              id="goal-text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g., Complete Project Documentation"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-date">Target Date</Label>
              <Input
                id="goal-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal-target-time">Target Time (minutes)</Label>
              <Input
                id="goal-target-time"
                type="number"
                min="1"
                value={targetTime}
                onChange={e => setTargetTime(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-priority">Priority</Label>
              <select
                id="goal-priority"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal-category">Category</Label>
              <div className="flex gap-2">
                <select
                  id="goal-category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => {
                    const newCat = window.prompt('Enter new category name:');
                    if (newCat && !categories.includes(newCat)) {
                      setCategories([...categories, newCat]);
                      setCategory(newCat);
                    }
                  }}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-color">Color</Label>
            <div className="flex gap-2">
              {(['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'gray'] as CalendarColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-ring' : ''}`}
                  style={{ backgroundColor: c }}
                  type="button"
                  aria-label={`Select ${c} color`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-notes">Additional Notes</Label>
            <textarea
              id="goal-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional details or milestones..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{goal ? "Save Changes" : "Create Goal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}