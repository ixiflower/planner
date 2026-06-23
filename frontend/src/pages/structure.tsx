import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { ImperativePanelHandle } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PlusCircle, Type, Box, ArrowRightCircle, Settings, Trash2, Maximize, Minimize, Menu, Layout, Plus, Minus, Lock, Unlock, Search, X, Share2, Users, Palette, Pencil, PenTool, MousePointer2, Group } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
interface Board {
  id: string;
  name: string;
  is_owner: boolean;
}
type Point = { x: number; y: number };
export type Node = {
  id: string;
  type: string;
  position: Point;
  width?: number;
  height?: number;
  data: any;
  style?: any;
};
export type Edge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: any;
};
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];
let id = 0;
const getId = () => `dndnode_${id++}`;

// Removed legacy DrawNode component from React Flow implementation

// nodeTypes removed in canvas implementation

type BoardCanvasProps = {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  tool: 'cursor' | 'pen' | 'text';
  view: { tx:number; ty:number; scale:number };
  setView: React.Dispatch<React.SetStateAction<{ tx:number; ty:number; scale:number }>>;
  locked: boolean;
  onNodeClick: (node: Node) => void;
  onEdgeClick: (edge: Edge) => void;
  onPaneClick: () => void;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  onSelectionChange: (nodes: Node[]) => void;
};

const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 130;

const BoardCanvas: React.FC<BoardCanvasProps> = ({ nodes, setNodes, edges, setEdges, tool, view, setView, locked, onNodeClick, onEdgeClick, onPaneClick, selectedNodeIds, selectedEdgeIds, onSelectionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{w:number; h:number}>({ w: 0, h: 0 });
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [hoverSide, setHoverSide] = useState<'left'|'right'|'top'|'bottom'|null>(null);
  const draggingRef = useRef<{ nodes: { id: string; offset: {x:number;y:number} }[] } | null>(null);
  const lastPointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const panningRef = useRef<{ start:{x:number;y:number}; orig:{tx:number;ty:number} } | null>(null);
  const resizingRef = useRef<{ nodeId:string; edge:'corner'; start:{x:number;y:number}; orig:{w:number;h:number} } | null>(null);
  const drawingRef = useRef<{ nodeId: string; path: {x:number;y:number}[] } | null>(null);
  const connectingRef = useRef<{ sourceId: string; current: {x:number;y:number} } | null>(null);
  const selectingRef = useRef<{ start: {x:number;y:number}; current: {x:number;y:number} } | null>(null);
  const spacePressed = useRef(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { 
      if (e.key === ' ' || e.code === 'Space') {
        spacePressed.current = true;
        setIsSpacePressed(true);
      }
    };
    const up = (e: KeyboardEvent) => { 
      if (e.key === ' ' || e.code === 'Space') {
        spacePressed.current = false;
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    }
  }, []);

  const getNodeRect = (n: Node) => ({
    x: n.position.x,
    y: n.position.y,
    w: n.width || DEFAULT_NODE_W,
    h: n.height || DEFAULT_NODE_H
  });

  const getConnectionPoint = (n: Node, toward: Point) => {
    const r = getNodeRect(n);
    const center = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? { x: r.x + r.w, y: center.y } : { x: r.x, y: center.y };
    }
    return dy > 0 ? { x: center.x, y: r.y + r.h } : { x: center.x, y: r.y };
  };

  const invView = (p:{x:number;y:number}) => ({ x: (p.x - view.tx) / view.scale, y: (p.y - view.ty) / view.scale });

  const hitNode = (x: number, y: number): Node | null => {
    // Check non-group nodes first (render order: top)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.type === 'group') continue;
      const r = getNodeRect(n);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return n;
    }
    // Then check groups (render order: bottom)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.type !== 'group') continue;
      const r = getNodeRect(n);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return n;
    }
    return null;
  };

  const getSideHover = (n: Node, wx: number, wy: number) => {
    const r = getNodeRect(n);
    const margin = 16 / Math.max(1, view.scale);
    const within = wx >= r.x - margin && wx <= r.x + r.w + margin && wy >= r.y - margin && wy <= r.y + r.h + margin;
    if (!within) return null;
    const distances = {
      left: Math.abs(wx - r.x),
      right: Math.abs(wx - (r.x + r.w)),
      top: Math.abs(wy - r.y),
      bottom: Math.abs(wy - (r.y + r.h))
    } as const;
    const minSide = (Object.keys(distances) as Array<keyof typeof distances>).reduce((prev, key) =>
      distances[key] < distances[prev] ? key : prev
    , 'left');
    if (distances[minSide] > margin) return null;
    return minSide;
  };

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid background
    ctx.save();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground') || '#e5e7eb';
    const gap = 24 * view.scale; const sizeDot = 1.2;
    for (let y=view.ty % gap; y<canvas.height; y+=gap) {
      for (let x=view.tx % gap; x<canvas.width; x+=gap) {
        ctx.fillRect(x, y, sizeDot, sizeDot);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);

    // edges
    ctx.save();
    for (const e of edges) {
      const source = nodes.find(n => n.id === e.source);
      const target = nodes.find(n => n.id === e.target);
      if (!source || !target) continue;
      const isSelected = selectedEdgeIds.includes(e.id);
      const start = getConnectionPoint(source, target.position);
      const end = getConnectionPoint(target, source.position);
      
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      const midX = (start.x + end.x) / 2;
      ctx.bezierCurveTo(midX, start.y, midX, end.y, end.x, end.y);
      
      const strokeColor = e.style?.stroke || '#1f2937';
      const strokeWidth = (e.style?.strokeWidth || 2) * (isSelected ? 1.5 : 1);
      
      ctx.strokeStyle = isSelected ? '#3b82f6' : strokeColor;
      ctx.lineWidth = strokeWidth;
      
      if (e.animated) {
          ctx.setLineDash([5, 5]);
          // Animate line dash offset
          const offset = (Date.now() / 20) % 10;
          ctx.lineDashOffset = -offset;
      } else {
          ctx.setLineDash([]);
      }
      
      // Shadow for selection
      if (isSelected) {
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 8;
      } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
      }
      
      ctx.stroke();
      
      // Reset context for next edge
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
    }
    
    // Draw connecting line
    if (connectingRef.current) {
      const source = nodes.find(n => n.id === connectingRef.current!.sourceId);
      if (source) {
        const end = connectingRef.current.current;
        const start = getConnectionPoint(source, end);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        const midX = (start.x + end.x) / 2;
        ctx.bezierCurveTo(midX, start.y, midX, end.y, end.x, end.y);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();

    // Draw nodes: groups first (background), then others
    const sortedNodes = [...nodes].sort((a, b) => {
        if (a.type === 'group' && b.type !== 'group') return -1;
        if (a.type !== 'group' && b.type === 'group') return 1;
        return 0;
    });

    for (const n of sortedNodes) {
      const isSelected = selectedNodeIds.includes(n.id);
      const r = getNodeRect(n);
      const color = n.data?.color || n.style?.backgroundColor || '#3b82f6';

      if (n.type === 'group') {
          // Group Node Rendering
          const headerH = 32;
          ctx.save();
          // Header
          ctx.beginPath();
          ctx.roundRect(r.x, r.y, r.w, headerH, [8, 8, 0, 0]);
          ctx.fillStyle = color;
          ctx.fill();
          
          // Body
          ctx.beginPath();
          ctx.roundRect(r.x, r.y + headerH, r.w, r.h - headerH, [0, 0, 8, 8]);
          ctx.fillStyle = color + '10'; // very transparent
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          
          // Selection glow
          if (isSelected) {
              ctx.shadowColor = '#2563eb';
              ctx.shadowBlur = 10;
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 3;
              ctx.strokeRect(r.x, r.y, r.w, r.h);
              ctx.shadowBlur = 0;
          }
          ctx.restore();

          // Label
          const label = n.data?.label || 'Group';
          ctx.save();
          ctx.fillStyle = '#fff'; // White text on colored header
          ctx.font = 'bold 14px ui-sans-serif, system-ui, -apple-system';
          ctx.textBaseline = 'middle';
          const textWidth = ctx.measureText(label).width;
          ctx.fillText(label, r.x + (r.w - textWidth) / 2, r.y + headerH / 2);
          ctx.restore();

          // Resize handle (corner)
          if (isSelected) {
            ctx.save();
            const handleSize = 8 / Math.max(1, view.scale);
            ctx.fillStyle = '#111827';
            ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize);
            ctx.restore();
          }
          continue; // Skip default rendering
      }

      if (n.type === 'text') {
          // Text Node Rendering
          ctx.save();
          if (isSelected) {
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(r.x, r.y, r.w, r.h);
              ctx.setLineDash([]);
          }
          
          const label = n.data?.label || 'Text';
          // Use custom font color if available, otherwise default to dark
          ctx.fillStyle = n.data?.fontColor || '#111827';
          
          // Font based on heading, custom font size, and custom font family
          const heading = n.data?.heading || 'normal';
          const fontFamily = n.data?.fontFamily || 'ui-sans-serif, system-ui, -apple-system';
          const customFontSize = n.data?.fontSize;
          
          let fontSize = customFontSize || 16;
          let fontWeight = '';
          
          // Override with heading sizes if no custom size is set
          if (!customFontSize) {
              if (heading === 'h1') { fontSize = 32; fontWeight = 'bold '; }
              else if (heading === 'h2') { fontSize = 24; fontWeight = 'bold '; }
              else if (heading === 'h3') { fontSize = 20; fontWeight = 'bold '; }
          }
          
          let font = `${fontWeight}${fontSize}px ${fontFamily}`;
          
          ctx.font = font;
          ctx.textBaseline = 'middle';
          ctx.fillText(label, r.x, r.y + r.h / 2); // Left aligned for text nodes usually? Or center? Let's stick to center for now or left? 
          // Text tool usually implies typing. Let's center it in the bounding box for consistency with resize.
          const textWidth = ctx.measureText(label).width;
          ctx.fillText(label, r.x + (r.w - textWidth)/2, r.y + r.h / 2);
          
          ctx.restore();
          
          // Resize handle if selected
          if (isSelected) {
            ctx.save();
            const handleSize = 8 / Math.max(1, view.scale);
            ctx.fillStyle = '#111827';
            ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize);
            ctx.restore();
          }
          continue;
      }

      // block (Regular Node)
      const radius = n.type === 'default' ? 0 : 8;
      ctx.save();
      drawRoundedRect(ctx, r.x, r.y, r.w, r.h, radius);
      ctx.fillStyle = color + '40'; // translucent fill
      ctx.strokeStyle = isSelected ? '#2563eb' : color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.fill();
      ctx.stroke();
      if (isSelected) {
          ctx.shadowColor = '#2563eb';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
      }
      ctx.restore();

      // title
      const label = n.data?.label || `${n.type} node`;
      const heading = n.data?.heading || 'normal';
      ctx.save();
      ctx.fillStyle = '#ffffff'; // white text for better visibility
      let font = 'bold 14px ui-sans-serif, system-ui, -apple-system';
      if (heading === 'h1') font = 'bold 24px ui-sans-serif, system-ui, -apple-system';
      else if (heading === 'h2') font = 'bold 20px ui-sans-serif, system-ui, -apple-system';
      else if (heading === 'h3') font = 'bold 18px ui-sans-serif, system-ui, -apple-system';
      ctx.font = font;
      ctx.textBaseline = 'middle';
      const textWidth = ctx.measureText(label).width;
      ctx.fillText(label, r.x + (r.w - textWidth) / 2, r.y + r.h / 2);
      ctx.restore();

      // resize handle (corner only)
      if (isSelected) {
        ctx.save();
        const handleSize = 8 / Math.max(1, view.scale);
        ctx.fillStyle = '#111827';
        // corner
        ctx.fillRect(r.x + r.w - handleSize/2, r.y + r.h - handleSize/2, handleSize, handleSize);
        ctx.restore();
      }

      if (hoverNodeId === n.id && hoverSide) {
        const dotRadius = 4 / Math.max(1, view.scale);
        ctx.save();
        ctx.fillStyle = '#111827';
        if (hoverSide === 'right') {
          ctx.beginPath();
          ctx.arc(r.x + r.w, r.y + r.h / 2, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (hoverSide === 'left') {
          ctx.beginPath();
          ctx.arc(r.x, r.y + r.h / 2, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (hoverSide === 'top') {
          ctx.beginPath();
          ctx.arc(r.x + r.w / 2, r.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (hoverSide === 'bottom') {
          ctx.beginPath();
          ctx.arc(r.x + r.w / 2, r.y + r.h, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // draw paths (clip to node rect)
      const paths: {x:number;y:number}[][] = n.data?.paths || [];
      if (paths.length) {
        ctx.save();
        drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.clip();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const p of paths) {
          if (p.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(r.x + p[0].x, r.y + p[0].y);
          for (let i=1;i<p.length;i++) ctx.lineTo(r.x + p[i].x, r.y + p[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Selection Box
    if (selectingRef.current) {
        const s = selectingRef.current.start;
        const c = selectingRef.current.current;
        const x = Math.min(s.x, c.x);
        const y = Math.min(s.y, c.y);
        const w = Math.abs(c.x - s.x);
        const h = Math.abs(c.y - s.y);
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / view.scale;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
    ctx.restore();
  }, [nodes, view, edges, hoverNodeId, hoverSide, selectedNodeIds]);

  useEffect(() => {
    const c = canvasRef.current; const wrap = containerRef.current;
    if (!c || !wrap) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      c.width = rect.width; c.height = rect.height; setSize({ w: rect.width, h: rect.height });
      render();
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(wrap);
    return () => obs.disconnect();
  }, [render]);

  useEffect(() => { render(); }, [nodes, render]);

  const getLocalPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const hitHandle = (n: Node, wx:number, wy:number): null | 'corner' => {
    const r = getNodeRect(n);
    const hs = 6 / Math.max(1, view.scale);
    const corner = { x: r.x + r.w - hs/2, y: r.y + r.h - hs/2, w: hs, h: hs };
    const ptIn = (rect:any) => wx >= rect.x && wx <= rect.x+rect.w && wy >= rect.y && wy <= rect.y+rect.h;
    if (ptIn(corner)) return 'corner';
    return null;
  };

  const hitEdge = (x: number, y: number): Edge | null => {
    const threshold = 10 / Math.max(1, view.scale);
    for (let i = edges.length - 1; i >= 0; i--) {
      const e = edges[i];
      const source = nodes.find(n => n.id === e.source);
      const target = nodes.find(n => n.id === e.target);
      if (!source || !target) continue;
      const start = getConnectionPoint(source, target.position);
      const end = getConnectionPoint(target, source.position);
      const midX = (start.x + end.x) / 2;
      
      // Simple sampling along the bezier curve
      for (let t = 0; t <= 1; t += 0.05) {
        const cx = (1-t)*(1-t)*(1-t)*start.x + 3*(1-t)*(1-t)*t*midX + 3*(1-t)*t*t*midX + t*t*t*end.x;
        const cy = (1-t)*(1-t)*(1-t)*start.y + 3*(1-t)*(1-t)*t*start.y + 3*(1-t)*t*t*end.y + t*t*t*end.y;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < threshold) return e;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getLocalPos(e);
    const world = invView({ x, y });
    const hit = hitNode(world.x, world.y);

    // panning with space bar + left click, or middle button (Always allowed)
    if ((e.button === 0 && spacePressed.current) || e.button === 1 || e.buttons === 4) {
      panningRef.current = { start: { x, y }, orig: { tx: view.tx, ty: view.ty } };
      return;
    }

    if (tool === 'pen') {
      if (locked) return;
      if (!hit) return; // draw only inside node
      const r = getNodeRect(hit);
      const local = { x: world.x - r.x, y: world.y - r.y };
      drawingRef.current = { nodeId: hit.id, path: [local] };
      return;
    }

    if (tool === 'text' && !hit) {
        if (locked) return;
        const newNode: Node = {
            id: getId(),
            type: 'text',
            position: { x: world.x, y: world.y },
            width: 100,
            height: 40,
            data: { label: 'Text', color: 'transparent' },
            style: { background: 'transparent', border: 'none' }
        };
        setNodes(prev => prev.concat(newNode));
        onNodeClick(newNode); // Select it immediately
        return;
    }

    // cursor mode: start resizing if handle hit, otherwise start dragging
    if (hit) {
      // Check handles first
      const h = hitHandle(hit, world.x, world.y);
      if (h && !locked) {
        const r = getNodeRect(hit);
        resizingRef.current = { nodeId: hit.id, edge: h, start: { x: world.x, y: world.y }, orig: { w: r.w, h: r.h } };
      } else {
        onNodeClick(hit);
        
        if (!locked) {
            const side = getSideHover(hit, world.x, world.y);
            if (side && (e as any).button === 0) {
              const connectionPoint = getConnectionPoint(hit, {
                x: world.x + (side === 'right' ? 1 : side === 'left' ? -1 : 0),
                y: world.y + (side === 'bottom' ? 1 : side === 'top' ? -1 : 0)
              });
              connectingRef.current = { sourceId: hit.id, current: connectionPoint };
            } else {
                 const movingNodes = [{ id: hit.id, offset: { x: world.x - hit.position.x, y: world.y - hit.position.y } }];
                 // If hitting a group, also move contained nodes
                 if (hit.type === 'group') {
                     const r = getNodeRect(hit);
                     // Find contained nodes
                     for (const n of nodes) {
                         if (n.id === hit.id) continue;
                         const nr = getNodeRect(n);
                         // Check strictly inside (or mostly inside?) - let's do overlapping center for easier UX or full containment
                         // Full containment:
                         if (nr.x >= r.x && nr.y >= r.y && nr.x + nr.w <= r.x + r.w && nr.y + nr.h <= r.y + r.h) {
                             movingNodes.push({ id: n.id, offset: { x: world.x - n.position.x, y: world.y - n.position.y } });
                         }
                     }
                 }
                 draggingRef.current = { nodes: movingNodes };
            }
        }
      }
    } else {
      const edgeHit = hitEdge(world.x, world.y);
      if (edgeHit) {
          onEdgeClick(edgeHit);
      } else if (tool === 'cursor' && !locked && !e.shiftKey) {
          // Pan only with Space+LeftClick (button 0) or MiddleClick (button 1)
          const isLeftClick = (e as any).button === 0;
          const isMiddleClick = (e as any).button === 1;
          
          if ((isLeftClick && spacePressed.current) || isMiddleClick) {
              panningRef.current = { start: { x, y }, orig: { tx: view.tx, ty: view.ty } };
          } else if (!spacePressed.current) {
              // Start selection box on background click/drag (when not panning)
              selectingRef.current = { start: {x: world.x, y: world.y}, current: {x: world.x, y: world.y} };
              // Clear selection immediately when clicking on empty space
              onPaneClick();
          }
      } else {
          // Start selection box on background click/drag (Shift+drag)
          selectingRef.current = { start: {x: world.x, y: world.y}, current: {x: world.x, y: world.y} };
          // Clear selection immediately when clicking on empty space
          onPaneClick();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getLocalPos(e);
    const world = invView({ x, y });
    lastPointerWorldRef.current = world;
    // drawing
    if (drawingRef.current && tool === 'pen') {
      const nodeId = drawingRef.current.nodeId;
      const n = nodes.find(n => n.id === nodeId); if (!n) return;
      const r = getNodeRect(n);
      const local = { x: world.x - r.x, y: world.y - r.y };
      drawingRef.current.path.push(local);
      render();
      // draw live
      const ctx = canvasRef.current!.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(view.tx, view.ty);
        ctx.scale(view.scale, view.scale);
        drawRoundedRect(ctx, r.x, r.y, r.w, r.h, 8);
        ctx.clip();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const p = drawingRef.current.path;
        ctx.moveTo(r.x + p[0].x, r.y + p[0].y);
        for (let i=1;i<p.length;i++) ctx.lineTo(r.x + p[i].x, r.y + p[i].y);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    // panning
    if (panningRef.current) {
      const { start, orig } = panningRef.current;
      setView(v => ({ ...v, tx: orig.tx + (x - start.x), ty: orig.ty + (y - start.y) }));
      return;
    }
    // connecting
    if (connectingRef.current) {
      connectingRef.current = { ...connectingRef.current, current: { x: world.x, y: world.y } };
      render();
      return;
    }
    // selecting
    if (selectingRef.current) {
        selectingRef.current.current = { x: world.x, y: world.y };
        render();
        return;
    }

    const hoverHit = hitNode(world.x, world.y);
    if (hoverHit) {
      const side = getSideHover(hoverHit, world.x, world.y);
      const nextHover = side ? hoverHit.id : null;
      setHoverNodeId(nextHover);
      setHoverSide(side);
      if (nextHover !== hoverNodeId || side !== hoverSide) {
        render();
      }
    } else if (hoverNodeId || hoverSide) {
      setHoverNodeId(null);
      setHoverSide(null);
      render();
    }
    // resizing
    if (resizingRef.current && tool !== 'pen') {
      const { nodeId, edge, orig } = resizingRef.current;
      setNodes(nds => nds.map(n => {
        if (n.id !== nodeId) return n;
        const minW = 120, minH = 100;
        let w = n.width || DEFAULT_NODE_W;
        let h = n.height || DEFAULT_NODE_H;
        if (edge === 'corner') w = Math.max(minW, orig.w + (world.x - (n.position.x + orig.w)));
        if (edge === 'corner') h = Math.max(minH, orig.h + (world.y - (n.position.y + orig.h)));
        return { ...n, width: w, height: h };
      }));
      return;
    }
    // dragging
    if (draggingRef.current && tool !== 'pen') {
      const moving = draggingRef.current.nodes;
      if (!connectingRef.current) {
        setNodes(nds => nds.map(n => {
            const moveEntry = moving.find(m => m.id === n.id);
            if (moveEntry) {
                return { ...n, position: { x: world.x - moveEntry.offset.x, y: world.y - moveEntry.offset.y } };
            }
            return n;
        }));
      }
      return;
    }
  };

  const handleMouseUp = (_e?: React.MouseEvent) => {
    if (drawingRef.current && tool === 'pen') {
      const { nodeId, path } = drawingRef.current;
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, paths: [ ...(n.data?.paths || []), path ] } } : n));
      drawingRef.current = null;
    }

    const dragInfo = draggingRef.current;
    const lastPointer = lastPointerWorldRef.current;

    draggingRef.current = null;
    panningRef.current = null;
    resizingRef.current = null;

    if (dragInfo && lastPointer && dragInfo.nodes.length === 1) {
      const movedId = dragInfo.nodes[0].id;
      setNodes(nds => {
        const movedNode = nds.find(n => n.id === movedId);
        if (!movedNode || movedNode.type === 'group') return nds;
        // Note: Group functionality temporarily disabled to prevent crashes
        // const targetGroup = findGroupAtPoint(lastPointer, nds);
        // if (targetGroup && targetGroup.id !== movedNode.id) {
        //   return layoutGroupNodes(targetGroup.id, nds);
        // }
        return nds;
      });
    }

    if (connectingRef.current) {
      const { sourceId, current } = connectingRef.current;
      const endHit = hitNode(current.x, current.y);
      if (endHit && endHit.id !== sourceId) {
        const edgeId = `edge_${sourceId}_${endHit.id}_${Date.now()}`;
        setEdges(eds => {
          if (eds.some(e => (e.source === sourceId && e.target === endHit.id))) return eds;
          return eds.concat({ id: edgeId, source: sourceId, target: endHit.id });
        });
      }
      connectingRef.current = null;
    }
    if (selectingRef.current) {
        const s = selectingRef.current.start;
        const c = selectingRef.current.current;
        const x1 = Math.min(s.x, c.x), x2 = Math.max(s.x, c.x);
        const y1 = Math.min(s.y, c.y), y2 = Math.max(s.y, c.y);
        // Only select if box has some size, otherwise it's just a click (handled by mousedown/onPaneClick)
        if (Math.abs(c.x - s.x) > 2 || Math.abs(c.y - s.y) > 2) {
            const selected = nodes.filter(n => {
                const r = getNodeRect(n);
                // Intersection check
                return x1 < r.x + r.w && x2 > r.x && y1 < r.y + r.h && y2 > r.y;
            });
            if (selected.length > 0) {
                onSelectionChange && onSelectionChange(selected);
            }
        } else {
            // It was just a click - selection already cleared on mouse down
            // No need to call onPaneClick again to avoid conflicts
        }
        selectingRef.current = null;
        render();
    }
    setHoverNodeId(null);
    setHoverSide(null);
  };

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (draggingRef.current || resizingRef.current || connectingRef.current || selectingRef.current) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [handleMouseUp]);

  const getCursor = () => {
    if (panningRef.current) return 'grabbing';
    if (isSpacePressed && tool === 'cursor') return 'grab';
    return 'auto';
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const { x, y } = getLocalPos(e as any);
          const delta = Math.sign((e as WheelEvent).deltaY);
          const factor = delta > 0 ? 0.9 : 1.1;
          const newScale = Math.min(3, Math.max(0.3, view.scale * factor));
          // zoom to mouse point
          const wx = (x - view.tx) / view.scale;
          const wy = (y - view.ty) / view.scale;
          const ntx = x - wx * newScale;
          const nty = y - wy * newScale;
          setView({ tx: ntx, ty: nty, scale: newScale });
        }}
      />
    </div>
  );
};

const StructureFlow = () => {
  const {
    token,
    user
  } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic sidebar constraints based on window width
  const sidebarSize = windowWidth > 2500 ? 12 : windowWidth > 1800 ? 15 : 20;
  const sidebarMinSize = windowWidth > 2500 ? 10 : windowWidth > 1800 ? 12 : 15;
  const sidebarMaxSize = windowWidth > 2500 ? 25 : windowWidth > 1800 ? 30 : 45;

  const [boards, setBoards] = useState<Board[]>([]);
  const [openTabs, setOpenTabs] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

  // Auto-create a board for the user when they first visit
  useEffect(() => {
    const createUserBoard = async () => {
      if (!currentBoardId && token && user) {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/structure/boards/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`
            },
            body: JSON.stringify({
              name: 'My Board'
            })
          });
          
          if (response.ok) {
            const board = await response.json();
            setCurrentBoardId(board.id);
            setCurrentBoardName(board.name);
            setBoards(prev => prev.concat(board));
            toast.success('Board created successfully!');
          } else {
            // Handle 5-board limit error
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 400 && errorData?.non_field_errors?.[0]?.includes('maximum of 5 boards')) {
              toast.error('You have reached the maximum limit of 5 boards per account. Please delete some boards to create new ones.');
              return; // Don't create fallback board if limit reached
            }
            
            // Fallback to client-side ID if API fails for other reasons
            const newBoardId = Math.random().toString(36).substring(2, 8).toUpperCase();
            setCurrentBoardId(newBoardId);
            setCurrentBoardName('My Board');
          }
        } catch (error) {
          // Fallback to client-side ID if API fails
          const newBoardId = Math.random().toString(36).substring(2, 8).toUpperCase();
          setCurrentBoardId(newBoardId);
          setCurrentBoardName('My Board');
        }
      }
    };

    createUserBoard();
  }, [currentBoardId, token, user]);

  // Function to create a new board manually
  const createNewBoard = async () => {
    if (!token || !user) {
      toast.error('You must be logged in to create a board');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/structure/boards/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          name: `Board ${boards.length + 1}`
        })
      });

      if (response.ok) {
        const board = await response.json();
        setBoards(prev => prev.concat(board));
        setCurrentBoardId(board.id);
        setCurrentBoardName(board.name);
        // Clear current board content for new board
        setNodes([]);
        setEdges([]);
        toast.success('New board created successfully!');
      } else {
        // Handle 5-board limit error
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && errorData?.non_field_errors?.[0]?.includes('maximum of 5 boards')) {
          toast.error('You have reached the maximum limit of 5 boards per account. Please delete some boards to create new ones.');
        } else {
          toast.error('Failed to create board. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create board. Please try again.');
    }
  };
  const [currentBoardName, setCurrentBoardName] = useState("Loading...");
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) || null : null;
  const selectedEdge = selectedEdgeId ? edges.find(edge => edge.id === selectedEdgeId) || null : null;
  const [view, setView] = useState<{ tx:number; ty:number; scale:number }>({ tx: 0, ty: 0, scale: 1 });
  const [locked, setLocked] = useState(false);
  
  // Restore missing state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarLockedOpen, setIsSidebarLockedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeStatus, setJoinCodeStatus] = useState<
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'exists'; name?: string }
    | { state: 'not_found' }
    | { state: 'error'; message?: string }
  >({ state: 'idle' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [tool, setTool] = useState<'cursor' | 'pen' | 'text'>('cursor');

  const clipboard = useRef<{ nodes: Node[], edges: Edge[] } | null>(null);

  const safeJson = async <T,>(res: Response): Promise<T | null> => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text) as T;
      } catch {
        return null;
      }
    }

    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  // Debounced join-code existence check
  useEffect(() => {
    if (!token) return;
    const code = joinCode.trim();
    if (!code) {
      setJoinCodeStatus({ state: 'idle' });
      return;
    }

    setJoinCodeStatus({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/structure/boards/exists/?code=${encodeURIComponent(code)}`, {
          headers: { Authorization: (token?.startsWith('Token ') ? token : `Token ${token}`) },
        });
        const data = await safeJson<{ exists?: boolean; name?: string; error?: string }>(res);
        if (!res.ok) {
          setJoinCodeStatus({ state: 'error', message: data?.error || 'Failed to validate code' });
          return;
        }
        if (data?.exists) {
          setJoinCodeStatus({ state: 'exists', name: data?.name });
        } else {
          setJoinCodeStatus({ state: 'not_found' });
        }
      } catch (e: any) {
        setJoinCodeStatus({ state: 'error', message: e?.message });
      }
    }, 350);

    return () => clearTimeout(t);
  }, [joinCode, token]);

  const penCursor = `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>`
  )}") 0 24, auto`;

  const handleCopy = useCallback(() => {
      if (selectedNodes.length === 0) return;
      const nodesToCopy = selectedNodes.map(n => ({ ...n })); // Deep clone logic handled by simple spread for now, assuming simple data
      const nodeIds = new Set(nodesToCopy.map(n => n.id));
      const edgesToCopy = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target)).map(e => ({ ...e }));
      
      clipboard.current = { nodes: nodesToCopy, edges: edgesToCopy };
      toast.success(`Copied ${nodesToCopy.length} node(s)`);
  }, [selectedNodes, edges]);

  const handlePaste = useCallback(() => {
      if (!clipboard.current) return;
      
      const { nodes: pastedNodes, edges: pastedEdges } = clipboard.current;
      const idMap = new Map<string, string>();
      
      const newNodes = pastedNodes.map(n => {
          const newId = getId();
          idMap.set(n.id, newId);
          return {
              ...n,
              id: newId,
              position: { x: n.position.x + 50, y: n.position.y + 50 },
              selected: true // This property isn't in Node type but we handle selection manually
          };
      });
      
      const newEdges = pastedEdges.map(e => ({
          ...e,
          id: `edge_${idMap.get(e.source)}_${idMap.get(e.target)}_${Date.now()}_${Math.random()}`,
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!
      }));
      
      setNodes(nds => [...nds, ...newNodes]);
      setEdges(eds => [...eds, ...newEdges]);
      setSelectedNodes(newNodes);
      setSelectedNodeId(null); // Multi-select state
      setSelectedEdgeId(null);
      
      toast.success("Pasted");
  }, [setNodes, setEdges]);

  const screenToFlowPosition = useCallback((p: {x: number, y: number}) => {
      return {
          x: (p.x - view.tx) / view.scale,
          y: (p.y - view.ty) / view.scale
      };
  }, [view]);

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('application/reactflow-label');
    if (typeof type === 'undefined' || !type) {
      return;
    }
    const canvas = reactFlowWrapper.current;
    const rect = canvas?.getBoundingClientRect();
    const x = event.clientX - (rect?.left || 0);
    const y = event.clientY - (rect?.top || 0);
    const world = screenToFlowPosition({ x, y });
    const position = { x: world.x, y: world.y };
    const newNode: Node = {
      id: getId(),
      type,
      position,
      width: type === 'group' ? 340 : undefined,
      height: type === 'group' ? 260 : undefined,
      data: {
        label: label || `${type} node`,
        heading: 'normal',
        color: type === 'group' ? '#ff7800' : '#9ca3af'
      },
      style: {
        background: type === 'group' ? '#ff7800 !important' : '#9ca3af !important',
        backgroundColor: type === 'group' ? '#ff7800 !important' : '#9ca3af !important',
        borderColor: type === 'group' ? '#ff7800' : '#9ca3af',
        borderRadius: '8px',
      }
    };

    setNodes(nds => {
      const updated = nds.concat(newNode);
      // Note: Group functionality temporarily disabled to prevent crashes
      // const targetGroup = findGroupAtPoint(position, updated);
      // if (targetGroup && targetGroup.id !== newNode.id && type !== 'group') {
      //   return layoutGroupNodes(targetGroup.id, updated);
      // }
      return updated;
    });
  }, [screenToFlowPosition, setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent shortcuts if editing text inputs
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedNodeId || selectedNodes.length > 0) deleteNode();
            if (selectedEdgeId) deleteEdge();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            handleCopy();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            handlePaste();
        }

        if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            sidebarRef.current?.expand();
            setIsSidebarOpen(true);
            setIsSidebarLockedOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, selectedNodes, handleCopy, handlePaste]);

  const onNodeClick = (node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedNodes([node]);
    setSelectedEdgeId(null);
    sidebarRef.current?.expand();
    setIsSidebarOpen(true);
  };
  const onEdgeClick = (edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setSelectedNodes([]);
    sidebarRef.current?.expand();
    setIsSidebarOpen(true);
  };
  const onPaneClick = () => {
    // Only clear selections, don't affect sidebar state
    setSelectedNodeId(null);
    setSelectedNodes([]);
    setSelectedEdgeId(null);
  };
  const onNodeDragStart = useCallback(() => setIsInteracting(true), []);
  const onNodeDragStop = useCallback(() => setIsInteracting(false), []);
  const updateNodeLabel = (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNodeId) return; // This will be updated for multi-select
    const newLabel = evt.target.value;
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            label: newLabel
          }
        };
      }
      return node;
    }));
  };
  const updateNodeHeading = (value: string) => {
    if (selectedNodes.length === 0) return;

    setNodes(nds => nds.map(node => {
      if (selectedNodes.some(n => n.id === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            heading: value
          }
        };
      }
      return node;
    }));
  };

  const updateNodeFontFamily = (value: string) => {
    if (selectedNodes.length === 0) return;

    setNodes(nds => nds.map(node => {
      if (selectedNodes.some(n => n.id === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            fontFamily: value
          }
        };
      }
      return node;
    }));
  };

  const updateNodeFontColor = (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNodes.length === 0) return;
    const newColor = evt.target.value;

    setNodes(nds => nds.map(node => {
      if (selectedNodes.some(n => n.id === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            fontColor: newColor
          }
        };
      }
      return node;
    }));
  };

  const updateNodeFontSize = (size: number) => {
    if (selectedNodes.length === 0) return;

    setNodes(nds => nds.map(node => {
      if (selectedNodes.some(n => n.id === node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            fontSize: size
          }
        };
      }
      return node;
    }));
  };
  const updateNodeColor = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = evt.target.value;
    const targetIds = selectedNodes.length > 0 ? selectedNodes.map(n => n.id) : (selectedNodeId ? [selectedNodeId] : []);
    
    if (targetIds.length === 0) return;

    setNodes(nds => nds.map(node => {
      if (targetIds.includes(node.id)) {
        return {
          ...node,
          style: {
            ...node.style,
            background: `${newColor} !important`,
            backgroundColor: `${newColor} !important`,
            borderColor: newColor,
          },
          data: {
            ...node.data,
            color: newColor
          }
        };
      }
      return node;
    }));
  };
  const updateNodeType = (value: string) => {
      if (!selectedNodeId) return;
      setNodes(nds => nds.map(node => {
          if (node.id === selectedNodeId) {
              return {
                  ...node,
                  type: value,
              };
          }
          return node;
      }));
  };
  const updateEdgeAnimated = (checked: boolean) => {
      if (!selectedEdgeId) return;
      setEdges(eds => eds.map(edge => {
          if (edge.id === selectedEdgeId) {
              return { ...edge, animated: checked };
          }
          return edge;
      }));
  };
  const updateEdgeColor = (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedEdgeId) return;
      const newColor = evt.target.value;
      setEdges(eds => eds.map(edge => {
          if (edge.id === selectedEdgeId) {
              return {
                  ...edge,
                  style: { ...edge.style, stroke: newColor }
              };
          }
          return edge;
      }));
  };
  const updateEdgeWidth = (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedEdgeId) return;
      const val = parseInt(evt.target.value);
      if (isNaN(val)) return;
      const newWidth = Math.min(Math.max(val, 1), 10);
      setEdges(eds => eds.map(edge => {
          if (edge.id === selectedEdgeId) {
              return {
                  ...edge,
                  style: { ...edge.style, strokeWidth: newWidth }
              };
          }
          return edge;
      }));
  };
  const deleteNode = () => {
    if (selectedNodes.length > 0) {
        const ids = selectedNodes.map(n => n.id);
        setNodes(nds => nds.filter(n => !ids.includes(n.id)));
        setSelectedNodes([]);
        setSelectedNodeId(null);
    } else if (selectedNodeId) {
        setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
        setSelectedNodeId(null);
    }
  };
  const deleteEdge = () => {
      if (!selectedEdgeId) return;
      setEdges(eds => eds.filter(e => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
  };

  const layoutGroupNodes = (groupId: string, allNodes: Node[]) => {
      const group = allNodes.find(n => n.id === groupId && n.type === 'group');
      if (!group) return allNodes;
      const groupRect = {
          x: group.position.x,
          y: group.position.y,
          w: group.width || 340,
          h: group.height || 260
      };

      const headerOffset = 50;
      const padding = 15;
      const bottomPadding = 15;
      const availableWidth = Math.max(120, groupRect.w - padding * 2);

      const children = allNodes.filter(n => {
          if (n.id === group.id) return false;
          const w = n.width || DEFAULT_NODE_W;
          const h = n.height || DEFAULT_NODE_H;
          const cx = n.position.x + w / 2;
          const cy = n.position.y + h / 2;
          return cx >= groupRect.x && cx <= groupRect.x + groupRect.w && cy >= groupRect.y && cy <= groupRect.y + groupRect.h;
      });

      if (children.length === 0) return allNodes;
      children.sort((a, b) => a.position.y - b.position.y);

      const desiredHeight = headerOffset + bottomPadding + (children.length * DEFAULT_NODE_H) + padding * (children.length - 1);
      const expandedHeight = children.length > 2 ? Math.max(groupRect.h, desiredHeight) : groupRect.h;
      const availableHeight = Math.max(0, expandedHeight - headerOffset - bottomPadding - padding * (children.length - 1));
      const minHeight = 60;
      const tileHeight = Math.max(minHeight, Math.floor(availableHeight / children.length));

      let currentY = groupRect.y + headerOffset;

      return allNodes.map(n => {
          if (n.id === group.id) {
              return expandedHeight !== groupRect.h ? { ...n, height: expandedHeight } : n;
          }
          const child = children.find(c => c.id === n.id);
          if (!child) return n;
          const w = Math.min(child.width || DEFAULT_NODE_W, Math.max(120, availableWidth - 40));
          const newPos = {
              x: groupRect.x + (groupRect.w - w) / 2,
              y: currentY
          };
          currentY += tileHeight + padding;
          return { ...n, width: w, height: tileHeight, position: newPos };
      });
  };

  const findGroupAtPoint = (point: { x: number; y: number }, allNodes: Node[]) => {
      return allNodes.find(n => {
          if (n.type !== 'group') return false;
          const w = n.width || 340;
          const h = n.height || 260;
          return point.x >= n.position.x && point.x <= n.position.x + w && point.y >= n.position.y && point.y <= n.position.y + h;
      }) || null;
  };

  const autoLayoutGroup = () => {
      if (selectedNodes.length !== 1 || selectedNodes[0].type !== 'group') return;
      const group = selectedNodes[0];
      const nextNodes = layoutGroupNodes(group.id, nodes);
      if (nextNodes === nodes) {
          toast.info("No nodes inside this group");
          return;
      }
      setNodes(nextNodes);
      toast.success("Auto-tiled group contents");
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (panel) {
      if (isSidebarOpen) {
        panel.collapse();
        setIsSidebarLockedOpen(false); // Unlock when explicitly closing
      } else {
        panel.expand();
        setIsSidebarLockedOpen(true); // Lock when explicitly opening
      }
    }
  };
    const copyBoardCode = () => {
        setShowShareDialog(true);
    }

    const handleJoinBoard = async () => {
        if (!joinCode.trim()) {
            toast.error("Enter a board code first");
            return;
        }
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/structure/boards/${joinCode}/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Board not found");
                return;
            }
            const board = await res.json();
            setBoards(prev => {
                if (prev.some(b => b.id === board.id)) return prev;
                return prev.concat(board);
            });
            setCurrentBoardId(board.id);
            setCurrentBoardName(board.name || 'Untitled');
            setJoinCode('');
            toast.success("Board joined!");
        } catch (e) {
            toast.error("Failed to join board");
        }
    }
  
    const handleRenameBoard = async () => {
        setIsEditingBoardName(false);
        if (!token || !currentBoardId || !currentBoardName) return;
  
        try {
            const res = await fetch(`/api/structure/boards/${currentBoardId}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify({ name: currentBoardName })
            });
            if (res.ok) {
                setBoards(prev => prev.map(b => b.id === currentBoardId ? { ...b, name: currentBoardName } : b));
                toast.success("Board name updated!");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to rename board");
            }
        } catch (e) {
            toast.error("Error renaming board");
        }
    }

    const switchBoard = async (boardId: string) => {
        if (boardId === currentBoardId) return;
        
        setCurrentBoardId(boardId);
        const board = boards.find(b => b.id === boardId);
        if (board) {
            setCurrentBoardName(board.name);
        }
        // Clear current canvas
        setNodes([]);
        setEdges([]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedNodes([]);
    }

    const deleteBoard = async (boardId: string) => {
        if (!token) return;
        
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/structure/boards/${boardId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            
            if (res.ok) {
                setBoards(prev => prev.filter(b => b.id !== boardId));
                
                // If we deleted the current board, switch to another or create new
                if (boardId === currentBoardId) {
                    const remainingBoards = boards.filter(b => b.id !== boardId);
                    if (remainingBoards.length > 0) {
                        switchBoard(remainingBoards[0].id);
                    } else {
                        setCurrentBoardId(null);
                        setNodes([]);
                        setEdges([]);
                    }
                }
                
                toast.success("Board deleted successfully!");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete board");
            }
        } catch (e) {
            toast.error("Error deleting board");
        }
    }
  
    return (
      <div ref={containerRef} className="h-screen w-full bg-background">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={100 - sidebarSize} minSize={30} className="transition-[flex,width] duration-300 ease-in-out">
                            <div
                              className="h-full w-full relative"
                              ref={reactFlowWrapper}
                              style={{ cursor: tool === 'pen' ? penCursor : (tool === 'cursor' ? 'auto' : 'text') }}
                              onDrop={onDrop}
                              onDragOver={onDragOver}
                            >
         
            <BoardCanvas
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              tool={tool}
              view={view}
              setView={setView}
              locked={locked}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              selectedNodeIds={selectedNodes.map(n => n.id)}
              selectedEdgeIds={selectedEdgeId ? [selectedEdgeId] : []}
              onSelectionChange={(newSelection) => {
                  setSelectedNodes(newSelection);
                  if (newSelection.length === 1) setSelectedNodeId(newSelection[0].id);
                  else setSelectedNodeId(null);
                  
                  if (newSelection.length > 0 && !isSidebarLockedOpen) {
                      sidebarRef.current?.expand();
                      setIsSidebarOpen(true);
                  }
              }}
            />
            <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
                <div className="flex flex-col bg-background/80 backdrop-blur-sm border rounded-md shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => setView(v => ({ ...v, scale: Math.min(3, v.scale * 1.2) }))} title="Zoom In">
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setView(v => ({ ...v, scale: Math.max(0.3, v.scale / 1.2) }))} title="Zoom Out">
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setView({ tx: 0, ty: 0, scale: 1 })} title="Reset View">
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex flex-col bg-background/80 backdrop-blur-sm border rounded-md shadow-sm">
                    <Button variant={locked ? "secondary" : "ghost"} size="icon" onClick={() => setLocked(!locked)} title={locked ? "Unlock Board" : "Lock Board"}>
                        {locked ? <Lock className="h-4 w-4 text-red-500" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm p-2 lg:p-3 rounded-md border shadow-sm flex items-center gap-2 lg:gap-3">
              {isEditingBoardName ? (
                <Input
                  value={currentBoardName}
                  onChange={(e) => setCurrentBoardName(e.target.value)}
                  onBlur={handleRenameBoard}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameBoard();
                    }
                  }}
                  className="h-8 text-lg font-bold text-primary"
                  autoFocus
                />
              ) : (
                <h1 className="text-xl font-bold text-primary">{currentBoardName}</h1>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingBoardName(!isEditingBoardName)} title="Rename Board">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyBoardCode} title="Copy Board Code to Share">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 items-end">
              <div className="flex gap-2">
                <Button variant="secondary" size="icon" onClick={toggleSidebar} title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}>
                  <Menu className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
              <ScrollArea className="max-w-[60vw] rounded-md bg-background/80 backdrop-blur-sm border p-1">
                <div className="flex gap-1 w-max">
                  {openTabs.map(tab => (
                    <div key={tab.id} className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/60 cursor-pointer" onClick={() => switchBoard(tab.id)}>
                      <span className="text-xs truncate max-w-[20ch]">{tab.name}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(tab.id)); }} title="Share">
                          <Share2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setOpenTabs(tabs => tabs.filter(t => t.id !== tab.id)); }} title="Close">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle className={isSidebarOpen ? "" : "hidden"} />
        
        <ResizablePanel 
          ref={sidebarRef} 
          defaultSize={sidebarSize} 
          minSize={sidebarMinSize} 
          maxSize={sidebarMaxSize} 
          collapsible={true} 
          collapsedSize={0} 
          onCollapse={() => setIsSidebarOpen(false)} 
          onExpand={() => setIsSidebarOpen(true)} 
          className={`bg-background border-l border-border transition-[flex,width] duration-300 ease-in-out ${isSidebarOpen ? '' : 'border-none'}`}
        >
          <ScrollArea className="h-full w-full">
            <aside className="p-4 lg:p-6 flex flex-col" style={{
              width: '100%',
              opacity: isSidebarOpen ? 1 : 0,
              transition: 'opacity 0.2s ease-in-out'
            }}>
              
              {}
              <Card className="border-none shadow-none bg-transparent mb-4">
                  <CardHeader className="px-0 pt-0 pb-2">
                      <CardTitle className="flex items-center justify-between text-sm lg:text-base font-medium">
                          <div className="flex items-center gap-2">
                             <Layout className="h-4 w-4" />
                             Boards
                             {currentBoardId && (
                                 <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md">
                                     <span className="text-xs text-muted-foreground">Room:</span>
                                     <span className="text-xs font-mono font-semibold">
                                         {currentBoardId.slice(0, 6).toUpperCase()}
                                     </span>
                                 </div>
                             )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => createNewBoard()} title="New Board">
                              <Plus className="h-4 w-4" />
                          </Button>
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 flex flex-col gap-2">
                      {}
                      <div className="flex gap-2 mb-2">
                          <div className="flex flex-col gap-1 flex-1">
                            <Input
                              placeholder="Join Code..."
                              value={joinCode}
                              onChange={e => {
                                setJoinCode(e.target.value);
                                // status will update via useEffect
                              }}
                              className="h-8 text-sm"
                            />
                            {joinCode.trim() && joinCodeStatus.state === 'exists' && (
                              <p className="text-xs text-green-600">this board is exist</p>
                            )}
                            {joinCode.trim() && joinCodeStatus.state === 'not_found' && (
                              <p className="text-xs text-red-600">board not found</p>
                            )}
                            {joinCode.trim() && joinCodeStatus.state === 'checking' && (
                              <p className="text-xs text-muted-foreground">checking…</p>
                            )}
                            {joinCode.trim() && joinCodeStatus.state === 'error' && (
                              <p className="text-xs text-red-600">{joinCodeStatus.message || 'validation error'}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={handleJoinBoard} title="Join Board">
                              <Users className="h-4 w-4" />
                          </Button>
                      </div>

                      <ScrollArea className="max-h-[200px] lg:max-h-[350px] xl:max-h-[500px]">
                        <div className="flex flex-col gap-1">
                          {boards.map(board => <div key={board.id} onClick={() => switchBoard(board.id)} className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${currentBoardId === board.id ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted text-muted-foreground'}`}>
                                <span className="truncate">{board.name}</span>
                                {board.is_owner && <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()} title="Delete Board">
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure you want to delete this board?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete your board "{board.name}"
                                                    and remove its data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteBoard(board.id)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>}
                            </div>)}
                        </div>
                      </ScrollArea>
                  </CardContent>
              </Card>

              <Separator className="mb-4" />

              <Card className="border-none shadow-none bg-transparent mb-4">
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="flex items-center justify-between text-sm lg:text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Modes
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 flex flex-col gap-2">
                  <Button
                    variant={tool === 'cursor' ? "default" : "outline"}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => setTool('cursor')}
                  >
                    <MousePointer2 className="h-4 w-4" />
                    Mouse
                  </Button>
                  <Button
                    variant={tool === 'pen' ? "default" : "outline"}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => setTool('pen')}
                  >
                    <PenTool className="h-4 w-4" />
                    Pen
                  </Button>
                  <Button
                    variant={tool === 'text' ? "default" : "outline"}
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => setTool('text')}
                  >
                    <Type className="h-4 w-4" />
                    Text
                  </Button>
                </CardContent>
              </Card>

              <Separator className="mb-4" />

              {selectedNodes.length > 0 ? <Card className="h-full border-none shadow-none bg-transparent">
                      <CardHeader className="px-0 pt-0">
                          <CardTitle className="flex items-center gap-2">
                              <Settings className="h-5 w-5" />
                              {selectedNodes.length > 1 ? "Properties (Multiple)" : "Properties"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                              {selectedNodes.length > 1 ? "Edit properties for selected nodes." : "Edit properties for the selected node."}
                          </p>
                      </CardHeader>
                      <Separator className="mb-4" />
                      <CardContent className="px-0 flex flex-col gap-6">
                          <div className="flex items-center gap-2 mb-2">
                              <Button
                                variant={(selectedNodes.length === 1 ? selectedNode?.data.heading : selectedNodes[0]?.data.heading) === 'h1' ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateNodeHeading('h1')}
                                className="h-8"
                              >
                                H1
                              </Button>
                              <Button
                                variant={(selectedNodes.length === 1 ? selectedNode?.data.heading : selectedNodes[0]?.data.heading) === 'h2' ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateNodeHeading('h2')}
                                className="h-8"
                              >
                                H2
                              </Button>
                              <Button
                                variant={(selectedNodes.length === 1 ? selectedNode?.data.heading : selectedNodes[0]?.data.heading) === 'h3' ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateNodeHeading('h3')}
                                className="h-8"
                              >
                                H3
                              </Button>
                              <Button
                                variant={((selectedNodes.length === 1 ? selectedNode?.data.heading : selectedNodes[0]?.data.heading) === 'normal' || !(selectedNodes.length === 1 ? selectedNode?.data.heading : selectedNodes[0]?.data.heading)) ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateNodeHeading('normal')}
                                className="h-8"
                              >
                                T
                              </Button>
                          </div>

                          {selectedNodes.length === 1 && selectedNode && (
                          <>
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="node-label">{selectedNode.type === 'group' ? 'Group Label' : 'Label'}</Label>
                              <Input id="node-label" value={selectedNode.data.label as string || ''} onChange={updateNodeLabel} />
                          </div>
                          {selectedNode.type === 'group' && (
                              <Button variant="outline" size="sm" onClick={autoLayoutGroup} className="w-full">
                                  <Layout className="mr-2 h-4 w-4" />
                                  Auto Tile
                              </Button>
                          )}
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="node-type">Node Type</Label>
                              <Select onValueChange={updateNodeType} value={selectedNode.type}>
                                  <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select a type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="input">Input Node</SelectItem>
                                      <SelectItem value="default">Default Node</SelectItem>
                                      <SelectItem value="output">Output Node</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          </>
                          )}
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="node-color">Block Color</Label>
                              <div className="flex gap-2 items-center">
                                  <Input 
                                      id="node-color" 
                                      type="color" 
                                      value={(selectedNodes.length > 0 ? (selectedNodes[0].data?.color || selectedNodes[0].style?.backgroundColor) : (selectedNode?.data?.color || selectedNode?.style?.backgroundColor)) as string || '#2d2d2d'} 
                                      onChange={updateNodeColor} 
                                      className="w-12 h-10 p-1 cursor-pointer" 
                                  />
                                  <Input 
                                      value={(selectedNodes.length > 0 ? (selectedNodes[0].data?.color || selectedNodes[0].style?.backgroundColor) : (selectedNode?.data?.color || selectedNode?.style?.backgroundColor)) as string || '#2d2d2d'} 
                                      onChange={updateNodeColor} 
                                      className="flex-1" 
                                  />
                              </div>
                          </div>
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="font-family">Font Family</Label>
                              <Select 
                                  value={(selectedNodes.length > 0 ? selectedNodes[0].data?.fontFamily : selectedNode?.data?.fontFamily) || 'ui-sans-serif, system-ui, -apple-system'}
                                  onValueChange={updateNodeFontFamily}
                              >
                                  <SelectTrigger id="font-family" className="w-full">
                                      <SelectValue placeholder="Select font..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="ui-sans-serif, system-ui, -apple-system">System UI</SelectItem>
                                      <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                                      <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                                      <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                                      <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                                      <SelectItem value="'Comic Sans MS', cursive">Comic Sans</SelectItem>
                                      <SelectItem value="Impact, fantasy">Impact</SelectItem>
                                      <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="font-size">Font Size</Label>
                              <Input 
                                  id="font-size" 
                                  type="number" 
                                  min="8"
                                  max="72"
                                  value={(selectedNodes.length > 0 ? selectedNodes[0].data?.fontSize : selectedNode?.data?.fontSize) || 16} 
                                  onChange={(e) => updateNodeFontSize(parseInt(e.target.value) || 16)} 
                                  className="w-full" 
                              />
                          </div>
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="font-color">Font Color</Label>
                              <div className="flex gap-2 items-center">
                                  <Input 
                                      id="font-color" 
                                      type="color" 
                                      value={(selectedNodes.length > 0 ? selectedNodes[0].data?.fontColor : selectedNode?.data?.fontColor) || '#111827'} 
                                      onChange={updateNodeFontColor} 
                                      className="w-12 h-10 p-1 cursor-pointer" 
                                  />
                                  <Input 
                                      value={(selectedNodes.length > 0 ? selectedNodes[0].data?.fontColor : selectedNode?.data?.fontColor) || '#111827'} 
                                      onChange={updateNodeFontColor} 
                                      className="flex-1" 
                                  />
                              </div>
                          </div>
                      </CardContent>
                      <CardFooter className="px-0 mt-auto">
                          <Button variant="destructive" className="w-full" onClick={deleteNode}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete {selectedNodes.length > 1 ? "Nodes" : "Node"}
                          </Button>
                      </CardFooter>
                  </Card> : selectedEdge ? <Card className="h-full border-none shadow-none bg-transparent">
                      <CardHeader className="px-0 pt-0">
                          <CardTitle className="flex items-center gap-2">
                              <Settings className="h-5 w-5" />
                              Edge Properties
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                              Edit properties for the selected edge.
                          </p>
                      </CardHeader>
                      <Separator className="mb-4" />
                      <CardContent className="px-0 flex flex-col gap-6">
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="edge-color">Stroke Color</Label>
                              <div className="flex gap-2 items-center">
                                  <Input value={selectedEdge.style?.stroke as string || '#B1B1B7'} onChange={updateEdgeColor} className="flex-1" />
                                  <Input id="edge-color" type="color" value={selectedEdge.style?.stroke as string || '#B1B1B7'} onChange={updateEdgeColor} className="w-12 h-10 p-1 cursor-pointer" />
                              </div>
                          </div>
                          <div className="grid w-full items-center gap-2">
                              <Label htmlFor="edge-width">Stroke Width</Label>
                              <Input id="edge-width" type="number" min={1} max={10} value={selectedEdge.style?.strokeWidth as number || 2} onChange={updateEdgeWidth} />
                          </div>
                          <div className="flex items-center space-x-2">
                              <input
                                  id="animated-edge"
                                  type="checkbox"
                                  checked={selectedEdge.animated || false}
                                  onChange={(e) => updateEdgeAnimated(e.target.checked)}
                                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                              <Label htmlFor="animated-edge">Animated</Label>
                          </div>
                      </CardContent>
                      <CardFooter className="px-0 mt-auto">
                          <Button variant="destructive" className="w-full" onClick={deleteEdge}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Edge
                          </Button>
                      </CardFooter>
                  </Card> : <Card className="h-full border-none shadow-none bg-transparent">
                      <CardHeader className="px-0 pt-0">
                          <CardTitle className="flex items-center gap-2">
                              <PlusCircle className="h-5 w-5" />
                              Add Nodes
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                              Drag and drop nodes to the canvas on the left.
                          </p>
                      </CardHeader>
                      <Separator className="mb-4" />
                      <CardContent className="px-0 flex flex-col gap-4">
                          <div className="p-4 border-2 border-dashed border-border rounded-lg cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors flex items-center gap-3 bg-card" onDragStart={event => onDragStart(event, 'input', 'Block Node')} draggable>
                              <Box className="h-6 w-6 text-primary" />
                              <div className="flex flex-col">
                                  <span className="font-medium">Block Node</span>
                                  <span className="text-xs text-muted-foreground">Standard block</span>
                              </div>
                          </div>

                          <div className="p-4 border-2 border-dashed border-border rounded-lg cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors flex items-center gap-3 bg-card" onDragStart={event => onDragStart(event, 'group', 'Group')} draggable>
                              <Group className="h-6 w-6 text-primary" />
                              <div className="flex flex-col">
                                  <span className="font-medium">Group</span>
                                  <span className="text-xs text-muted-foreground">Container block</span>
                              </div>
                          </div>
                      </CardContent>
                  </Card>}
            </aside>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {/* Share Dialog */}
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Board
            </AlertDialogTitle>
            <AlertDialogDescription>
              Share this board code with others to collaborate:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold tracking-wider mb-2">
                  {currentBoardId?.slice(0, 6).toUpperCase() || '------'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Room Code
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Others can join using this 6-digit code
              </p>
            </div>
          </div>
          <AlertDialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (currentBoardId) {
                  navigator.clipboard.writeText(currentBoardId);
                  toast.success("Board code copied to clipboard!");
                }
              }}
            >
              Copy Code
            </Button>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    );
}
const Structure: React.FC = () => {
  return <StructureFlow />;
};
export default Structure;
