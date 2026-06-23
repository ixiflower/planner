import * as React from "react";
import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventTemplate, CalendarColor } from "@/pages/calendar/types";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

const colorMap: Record<CalendarColor, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#8b5cf6",
  orange: "#f97316",
  gray: "#64748b",
};

interface DraggableTemplateProps {
  template: EventTemplate;
  onDelete: (template: EventTemplate) => void;
  onEdit?: (template: EventTemplate) => void;
}

const DraggableTemplate: React.FC<DraggableTemplateProps> = ({ 
  template, 
  onDelete, 
  onEdit 
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ template }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [template]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`p-2 border rounded-md cursor-grab bg-card hover:bg-muted flex items-center justify-between gap-3 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: colorMap[template.color] }}
        />
        <span>{template.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => onEdit && onEdit(template)}
          aria-label={`Edit template ${template.name}`}
        >
          <Edit3 className="h-4 w-4 text-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => onDelete(template)}
          aria-label={`Delete template ${template.name}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default DraggableTemplate;