import * as React from "react";
import { format } from "date-fns";

interface Props {
  hour: number;
}

const TimeSlot: React.FC<Props> = ({ hour }) => {
  return (
    <div className="relative" style={{ height: "48px", minHeight: "48px" }}>
      <div className="absolute -top-3 right-1 flex h-6 items-center">
        <span className="text-[0.6rem] text-muted-foreground">
          {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
        </span>
      </div>

      {}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {}
        <div className="absolute top-1/4 w-2 border-t border-muted-foreground/30"></div>

        {}
        <div className="absolute top-1/2 w-2 border-t border-muted-foreground/30"></div>

        {}
        <div className="absolute top-3/4 w-2 border-t border-muted-foreground/30"></div>
      </div>
    </div>
  );
};

export default TimeSlot;