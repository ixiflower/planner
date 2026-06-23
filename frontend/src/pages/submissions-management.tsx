import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, Calendar, Star, User, FileText } from "lucide-react";
import { BACKEND_URL } from "@/config/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Submission {
  id: number;
  userId: string;
  username: string;
  date: string;
  report: string;
  rating: number | null;
  status: string;
  created_at: string;
  updated_at?: string;
}

export default function SubmissionsManagement() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(
    new Set()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem("token") || "";
  };

  // Fetch submissions for a specific date
  const fetchSubmissions = async (date?: string) => {
    setLoading(true);
    try {
      const dateParam = date || selectedDate;
      const url = `${BACKEND_URL}/tickets/api/submissions/?date=${dateParam}`;
      const token = getToken();

      const response = await fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }

      const data = await response.json();
      const submissionsData = Array.isArray(data?.submissions)
        ? data.submissions
        : [];
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Error fetching submissions. Please check your authentication.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a submission
  const deleteSubmission = async (id: number) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${BACKEND_URL}/tickets/api/submissions/${id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete submission");
      }

      return true;
    } catch (error) {
      console.error("Error deleting submission:", error);
      return false;
    }
  };

  // Delete selected submissions
  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedSubmissions);
    let successCount = 0;

    for (const id of idsToDelete) {
      const success = await deleteSubmission(id);
      if (success) {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} submission(s)`);
      setSelectedSubmissions(new Set());
      fetchSubmissions();
    } else {
      toast.error("Failed to delete submissions");
    }

    setDeleteDialogOpen(false);
  };

  // Toggle submission selection
  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedSubmissions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSubmissions(newSelection);
  };

  // Select all submissions
  const selectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map((s) => s.id)));
    }
  };

  // Update submission rating/status
  const updateSubmission = async (
    id: number,
    updates: { rating?: number; status?: string }
  ) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${BACKEND_URL}/tickets/api/submissions/${id}/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update submission");
      }

      fetchSubmissions();
      return true;
    } catch (error) {
      console.error("Error updating submission:", error);
      toast.error("Failed to update submission");
      return false;
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (filterStatus !== "all" && sub.status !== filterStatus) return false;
    if (filterRating !== "all") {
      if (filterRating === "none" && sub.rating !== null) return false;
      if (filterRating !== "none" && sub.rating !== parseInt(filterRating))
        return false;
    }
    return true;
  });

  // Load submissions on mount
  useEffect(() => {
    fetchSubmissions();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Submissions Management
          </CardTitle>
          <CardDescription>
            View and manage user submissions from the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters and Controls */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="date-select">Select Date</Label>
              <div className="flex gap-2">
                <Input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => fetchSubmissions()}
                  disabled={loading}
                  size="icon"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            <div className="min-w-[150px]">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label htmlFor="rating-filter">Rating</Label>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger id="rating-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="none">No Rating</SelectItem>
                  <SelectItem value="1">⭐ 1</SelectItem>
                  <SelectItem value="2">⭐ 2</SelectItem>
                  <SelectItem value="3">⭐ 3</SelectItem>
                  <SelectItem value="4">⭐ 4</SelectItem>
                  <SelectItem value="5">⭐ 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selection Controls */}
          {filteredSubmissions.length > 0 && (
            <div className="flex justify-between items-center border-b pb-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    filteredSubmissions.length > 0 &&
                    selectedSubmissions.size === filteredSubmissions.length
                  }
                  onCheckedChange={selectAll}
                  id="select-all-checkbox"
                />
                <label
                  htmlFor="select-all-checkbox"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All ({selectedSubmissions.size} of{" "}
                  {filteredSubmissions.length} selected)
                </label>
              </div>

              <Button
                onClick={() => setDeleteDialogOpen(true)}
                disabled={selectedSubmissions.size === 0}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedSubmissions.size})
              </Button>
            </div>
          )}

          {/* Submissions List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Loading submissions...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No submissions found</p>
              <p className="text-sm">
                Try selecting a different date or adjusting filters
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] border rounded-lg">
              <div className="p-4 space-y-3">
                {filteredSubmissions.map((submission) => (
                  <Card
                    key={submission.id}
                    className={`transition-all ${
                      selectedSubmissions.has(submission.id)
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedSubmissions.has(submission.id)}
                            onCheckedChange={() => toggleSelection(submission.id)}
                            id={`sub-${submission.id}`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">
                                  #{submission.id}
                                </span>
                                <Badge
                                  variant={
                                    submission.status === "approved"
                                      ? "default"
                                      : submission.status === "declined"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {submission.status}
                                </Badge>
                                {submission.rating && (
                                  <Badge variant="outline" className="gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    {submission.rating}/5
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span className="font-medium">
                                  {submission.username}
                                </span>
                                <span>•</span>
                                <Calendar className="w-4 h-4" />
                                <span>{submission.date}</span>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                              <Select
                                value={submission.status}
                                onValueChange={(value) =>
                                  updateSubmission(submission.id, {
                                    status: value,
                                  })
                                }
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">
                                    Approved
                                  </SelectItem>
                                  <SelectItem value="declined">
                                    Declined
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={submission.rating?.toString() || "none"}
                                onValueChange={(value) =>
                                  updateSubmission(submission.id, {
                                    rating:
                                      value === "none" ? undefined : parseInt(value),
                                  })
                                }
                              >
                                <SelectTrigger className="w-[100px] h-8">
                                  <SelectValue placeholder="Rate" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Rating</SelectItem>
                                  <SelectItem value="1">⭐ 1</SelectItem>
                                  <SelectItem value="2">⭐ 2</SelectItem>
                                  <SelectItem value="3">⭐ 3</SelectItem>
                                  <SelectItem value="4">⭐ 4</SelectItem>
                                  <SelectItem value="5">⭐ 5</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Report Content */}
                          <div className="bg-muted/50 rounded-md p-3">
                            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                              Report
                            </p>
                            <p className="text-sm whitespace-pre-wrap">
                              {submission.report || "No report provided"}
                            </p>
                          </div>

                          {/* Timestamps */}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>
                              Created:{" "}
                              {new Date(submission.created_at).toLocaleString()}
                            </span>
                            {submission.updated_at && (
                              <span>
                                Updated:{" "}
                                {new Date(submission.updated_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Stats */}
          {filteredSubmissions.length > 0 && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{filteredSubmissions.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      filteredSubmissions.filter((s) => s.status === "approved")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {
                      filteredSubmissions.filter((s) => s.status === "pending")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      filteredSubmissions.filter((s) => s.status === "declined")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Declined</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedSubmissions.size} submission
              {selectedSubmissions.size !== 1 ? "s" : ""}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
