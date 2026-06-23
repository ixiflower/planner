import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
}

const commonEmojis = [
  "😀", "😂", "😍", "🥰", "😎", "🤩", "🥳", "😭", "😡", "🤯",
  "🥶", "😱", "👻", "👾", "🤖", "👋", "👍", "👏", "🙌", "💪",
  "👀", "🧠", "💼", "💻", "🖥️", "📱", "⌨️", "🖱️", "🔗", "📅",
  "✅", "❌", "❓", "❗", "❤️", "💙", "💚", "💛", "💜", "🧡"
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="h-10 w-10"
          aria-label="Select emoji"
        >
          {value ? (
            <span className="text-lg">{value}</span>
          ) : (
            <Smile className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-3" 
        align="start"
        sideOffset={8}
      >
        <div className="grid grid-cols-8 gap-2">
          {commonEmojis.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-lg hover:bg-muted"
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </Button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange("")}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const customEmoji = prompt("Enter emoji:");
              if (customEmoji) {
                onChange(customEmoji);
                setOpen(false);
              }
            }}
          >
            Custom
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;