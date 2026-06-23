import * as React from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  value: string; 
  onChange: (newValue: string) => void;
  className?: string;
  disabled?: boolean;
  use12Hour?: boolean;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  let hours = 9;
  let minutes = 0;

  if (match) {
    hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  }

  const isPM = hours >= 12;
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return { hours, minutes, hours12, isPM };
}

function formatTime(hours: number, minutes: number) {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

const CLOCK_SIZE = 240;
const CLOCK_RADIUS = CLOCK_SIZE / 2;
const OUTER_RADIUS = 100;
const INNER_RADIUS = 65;

function getClockPosition(value: number, max: number, radius: number) {
  const angleDeg = (value / max) * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = CLOCK_RADIUS + radius * Math.cos(angleRad);
  const y = CLOCK_RADIUS + radius * Math.sin(angleRad);
  return { x, y };
}

function getAngle(value: number, max: number) {
  return (value / max) * 360 - 90;
}

function getValueFromPosition(
  x: number,
  y: number,
  max: number,
  useInnerOuter: boolean = false
) {
  const dx = x - CLOCK_RADIUS;
  const dy = y - CLOCK_RADIUS;
  const distance = Math.sqrt(dx * dx + dy * dy);
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  let value = Math.round((angle * max) / 360) % max;

  if (useInnerOuter && max === 24) {
    const threshold = (OUTER_RADIUS + INNER_RADIUS) / 2;
    const isInner = distance < threshold;
    value = Math.round((angle * 12) / 360) % 12;
    value = isInner ? value : value + 12;
    if (value === 24) value = 0;
    if (value === 0 && !isInner) value = 12;
    if (value === 12 && isInner) value = 0;
  }

  return value;
}

export function TimePicker({
  value,
  onChange,
  className,
  disabled,
  use12Hour = false
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"hours" | "minutes">("hours");
  const [isDragging, setIsDragging] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(value);
  const [initialIsInner, setInitialIsInner] = React.useState<boolean | null>(
    null
  );
  const clockRef = React.useRef<SVGSVGElement>(null);
  const hoursInputRef = React.useRef<HTMLInputElement>(null);
  const minutesInputRef = React.useRef<HTMLInputElement>(null);

  const { hours, minutes, hours12, isPM } = React.useMemo(
    () => parseTime(tempValue),
    [tempValue]
  );

  React.useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleClockInteraction = React.useCallback(
    (x: number, y: number) => {
      let newValue: number;
      if (mode === "hours") {
        if (use12Hour) {
          newValue = getValueFromPosition(x, y, 12);
          const newHour12 = newValue === 0 ? 12 : newValue;
          const newHour24 =
            newHour12 === 12
              ? isPM
                ? 12
                : 0
              : isPM
              ? newHour12 + 12
              : newHour12;
          setTempValue(formatTime(newHour24, minutes));
        } else {
          if (isDragging && initialIsInner !== null) {
            const dx = x - CLOCK_RADIUS;
            const dy = y - CLOCK_RADIUS;
            let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
            if (angle < 0) angle += 360;
            newValue = Math.round((angle * 12) / 360) % 12;
            newValue = initialIsInner ? newValue : newValue + 12;
            if (newValue === 24) newValue = 0;
            if (newValue === 0 && !initialIsInner) newValue = 12;
            if (newValue === 12 && initialIsInner) newValue = 0;
          } else {
            newValue = getValueFromPosition(x, y, 24, true);
          }
          setTempValue(formatTime(newValue, minutes));
        }
        setMode("minutes");
      } else {
        newValue = getValueFromPosition(x, y, 60);
        setTempValue(formatTime(hours, newValue));
      }
    },
    [mode, hours, minutes, isPM, use12Hour, isDragging, initialIsInner]
  );

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      setIsDragging(true);
      if (!clockRef.current) return;
      const rect = clockRef.current.getBoundingClientRect();
      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (mode === "hours" && !use12Hour) {
        const dx = x - CLOCK_RADIUS;
        const dy = y - CLOCK_RADIUS;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const threshold = (OUTER_RADIUS + INNER_RADIUS) / 2;
        setInitialIsInner(distance < threshold);
      } else {
        setInitialIsInner(null);
      }
      handleClockInteraction(x, y);
    },
    [handleClockInteraction, mode, use12Hour]
  );

  const handleMouseMove = React.useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;
      if (!clockRef.current) return;
      const rect = clockRef.current.getBoundingClientRect();
      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      handleClockInteraction(x, y);
    },
    [isDragging, handleClockInteraction]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    setInitialIsInner(null);
  }, []);

  const toggleAMPM = React.useCallback(() => {
    if (!use12Hour) return;
    const newHours = isPM ? hours - 12 : hours + 12;
    setTempValue(formatTime(Math.max(0, Math.min(23, newHours)), minutes));
  }, [hours, minutes, isPM, use12Hour]);

  const increment = React.useCallback(
    (type: "hours" | "minutes", delta: number) => {
      if (type === "hours") {
        const newHours = (hours + delta + 24) % 24;
        setTempValue(formatTime(newHours, minutes));
      } else {
        const newMinutes = (minutes + delta + 60) % 60;
        setTempValue(formatTime(hours, newMinutes));
      }
    },
    [hours, minutes]
  );

  const handleHoursChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let newH = parseInt(e.target.value, 10);
      if (isNaN(newH)) return;
      if (use12Hour) {
        newH = Math.max(1, Math.min(12, newH));
        const newHour24 =
          newH === 12 ? (isPM ? 12 : 0) : isPM ? newH + 12 : newH;
        setTempValue(formatTime(newHour24, minutes));
      } else {
        newH = Math.max(0, Math.min(23, newH));
        setTempValue(formatTime(newH, minutes));
      }
    },
    [minutes, isPM, use12Hour]
  );

  const handleMinutesChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let newM = parseInt(e.target.value, 10);
      if (isNaN(newM)) return;
      newM = Math.max(0, Math.min(59, newM));
      setTempValue(formatTime(hours, newM));
    },
    [hours]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onChange(tempValue);
        setOpen(false);
      } else if (e.key === "Escape") {
        setTempValue(value);
        setOpen(false);
      } else if (e.key === "Tab") {
        if (e.currentTarget === hoursInputRef.current) {
          e.preventDefault();
          minutesInputRef.current?.focus();
        }
      }
    },
    [tempValue, value, onChange]
  );

  const setToNow = React.useCallback(() => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    setTempValue(formatTime(currentHours, currentMinutes));
  }, []);

  const confirm = React.useCallback(() => {
    onChange(tempValue);
    setOpen(false);
  }, [tempValue, onChange]);

  const renderHourMarkers = () => {
    const markers = [];

    if (use12Hour) {
      for (let i = 1; i <= 12; i++) {
        const { x, y } = getClockPosition(i % 12, 12, OUTER_RADIUS);
        const isSelected = hours12 === i;

        markers.push(
          <g
            key={i}
            onClick={() => {
              const newHour24 = i === 12 ? (isPM ? 12 : 0) : isPM ? i + 12 : i;
              setTempValue(formatTime(newHour24, minutes));
              setMode("minutes");
            }}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            {isSelected && (
              <circle
                cx={x}
                cy={y}
                r="20"
                fill="currentColor"
                className="text-primary opacity-15"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r="16"
              fill="currentColor"
              className={cn(
                "transition-colors",
                isSelected
                  ? "text-primary opacity-20"
                  : "text-muted-foreground opacity-10"
              )}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "fill-current text-sm font-semibold transition-colors",
                isSelected ? "text-primary" : "text-foreground"
              )}
            >
              {i}
            </text>
          </g>
        );
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const isInner = i < 12;
        const valueForPos = i % 12;
        const { x, y } = getClockPosition(
          valueForPos,
          12,
          isInner ? INNER_RADIUS : OUTER_RADIUS
        );
        const isSelected = hours === i;

        markers.push(
          <g
            key={i}
            onClick={() => {
              setTempValue(formatTime(i, minutes));
              setMode("minutes");
            }}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            {isSelected && (
              <circle
                cx={x}
                cy={y}
                r="18"
                fill="currentColor"
                className="text-primary opacity-15"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r="14"
              fill="currentColor"
              className={cn(
                "transition-colors",
                isSelected
                  ? "text-primary opacity-20"
                  : "text-muted-foreground opacity-10"
              )}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "fill-current text-xs font-medium transition-colors",
                isSelected ? "text-primary" : "text-foreground"
              )}
            >
              {pad2(i)}
            </text>
          </g>
        );
      }
    }
    return markers;
  };

  const renderMinuteMarkers = () => {
    const markers = [];
    for (let i = 0; i < 60; i += 5) {
      const { x, y } = getClockPosition(i, 60, OUTER_RADIUS);
      const isSelected = minutes === i;

      markers.push(
        <g
          key={i}
          onClick={() => {
            setTempValue(formatTime(hours, i));
          }}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          {isSelected && (
            <circle
              cx={x}
              cy={y}
              r="20"
              fill="currentColor"
              className="text-primary opacity-15"
            />
          )}
          <circle
            cx={x}
            cy={y}
            r="16"
            fill="currentColor"
            className={cn(
              "transition-colors",
              isSelected
                ? "text-primary opacity-20"
                : "text-muted-foreground opacity-10"
            )}
          />
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className={cn(
              "fill-current text-sm font-medium transition-colors",
              isSelected ? "text-primary" : "text-foreground"
            )}
          >
            {pad2(i)}
          </text>
        </g>
      );
    }
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const { x, y } = getClockPosition(i, 60, OUTER_RADIUS - 10);
      markers.push(
        <circle
          key={`tick-${i}`}
          cx={x}
          cy={y}
          r="1"
          fill="currentColor"
          className="text-muted-foreground opacity-60"
        />
      );
    }
    return markers;
  };

  const renderClockHand = () => {
    let handValue: number;
    let handMax: number;
    let handRadius: number;
    if (mode === "hours") {
      handValue = use12Hour ? hours12 : hours % 12;
      handMax = 12;
      handRadius = use12Hour
        ? OUTER_RADIUS
        : hours < 12
        ? INNER_RADIUS
        : OUTER_RADIUS;
    } else {
      handValue = minutes;
      handMax = 60;
      handRadius = OUTER_RADIUS;
    }
    const angle = getAngle(handValue, handMax);
    const angleRad = (angle * Math.PI) / 180;
    const endX = CLOCK_RADIUS + handRadius * Math.cos(angleRad);
    const endY = CLOCK_RADIUS + handRadius * Math.sin(angleRad);

    return (
      <>
        <line
          x1={CLOCK_RADIUS}
          y1={CLOCK_RADIUS}
          x2={endX}
          y2={endY}
          stroke="currentColor"
          className="text-primary"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#shadow)"
        />
        <circle
          cx={endX}
          cy={endY}
          r="6"
          fill="currentColor"
          className="text-primary"
        />
      </>
    );
  };

  const displayHours = pad2(use12Hour ? hours12 : hours);
  const displayMinutes = pad2(minutes);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setTempValue(value);
          setMode("hours");
        }
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 opacity-50" />
          <span>{value || "Select time"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-6" align="start">
        <div className="flex flex-col items-center space-y-6">
          {}
          <div className="flex items-center justify-center gap-4">
            {}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-12 mb-2"
                onClick={() => increment("hours", 1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Input
                  ref={hoursInputRef}
                  type="text"
                  value={displayHours}
                  onChange={handleHoursChange}
                  onKeyDown={handleKeyDown}
                  className="w-20 text-3xl font-bold tabular-nums text-center border-2"
                  aria-label="Hours"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-12 mt-2"
                onClick={() => increment("hours", -1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-3xl font-bold text-muted-foreground pb-6">
              :
            </div>

            {}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-12 mb-2"
                onClick={() => increment("minutes", 1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Input
                  ref={minutesInputRef}
                  type="text"
                  value={displayMinutes}
                  onChange={handleMinutesChange}
                  onKeyDown={handleKeyDown}
                  className="w-20 text-3xl font-bold tabular-nums text-center border-2"
                  aria-label="Minutes"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-12 mt-2"
                onClick={() => increment("minutes", -1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            {}
            {use12Hour && (
              <div className="flex flex-col items-center ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-12 mb-2"
                  onClick={() => !isPM && toggleAMPM()}
                  disabled={isPM}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant={isPM ? "default" : "outline"}
                  className="w-16 h-12 text-lg font-semibold"
                  onClick={toggleAMPM}
                >
                  {isPM ? "PM" : "AM"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-12 mt-2"
                  onClick={() => isPM && toggleAMPM()}
                  disabled={!isPM}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {}
          <div className="flex gap-2">
            <Button
              variant={mode === "hours" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("hours")}
              className="px-4"
            >
              Hours
            </Button>
            <Button
              variant={mode === "minutes" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("minutes")}
              className="px-4"
            >
              Minutes
            </Button>
          </div>

          {}
          <div className="relative">
            <svg
              ref={clockRef}
              width={CLOCK_SIZE}
              height={CLOCK_SIZE}
              viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
              className="cursor-pointer select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <defs>
                <filter
                  id="shadow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="3"
                    floodOpacity="0.3"
                  />
                </filter>
              </defs>

              {}
              <circle
                cx={CLOCK_RADIUS}
                cy={CLOCK_RADIUS}
                r={CLOCK_RADIUS - 2}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border opacity-30"
              />

              {}
              <circle
                cx={CLOCK_RADIUS}
                cy={CLOCK_RADIUS}
                r="6"
                fill="currentColor"
                className="text-muted-foreground opacity-20"
              />

              {mode === "hours" ? renderHourMarkers() : renderMinuteMarkers()}
              {renderClockHand()}

              {}
              <circle
                cx={CLOCK_RADIUS}
                cy={CLOCK_RADIUS}
                r="4"
                fill="currentColor"
                className="text-primary"
              />
            </svg>
          </div>

          {}
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" onClick={setToNow}>
              Now
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempValue(value);
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={confirm}>
                OK
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TimePicker;
