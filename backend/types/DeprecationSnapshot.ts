export interface DeprecationSnapshot {
    _id?: string;
    provider_canonical: string;
    model_canonical: string;
    display_name: string;
    snapshot_mean: number;
    snapshot_p10: number;
    snapshot_p50: number;
    snapshot_p90: number;
    snapshot_period_start: Date;
    snapshot_period_end: Date;
    deprecation_date: Date;
    successor_model?: string;
    sample_size: number;
    created_at: Date;
}
