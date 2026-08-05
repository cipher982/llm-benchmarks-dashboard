import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectToMongoDB from '../../utils/connectToMongoDB';
import logger from '../../utils/logger';

/**
 * Raw observations for an observer outside this host.
 *
 * The invariant checker runs inside the benchmark daemon and the Sauron
 * watchers run beside it on the same machine, so neither can report that
 * machine going dark. Something off clifford has to look, and looking means
 * either handing it database credentials or giving it a URL. This is the URL.
 *
 * It deliberately publishes numbers rather than a verdict. An endpoint that
 * grades itself is the failure this whole epic started from — the caller
 * decides what counts as too old or too few, so the thresholds live with the
 * observer and can be changed without deploying the thing being observed.
 *
 * `reachable: false` is not `count: 0`. A missing database means the answer is
 * unknown, and an observer must be able to tell "I could not look" from "I
 * looked and everything is gone" — they call for different responses, and
 * collapsing them is how a monitoring outage comes to look like healthy silence.
 *
 * No credentials, no secrets, nothing a visitor could not already derive from
 * the public API. It is unauthenticated so the observer needs nothing but curl.
 */

interface Watchdog {
  observed_at: string;
  mongo: { reachable: boolean; details?: string };
  invariants: {
    reachable: boolean;
    last_run_at: string | null;
    age_seconds: number | null;
    threshold_version: number | null;
    failing: string[];
    unevaluable: string[];
  };
  benchmarks: {
    reachable: boolean;
    newest_run_at: string | null;
    age_seconds: number | null;
    completed_last_hour: number | null;
  };
  catalogue: {
    reachable: boolean;
    enabled_models: number | null;
    enabled_providers: number | null;
  };
}

const ageSeconds = (value: Date | null, now: number): number | null =>
  value ? Math.round((now - value.getTime()) / 1000) : null;

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Watchdog>) {
  const now = Date.now();
  const payload: Watchdog = {
    observed_at: new Date(now).toISOString(),
    mongo: { reachable: false },
    invariants: {
      reachable: false,
      last_run_at: null,
      age_seconds: null,
      threshold_version: null,
      failing: [],
      unevaluable: [],
    },
    benchmarks: { reachable: false, newest_run_at: null, age_seconds: null, completed_last_hour: null },
    catalogue: { reachable: false, enabled_models: null, enabled_providers: null },
  };

  let db: mongoose.mongo.Db | undefined;
  try {
    await connectToMongoDB();
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      db = mongoose.connection.db;
      payload.mongo = { reachable: true };
    } else {
      payload.mongo = { reachable: false, details: `connection state ${mongoose.connection.readyState}` };
    }
  } catch (error) {
    payload.mongo = { reachable: false, details: error instanceof Error ? error.message : 'unknown error' };
  }

  if (!db) {
    // Every section stays `reachable: false`. Reporting zeros here would tell
    // the observer the catalogue is empty, which is a different emergency.
    logger.warn('Watchdog could not reach MongoDB; reporting unknown rather than zero');
    return res.status(503).json(payload);
  }

  // Each section is independent: one collection missing or renamed must not
  // blank the others, or a single schema change would blind the whole observer.
  try {
    const latest = await db
      .collection('bench_check_runs')
      .find({}, { projection: { checked_at: 1, threshold_version: 1, results: 1, checks: 1 } })
      .sort({ checked_at: -1 })
      .limit(1)
      .next();

    const checkedAt = toDate(latest?.checked_at);
    const results = (latest?.results || latest?.checks || []) as Array<Record<string, unknown>>;

    payload.invariants = {
      reachable: true,
      last_run_at: checkedAt ? checkedAt.toISOString() : null,
      age_seconds: ageSeconds(checkedAt, now),
      threshold_version: typeof latest?.threshold_version === 'number' ? latest.threshold_version : null,
      // An invariant that could not be evaluated is reported apart from one
      // that was evaluated and failed. Folding them together would let a check
      // that stopped being able to run pass as a check that passed.
      failing: results.filter(r => r.evaluated !== false && r.ok === false).map(r => String(r.name)),
      unevaluable: results.filter(r => r.evaluated === false).map(r => String(r.name)),
    };
  } catch (error) {
    logger.warn(`Watchdog invariant read failed: ${error}`);
  }

  try {
    const metrics = db.collection('metrics_cloud_v2');
    const newest = await metrics.find({}, { projection: { run_ts: 1 } }).sort({ run_ts: -1 }).limit(1).next();
    const newestRun = toDate(newest?.run_ts);
    payload.benchmarks = {
      reachable: true,
      newest_run_at: newestRun ? newestRun.toISOString() : null,
      age_seconds: ageSeconds(newestRun, now),
      completed_last_hour: await metrics.countDocuments({ run_ts: { $gte: new Date(now - 3600_000) } }),
    };
  } catch (error) {
    logger.warn(`Watchdog benchmark read failed: ${error}`);
  }

  try {
    const models = db.collection('models');
    const enabled = { enabled: true, deprecated: { $ne: true } };
    payload.catalogue = {
      reachable: true,
      enabled_models: await models.countDocuments(enabled),
      enabled_providers: (await models.distinct('provider', enabled)).length,
    };
  } catch (error) {
    logger.warn(`Watchdog catalogue read failed: ${error}`);
  }

  // 503 when a section could not be read, so an observer with nothing but
  // `curl -f` still notices. An observer that parses the body should judge the
  // numbers itself rather than trust this code.
  const complete =
    payload.invariants.reachable && payload.benchmarks.reachable && payload.catalogue.reachable;
  return res.status(complete ? 200 : 503).json(payload);
}
