export interface SpeedDistributionPoint {
    provider: string;
    model_name: string;
    display_name: string;
    tokens_per_second: number[];
}

export interface TimeSeriesProvider {
    provider: string;
    values: number[];
}

export interface TimeSeriesModel {
    model_name: string;
    display_name: string;
    providers: TimeSeriesProvider[];
}

export interface TimeSeriesData {
    timestamps: string[];
    models: TimeSeriesModel[];
}

export interface TableRow {
    provider: string;
    model_name: string;
    tokens_per_second_mean: number;
    tokens_per_second_min: number;
    tokens_per_second_max: number;
    time_to_first_token_mean: number;
}

export interface ProcessedData {
    speedDistribution: SpeedDistributionPoint[];
    timeSeries: TimeSeriesData;
    table: TableRow[];
}
