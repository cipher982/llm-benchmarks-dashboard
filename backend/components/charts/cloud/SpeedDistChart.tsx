import * as d3 from 'd3';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { Provider, getProviderColor } from '../../theme/theme';
import { SpeedDistributionPoint } from '../../../types/ProcessedData';

interface SpeedDistChartProps {
    data: SpeedDistributionPoint[];
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data }) => {
    const theme = useTheme();
    const d3Container = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const clipId = useMemo(() => `speed-dist-clip-${Math.random().toString(36).slice(2, 10)}`, []);
    const margin = useMemo(() => ({ top: 30, right: 30, bottom: 70, left: 80 }), []);
    const width = 1100 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    const setupChart = useCallback(() => {
        if (!d3Container.current || svgRef.current) return null;
        
        const svg = d3.select(d3Container.current)
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("background", "transparent");

        svgRef.current = svg.node();

        svg.append("defs")
            .append("clipPath")
            .attr("id", clipId)
            .attr("clipPathUnits", "userSpaceOnUse")
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height);

        return svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }, [width, height, margin, clipId]);

    const setupScales = useCallback(() => {
        // Auto-scale x-domain to data range with padding
        const maxSpeed = d3.max(data, d =>
            d.density_points ? d3.max(d.density_points, p => p.x) || 0 : 0
        ) || 150;
        x.domain([0, Math.ceil(maxSpeed / 50) * 50]); // Round up to nearest 50
        const maxDensity = d3.max(data, d =>
            d.density_points ? d3.max(d.density_points, p => p.y) || 0 : 0
        ) || 0;
        y.domain([0, maxDensity * 1.1]); // Add 10% padding
    }, [data, x, y]);

    const drawAxes = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        // Remove existing axes
        svg.selectAll(".axis").remove();

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", theme.palette.text.primary);

        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", theme.palette.text.primary);

        svg.selectAll(".domain").style("stroke", theme.palette.text.secondary);
        svg.selectAll(".tick line").style("stroke", theme.palette.divider);
    }, [height, x, y, theme]);

    const drawDensityPaths = useCallback((
        svg: d3.Selection<SVGGElement, unknown, null, undefined>,
        tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
    ) => {
        // Remove existing paths and labels
        svg.selectAll(".density-path").remove();
        svg.selectAll(".model-label").remove();

        const [xMin, xMax] = x.domain();

        data.forEach((modelData, index) => {
            if (!modelData.density_points) return;

            const visibleDensityPoints = modelData.density_points.filter(p => p.x >= xMin && p.x <= xMax);
            if (visibleDensityPoints.length === 0) return;

            const maxDensityPoint = visibleDensityPoints.reduce((prev, current) =>
                (prev.y > current.y) ? prev : current
            );

            const lineId = `line-${index}`;
            const textId = `text-${index}`;

            const line = d3.line<{x: number, y: number}>()
                .x(d => x(d.x))
                .y(d => y(d.y))
                .curve(d3.curveBasis);

            // Determine styling based on deprecation status
            const isDeprecated = modelData.deprecated;
            const baseColor = getProviderColor(theme, modelData.provider as Provider);
            const strokeColor = isDeprecated ? '#999999' : baseColor;
            const strokeWidth = isDeprecated ? 1.5 : 2;
            const strokeDasharray = isDeprecated ? '5,5' : 'none';
            const opacity = isDeprecated ? 0.5 : 1;

            // Draw density path
            svg.append("path")
                .datum(visibleDensityPoints)
                .attr("class", "density-path")
                .attr("id", lineId)
                .attr("d", line)
                .attr("clip-path", `url(#${clipId})`)
                .style("fill", "none")
                .style("stroke", strokeColor)
                .style("stroke-width", strokeWidth)
                .style("stroke-dasharray", strokeDasharray)
                .style("opacity", opacity)
                .on("mouseover", function(event) {
                    d3.select(this)
                        .style("stroke-width", 4);

                    const tooltipHtml = isDeprecated
                        ? `${modelData.display_name}<br/>⚠ Deprecated<br/>Avg: ${modelData.mean_tokens_per_second.toFixed(2)} tokens/s`
                        : `${modelData.display_name}<br/>Avg: ${modelData.mean_tokens_per_second.toFixed(2)} tokens/s`;

                    tooltip
                        .style("opacity", 1)
                        .html(tooltipHtml)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .style("stroke-width", 2);
                    tooltip.style("opacity", 0);
                });

            // Add model label
            const labelColor = isDeprecated ? '#999999' : getProviderColor(theme, modelData.provider as Provider);
            const labelText = isDeprecated ? `${modelData.display_name} ⚠` : modelData.display_name;

            svg.append("text")
                .attr("class", "model-label")
                .attr("id", textId)
                .attr("x", x(maxDensityPoint.x))
                .attr("y", y(maxDensityPoint.y))
                .attr("clip-path", `url(#${clipId})`)
                .attr("dx", "0.5em")
                .attr("dy", "-0.5em")
                .style("fill", labelColor)
                .style("font-size", "12px")
                .style("font-style", isDeprecated ? "italic" : "normal")
                .style("opacity", opacity)
                .text(labelText);
        });
    }, [data, x, y, theme, clipId]);

    const drawLabels = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        // Remove existing labels
        svg.selectAll(".axis-label").remove();

        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2 + 10)
            .attr("fill", theme.palette.text.primary)
            .style("font-weight", theme.typography.fontWeightMedium || 500)
            .text("Tokens per Second");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)  
            .attr("x", -height / 2)
            .attr("fill", theme.palette.text.primary)
            .style("font-weight", theme.typography.fontWeightMedium || 500)
            .text("Density");
    }, [width, height, margin, theme]);

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
            .attr("transform", (d, i) => `translate(${width - 120},${i * 20})`);

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
    }, [data, width, theme]);

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
