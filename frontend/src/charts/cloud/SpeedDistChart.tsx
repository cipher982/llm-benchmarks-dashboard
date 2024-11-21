import * as d3 from 'd3';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Provider, providerColors } from '../../theme/theme';
import { SpeedDistributionPoint } from '../../types/ProcessedData';

interface SpeedDistChartProps {
    data: SpeedDistributionPoint[];
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data }) => {
    const d3Container = useRef<HTMLDivElement | null>(null);
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = 1100 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Memoize the processed data
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data
            .filter(d => !d.model_name.includes('amazon'))
            .map(d => ({
                ...d,
                model_name: `${d.provider}-${d.model_name}`,
                display_name: d.model_name,
                tokens_per_second: d.tokens_per_second.filter(val => val <= 140)
            }))
            .filter(d => d.tokens_per_second.length > 0);
    }, [data]);

    const setupChart = useCallback(() => {
        if (!d3Container.current) return null;
        const container = d3Container.current;
        
        // Clear any existing SVG
        d3.select(container).selectAll("svg").remove();

        return d3.select(container)
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("background", "transparent")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }, [width, height, margin]);

    const x = d3.scaleLinear()
        .range([0, width]);

    const y = d3.scaleLinear()
        .range([height, 0]);

    const setupScales = useCallback((processedData: SpeedDistributionPoint[]) => {
        // Set fixed x domain from 0 to 140
        x.domain([0, 140]);

        const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100));
        const maxDensity = d3.max(processedData.map(d => {
            const density = kde(d.tokens_per_second);
            return d3.max(density, d => d[1]) || 0;
        })) || 0;

        y.domain([0, maxDensity]);
    }, [width, height]);

    const drawAxes = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", "white");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "14px")
            .style("fill", "white");

        // Color the axis lines white
        svg.selectAll(".domain")
            .style("stroke", "white");
        svg.selectAll(".tick line")
            .style("stroke", "white");
    }, [height, x, y]);

    const drawDensityPaths = useCallback((
        svg: d3.Selection<SVGGElement, unknown, null, undefined>,
        tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>,
        processedData: SpeedDistributionPoint[]
    ) => {
        const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(100));

        processedData.forEach((modelData, index) => {
            const densityData = kde(modelData.tokens_per_second);
            // console.log(`Density data for ${modelData.model_name}:`, densityData);

            const maxDensityPoint = densityData.reduce((prev: any, current: any) => 
                (prev[1] > current[1]) ? prev : current
            );

            const lineId = `line-${index}`;
            const textId = `text-${index}`;

            const NORMAL_STROKE_WIDTH = 2.5;
            const HOVER_STROKE_WIDTH = 7;
            const NORMAL_FONT_SIZE = "10px";
            const HOVER_FONT_SIZE = "16px";

            const path = svg.append("path")
                .datum(densityData)
                .attr("id", lineId)
                .attr("fill", "none")
                .attr("opacity", ".9")
                .attr("stroke", providerColors[modelData.provider as Provider])
                .attr("stroke-width", NORMAL_STROKE_WIDTH)
                .attr("d", d3.line()
                    .curve(d3.curveBasis)
                    .x((d: [number, number]) => x(d[0]))
                    .y((d: [number, number]) => y(d[1]))
                );

            path.on("mouseover", function(event: any) {
                d3.select(event.currentTarget)
                    .raise()
                    .attr("stroke-width", HOVER_STROKE_WIDTH);
                d3.select(`#${textId}`)
                    .raise()
                    .style("font-weight", "bold")
                    .style("font-size", HOVER_FONT_SIZE);
                tooltip.style("visibility", "visible")
                    .html(`${modelData.provider}<br>${modelData.model_name}`);
            })
            .on("mousemove", function(event: any) {
                tooltip.style("top", (event.pageY + 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function(event: any) {
                d3.select(event.currentTarget)
                    .attr("stroke-width", NORMAL_STROKE_WIDTH);
                d3.select(`#${textId}`)
                    .style("font-weight", "normal")
                    .style("font-size", NORMAL_FONT_SIZE);
                tooltip.style("visibility", "hidden");
            });

            svg.append("text")
                .attr("id", textId)
                .attr("x", x(maxDensityPoint[0]))
                .attr("y", y(maxDensityPoint[1]) - 10)
                .attr("text-anchor", "middle")
                .style("fill", providerColors[modelData.provider as Provider])
                .style("font-size", NORMAL_FONT_SIZE)
                .text(modelData.model_name);
        });
    }, [x, y]);

    const drawLabels = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2 + 10)
            .attr("fill", "white")
            .text("Tokens per Second");

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left / 2 - 17)
            .attr("x", -height / 2)
            .attr("fill", "white")
            .text("Density");
    }, [width, height, margin]);

    const drawLegend = useCallback((svg: d3.Selection<SVGGElement, unknown, null, undefined>) => {
        const providers = Array.from(new Set(data.map(d => d.provider))) as Provider[];
        const legend = svg.append("g")
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
            .attr("fill", d => providerColors[d as Provider]);

        // Add text labels
        legend.append("text")
            .attr("x", 24)  // Increased spacing between rect and text
            .attr("y", 9)
            .attr("dy", "0.32em")
            .style("fill", "white")
            .text(d => d);
    }, [data, width]);

    const kernelDensityEstimator = (kernel: (v: number) => number, X: number[]) => {
        return (V: number[]): [number, number][] => {
            return X.map(x => [x, d3.mean(V, v => kernel(x - v)) || 0]);
        };
    };

    const kernelEpanechnikov = (k: number) => {
        return (v: number): number => {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    };

    useEffect(() => {
        if (!processedData.length || !d3Container.current) {
            return;
        }

        const svg = setupChart();
        if (!svg) return;

        setupScales(processedData);
        drawAxes(svg);

        // Create tooltip once
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
            .style("color", "black")
            .style("border-radius", "5px")
            .style("padding", "5px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("font-weight", "bold");

        drawDensityPaths(svg, tooltip, processedData);
        drawLabels(svg);
        drawLegend(svg);

        return () => {
            // Clean up
            tooltip.remove();
            if (d3Container.current) {
                d3.select(d3Container.current).selectAll("svg").remove();
            }
        };
    }, [processedData, setupChart, setupScales, drawAxes, drawDensityPaths, drawLabels, drawLegend]);

    return (
        <div
            ref={d3Container}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '600px'
            }}
        />
    );
};

export default React.memo(SpeedDistChart);