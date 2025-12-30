import * as d3 from 'd3';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { Provider, getProviderColor } from '../../theme/theme';
import { SpeedDistributionPoint } from '../../../types/ProcessedData';

interface SpeedDistChartProps {
    data: SpeedDistributionPoint[];
}

interface Point {
    x: number;
    y: number;
}

// Split density curve at breakpoint with interpolation
function splitAtBreakpoint(points: Point[], breakX: number): { left: Point[]; right: Point[] } {
    const left: Point[] = [];
    const right: Point[] = [];

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.x < breakX) {
            left.push(p);
        } else if (p.x > breakX) {
            right.push(p);
        } else {
            // Exactly at breakpoint - add to both
            left.push(p);
            right.push(p);
        }
    }

    // If no exact breakpoint, interpolate one
    const hasExactBreak = points.some(p => p.x === breakX);
    if (!hasExactBreak && left.length > 0 && right.length > 0) {
        // Find segment that crosses breakpoint
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const b = points[i];
            if (a.x < breakX && b.x > breakX) {
                const t = (breakX - a.x) / (b.x - a.x);
                const interpolatedY = a.y + t * (b.y - a.y);
                const breakPoint = { x: breakX, y: interpolatedY };
                left.push(breakPoint);
                right.unshift(breakPoint);
                break;
            }
        }
    }

    return { left, right };
}

// Interface for storing scales in ref
interface ScalesRef {
    xLeft: d3.ScaleLinear<number, number, never>;
    xRight: d3.ScaleLinear<number, number, never>;
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data }) => {
    const theme = useTheme();
    const d3Container = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const scalesRef = useRef<ScalesRef | null>(null);

    // Geometry constants for split-axis chart
    const BREAKPOINT = 140;
    const LEFT_RATIO = 0.75;
    const GAP = 14;

    // Compute RIGHT_MAX from data (round up to nearest 50)
    const RIGHT_MAX = useMemo(() => {
        const maxSpeed = d3.max(data, d => d.mean_tokens_per_second) || 300;
        return Math.max(300, Math.ceil(maxSpeed / 50) * 50);
    }, [data]);

    const clipIdLeft = useMemo(() => `clip-left-${Math.random().toString(36).slice(2, 10)}`, []);
    const clipIdRight = useMemo(() => `clip-right-${Math.random().toString(36).slice(2, 10)}`, []);
    const margin = useMemo(() => ({ top: 30, right: 30, bottom: 70, left: 80 }), []);
    const totalWidth = 1100 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Computed panel widths
    const leftWidth = Math.round((totalWidth - GAP) * LEFT_RATIO);
    const rightWidth = totalWidth - leftWidth - GAP;

    // Use useMemo for y scale to avoid recreation on each render
    const y = useMemo(() => d3.scaleLinear().range([height, 0]), [height]);

    const setupChart = useCallback(() => {
        if (!d3Container.current || svgRef.current) return null;

        const svg = d3.select(d3Container.current)
            .append("svg")
            .attr("viewBox", `0 0 ${totalWidth + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("background", "transparent");

        svgRef.current = svg.node();

        // Create clip paths for both panels
        const defs = svg.append("defs");

        // Left clip region
        defs.append("clipPath")
            .attr("id", clipIdLeft)
            .attr("clipPathUnits", "userSpaceOnUse")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", leftWidth)
            .attr("height", height);

        // Right clip region
        defs.append("clipPath")
            .attr("id", clipIdRight)
            .attr("clipPathUnits", "userSpaceOnUse")
            .append("rect")
            .attr("x", leftWidth + GAP)
            .attr("y", 0)
            .attr("width", rightWidth)
            .attr("height", height);

        return svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }, [totalWidth, height, margin, clipIdLeft, clipIdRight, leftWidth, rightWidth, GAP]);

    const setupScales = useCallback(() => {
        const maxDensity = d3.max(data, d =>
            d.density_points ? d3.max(d.density_points, p => p.y) || 0 : 0
        ) || 0;
        y.domain([0, maxDensity * 1.1]); // Add 10% padding
    }, [data, y]);

    const drawAxes = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        // Remove existing axes and break indicators
        svg.selectAll(".axis").remove();
        svg.selectAll(".break-indicator").remove();
        svg.selectAll(".right-panel-bg").remove();

        // Create scales for the two panels
        const xLeft = d3.scaleLinear()
            .domain([0, BREAKPOINT])
            .range([0, leftWidth]);

        const xRight = d3.scaleLinear()
            .domain([BREAKPOINT, RIGHT_MAX])
            .range([leftWidth + GAP, totalWidth]);

        // Optional: Subtle background tint for right panel
        svg.insert("rect", ":first-child")
            .attr("class", "right-panel-bg")
            .attr("x", leftWidth + GAP)
            .attr("y", 0)
            .attr("width", rightWidth)
            .attr("height", height)
            .style("fill", theme.palette.action.hover)
            .style("opacity", 0.3);

        // Left x-axis (0-140)
        svg.append("g")
            .attr("class", "axis axis-left")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xLeft).ticks(7))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", theme.palette.text.primary);

        // Right x-axis (140-300) - exclude 140 to avoid duplicate tick
        const rightTickValues = d3.range(150, RIGHT_MAX + 1, 50).filter(v => v <= RIGHT_MAX);
        svg.append("g")
            .attr("class", "axis axis-right")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xRight).tickValues(rightTickValues))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", theme.palette.text.primary);

        // Y-axis (shared)
        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", theme.palette.text.primary);

        svg.selectAll(".domain").style("stroke", theme.palette.text.secondary);
        svg.selectAll(".tick line").style("stroke", theme.palette.divider);

        // Break indicator (diagonal lines)
        const breakX = leftWidth + GAP / 2;
        svg.append("g")
            .attr("class", "break-indicator")
            .selectAll("line")
            .data([
                { y1: height - 10, y2: height + 5 },
                { y1: height - 5, y2: height + 10 }
            ])
            .enter()
            .append("line")
            .attr("x1", breakX - 4)
            .attr("x2", breakX + 4)
            .attr("y1", d => d.y1)
            .attr("y2", d => d.y2)
            .style("stroke", theme.palette.text.secondary)
            .style("stroke-width", 1.5);

        // Store scales in ref for use in other functions (avoids type-unsafe DOM storage)
        scalesRef.current = { xLeft, xRight };
    }, [height, y, theme, BREAKPOINT, RIGHT_MAX, leftWidth, rightWidth, GAP, totalWidth]);

    const drawDensityPaths = useCallback((
        svg: d3.Selection<SVGGElement, unknown, null, undefined>,
        tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
    ) => {
        // Remove existing paths and labels
        svg.selectAll(".density-path").remove();
        svg.selectAll(".model-label").remove();

        // Retrieve scales from ref (type-safe)
        if (!scalesRef.current) return;
        const { xLeft, xRight } = scalesRef.current;

        // Create line generators for both panels
        // Using curveMonotoneX instead of curveBasis for better shape preservation at breakpoint
        const lineLeft = d3.line<Point>()
            .x(p => xLeft(p.x))
            .y(p => y(p.y))
            .curve(d3.curveMonotoneX);

        const lineRight = d3.line<Point>()
            .x(p => xRight(p.x))
            .y(p => y(p.y))
            .curve(d3.curveMonotoneX);

        data.forEach((modelData, index) => {
            if (!modelData.density_points) return;

            const { left, right } = splitAtBreakpoint(modelData.density_points, BREAKPOINT);

            // Determine styling based on deprecation status
            const isDeprecated = modelData.deprecated;
            const baseColor = getProviderColor(theme, modelData.provider as Provider);
            const strokeColor = isDeprecated ? '#999999' : baseColor;
            const strokeWidth = isDeprecated ? 1.5 : 2;
            const strokeDasharray = isDeprecated ? '5,5' : 'none';
            const opacity = isDeprecated ? 0.5 : 1;

            const lineIdLeft = `line-left-${index}`;
            const lineIdRight = `line-right-${index}`;

            // Draw left segment (if has points)
            if (left.length > 1) {
                svg.append("path")
                    .datum(left)
                    .attr("class", "density-path density-left")
                    .attr("id", lineIdLeft)
                    .attr("d", lineLeft)
                    .attr("clip-path", `url(#${clipIdLeft})`)
                    .style("fill", "none")
                    .style("stroke", strokeColor)
                    .style("stroke-width", strokeWidth)
                    .style("stroke-dasharray", strokeDasharray)
                    .style("opacity", opacity)
                    .on("mouseover", function(event) {
                        d3.select(this).style("stroke-width", 4);
                        d3.select(`#${lineIdRight}`).style("stroke-width", 4);

                        // Safe tooltip update using text nodes (XSS-safe)
                        tooltip.selectAll("*").remove();
                        tooltip.append("div").text(modelData.display_name);
                        if (isDeprecated) {
                            tooltip.append("div").text("⚠ Deprecated");
                        }
                        tooltip.append("div").text(`Avg: ${modelData.mean_tokens_per_second.toFixed(2)} tokens/s`);

                        tooltip
                            .style("opacity", 1)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this).style("stroke-width", strokeWidth);
                        d3.select(`#${lineIdRight}`).style("stroke-width", strokeWidth);
                        tooltip.style("opacity", 0);
                    });
            }

            // Draw right segment (if has points)
            if (right.length > 1) {
                svg.append("path")
                    .datum(right)
                    .attr("class", "density-path density-right")
                    .attr("id", lineIdRight)
                    .attr("d", lineRight)
                    .attr("clip-path", `url(#${clipIdRight})`)
                    .style("fill", "none")
                    .style("stroke", strokeColor)
                    .style("stroke-width", strokeWidth)
                    .style("stroke-dasharray", strokeDasharray)
                    .style("opacity", opacity)
                    .on("mouseover", function(event) {
                        d3.select(this).style("stroke-width", 4);
                        d3.select(`#${lineIdLeft}`).style("stroke-width", 4);

                        // Safe tooltip update using text nodes (XSS-safe)
                        tooltip.selectAll("*").remove();
                        tooltip.append("div").text(modelData.display_name);
                        if (isDeprecated) {
                            tooltip.append("div").text("⚠ Deprecated");
                        }
                        tooltip.append("div").text(`Avg: ${modelData.mean_tokens_per_second.toFixed(2)} tokens/s`);

                        tooltip
                            .style("opacity", 1)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    })
                    .on("mouseout", function() {
                        d3.select(this).style("stroke-width", strokeWidth);
                        d3.select(`#${lineIdLeft}`).style("stroke-width", strokeWidth);
                        tooltip.style("opacity", 0);
                    });
            }

            // Label placement: use max density point, place in appropriate panel
            const allPoints = [...left, ...right];
            if (allPoints.length === 0) return;

            const maxPoint = allPoints.reduce((prev, curr) => prev.y > curr.y ? prev : curr);
            const labelX = maxPoint.x <= BREAKPOINT ? xLeft(maxPoint.x) : xRight(maxPoint.x);

            const labelColor = isDeprecated ? '#999999' : baseColor;
            const labelText = isDeprecated ? `${modelData.display_name} ⚠` : modelData.display_name;

            svg.append("text")
                .attr("class", "model-label")
                .attr("x", labelX)
                .attr("y", y(maxPoint.y))
                .attr("dx", "0.5em")
                .attr("dy", "-0.5em")
                .style("fill", labelColor)
                .style("font-size", "12px")
                .style("font-style", isDeprecated ? "italic" : "normal")
                .style("opacity", opacity)
                .text(labelText);
        });
    }, [data, y, theme, clipIdLeft, clipIdRight, BREAKPOINT]);

    const drawLabels = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        // Remove existing labels
        svg.selectAll(".axis-label").remove();
        svg.selectAll(".panel-label").remove();

        // Main y-axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .attr("fill", theme.palette.text.primary)
            .style("font-weight", theme.typography.fontWeightMedium || 500)
            .text("Density");

        // Panel labels
        // "Common Range" label for left panel
        svg.append("text")
            .attr("class", "panel-label")
            .attr("x", leftWidth / 2)
            .attr("y", height + 45)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", theme.palette.text.secondary)
            .text("Common Range (0-140)");

        // "Speed Leaders" label for right panel
        svg.append("text")
            .attr("class", "panel-label")
            .attr("x", leftWidth + GAP + rightWidth / 2)
            .attr("y", height + 45)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", theme.palette.text.secondary)
            .text("⚡ Speed Leaders");
    }, [height, margin, theme, leftWidth, rightWidth, GAP]);

    const drawLegend = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        // Remove existing legend
        svg.selectAll(".legend").remove();

        const providers = Array.from(new Set(data.map(d => d.provider))) as Provider[];
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("font-family", "sans-serif")
            .attr("font-size", "12px")
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(providers)
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(${totalWidth - 120},${i * 20})`);

        // Add colored rectangles
        legend.append("rect")
            .attr("x", 0)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => getProviderColor(theme, d));

        // Add text labels
        legend.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.32em")
            .style("fill", theme.palette.text.primary)
            .text(d => d);
    }, [data, totalWidth, theme]);

    useEffect(() => {
        if (!data?.length) return;

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", theme.palette.background.paper)
            .style("color", theme.palette.text.primary)
            .style("border", `1px solid ${theme.palette.divider}`)
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("pointer-events", "none");

        const svg = setupChart();
        if (!svg) return;

        setupScales();
        drawAxes(svg);
        drawDensityPaths(svg, tooltip as any);
        drawLabels(svg);
        drawLegend(svg);

        // Cleanup function
        return () => {
            if (svgRef.current) {
                d3.select(svgRef.current).remove();
                svgRef.current = null;
            }
            tooltip.remove();
        };
    }, [data, setupChart, setupScales, drawAxes, drawDensityPaths, drawLabels, drawLegend, theme.palette.background.paper, theme.palette.divider, theme.palette.text.primary]);

    return <div ref={d3Container} style={{ width: '100%', height: '100%' }} />;
};

export default React.memo(SpeedDistChart);
