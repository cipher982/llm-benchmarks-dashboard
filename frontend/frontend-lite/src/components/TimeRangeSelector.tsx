import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

export interface TimeRange {
  days: number;
  label: string;
}

interface TimeRangeSelectorProps {
  selectedDays: number;
  onChange: (days: number) => void;
}

const timeRanges: TimeRange[] = [
  { days: 1, label: '24h' },
  { days: 3, label: '3d' },
  { days: 7, label: '1w' },
  { days: 14, label: '2w' },
  { days: 30, label: '1m' },
];

export function TimeRangeSelector({ selectedDays, onChange }: TimeRangeSelectorProps) {
  return (
    <ToggleButtonGroup
      value={selectedDays}
      exclusive
      onChange={(_, days) => days && onChange(days)}
      aria-label="time range"
      size="small"
      sx={{ mb: 2 }}
    >
      {timeRanges.map((range) => (
        <ToggleButton
          key={range.days}
          value={range.days}
          aria-label={`${range.label} time range`}
        >
          {range.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
