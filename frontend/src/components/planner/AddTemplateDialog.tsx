import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventTemplate, CalendarColor } from "@/pages/calendar/types";

const colorMap: Record<CalendarColor, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#8b5cf6",
  orange: "#f97316",
  gray: "#64748b",
};

interface AddTemplateDialogProps {
  isAddTemplateOpen: boolean;
  setIsAddTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newTemplate: Omit<EventTemplate, "id">;
  setNewTemplate: React.Dispatch<React.SetStateAction<Omit<EventTemplate, "id">>>;
  templateCategories: string[];
  setTemplateCategories: React.Dispatch<React.SetStateAction<string[]>>;
  handleSaveTemplate: () => void;
}

const AddTemplateDialog: React.FC<AddTemplateDialogProps> = ({
  isAddTemplateOpen,
  setIsAddTemplateOpen,
  newTemplate,
  setNewTemplate,
  templateCategories,
  setTemplateCategories,
  handleSaveTemplate,
}) => {
  return (
    <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="template-name" className="text-sm font-medium">
              Template Name
            </label>
            <Input
              id="template-name"
              value={newTemplate.name}
              onChange={(e) =>
                setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Morning Routine"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="template-title" className="text-sm font-medium">
              Default Event Title
            </label>
            <Input
              id="template-title"
              value={newTemplate.title}
              onChange={(e) =>
                setNewTemplate((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Morning Standup"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="template-category" className="text-sm font-medium">
              Category
            </label>
            <div className="flex gap-2">
              <select
                id="template-category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, category: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {templateCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => {
                  const newCat = window.prompt('Enter new category name:');
                  if (newCat && !templateCategories.includes(newCat)) {
                    setTemplateCategories((prev) => [...prev, newCat]);
                    setNewTemplate((prev) => ({ ...prev, category: newCat }));
                  }
                }}
              >
                +
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Color</label>
            <div className="flex gap-2 pt-2">
              {(Object.keys(colorMap) as CalendarColor[]).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                    newTemplate.color === color
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: colorMap[color] }}
                  onClick={() =>
                    setNewTemplate((prev) => ({ ...prev, color }))
                  }
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsAddTemplateOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTemplateDialog;