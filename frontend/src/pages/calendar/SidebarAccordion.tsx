import * as React from "react";
import { Pin, Target, Notebook, Plus, LayoutTemplate } from "lucide-react";
import { Goals } from "./Goals";
import { PermanentNotes } from "./PermanentNotes";
import DraggableTemplate from "@/components/planner/DraggableTemplate";
import type { DailyGoal, PermanentNote, EventTemplate } from "./types";

interface SidebarAccordionProps {
  pinnedItems: string[];
  togglePin: (item: string) => void;
  dailyGoals: DailyGoal[];
  setDailyGoals: React.Dispatch<React.SetStateAction<DailyGoal[]>>;
  permanentNotes: PermanentNote[];
  setPermanentNotes: React.Dispatch<React.SetStateAction<PermanentNote[]>>;
  templates: EventTemplate[];
  handleDeleteTemplate: (templateToDelete: EventTemplate) => void;
  setIsAddTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingTemplate: React.Dispatch<React.SetStateAction<EventTemplate | null>>;
  setIsEditTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotePopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  token: string | undefined;
  isGoalDialogOpen: boolean;
  setIsGoalDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingGoal: DailyGoal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<DailyGoal | null>>;
}

const SidebarAccordion: React.FC<SidebarAccordionProps> = ({
  pinnedItems,
  togglePin,
  dailyGoals,
  setDailyGoals,
  permanentNotes,
  setPermanentNotes,
  templates,
  handleDeleteTemplate,
  setIsAddTemplateOpen,
  setEditingTemplate,
  setIsEditTemplateOpen,
  setNotePopupOpen,
  token,
  isGoalDialogOpen,
  setIsGoalDialogOpen,
  editingGoal,
  setEditingGoal
}) => {
  return (
    <div className="mt-auto p-4">
      <div className="w-full">
        {!pinnedItems.includes("goals") && (
          <div className="border-t pt-4">
            <div className="flex justify-between w-full items-center pr-2">
              <div className="flex items-center gap-2 py-4 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                <Target className="h-4 w-4" />
                <span>Daily Goals</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGoalDialogOpen(true);
                    setEditingGoal(null);
                  }}
                >
                  <Plus className="h-4 w-4 text-black" />
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin("goals");
                  }}
                >
                  <Pin className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <Goals
                goals={dailyGoals}
                setGoals={setDailyGoals}
                token={token || null}
                isGoalDialogOpen={isGoalDialogOpen}
                setIsGoalDialogOpen={setIsGoalDialogOpen}
                editingGoal={editingGoal}
                setEditingGoal={setEditingGoal}
              />
            </div>
          </div>
        )}
        {!pinnedItems.includes("notes") && (
          <div className="border-t pt-4">
            <div className="flex justify-between w-full items-center pr-2">
              <div className="flex items-center gap-2 py-4 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                <Notebook className="h-4 w-4" />
                <span>Permanent Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotePopupOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 text-black" />
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin("notes");
                  }}
                >
                  <Pin className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <PermanentNotes
                permanentNotes={permanentNotes}
                setPermanentNotes={setPermanentNotes}
                setQuickNote={() => {}} 
                setNotePreviewMode={() => {}} 
                setNotePopupOpen={setNotePopupOpen}
                token={token || null}
              />
            </div>
          </div>
        )}
        {!pinnedItems.includes("templates") && (
          <div className="border-t pt-4">
            <div className="flex justify-between w-full items-center pr-2">
              <div className="flex items-center gap-2 py-4 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
                <LayoutTemplate className="h-4 w-4" />
                <span>Event Templates</span>
              </div>
              <div className="flex items-center">
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddTemplateOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 text-black" />
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin("templates");
                  }}
                >
                  <Pin className="h-4 w-4" />
                </button>
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
        )}
      </div>
    </div>
  );
};

export default SidebarAccordion;