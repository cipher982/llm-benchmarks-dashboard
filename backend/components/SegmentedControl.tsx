/**
 * The one control shape the site uses.
 *
 * A strip of small flat rectangles, pressed state filled with the accent. It
 * sits on the right of a section rail, which is why it is sized to fit inside
 * one — 20px tall, mono, all-caps, no margin of its own.
 */

import React from 'react';
import { styled } from '@mui/material/styles';
import { colors, typography, sizing, spacing } from './design-system';

const Strip = styled('div')({
    display: 'inline-flex',
    gap: '1px',
});

const Segment = styled('button')<{ $pressed: boolean }>(({ $pressed }) => ({
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.normal,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    lineHeight: 1,
    padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
    minHeight: `${sizing.buttonHeight.sm}px`,
    borderRadius: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'color 80ms linear, background-color 80ms linear',

    backgroundColor: $pressed ? colors.accent : colors.raised,
    color: $pressed ? colors.accentInk : colors.textMute,
    border: `1px solid ${$pressed ? colors.accent : colors.rule}`,

    '&:hover': {
        color: $pressed ? colors.accentInk : colors.text,
    },
    '&:focus-visible': {
        outline: `1px solid ${colors.accent}`,
        outlineOffset: '1px',
    },
}));

export interface SegmentedOption<T> {
    value: T;
    label: string;
    /** Read by assistive tech in place of the abbreviated label. */
    description?: string;
}

interface SegmentedControlProps<T> {
    options: Array<SegmentedOption<T>>;
    value: T;
    onChange: (value: T) => void;
    label: string;
}

export function SegmentedControl<T extends string | number>({
    options,
    value,
    onChange,
    label,
}: SegmentedControlProps<T>) {
    return (
        <Strip role="group" aria-label={label}>
            {options.map((option) => {
                const pressed = option.value === value;
                return (
                    <Segment
                        key={String(option.value)}
                        type="button"
                        $pressed={pressed}
                        aria-pressed={pressed}
                        aria-label={option.description ?? option.label}
                        onClick={() => !pressed && onChange(option.value)}
                    >
                        {option.label}
                    </Segment>
                );
            })}
        </Strip>
    );
}
