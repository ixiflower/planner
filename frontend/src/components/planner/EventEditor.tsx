import {
  CalendarPlusIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES = {
  work: { name: "Work", color: "#ef4444" },
  personal: { name: "Personal", color: "#3b82f6" },
  study: { name: "Study", color: "#10b981" },
  travel: { name: "Travel", color: "#f59e0b" },
  health: { name: "Health", color: "#8b5cf6" },
  other: { name: "Other", color: "#6b7280" }
} as const;

const REMINDER_OPTIONS = [
  { value: "30minutes", label: "30 minutes before" },
  { value: "1hour", label: "1 hour before" },
  { value: "2hours", label: "2 hours before" },
  { value: "1day", label: "1 day before" },
  { value: "2days", label: "2 days before" }
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
];

interface EventEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  isDateDisabled: (date: Date) => boolean;
  handleDateSelect: (date: Date | undefined) => void;
  draftDescription: string;
  setDraftDescription: (description: string) => void;
  draftCategory: string;
  setDraftCategory: (category: string) => void;
  draftReminder: string;
  setDraftReminder: (reminder: string) => void;
  draftRecurrence: string;
  setDraftRecurrence: (recurrence: string) => void;
  draftCompleted: boolean;
  setDraftCompleted: (completed: boolean) => void;
  editingKey: string | null;
  saveDescription: () => void;
  cancelDescriptionEdit: () => void;
}

export function EventEditor({
  open,
  onOpenChange,
  selectedDate,
  isDateDisabled,
  handleDateSelect,
  draftDescription,
  setDraftDescription,
  draftCategory,
  setDraftCategory,
  draftReminder,
  setDraftReminder,
  draftRecurrence,
  setDraftRecurrence,
  draftCompleted,
  setDraftCompleted,
  editingKey,
  saveDescription,
  cancelDescriptionEdit
}: EventEditorProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button
          id="date"
          variant="outline"
          className="flex items-center gap-2 px-3 py-2 text-sm"
          aria-haspopup="dialog"
        >
          <CalendarPlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">
            {selectedDate ? selectedDate.toLocaleDateString() : "Choose date"}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-full max-w-md p-0 mx-auto border max-h-[85vh]">
        <DrawerHeader className="text-left px-3 sm:px-4 pt-3 sm:pt-4">
          <DrawerTitle className="text-base sm:text-lg">
            {editingKey ? "Edit Event" : "Add Event"}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-3 sm:px-4 pb-20"> {}
          <Calendar
            mode="single"
            selected={selectedDate}
            captionLayout="dropdown"
            fromYear={2020}
            toYear={2030}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            className="mx-auto [--cell-size:clamp(28px,calc(100vw/9),48px)]"
          />
          
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
              <Textarea
                id="description"
                placeholder={`What will you do on ${
                  selectedDate
                    ? selectedDate.toLocaleDateString()
                    : "the selected date"
                }?`}
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                rows={2}
                className="w-full text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    saveDescription();
                  if (e.key === "Escape") cancelDescriptionEdit();
                }}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="category" className="text-sm sm:text-base">Category</Label>
                <Select
                  value={draftCategory}
                  onValueChange={setDraftCategory}
                >
                  <SelectTrigger id="category" className="text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-black">
                    <SelectItem value="_none_">None</SelectItem>
                    {Object.entries(CATEGORIES).map(([id, category]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm">{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="reminder" className="text-sm sm:text-base">Reminder</Label>
                <Select
                  value={draftReminder}
                  onValueChange={setDraftReminder}
                >
                  <SelectTrigger id="reminder" className="text-sm">
                    <SelectValue placeholder="No reminder" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-black">
                    <SelectItem value="_none_">None</SelectItem>
                    {REMINDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="text-sm">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="recurrence" className="text-sm sm:text-base">Recurrence</Label>
              <Select
                value={draftRecurrence}
                onValueChange={setDraftRecurrence}
              >
                <SelectTrigger id="recurrence" className="text-sm">
                  <SelectValue placeholder="Does not repeat" />
                </SelectTrigger>
                <SelectContent className="dark:bg-black max-h-40 overflow-y-auto">
                  <SelectItem value="none">Does not repeat</SelectItem>
                  {RECURRENCE_OPTIONS.slice(1).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="text-sm">{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 sm:space-y-2 pt-1 sm:pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="completed"
                  checked={draftCompleted}
                  onCheckedChange={(checked) =>
                    setDraftCompleted(checked === true)
                  }
                />
                <Label htmlFor="completed" className="cursor-pointer text-sm sm:text-base">
                  Mark as completed
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Completed events will be shown with a strikethrough. 
                You can toggle this later from the event list.
              </p>
            </div>
          </div>
        </div>
        
        {}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 sm:p-4 w-full max-w-md mx-auto">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelDescriptionEdit} className="text-sm sm:text-base">
              <XIcon className="h-4 w-4" />
              <span className="ml-2">Cancel</span>
            </Button>
            <Button
              onClick={saveDescription}
              disabled={!draftDescription.trim()}
              className="text-sm sm:text-base"
            >
              <SaveIcon className="h-4 w-4" />
              <span className="ml-2">Save</span>
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}