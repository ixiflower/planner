import * as React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { XIcon, SaveIcon } from "lucide-react";

interface FullNoteEditorProps {
  fullEditorOpen: string | null;
  setFullEditorOpen: React.Dispatch<React.SetStateAction<string | null>>;
  fullDraft: string;
  setFullDraft: React.Dispatch<React.SetStateAction<string>>;
  saveFullNote: (key?: string) => void;
  markdownPreview: boolean;
  setMarkdownPreview: React.Dispatch<React.SetStateAction<boolean>>;
  formatReadable: (date: string | Date | undefined) => string;
  cancelFull: () => void;
}

export function FullNoteEditor({
  fullEditorOpen,
  fullDraft,
  setFullDraft,
  saveFullNote,
  markdownPreview,
  setMarkdownPreview,
  formatReadable,
  cancelFull
}: FullNoteEditorProps) {
  if (!fullEditorOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b shadow-sm gap-3">
        <div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            Editing note
          </div>
          <div className="text-base sm:text-lg font-semibold">
            {formatReadable(fullEditorOpen)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setMarkdownPreview(!markdownPreview)}
            className="text-xs sm:text-sm px-2 py-1 h-7 sm:h-9"
          >
            {markdownPreview ? "Edit" : "Preview"}
          </Button>
          <Button
            variant="outline"
            onClick={cancelFull}
            aria-label="Cancel full editor"
            className="text-xs sm:text-sm px-2 py-1 h-7 sm:h-9"
          >
            <XIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            Cancel
          </Button>
          <Button
            onClick={() => saveFullNote()}
            disabled={!fullDraft.trim()}
            className="text-xs sm:text-sm px-2 py-1 h-7 sm:h-9"
          >
            <SaveIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            Save
          </Button>
        </div>
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={70} minSize={30}>
          <div className="p-3 sm:p-4 h-full">
            {markdownPreview ? (
              <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none p-3 sm:p-4 border rounded-md h-full overflow-auto">
                {fullDraft || <em>No content to preview</em>}
              </div>
            ) : (
              <Textarea
                value={fullDraft}
                onChange={(e) => setFullDraft(e.target.value)}
                className="h-full min-h-[40vh] sm:min-h-[30vh] w-full resize-none font-mono text-sm"
                placeholder={`Write anything you want for ${formatReadable(
                  fullEditorOpen
                )}... (Markdown supported)`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    saveFullNote();
                  if (e.key === "Escape") cancelFull();
                }}
              />
            )}
          </div>
        </ResizablePanel>
        {!markdownPreview && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="p-3 sm:p-4 h-full overflow-auto">
                <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none">
                  <h3 className="text-base sm:text-lg">Markdown Preview</h3>
                  <div className="border rounded-md p-3 sm:p-4">
                    {fullDraft || <em>No content to preview</em>}
                  </div>
                  <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                    <h4 className="text-sm sm:text-base">Markdown Tips:</h4>
                    <ul className="space-y-1">
                      <li>
                        **Bold** for <strong>bold text</strong>
                      </li>
                      <li>
                        *Italic* for <em>italic text</em>
                      </li>
                      <li># Heading 1</li>
                      <li>## Heading 2</li>
                      <li>- List items</li>
                      <li>[Link](https://example.com)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}