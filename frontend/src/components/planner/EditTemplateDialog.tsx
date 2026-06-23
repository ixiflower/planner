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

interface EditTemplateDialogProps {
  isEditTemplateOpen: boolean;
  setIsEditTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingTemplate: EventTemplate | null;
  setEditingTemplate: React.Dispatch<React.SetStateAction<EventTemplate | null>>;
  templateCategories: string[];
  setTemplateCategories: React.Dispatch<React.SetStateAction<string[]>>;
  handleUpdateTemplate: () => void;
}

const EditTemplateDialog: React.FC<EditTemplateDialogProps> = ({
  isEditTemplateOpen,
  setIsEditTemplateOpen,
  editingTemplate,
  setEditingTemplate,
  templateCategories,
  setTemplateCategories,
  handleUpdateTemplate,
}) => {
  return (
    <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="edit-template-name" className="text-sm font-medium">
              Template Name
            </label>
            <Input
              id="edit-template-name"
              value={editingTemplate?.name || ""}
              onChange={(e) =>
                setEditingTemplate((prev) => (prev ? { ...prev, name: e.target.value } : prev))
              }
              placeholder="Template name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-template-title" className="text-sm font-medium">
              Default Event Title
            </label>
            <Input
              id="edit-template-title"
              value={editingTemplate?.title || ""}
              onChange={(e) =>
                setEditingTemplate((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
              placeholder="Default event title"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-template-category" className="text-sm font-medium">
              Category
            </label>
            <div className="flex gap-2">
              <select
                id="edit-template-category"
                value={editingTemplate?.category || "general"}
                onChange={(e) => setEditingTemplate((prev) => (prev ? { ...prev, category: e.target.value } : prev))}
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
                    setEditingTemplate((prev) => (prev ? { ...prev, category: newCat } : prev));
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
                    editingTemplate?.color === color ? "border-primary ring-2 ring-primary/50" : "border-transparent"
                  }`}
                  style={{ backgroundColor: colorMap[color] }}
                  onClick={() => setEditingTemplate((prev) => (prev ? { ...prev, color } : prev))}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditTemplateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateTemplate}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;