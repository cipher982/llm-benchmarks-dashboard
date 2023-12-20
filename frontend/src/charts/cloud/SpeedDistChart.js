import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

const SpeedDistChart = ({ data }) => {
    const d3Container = useRef(null);
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const providers = [...new Set(data.map(d => d.provider))];

    // Define scales
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Define color scale
    const colorScale = d3.scaleOrdinal()
        .domain(providers)
        .range(["#FF0000", "#7FFF00", "#00FFFF"]);

    useEffect(() => {
        if (data && d3Container.current) {
            const svg = setupChart();
            setupScales(svg);
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

    const setupScales = (svg) => {
        // x.domain(d3.extent(data.flatMap(d => d.tokens_per_second)));
        x.domain([0, d3.max(data.flatMap(d => d.tokens_per_second))]);
        y.domain([0, getMaxDensity()]);
    };

    const getMaxDensity = () => {
        const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40));
        return d3.max(data.flatMap(modelData => {
            return kde(modelData.tokens_per_second).map(d => d[1]);
        }));
    };

    const drawAxes = (svg) => {
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));
    };


    const drawDensityPaths = (svg) => {
        const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40));

        data.forEach((modelData, index) => {
            const densityData = kde(modelData.tokens_per_second);
            const maxDensityPoint = densityData.reduce((prev, current) => (prev[1] > current[1]) ? prev : current);

            // Assign a unique ID to each path and text element
            const lineId = `line-${index}`;
            const textId = `text-${index}`;

            const path = svg.append("path")
                .datum(densityData)
                .attr("id", lineId)
                .attr("fill", "none")
                .attr("opacity", ".9")
                .attr("stroke", colorScale(modelData.provider)) // Use provider to assign color
                .attr("stroke-width", 2.5)
                .attr("d", d3.line()
                    .curve(d3.curveBasis)
                    .x(d => x(d[0]))
                    .y(d => y(d[1])));

            path.on("mouseover", function (event, d) {
                d3.select(this).raise().attr("stroke-width", 5);
                d3.select(`#${textId}`).raise().style("font-weight", "bold").style("font-size", "14px");
            })
                .on("mouseout", function (d) {
                    d3.select(this).attr("stroke-width", 2.5);
                    d3.select(`#${textId}`).style("font-weight", "normal").style("font-size", "10px");
                });

            // Add label to the line at the peak of the distribution
            svg.append("text")
                .attr("id", textId)
                .attr("x", x(maxDensityPoint[0]))
                .attr("y", y(maxDensityPoint[1]) - 10)
                .attr("text-anchor", "middle")
                .style("fill", colorScale(modelData.provider))
                .style("font-size", "10px")
                .text(modelData.model_name);
        });
    };


    const drawLabels = (svg) => {
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

    const drawLegend = (svg) => {
        const legend = svg.selectAll(".legend")
            .data(colorScale.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(0,${i * 20})`);

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
            .style("font-size", "15px")  // Reduced the font size to make the text smaller
            .text(d => d);
    };

    function kernelDensityEstimator(kernel, X) {
        return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    }


    function kernelEpanechnikov(k) {
        return v => Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    }

    return (
        <div ref={d3Container} />
    );
};

export default SpeedDistChart;