"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

type Props = {
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
};

function RateSlider({ value, onChange, label = "Select Performance" }: Props) {
  const [internal, setInternal] = useState<number>(value ?? 3);

  const current = value ?? internal;
  const sliderValue = [current];

  const emojis = ["😡", "🙁", "😐", "🙂", "😍"];

  return (
    <div className="space-y-3 min-w-[240px] w-full">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Slider
          value={sliderValue}
          onValueChange={(v) => {
            const n = v[0];
            setInternal(n);
            onChange?.(n);
          }}
          min={1}
          max={5}
          aria-label="Rate performance"
        />
        <span className="text-2xl">{emojis[current - 1]}</span>
      </div>
    </div>
  );
}

export { RateSlider };
