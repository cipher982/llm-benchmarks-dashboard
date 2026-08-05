/**
 * Summary metrics on the provider and model templates.
 *
 * These were four bordered MUI cards on a 12-column grid. At 390px each card
 * spanned the full width, so four numbers cost roughly half a viewport, and the
 * values were set barely larger than the prose beside them — the opposite of
 * "numbers are the typography". It is the Console meter strip now, the same one
 * that opens `/cloud`, `/status` and `/local`, so a measurement looks the same
 * wherever it appears on the site.
 */

import React from "react";
import { MeterStrip } from "../design-system/components";

export interface MetricSummaryItem {
    label: string;
    value: string;
    helperText?: string;
}

interface MetricSummaryGridProps {
    items: MetricSummaryItem[];
}

const MetricSummaryGrid: React.FC<MetricSummaryGridProps> = ({ items }) => {
    if (!items.length) return null;

    return (
        <MeterStrip columns={Math.min(items.length, 4)}>
            {items.map((item) => (
                <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                    {item.helperText && (
                        <dd
                            style={{
                                fontSize: "10px",
                                fontWeight: 400,
                                letterSpacing: 0,
                                marginTop: "4px",
                                opacity: 0.7,
                            }}
                        >
                            {item.helperText}
                        </dd>
                    )}
                </div>
            ))}
        </MeterStrip>
    );
};

export default MetricSummaryGrid;
