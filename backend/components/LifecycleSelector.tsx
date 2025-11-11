import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { colors } from './design-system';

export type LifecycleFilter = 'all' | 'hideFlagged' | 'flaggedOnly';

interface LifecycleSelectorProps {
  value: LifecycleFilter;
  onChange: (value: LifecycleFilter) => void;
}

const FILTER_OPTIONS: Array<{ value: LifecycleFilter; label: string }> = [
  { value: 'all', label: 'All models' },
  { value: 'hideFlagged', label: 'Hide flagged' },
  { value: 'flaggedOnly', label: 'Flagged only' },
];

export function LifecycleSelector({ value, onChange }: LifecycleSelectorProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, val) => val && onChange(val)}
      aria-label="lifecycle filter"
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
      {FILTER_OPTIONS.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          aria-label={`${option.label} filter`}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
