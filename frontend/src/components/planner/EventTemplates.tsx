import * as React from "react";
import { Plus, LayoutTemplate, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventTemplate } from "@/pages/calendar/types";
import DraggableTemplate from "./DraggableTemplate";

interface EventTemplatesProps {
  templates: EventTemplate[];
  pinnedItems: string[];
  togglePin: (item: string) => void;
  handleDeleteTemplate: (template: EventTemplate) => void;
  setIsAddTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingTemplate: React.Dispatch<React.SetStateAction<EventTemplate | null>>;
  setIsEditTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const EventTemplates: React.FC<EventTemplatesProps> = ({
  templates,
  togglePin,
  handleDeleteTemplate,
  setIsAddTemplateOpen,
  setEditingTemplate,
  setIsEditTemplateOpen,
}) => {
  return (
    <div className="border-t pt-4">
      <div className="flex flex-row items-center justify-between pb-2">
        <h3 className="text-base font-medium flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Event Templates
        </h3>
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddTemplateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 text-black" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => togglePin("templates")}
          >
            <Pin className="h-4 w-4 fill-current" />
          </Button>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {templates.map((template, index) => (
          <DraggableTemplate
            key={index}
            template={template}
            onDelete={handleDeleteTemplate}
            onEdit={(t) => {
              setEditingTemplate(t);
              setIsEditTemplateOpen(true);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default EventTemplates;