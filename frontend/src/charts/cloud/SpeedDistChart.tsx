import * as d3 from 'd3';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Provider, providerColors } from '../../theme/theme';
import { SpeedDistributionPoint } from '../../types/ProcessedData';

interface SpeedDistChartProps {
    data: SpeedDistributionPoint[];
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data }) => {
    const d3Container = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
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
        return svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }, [width, height, margin]);

    const setupScales = useCallback(() => {
        x.domain([0, 140]);
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
            .style("fill", "white");

        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", "white");

        svg.selectAll(".domain").style("stroke", "white");
        svg.selectAll(".tick line").style("stroke", "white");
    }, [height, x, y]);

    const drawDensityPaths = useCallback((
        svg: d3.Selection<SVGGElement, unknown, null, undefined>,
        tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
    ) => {
        // Remove existing paths and labels
        svg.selectAll(".density-path").remove();
        svg.selectAll(".model-label").remove();

        data.forEach((modelData, index) => {
            if (!modelData.density_points) return;

            const maxDensityPoint = modelData.density_points.reduce((prev, current) => 
                (prev.y > current.y) ? prev : current
            );

            const lineId = `line-${index}`;
            const textId = `text-${index}`;

            const line = d3.line<{x: number, y: number}>()
                .x(d => x(d.x))
                .y(d => y(d.y))
                .curve(d3.curveBasis);

            // Draw density path
            svg.append("path")
                .datum(modelData.density_points)
                .attr("class", "density-path")
                .attr("id", lineId)
                .attr("d", line)
                .style("fill", "none")
                .style("stroke", providerColors[modelData.provider as Provider] || "#fff")
                .style("stroke-width", 2)
                .on("mouseover", function(event) {
                    d3.select(this)
                        .style("stroke-width", 4);
                    
                    tooltip
                        .style("opacity", 1)
                        .html(`${modelData.display_name}<br/>Mean: ${modelData.mean_tokens_per_second.toFixed(2)} tokens/s`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .style("stroke-width", 2);
                    tooltip.style("opacity", 0);
                });

            // Add model label
            svg.append("text")
                .attr("class", "model-label")
                .attr("id", textId)
                .attr("x", x(maxDensityPoint.x))
                .attr("y", y(maxDensityPoint.y))
                .attr("dx", "0.5em")
                .attr("dy", "-0.5em")
                .style("fill", providerColors[modelData.provider as Provider] || "#fff")
                .style("font-size", "12px")
                .text(modelData.display_name);
        });
    }, [data, x, y]);

    const drawLabels = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        // Remove existing labels
        svg.selectAll(".axis-label").remove();

        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2 + 10)
            .attr("fill", "white")
            .text("Tokens per Second");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)  
            .attr("x", -height / 2)
            .attr("fill", "white")
            .text("Density");
    }, [width, height, margin]);

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
            .attr("fill", d => providerColors[d]);

        // Add text labels
        legend.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.32em")
            .style("fill", "white")
            .text(d => d);
    }, [data, width]);

    useEffect(() => {
        if (!data?.length) return;

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
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
    }, [data, setupChart, setupScales, drawAxes, drawDensityPaths, drawLabels, drawLegend]);

    return <div ref={d3Container} style={{ width: '100%', height: '100%' }} />;
};

export default React.memo(SpeedDistChart);