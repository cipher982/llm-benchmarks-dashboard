import React from 'react';
import { SegmentedControl, SegmentedOption } from './SegmentedControl';

export type LifecycleFilter = 'all' | 'hideFlagged' | 'flaggedOnly';

interface LifecycleSelectorProps {
  value: LifecycleFilter;
  onChange: (value: LifecycleFilter) => void;
}

const FILTER_OPTIONS: Array<SegmentedOption<LifecycleFilter>> = [
  { value: 'all', label: 'All', description: 'All models' },
  { value: 'hideFlagged', label: 'Active', description: 'Hide flagged models' },
  { value: 'flaggedOnly', label: 'Flagged', description: 'Flagged models only' },
];

export function LifecycleSelector({ value, onChange }: LifecycleSelectorProps) {
  return (
    <SegmentedControl
      label="Lifecycle filter"
      options={FILTER_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
