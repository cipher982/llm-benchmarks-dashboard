import React from 'react';
import { SegmentedControl, SegmentedOption } from './SegmentedControl';

export interface TimeRange {
  days: number;
  label: string;
}

interface TimeRangeSelectorProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

const timeRanges: Array<SegmentedOption<number>> = [
  { value: 1, label: '1D', description: '1 day' },
  { value: 3, label: '3D', description: '3 days' },
  { value: 7, label: '7D', description: '7 days' },
  { value: 14, label: '14D', description: '14 days' },
  { value: 30, label: '30D', description: '30 days' },
];

export function TimeRangeSelector({ selectedDays, onChange }: TimeRangeSelectorProps) {
  return (
    <SegmentedControl
      label="Time range"
      options={timeRanges}
      value={selectedDays}
      onChange={onChange}
    />
  );
}
