/**
 * Questions and answers on the document templates.
 *
 * These were MUI accordions with a 600-weight subtitle on a raised panel and a
 * 2px gap between each, which made "Which groq model is fastest?" the largest
 * and brightest thing on a page whose largest thing is supposed to be a
 * measured value. They are rows on hairlines now — the same shape as every
 * other list on the site — and the question is set at body size rather than
 * heading size.
 *
 * Still native `<details>`/`<summary>`: it needs no JavaScript, it is
 * expandable without a library, and search engines index the answer whether or
 * not it is open.
 */

import React from "react";
import { styled } from "@mui/material/styles";
import { colors, typography, spacing } from "../design-system";

export interface FAQItem {
    question: string;
    answer: React.ReactNode;
}

interface FAQAccordionProps {
    items: FAQItem[];
}

const Item = styled("details")({
    borderBottom: `1px solid ${colors.ruleSoft}`,

    "& > summary": {
        display: "flex",
        alignItems: "baseline",
        gap: `${spacing.scale[2]}px`,
        listStyle: "none",
        cursor: "pointer",
        padding: `${spacing.scale[2]}px 0`,
        fontFamily: typography.fontFamily,
        fontSize: typography.sizes.base,
        color: colors.text,
    },
    "& > summary::-webkit-details-marker": { display: "none" },
    "& > summary::before": {
        content: '"+"',
        fontFamily: typography.monoFamily,
        fontSize: typography.sizes.sm,
        color: colors.textMute,
        width: "10px",
        flexShrink: 0,
    },
    "&[open] > summary::before": { content: '"−"', color: colors.accent },
    "& > summary:hover": { color: colors.accent },
    "& > summary:focus-visible": {
        outline: `1px solid ${colors.accent}`,
        outlineOffset: "2px",
    },

    "& > div": {
        padding: `0 0 ${spacing.scale[3]}px ${spacing.scale[5]}px`,
        maxWidth: "88ch",
        fontFamily: typography.fontFamily,
        fontSize: typography.sizes.sm,
        lineHeight: typography.lineHeights.relaxed,
        color: colors.textMute,
    },
    "& > div a": { color: colors.accent },
});

const FAQAccordion: React.FC<FAQAccordionProps> = ({ items }) => {
    if (!items.length) return null;

    return (
        <div>
            {items.map((item) => (
                <Item key={item.question}>
                    <summary>{item.question}</summary>
                    <div>{item.answer}</div>
                </Item>
            ))}
        </div>
    );
};

export default FAQAccordion;
