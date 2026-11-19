import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ML_MODEL_INFO, ML_METRIC_DISCLOSURE, formatMetric, metricSummary } from '@/lib/mlModelInfo';

/**
 * Parity guard: the admin ML card is only trustworthy while the values it
 * renders match the committed artifacts. These files are read from disk so a
 * retrain (which rewrites metadata/benchmarks) fails here instead of leaving
 * a stale claim in the UI.
 *
 * The baseline file (ml/reports/baseline_metrics.json) is deliberately NOT
 * used: 0.699 / 0.579 are the frozen M8 formula's validation numbers, not the
 * trained logistic-regression's test numbers.
 */

const ROOT = process.cwd();
const metadata = JSON.parse(
  readFileSync(path.join(ROOT, 'ml/model/metadata.json'), 'utf8'),
) as {
  model_name: string;
  model_version: string;
  model_type: string;
  feature_schema_version: string;
  n_train_rows: number;
  trained_at_utc: string;
  dataset: string;
};

const benchmark = JSON.parse(
  readFileSync(path.join(ROOT, 'ml/benchmarks/test_results.json'), 'utf8'),
) as {
  version: string;
  winner: string;
  metrics: { 'Hit@1': number; 'Hit@3': number; 'NDCG@3': number; groups: number; ROC_AUC: number };
  latency_ms: { p95_ms: number };
  model_bytes: number;
};

describe('ML_MODEL_INFO matches the committed model artifacts', () => {
  it('mirrors ml/model/metadata.json', () => {
    expect(ML_MODEL_INFO.name).toBe(metadata.model_name);
    expect(ML_MODEL_INFO.version).toBe(metadata.model_version);
    expect(ML_MODEL_INFO.algorithm).toBe(metadata.model_type);
    expect(ML_MODEL_INFO.featureSchemaVersion).toBe(metadata.feature_schema_version);
    expect(ML_MODEL_INFO.trainingRows).toBe(metadata.n_train_rows);
    expect(ML_MODEL_INFO.trainedAtUtc).toBe(metadata.trained_at_utc);
    expect(ML_MODEL_INFO.dataset).toBe(metadata.dataset);
  });

  it('mirrors the trained model test metrics, not the M8 baseline', () => {
    expect(ML_MODEL_INFO.evaluation.version).toBe(benchmark.version);
    expect(ML_MODEL_INFO.evaluation.split).toBe('test');
    expect(ML_MODEL_INFO.evaluation.hitAt1).toBe(benchmark.metrics['Hit@1']);
    expect(ML_MODEL_INFO.evaluation.hitAt3).toBe(benchmark.metrics['Hit@3']);
    expect(ML_MODEL_INFO.evaluation.ndcgAt3).toBe(benchmark.metrics['NDCG@3']);
    expect(ML_MODEL_INFO.evaluation.groups).toBe(benchmark.metrics.groups);
    expect(ML_MODEL_INFO.evaluation.rocAuc).toBe(benchmark.metrics.ROC_AUC);
    expect(ML_MODEL_INFO.evaluation.latencyP95Ms).toBe(benchmark.latency_ms.p95_ms);
  });

  it('does not reuse the frozen M8 baseline values for the trained model', () => {
    const baseline = JSON.parse(
      readFileSync(path.join(ROOT, 'ml/reports/baseline_metrics.json'), 'utf8'),
    ) as { splits: { valid: { 'Hit@3': number; 'NDCG@3': number } } };
    // Guard the exact regression that shipped before: 0.6990 / 0.5787 on valid.
    expect(ML_MODEL_INFO.evaluation.hitAt3).not.toBe(baseline.splits.valid['Hit@3']);
    expect(ML_MODEL_INFO.evaluation.ndcgAt3).not.toBe(baseline.splits.valid['NDCG@3']);
  });

  it('declares synthetic training data and documents real limitations', () => {
    expect(ML_MODEL_INFO.syntheticTrainingData).toBe(true);
    expect(ML_MODEL_INFO.limitations.length).toBeGreaterThanOrEqual(3);
    expect(ML_MODEL_INFO.limitations.join(' ')).toMatch(/synthetic/i);
    expect(ML_MODEL_INFO.limitations.join(' ')).toMatch(/dispatch/i);
    expect(ML_METRIC_DISCLOSURE).toMatch(/synthetic/i);
  });
});

describe('metric formatting helpers', () => {
  it('renders four decimal places without rounding to a friendlier-looking value', () => {
    expect(formatMetric(0.8264)).toBe('0.8264');
    expect(formatMetric(0.6882)).toBe('0.6882');
  });

  it('summarises Hit@3 / NDCG@3 for the admin card', () => {
    expect(metricSummary()).toBe('0.8264 / 0.6882');
  });
});
