"""Every tunable number in the engine, in one place."""

# Decide how a column is classified and when an insight fires.
THRESHOLDS = {
    # Share of non-missing values that must parse for a column to get a type.
    "type_parse_min_share": 0.8,
    "id_min_unique_share": 0.95,
    "id_min_digit_length": 12,
    "text_min_unique_share": 0.5,
    "text_min_mean_length": 20,
    "datetime_min_year": 1900,
    "datetime_max_year": 2100,
    "missing_warning_percent": 20,
    "missing_critical_percent": 50,
    "strong_correlation_r": 0.7,
    "strong_correlation_min_pairs": 5,
    "heavy_skew": 1.0,
    "many_outliers_percent": 5,
    "high_cardinality_unique": 50,
    "duplicate_warning_percent": 1,
}

# Keep the report compact. See "Size limits" in docs/report_schema.md.
LIMITS = {
    "histogram_bins": 20,
    "top_values": 10,
    "example_values": 3,
    "value_length": 100,
    "preview_rows": 100,
    "preview_cell_length": 200,
    "correlation_columns": 50,
    "correlation_min_pairs": 3,
    "top_pairs": 10,
    "sample_rows": 200_000,
    "sample_seed": 42,
}
