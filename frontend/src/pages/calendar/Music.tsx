import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, Music as MusicIcon, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Music = () => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTrack, setCurrentTrack] = React.useState(0);
  const [isAddSongOpen, setIsAddSongOpen] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  
  const tracks = [
    { id: 1, title: "Relaxing Piano", artist: "Ambient Sounds", duration: "3:45" },
    { id: 2, title: "Nature Sounds", artist: "Forest Collection", duration: "5:20" },
    { id: 3, title: "Ocean Waves", artist: "Beach Vibes", duration: "4:15" },
    { id: 4, title: "Rainy Day", artist: "Weather Collection", duration: "6:30" },
    { id: 5, title: "Focus Flow", artist: "Productivity Mix", duration: "4:50" },
  ];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    console.log("Files dropped:", e.dataTransfer.files);
    toast.success(`${e.dataTransfer.files.length} file(s) would be added to your playlist`);
    setIsAddSongOpen(false);
  };

  return (
    <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-6">
        <CardTitle className="flex items-center justify-between gap-3 text-xl font-bold text-foreground">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <MusicIcon className="w-5 h-5 text-purple-500" />
            </div>
            Music & Sounds
          </div>
          <Dialog open={isAddSongOpen} onOpenChange={setIsAddSongOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 bg-white">
                <Plus className="h-4 w-4 text-black" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Songs</DialogTitle>
              </DialogHeader>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver 
                    ? "border-purple-500 bg-purple-500/10" 
                    : "border-muted-foreground/25 hover:border-purple-500/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <MusicIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4">
                  <h3 className="text-lg font-medium">Drag and drop songs here</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    or click to browse your files
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="audio/*" 
                  multiple 
                />
                <Button 
                  variant="secondary" 
                  className="mt-4"
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLElement)?.click?.()}
                >
                  Select Files
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-4 rounded-full">
              <div className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 p-6 rounded-full">
                <MusicIcon className="w-12 h-12 text-purple-500" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg">{tracks[currentTrack].title}</h3>
              <p className="text-muted-foreground">{tracks[currentTrack].artist}</p>
            </div>
            
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>1:30</span>
                <span>{tracks[currentTrack].duration}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-1/3"></div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="icon" onClick={prevTrack}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button 
                className="rounded-full h-12 w-12 bg-purple-500 hover:bg-purple-600" 
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={nextTrack}>
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {}
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-2/3"></div>
            </div>
          </div>
          
          {}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Playlist</h4>
            <div className="space-y-1">
              {tracks.map((track, index) => (
                <div 
                  key={track.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    index === currentTrack 
                      ? "bg-purple-500/20" 
                      : "hover:bg-muted/50"
                  } group`}
                  onClick={() => setCurrentTrack(index)}
                >
                  <div className="flex items-center gap-3">
                    {index === currentTrack && isPlaying ? (
                      <div className="h-3 w-3 flex items-center justify-center">
                        <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="h-3 w-3 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full"></div>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{track.title}</p>
                      <p className="text-xs text-muted-foreground">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{track.duration}</span>
                    {}
                    <button 
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info(`Would delete song: ${track.title}`);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" x2="10" y1="11" y2="17"/>
                        <line x1="14" x2="14" y1="11" y2="17"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Music;