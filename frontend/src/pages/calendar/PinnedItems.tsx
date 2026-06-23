import * as React from "react";
import { Pin, Target, Notebook, Plus } from "lucide-react";
import { Goals } from "./Goals";
import { PermanentNotes } from "./PermanentNotes";
import EventTemplates from "@/components/planner/EventTemplates";
import type { DailyGoal, PermanentNote, EventTemplate } from "./types";

interface PinnedItemsProps {
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
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  setNotePreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  token: string | undefined;
  isGoalDialogOpen: boolean;
  setIsGoalDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingGoal: DailyGoal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<DailyGoal | null>>;
}

const PinnedItems: React.FC<PinnedItemsProps> = ({
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
  setQuickNote,
  setNotePreviewMode,
  token,
  isGoalDialogOpen,
  setIsGoalDialogOpen,
  editingGoal,
  setEditingGoal
}) => {
  return (
    <div className="p-4 space-y-4">
      {pinnedItems.includes("goals") && (
        <div className="border-t pt-4">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Daily Goals
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 bg-white"
                onClick={() => setIsGoalDialogOpen(true)}
              >
                <Plus className="h-4 w-4 text-black" />
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                onClick={() => togglePin("goals")}
              >
                <Pin className="h-2 w-4" />
              </button>
            </div>
          </div>
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
      )}
      {pinnedItems.includes("notes") && (
        <div className="border-t pt-4">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Notebook className="h-4 w-4" />
              Permanent Notes
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 bg-white"
                onClick={() => setNotePopupOpen(true)}
              >
                <Plus className="h-4 w-4 text-black" />
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                onClick={() => togglePin("notes")}
              >
                <Pin className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>
          <PermanentNotes
            permanentNotes={permanentNotes}
            setPermanentNotes={setPermanentNotes}
            setQuickNote={setQuickNote}
            setNotePreviewMode={setNotePreviewMode}
            setNotePopupOpen={setNotePopupOpen}
            token={token || null}
          />
        </div>
      )}
      {pinnedItems.includes("templates") && (
        <div className="border-t pt-4">
          <EventTemplates
            templates={templates}
            pinnedItems={pinnedItems}
            togglePin={togglePin}
            handleDeleteTemplate={handleDeleteTemplate}
            setIsAddTemplateOpen={setIsAddTemplateOpen}
            setEditingTemplate={setEditingTemplate}
            setIsEditTemplateOpen={setIsEditTemplateOpen}
          />
        </div>
      )}
    </div>
  );
};

export default PinnedItems;