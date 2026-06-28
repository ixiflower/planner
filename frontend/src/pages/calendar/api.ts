import { API_BASE_URL } from "@/config/backend";
import type { CalendarEvent } from "./types";
import type { PermanentNote, DailyGoal, EventTemplate } from "./types";

const API_URL = API_BASE_URL;

const getStoredAuthToken = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    const fromLocal = localStorage.getItem('authToken');
    if (fromLocal) {
      const token = fromLocal.startsWith('Bearer ') ? fromLocal : `Bearer ${fromLocal}`;
      console.debug('Using token from localStorage:', token);
      return token;
    }

    const match = document.cookie.match(new RegExp('(^| )authToken=([^;]+)'));
    if (match) {
      const token = decodeURIComponent(match[2]);
      const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      console.debug('Using token from cookie:', finalToken);
      return finalToken;
    }
    
    console.debug('No auth token found');
    return null;
  } catch (e) {
    console.error('Error getting stored auth token:', e);
    return null;
  }
};

const buildHeaders = (token?: string, extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };

  const resolvedToken = token || getStoredAuthToken();
  if (resolvedToken) {
    headers["Authorization"] = resolvedToken.startsWith('Bearer ') ? resolvedToken : `Bearer ${resolvedToken}`;
    console.debug('Authorization header set:', headers["Authorization"]);
  } else {
    console.warn('No authorization token available');
  }

  return headers;
};

export const fetchTasks = async (token?: string): Promise<CalendarEvent[]> => {
  try {
    const headers = buildHeaders(token);

    const response = await fetch(`${API_URL}/tasks/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

export const createTask = async (task: Omit<CalendarEvent, "id">, token?: string): Promise<CalendarEvent | null> => {
  try {
    console.log("Creating task with data:", task);
    console.log("Task startDate value:", task.startDate, "type:", typeof task.startDate);
    console.log("Task endDate value:", task.endDate, "type:", typeof task.endDate);
    
    // Validate required fields
    if (!task.startDate || !task.endDate) {
      console.error("Missing required date fields:", { startDate: task.startDate, endDate: task.endDate });
      throw new Error("startDate and endDate are required");
    }
    
    // Map frontend field names to backend field names
    const taskPayload = {
      title: task.title || '',
      description: task.description || '',
      start_date: task.startDate,  // Map startDate to start_date
      end_date: task.endDate,      // Map endDate to end_date
      color: task.color || 'blue',
      is_important: Boolean(task.isImportant),  // Map isImportant to is_important
      category: task.category || 'general',
    };

    console.log("Task payload being sent to backend:", taskPayload);
    console.log("Task payload as JSON:", JSON.stringify(taskPayload, null, 2));

    const headers = buildHeaders(token);
    try {
      const resolved = token || (typeof window !== 'undefined' ? (localStorage.getItem('authToken') || null) : null);
      console.debug('createTask - resolved token from param/localStorage:', resolved);
    } catch (e) {
      console.debug('createTask - error reading token for debug:', e);
    }
    console.debug('createTask - headers to send:', headers, 'API URL:', `${API_URL}/tasks/`);
    const response = await fetch(`${API_URL}/tasks/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(taskPayload),
    });

    console.log("Create task response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Create task failed:", errorText);
      throw new Error(`Failed to create task: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Create task result:", result);
    return result;
  } catch (error) {
    console.error("Error creating task:", error);
    return null;
  }
};

export const updateTask = async (task: CalendarEvent, token?: string): Promise<CalendarEvent | null> => {
  try {
    if (!task.id) {
      console.error("Task ID is missing");
      return null;
    }
    
    // Map frontend field names to backend field names
    const taskPayload = {
      title: task.title,
      description: task.description,
      start_date: task.startDate,  // Map startDate to start_date
      end_date: task.endDate,      // Map endDate to end_date
      color: task.color,
      is_important: Boolean(task.isImportant),  // Map isImportant to is_important
      category: task.category || 'general',
    };

    const headers = buildHeaders(token);
    const response = await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(taskPayload),
    });

    if (!response.ok) {
      throw new Error("Failed to update task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
};

export const deleteTask = async (taskId: string, token?: string): Promise<boolean> => {
  try {
    const headers = buildHeaders(token);
    const response = await fetch(`${API_URL}/tasks/${taskId}/`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

export const fetchAllEvents = async (token?: string): Promise<CalendarEvent[]> => {
  try {
    const headers = buildHeaders(token);
    const response = await fetch(`${API_URL}/tasks/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data = await response.json();
    console.log("Fetched events:", data);
    
    if (data && data.tasks && Array.isArray(data.tasks)) {
      return data.tasks;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.error("Unexpected data format:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

export const fetchPermanentNotes = async (token?: string): Promise<PermanentNote[]> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/notes/`, { headers, credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch notes");
  const data = await response.json();
  return data.notes || [];
};

export const createPermanentNote = async (note: Omit<PermanentNote, "id" | "created_at" | "updated_at">, token?: string): Promise<PermanentNote> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/notes/`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(note),
  });
  if (!response.ok) throw new Error("Failed to create note");
  return response.json();
};

export const updatePermanentNote = async (note: PermanentNote, token?: string): Promise<PermanentNote> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/notes/${note.id}/`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(note),
  });
  if (!response.ok) throw new Error("Failed to update note");
  return response.json();
};

export const deletePermanentNote = async (noteId: number, token?: string): Promise<boolean> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/notes/${noteId}/`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return response.ok;
};

export const fetchDailyGoals = async (token?: string): Promise<DailyGoal[]> => {
  try {
    const headers = buildHeaders(token);
    const response = await fetch(`${API_URL}/daily-goals/`, { headers, credentials: "include" });
    if (!response.ok) {
      console.warn("Failed to fetch daily goals:", response.status);
      return []; // Return empty array instead of throwing
    }
    return response.json();
  } catch (error) {
    console.warn("Error fetching daily goals:", error);
    return []; // Return empty array on error
  }
};

export const createDailyGoal = async (goal: Omit<DailyGoal, "id">, token?: string): Promise<DailyGoal> => {
  const headers = buildHeaders(token);
  try {
    const resolved = token || (typeof window !== 'undefined' ? (localStorage.getItem('authToken') || null) : null);
    console.debug('createDailyGoal - resolved token from param/localStorage:', resolved);
  } catch (e) {
    console.debug('createDailyGoal - error reading token for debug:', e);
  }
  console.debug('createDailyGoal - headers to send:', headers, 'API URL:', `${API_URL}/daily-goals/`);
  const response = await fetch(`${API_URL}/daily-goals/`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(goal),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to create daily goal. Status:", response.status, "Response:", errorText);
    throw new Error(`Failed to create daily goal: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
};

export const updateDailyGoal = async (goal: DailyGoal, token?: string): Promise<DailyGoal> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/daily-goals/${goal.id}/`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(goal),
  });
  if (!response.ok) throw new Error("Failed to update daily goal");
  return response.json();
};

export const deleteDailyGoal = async (goalId: number, token?: string): Promise<boolean> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/daily-goals/${goalId}/`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return response.ok;
};

export const fetchEventTemplates = async (token?: string): Promise<EventTemplate[]> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/event-templates/`, { headers, credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch event templates");
  return response.json();
};

export const createEventTemplate = async (template: Omit<EventTemplate, "id">, token?: string): Promise<EventTemplate> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/event-templates/`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error("Failed to create event template");
  return response.json();
};

export const updateEventTemplate = async (template: EventTemplate, token?: string): Promise<EventTemplate> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/event-templates/${template.id}/`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify({ name: template.name, title: template.title, color: template.color, category: template.category }),
  });
  if (!response.ok) throw new Error("Failed to update event template");
  return response.json();
};

export const deleteEventTemplate = async (templateId: number, token?: string): Promise<boolean> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/event-templates/${templateId}/`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return response.ok;
};

export interface Exercise {
  id?: number;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export const fetchExercise = async (token?: string): Promise<Exercise | null> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/exercise/`, { 
    headers, 
    credentials: "include" 
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    
    try {
      const errorData = await response.json();
      if (errorData && errorData.exercise === null) {
        return null;
      }
    } catch (e) {
    }
    
    throw new Error(`Failed to fetch exercise data: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.exercise;
};

export const saveExercise = async (exercise: Exercise, token?: string): Promise<Exercise> => {
  const headers = buildHeaders(token);
  const response = await fetch(`${API_URL}/exercise/`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ content: exercise.content }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save exercise: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
};
