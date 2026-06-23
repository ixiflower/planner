import * as React from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import TimePicker from "@/components/ui/time-picker";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import type { CalendarEvent } from "./types";

interface Props {
  event: CalendarEvent | null;
  onSave: (updatedEvent: CalendarEvent) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  }

const EventEditor: React.FC<Props> = ({ event, onSave, onCancel, onDelete, open, onOpenChange }) => {
  const [title, setTitle] = React.useState(event?.title || "");
  const [description, setDescription] = React.useState(event?.description || "");
  const [startTime, setStartTime] = React.useState(
    event ? format(parseISO(event.startDate), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    event ? format(parseISO(event.endDate), "HH:mm") : "10:00"
  );
  const [color, setColor] = React.useState<CalendarEvent["color"]>(
    event?.color || "blue"
  );
  const [isImportant, setIsImportant] = React.useState(event?.isImportant || false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [category, setCategory] = React.useState<string>(event?.category || "general");
  const [categories, setCategories] = React.useState<string[]>(["general", "work", "personal", "education", "health"]);
  const [emoji, setEmoji] = React.useState<string>(event?.emoji || "");

  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartTime(format(parseISO(event.startDate), "HH:mm"));
      setEndTime(format(parseISO(event.endDate), "HH:mm"));
      setColor(event.color);
      setIsImportant(event.isImportant || false);
      setEmoji(event.emoji || "");
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;

    setIsSaving(true);

    try {
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const [endHours, endMinutes] = endTime.split(":").map(Number);

      const newStartDate = new Date(parseISO(event.startDate));
      newStartDate.setHours(startHours, startMinutes, 0, 0);

      const newEndDate = new Date(parseISO(event.endDate));
      newEndDate.setHours(endHours, endMinutes, 0, 0);

      if (newEndDate <= newStartDate) {
        newEndDate.setDate(newEndDate.getDate() + 1);
      }

      const updatedEvent: CalendarEvent = {
        ...event,
        title: title.trim() || "Untitled Event",
        description: description.trim() || undefined,
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
        color,
        isImportant,
        category,
        emoji: emoji || undefined,
      };

      await onSave(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (event && window.confirm("Are you sure you want to delete this event?")) {
      onDelete(event.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border bg-background"
                autoFocus
              />
            </div>
            
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background min-h-[80px]"
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <TimePicker value={startTime} onChange={setStartTime} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as CalendarEvent["color"])}
                className="w-full border rounded px-3 py-2 text-sm bg-black"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
                <option value="purple">Purple</option>
                <option value="orange">Orange</option>
                <option value="gray">Gray</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Button
                  type="button"
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

            <div className="flex items-center">
              <Checkbox
                checked={isImportant}
                onCheckedChange={(checked) => setIsImportant(Boolean(checked))}
              />
              <label className="ml-2 text-sm font-medium">Important</label>
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSaving}>
                🗑️ Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventEditor;
