import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

const SpeedChart = ({ data }) => {
    const d3Container = useRef(null);
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const svgWidth = 800;
    const svgHeight = 400;

    // Define scales outside to be accessible by other functions
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Define your light purple background color in RGB
    const backgroundColor = [102, 51, 153];

    // Function to calculate the Euclidean distance between two colors
    function colorDistance(color1, color2) {
        return Math.sqrt(
            Math.pow(color1[0] - color2[0], 2) +
            Math.pow(color1[1] - color2[1], 2) +
            Math.pow(color1[2] - color2[2], 2)
        );
    }

    // Convert a hex color to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    }

    // Filter out colors that are too close to the background color
    const colorThreshold = 50;
    const customColors = d3.schemeCategory10.map(hexToRgb).filter(color => {
        return colorDistance(color, backgroundColor) > colorThreshold;
    }).map(rgb => `rgb(${rgb.join(',')})`);

    // Use the customColors array for your color scale
    const colorScale = d3.scaleOrdinal(customColors);

    useEffect(() => {
        if (data && d3Container.current) {
            drawGraph();
        }
    }, [data]);

    const drawGraph = () => {
        const svg = setupChart();
        setupScales(svg);
        drawAxes(svg);
        drawDensityPaths(svg);
        drawLabels(svg);
    };

    const setupChart = () => {
        d3.select(d3Container.current).selectAll("*").remove();
        const svg = d3.select(d3Container.current)
            .append("svg")
            // Use viewBox to make the SVG responsive
            .attr("viewBox", `0 0 ${svgWidth + margin.left + margin.right} ${svgHeight + margin.top + margin.bottom}`)
            // Preserve the aspect ratio
            .attr("preserveAspectRatio", "xMidYMid meet")
            // Set the width and height to 100% to fill the container
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        return svg;
    };

    const setupScales = (svg) => {
        x.domain(d3.extent(data.flatMap(d => d.tokens_per_second)));
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
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("font-size", "15px");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "15px");
    };

    const drawDensityPaths = (svg) => {
        const kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40));
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Create an array to store the positions of labels to avoid overlap
        let labelPositions = [];

        data.forEach((modelData, index) => {
            const densityData = kde(modelData.tokens_per_second);
            svg.append("path")
                .datum(densityData)
                .attr("fill", "none")
                .attr("opacity", ".9")
                .attr("stroke", colorScale(index))
                .attr("stroke-width", 2.5)
                .attr("d", d3.line()
                    .curve(d3.curveBasis)
                    .x(d => x(d[0]))
                    .y(d => y(d[1])));

            // Find the peak of the density curve
            const peak = densityData.reduce((prev, current) => (prev[1] > current[1]) ? prev : current);

            // Calculate an offset for the label based on the density of the peaks
            let labelY = y(peak[1]);
            const existingLabel = labelPositions.find(pos => Math.abs(pos - labelY) < 10);
            if (existingLabel) {
                labelY = existingLabel + 10;
            }
            labelPositions.push(labelY);

            // Add label at the peak of the density curve with dynamic offset
            svg.append("text")
                .attr("x", x(peak[0]))
                .attr("y", labelY)
                .attr("dy", "-0.3em")
                .attr("text-anchor", "middle")
                .style("fill", colorScale(index))
                .style("font-size", "15px")
                .text(modelData.model_name);
        });

        // Sort label positions for next iteration
        labelPositions.sort((a, b) => a - b);
    };

    const drawLabels = (svg) => {
        // Center the x-axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2 + 10) // moved slightly downwards
            .attr("fill", "white")
            .text("Tokens per Second");

        // Center the y-axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left / 2 - 17) // moved slightly to the left
            .attr("x", -height / 2)
            .attr("fill", "white")
            .text("Density");
    };

    function kernelDensityEstimator(kernel, X) {
        return V => X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    }

    function kernelEpanechnikov(k) {
        return v => {
            v /= k;
            return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }

    return (
        <div>
            <div ref={d3Container}></div>
        </div>
    );
};

export default SpeedChart;