import * as React from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import TimePicker from "@/components/ui/time-picker";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import type { CalendarEvent } from "./types";

interface Props {
  selectedDate: Date;
  onSave: (newEvent: CalendarEvent) => void;
  onCancel: () => void;
  tempEvent?: CalendarEvent | null;
}

const EventCreator: React.FC<Props> = ({ selectedDate, onSave, onCancel, tempEvent }) => {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startTime, setStartTime] = React.useState(
    tempEvent ? format(parseISO(tempEvent.startDate), "HH:mm") : "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    tempEvent ? format(parseISO(tempEvent.endDate), "HH:mm") : "10:00"
  );

  React.useEffect(() => {
    if (tempEvent) {
      setTitle(tempEvent.title);
      setDescription(tempEvent.description || "");
      setStartTime(format(parseISO(tempEvent.startDate), "HH:mm"));
      setEndTime(format(parseISO(tempEvent.endDate), "HH:mm"));
      setEmoji(tempEvent.emoji || "");
    }
  }, [tempEvent]);
  const [color, setColor] = React.useState("blue");
  const [isImportant, setIsImportant] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [category, setCategory] = React.useState<string>("general");
  const [categories, setCategories] = React.useState<string[]>(["general", "work", "personal", "education", "health"]);
  const [emoji, setEmoji] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsCreating(true);

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startDate = new Date(selectedDate);
    startDate.setHours(startHours, startMinutes, 0, 0);

    const endDate = new Date(selectedDate);
    endDate.setHours(endHours, endMinutes, 0, 0);

    const newEvent: CalendarEvent = {
      id: tempEvent ? tempEvent.id : Math.random().toString(36).substr(2, 9),
      title,
      description: description || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: color as CalendarEvent["color"],
      isImportant,
      category,
    };

    console.log("EventCreator submitting event:", newEvent);
    console.log("tempEvent was:", tempEvent);

    try {
      await onSave(newEvent);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border bg-background"
            autoFocus
          />
        </div>
        
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-md border bg-background min-h-[80px]"
        />
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <TimePicker value={startTime} onChange={setStartTime} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <TimePicker value={endTime} onChange={setEndTime} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Color</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
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
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-important-create"
            checked={isImportant}
            onCheckedChange={(checked) => setIsImportant(checked as boolean)}
          />
          <label 
            htmlFor="is-important-create" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Is Important
          </label>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">
          {isCreating ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
};

export default EventCreator;