import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

interface DataItem {
    provider: string;
    model_name: string;
    tokens_per_second: number[];
    display_name?: string;
}

interface Margin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface SpeedDistChartProps {
    data: DataItem[];
}

const SpeedDistChart: React.FC<SpeedDistChartProps> = ({ data }) => {
    const d3Container = useRef<SVGSVGElement | null>(null);
    const margin: Margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width: number = 800 - margin.left - margin.right;
    const height: number = 400 - margin.top - margin.bottom;

    // Filter data first
    data = data.filter(d => !d.model_name.includes('amazon'));

    const providers: string[] = [...new Set(data.map(d => d.provider))];

    // Define scales
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Define color scale
    const colorScale = d3.scaleOrdinal()
        .domain(providers)
        .range(d3.schemeCategory10);

    useEffect(() => {
        if (data && d3Container.current) {

            // Then, map the model names to their combined names
            data = data.map(d => ({
                ...d,
                model_name: `${d.provider}-${d.model_name || d.model_name}`,
                display_name: d.model_name || d.model_name,
            }));

            // Group data by model_name
            data = Object.values(data.reduce((acc: { [key: string]: DataItem }, d) => {
                if (!acc[d.model_name]) {
                    acc[d.model_name] = { ...d, tokens_per_second: [] };
                }
                acc[d.model_name].tokens_per_second.push(...d.tokens_per_second);
                return acc;
            }, {}));

            // Convert the grouped data back into an array
            data = Object.values(data);

            const svg = setupChart();
            setupScales();
            drawAxes(svg);
            drawDensityPaths(svg);
            drawLabels(svg);
            drawLegend(svg);
        }
    }, [data]);

    const setupChart = () => {
        d3.select(d3Container.current).selectAll("*").remove();
        const svg = d3.select(d3Container.current)
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        return svg;
    };

    const setupScales = () => {
        // x.domain(d3.extent(data.flatMap(d => d.tokens_per_second)));
        x.domain([0, 140]);
        // x.domain([0, d3.max(data.flatMap(d => d.tokens_per_second))]);
        y.domain([0, getMaxDensity()]);
    };

    const getMaxDensity = () => {
        const kde = kernelDensityEstimator(kernelEpanechnikov(6), x.ticks(40));
        return d3.max(data.flatMap(modelData => {
            return kde(modelData.tokens_per_second).map(d => d[1]);
        }));
    };

    const drawAxes = (svg: any) => {
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", "14px");

        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d3.format(".2f")))
            .selectAll("text")
            .style("font-size", "14px");
    };


    const drawDensityPaths = (svg: any) => {
        const kde = kernelDensityEstimator(kernelEpanechnikov(6), x.ticks(40));

        data.forEach((modelData, index) => {
            const densityData = kde(modelData.tokens_per_second);
            const maxDensityPoint = densityData.reduce((prev: any, current: any) => (prev[1] > current[1]) ? prev : current);

            // Assign a unique ID to each path and text element
            const lineId = `line-${index}`;
            const textId = `text-${index}`;

            // Hovering and not
            const NORMAL_STROKE_WIDTH = 2.5;
            const HOVER_STROKE_WIDTH = 7;
            const NORMAL_FONT_SIZE = "10px";
            const HOVER_FONT_SIZE = "16px";

            const path = svg.append("path")
                .datum(densityData)
                .attr("id", lineId)
                .attr("fill", "none")
                .attr("opacity", ".9")
                .attr("stroke", colorScale(modelData.provider))
                .attr("stroke-width", NORMAL_STROKE_WIDTH)
                .attr("d", d3.line()
                    .curve(d3.curveBasis)
                    .x((d: [number, number]) => x(d[0]))
                    .y((d: [number, number]) => y(d[1]))
                );

                path.on("mouseover", () => {
                    d3.select(this).raise().attr("stroke-width", HOVER_STROKE_WIDTH);
                    d3.select(`#${textId}`).raise().style("font-weight", "bold").style("font-size", HOVER_FONT_SIZE);
                }).on("mouseout", () => {
                    d3.select(this).attr("stroke-width", NORMAL_STROKE_WIDTH);
                    d3.select(`#${textId}`).style("font-weight", "normal").style("font-size", NORMAL_FONT_SIZE);
                });

            // Add label to the line at the peak of the distribution
            svg.append("text")
                .attr("id", textId)
                .attr("x", x(maxDensityPoint[0]))
                .attr("y", y(maxDensityPoint[1]) - 10)
                .attr("text-anchor", "middle")
                .style("fill", colorScale(modelData.provider))
                .style("font-size", NORMAL_FONT_SIZE)
                .text(modelData.display_name ? modelData.display_name.split('/')[1] || modelData.display_name : "");        });
    };


    const drawLabels = (svg: any) => {
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
    };

    const drawLegend = (svg: any) => {
        const legend = svg.selectAll(".legend")
            .data(colorScale.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (_: any, i: number) => `translate(0,${i * 20})`);
            // .attr("transform", (d, i) => `translate(0,${height / 2 + i * 20})`);

        legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", colorScale);

        legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .style("fill", "white")
            .style("font-size", "15px")
            .text((d: string) => d);
    };

    function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
        return (V: number[]) => X.map(x => [x, d3.mean(V, (v: number) => kernel(x - v)) || 0]);
    }


    function kernelEpanechnikov(k: number): (v: number) => number {
        return (v: number): number => {
            v /= k;
            return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }

    return (
        <div ref={d3Container as any} />
    );
};

export default SpeedDistChart;