import * as React from "react";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/config/backend";
import type { CalendarEvent } from "./types";

const API_URL = API_BASE_URL;

interface Props {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  token?: string;
}

const Checklist: React.FC<Props> = ({ token }) => {
  const [checklistItems, setChecklistItems] = React.useState<Array<{id: number; text: string; completed: boolean}>>([]);
  const [newItemText, setNewItemText] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchChecklistItems = async () => {
      console.log("Fetching checklist items with token:", token);
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = token;
          console.log("Setting Authorization header:", headers["Authorization"]);
        } else {
          console.log("No token provided");
        }

        const response = await fetch(`${API_URL}/checklist/`, {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Response not ok:", response.status, response.statusText);
          const errorData = await response.text();
          console.error("Error response:", errorData);
          throw new Error("Failed to fetch checklist items");
        }

        const data = await response.json();
        setChecklistItems(data.checklist_items || []);
      } catch (error) {
        console.error("Error fetching checklist items:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchChecklistItems();
    } else {
      setLoading(false);
    }
  }, [token]);

  const addChecklistItem = async () => {
    if (newItemText.trim() !== "") {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = token;
        }
        
        const response = await fetch(`${API_URL}/checklist/`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            text: newItemText,
            completed: false
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checklist item");
        }

        const newItem = await response.json();
        setChecklistItems([...checklistItems, newItem]);
        setNewItemText("");
      } catch (error) {
        console.error("Error creating checklist item:", error);
      }
    }
  };

  const toggleChecklistItem = async (id: number) => {
    try {
      const item = checklistItems.find(item => item.id === id);
      if (!item) return;
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = token;
      }
      
      const response = await fetch(`${API_URL}/checklist/${id}/`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          ...item,
          completed: !item.completed
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update checklist item");
      }

      const updatedItem = await response.json();
      setChecklistItems(checklistItems.map(item => 
        item.id === id ? updatedItem : item
      ));
    } catch (error) {
      console.error("Error updating checklist item:", error);
    }
  };

  const deleteChecklistItem = async (id: number) => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (token) {
        headers["Authorization"] = token;
      }
      
      const response = await fetch(`${API_URL}/checklist/${id}/`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete checklist item");
      }

      setChecklistItems(checklistItems.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addChecklistItem();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new item"
          className="w-full"
        />
        <Button onClick={addChecklistItem}>Add</Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {checklistItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggleChecklistItem(item.id)}
              />
              <span className={item.completed ? "line-through" : ""}>{item.text}</span>
              <Button variant="ghost" onClick={() => deleteChecklistItem(item.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Checklist;