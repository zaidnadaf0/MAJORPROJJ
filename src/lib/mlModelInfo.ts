/**
 * ML model information — the single frontend source of truth for what the
 * admin dashboard shows about the ranking model.
 *
 * The values below are the *trained* logistic-regression artifact, not the
 * frozen M8 baseline formula. They are pinned here (rather than fetched at
 * runtime) so the admin portal stays a static, reviewable bundle with no extra
 * network dependency, no CORS surface and no silent fallback.
 *
 * They are kept honest by `mlModelInfo.test.ts`, which reads the committed
 * artifacts below and fails if this module drifts from them:
 *   - ml/model/metadata.json          (name, version, algorithm, rows, schema)
 *   - ml/benchmarks/test_results.json (held-out test metrics + latency)
 *
 * If the model is ever retrained, update the artifacts and this module
 * together — the parity test is what prevents a stale or inflated claim.
 */

export interface MlEvaluation {
  /** Which split the numbers come from. The model is only ever reported on test. */
  split: 'test';
  /** Bench version that produced these numbers. */
  version: string;
  hitAt1: number;
  hitAt3: number;
  ndcgAt3: number;
  /** Number of ranking groups (candidate sets) in the test split. */
  groups: number;
  rocAuc: number;
  /** p95 inference latency in milliseconds, measured offline. */
  latencyP95Ms: number;
}

export interface MlModelInfo {
  name: string;
  version: string;
  algorithm: string;
  featureSchemaVersion: string;
  trainingRows: number;
  trainedAtUtc: string;
  /** Plain-language description of where the training data came from. */
  dataset: string;
  /** True whenever the model was trained on generated rather than real history. */
  syntheticTrainingData: boolean;
  evaluation: MlEvaluation;
  limitations: string[];
}

export const ML_MODEL_INFO: MlModelInfo = {
  name: 'roadassist-logreg',
  version: 'roadassist-logreg-v1',
  algorithm: 'LogisticRegression',
  featureSchemaVersion: 'm9-features-v1',
  trainingRows: 23310,
  trainedAtUtc: '2026-10-07T09:13:58.710968+00:00',
  dataset: 'SYNTHETIC development data (seed 42) — MUST revalidate/retrain on real history',
  syntheticTrainingData: true,
  evaluation: {
    split: 'test',
    version: 'm10-bench-v1',
    hitAt1: 0.4855,
    hitAt3: 0.8264,
    ndcgAt3: 0.6882,
    groups: 484,
    rocAuc: 0.8701,
    latencyP95Ms: 0.133,
  },
  limitations: [
    'Trained and evaluated on synthetic data; real-world ranking quality is not established.',
    'Offline metrics describe the ranking model only — they are not proof of better roadside outcomes.',
    'ML orders the displayed recommendations; server-side eligibility and dispatch remain authoritative.',
    'Coverage, distance and ETA use straight-line geometry, not live traffic or road networks.',
    'The 1.2 s client timeout falls back to deterministic ordering when the service is unavailable.',
  ],
};

/** Deterministic 4-decimal display for offline metrics (e.g. 0.8264). */
export function formatMetric(value: number): string {
  return value.toFixed(4);
}

/** Bilingual-safe short label for the Hit@3 / NDCG@3 pair used in the admin card. */
export function metricSummary(info: MlModelInfo = ML_MODEL_INFO): string {
  return `${formatMetric(info.evaluation.hitAt3)} / ${formatMetric(info.evaluation.ndcgAt3)}`;
}

/** One-line disclosure shown next to the metrics, kept in one place for reuse. */
export const ML_METRIC_DISCLOSURE =
  'Offline test-split metrics on synthetic data; display ranking only, dispatch stays authoritative.';
