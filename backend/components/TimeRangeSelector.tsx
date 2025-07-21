import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { colors } from './design-system';

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
      sx={{ 
        mb: 2,
        '& .MuiToggleButton-root': {
          backgroundColor: colors.surfaceElevated,
          color: colors.textPrimary,
          border: `2px outset ${colors.surfaceElevated}`,
          borderRadius: 0,
          padding: '4px 16px',
          fontSize: '11px',
          fontFamily: 'Tahoma, sans-serif',
          textTransform: 'none',
          '&:hover': {
            backgroundColor: colors.hover,
            border: `2px outset ${colors.surfaceElevated}`,
          },
          '&.Mui-selected': {
            backgroundColor: colors.surface,
            border: `2px inset ${colors.surfaceElevated}`,
            '&:hover': {
              backgroundColor: colors.surface,
            },
          },
        },
      }}
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
