import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, FileText, Sparkles, Heading1, List, ListOrdered, Minus, Eye, EyeOff, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchExercise, saveExercise, type Exercise } from "./api";

const ExerciseBoard: React.FC = () => {
  const [exercises, setExercises] = React.useState<string>("");
  const [previewMode, setPreviewMode] = React.useState(true);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadExerciseData = async () => {
      try {
        setLoading(true);
        const exerciseData = await fetchExercise();
        if (exerciseData) {
          setExercises(exerciseData.content);
        }
      } catch (error) {
        console.error("Failed to load exercise data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadExerciseData();
  }, []);

  const handleSave = async () => {
    try {
      let formattedText = exercises;
      
      formattedText = formattedText.replace(/^# (.*$)/gm, "## $1");
      formattedText = formattedText.replace(/^## (.*$)/gm, "### $1");
      
      formattedText = formattedText.replace(/^[*-] (.*)$/gm, "• $1");
      
      formattedText = formattedText.replace(/^(\d+)\. (.*)$/gm, "$1. $2");
      
      formattedText = formattedText.replace(/^(#+ .*$)/gm, "\n$1\n");
      
      formattedText = formattedText.replace(/\n{3,}/g, "\n\n");
      
      formattedText = formattedText.trim();
      
      const exerciseData: Exercise = {
        content: formattedText
      };
      
      await saveExercise(exerciseData);
      toast.success("Exercises saved successfully!");
      
      setExercises(formattedText);
    } catch (error) {
      console.error("Failed to save exercises:", error);
      toast.error("Failed to save exercises. Please try again.");
    };
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all exercises?")) {
      setExercises("");
    };
  };

  const handleAutoFormat = () => {
    let formattedText = exercises;
    
    formattedText = formattedText.replace(/^# (.*$)/gm, "## $1");
    formattedText = formattedText.replace(/^## (.*$)/gm, "### $1");
    
    formattedText = formattedText.replace(/^[*-] (.*)$/gm, "• $1");
    
    formattedText = formattedText.replace(/^(\d+)\. (.*)$/gm, "$1. $2");
    
    formattedText = formattedText.replace(/^(#+ .*$)/gm, "\n$1\n");
    
    formattedText = formattedText.replace(/\n{3,}/g, "\n\n");
    
    formattedText = formattedText.trim();
    
    setExercises(formattedText);
  };

  const insertHeader = () => {
    const textarea = document.getElementById("exercises-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = exercises.substring(start, end);
    
    const newText = selectedText ? `# ${selectedText}` : "# New Header";
    const newExercises = exercises.substring(0, start) + newText + exercises.substring(end);
    
    setExercises(newExercises);
    
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + newText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

  const insertBulletList = () => {
    const textarea = document.getElementById("exercises-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = exercises.substring(start, end);
    
    let newText;
    if (selectedText) {
      newText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
    } else {
      newText = "- ";
    }
    
    const newExercises = exercises.substring(0, start) + newText + exercises.substring(end);
    setExercises(newExercises);
    
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + newText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

  const insertNumberedList = () => {
    const textarea = document.getElementById("exercises-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = exercises.substring(start, end);
    
    let newText;
    if (selectedText) {
      const lines = selectedText.split('\n');
      newText = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    } else {
      newText = "1. ";
    }
    
    const newExercises = exercises.substring(0, start) + newText + exercises.substring(end);
    setExercises(newExercises);
    
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + newText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

  const insertHorizontalRule = () => {
    const textarea = document.getElementById("exercises-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newExercises = exercises.substring(0, start) + "\n---\n" + exercises.substring(end);
    setExercises(newExercises);
    
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + 5; 
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById("exercises-textarea") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newExercises = exercises.substring(0, start) + emoji + exercises.substring(end);
    setExercises(newExercises);
    
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + emoji.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  };

  const commonEmojis = [
    '💪', '🏃', '🏋️', '🧘', '🚴', '🏊', '⚽', '🏀', '🎾', '⛳',
    '🔥', '⭐', '✅', '🎯', '🏆', '🏅', '🥇', '🥈', '🥉', '🎖️',
    '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🔟'
  ];

  const renderPreview = () => {
    const lines = exercises.split('\n');
    
    return (
      <div className="prose prose-sm max-w-none bg-background p-4 rounded-lg border min-h-[300px]">
        {lines.map((line, index) => {
          if (line.trimStart().startsWith('# ')) {
            return <h1 key={index} className="text-xl font-bold mt-4 mb-2">{line.trimStart().substring(2).trim()}</h1>;
          } else if (line.trimStart().startsWith('## ')) {
            return <h2 key={index} className="text-lg font-bold mt-3 mb-2">{line.trimStart().substring(3).trim()}</h2>;
          } else if (line.trimStart().startsWith('### ')) {
            return <h3 key={index} className="font-bold mt-2 mb-1">{line.trimStart().substring(4).trim()}</h3>;
          }
          
          if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ')) {
            return <li key={index} className="ml-6 list-disc">{line.trimStart().substring(2).trim()}</li>;
          } else if (/^\s*\d+\./.test(line)) {
            const content = line.trimStart().replace(/^\d+\.\s*/, '');
            return <li key={index} className="ml-6 list-decimal">{content}</li>;
          }
          
          if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
            return <hr key={index} className="my-4 border-t" />;
          }
          
          if (line.trim() !== '') {
            return <p key={index} className="mb-2">{line}</p>;
          }
          
          return <br key={index} />;
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur overflow-hidden">
        <CardContent className="p-6 flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading exercise data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
          <div className="p-2 bg-muted rounded-lg">
            <FileText className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex items-center justify-between w-full">
            <span>Daily Exercise Board</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2"
            >
              {previewMode ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {!previewMode && (
            <>
              <div className="text-sm text-muted-foreground">
                Paste your daily exercises here:
              </div>
              
              {}
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-lg">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={insertHeader}
                  title="Insert Header"
                  className="flex items-center gap-1"
                >
                  <Heading1 className="w-4 h-4" />
                  <span className="hidden sm:inline">Header</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={insertBulletList}
                  title="Insert Bullet List"
                  className="flex items-center gap-1"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Bullet List</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={insertNumberedList}
                  title="Insert Numbered List"
                  className="flex items-center gap-1"
                >
                  <ListOrdered className="w-4 h-4" />
                  <span className="hidden sm:inline">Numbered List</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={insertHorizontalRule}
                  title="Insert Separator"
                  className="flex items-center gap-1"
                >
                  <Minus className="w-4 h-4" />
                  <span className="hidden sm:inline">Separator</span>
                </Button>
                
                {}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Insert Emoji"
                      className="flex items-center gap-1 ml-auto"
                    >
                      <Smile className="w-4 h-4" />
                      <span className="hidden sm:inline">Emoji</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="end">
                    <div className="grid grid-cols-6 gap-2">
                      {commonEmojis.map((emoji, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="text-lg h-8 w-8 p-0 rounded-full transition-all duration-200 transform hover:scale-110 shadow-sm hover:shadow-md"
                          onClick={() => insertEmoji(emoji)}
                          style={{
                            background: `hsl(${(index * 12) % 360}, 70%, 90%)`,
                          }}
                        >
                          <span className="transition-transform duration-200 hover:scale-125">
                            {emoji}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
          
          {previewMode ? (
            renderPreview()
          ) : (
            <Textarea
              id="exercises-textarea"
              value={exercises}
              onChange={(e) => setExercises(e.target.value)}
              placeholder="Example:
- 10 push-ups 💪
- 15 minutes running 🏃
- 30 seconds plank 🧘
- 10 minutes stretching

# Header Example
## Subheader Example
1. Numbered item
2. Another numbered item
---
Separator example"
              className="min-h-[300px] resize-none"
            />
          )}
          
          {!previewMode && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button onClick={handleAutoFormat} className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Auto Format
              </Button>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Exercises
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseBoard;