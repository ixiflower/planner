"use client";

import * as React from "react";
import { CalendarPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";

export function Calendar32() {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  const minDate = new Date(2025, 0, 1);
  const maxDate = new Date(2030, 11, 31);

  const isDateDisabled = (date: Date) => {
    return date < minDate || date > maxDate;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setDate(date);
  };

  const handleAddEvent = () => {
    console.log("Event created for date:", date);
    setOpen(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Label htmlFor="date" className="text-center text-2xl">
        Set an Event
      </Label>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <CalendarPlusIcon />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="w-auto overflow-hidden p-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Select date</DrawerTitle>
            <DrawerDescription>Set your date of Event</DrawerDescription>
          </DrawerHeader>
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            fromYear={2025}
            toYear={2030}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            className="mx-auto [--cell-size:clamp(0px,calc(100vw/7.5),52px)]"
          />
          <Button
            variant={"secondary"}
            className="m-2 h-10"
            onClick={handleAddEvent}
          >
            Add Event
          </Button>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
