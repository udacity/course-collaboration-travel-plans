#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

/**
 * @typedef LanternSiteDefinition
 * @property {string} url
 * @property {TargetMetrics} wpt3g
 * @property {LanternMetrics} lantern
 * @property {LanternMetrics} baseline
 */

/**
 * @typedef LanternEvaluation
 * @property {string} url
 * @property {string} metric
 * @property {string} lanternMetric
 * @property {number} expected
 * @property {number} actual
 * @property {number} diff
 * @property {number} diffAsPercent
 */

/**
 * @typedef EstimateEvaluationSummary
 * @property {LanternEvaluation[]} evaluations
 * @property {number} p50
 * @property {number} p90
 * @property {number} p95
 */

/**
 * @typedef TargetMetrics
 * @property {number} [firstContentfulPaint]
 * @property {number} [firstMeaningfulPaint]
 * @property {number} [timeToFirstInteractive]
 * @property {number} [timeToConsistentlyInteractive]
 * @property {number} [speedIndex]
 */

/**
 * @typedef LanternMetrics
 * @property {number} optimisticFCP
 * @property {number} optimisticFMP
 * @property {number} optimisticSI
 * @property {number} optimisticTTFCPUI
 * @property {number} optimisticTTI
 * @property {number} pessimisticFCP
 * @property {number} pessimisticFMP
 * @property {number} pessimisticSI
 * @property {number} pessimisticTTFCPUI
 * @property {number} pessimisticTTI
 * @property {number} roughEstimateOfFCP
 * @property {number} roughEstimateOfFMP
 * @property {number} roughEstimateOfSI
 * @property {number} roughEstimateOfTTFCPUI
 * @property {number} roughEstimateOfTTI
 */

const fs = require('fs');
const path = require('path');
const constants = require('./constants');
const chalk = require('chalk').default;

const GOOD_DIFF_AS_PERCENT_THRESHOLD = 0.2;
const OK_DIFF_AS_PERCENT_THRESHOLD = 0.5;

const INPUT_PATH = process.argv[2] || constants.SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH;
const COMPUTATIONS_PATH = path.resolve(process.cwd(), INPUT_PATH);
const BASELINE_PATH = constants.MASTER_COMPUTED_PATH;

if (!fs.existsSync(COMPUTATIONS_PATH)) throw new Error('Usage $0 <computed summary file>');

/** @type {{sites: LanternSiteDefinition[]}} */
const siteIndexWithComputed = require(COMPUTATIONS_PATH);
const baselineLanternData = require(BASELINE_PATH);

for (const site of baselineLanternData.sites) {
  const computedSite = siteIndexWithComputed.sites.find(entry => entry.url === site.url);
  if (!computedSite) continue;
  computedSite.baseline = site;
}

const entries = siteIndexWithComputed.sites.filter(site => site.lantern && site.baseline);

if (!entries.length) {
  throw new Error('No lantern metrics available, did you run run-on-all-assets.js?');
}

/**
 * @param {LanternSiteDefinition} site
 * @param {TargetMetrics} expectedMetrics
 * @param {LanternMetrics} actualMetrics
 * @param {keyof TargetMetrics} metric
 * @param {keyof LanternMetrics} lanternMetric
 * @return {(LanternEvaluation & LanternSiteDefinition)|null}
 */
function evaluateSite(site, expectedMetrics, actualMetrics, metric, lanternMetric) {
  const expected = Math.round(expectedMetrics[metric]);
  if (expected === 0) return null;

  const actual = Math.round(actualMetrics[lanternMetric]);
  const diff = Math.abs(actual - expected);
  const diffAsPercent = diff / expected;

  return {...site, expected, actual, diff, diffAsPercent, metric, lanternMetric};
}

/** @param {LanternEvaluation} evaluation */
function isEvaluationGood(evaluation) {
  return evaluation.diffAsPercent < GOOD_DIFF_AS_PERCENT_THRESHOLD;
}
/** @param {LanternEvaluation} evaluation */
function isEvaluationOK(evaluation) {
  return (
    evaluation.diffAsPercent >= GOOD_DIFF_AS_PERCENT_THRESHOLD &&
    evaluation.diffAsPercent < OK_DIFF_AS_PERCENT_THRESHOLD
  );
}
/** @param {LanternEvaluation} evaluation */
function isEvaluationBad(evaluation) {
  return evaluation.diffAsPercent > OK_DIFF_AS_PERCENT_THRESHOLD;
}

/**
 * @param {LanternSiteDefinition[]} entries
 * @param {keyof TargetMetrics} metric
 * @param {keyof LanternMetrics} lanternMetric
 * @param {'lantern'|'baseline'} [lanternOrBaseline]
 * @return {EstimateEvaluationSummary}
 */
function evaluateAccuracy(entries, metric, lanternMetric, lanternOrBaseline = 'lantern') {
  const evaluations = [];

  const percentErrors = [];
  for (const entry of entries) {
    const evaluation = evaluateSite(
      entry,
      entry.wpt3g,
      entry[lanternOrBaseline],
      metric,
      lanternMetric
    );
    if (!evaluation) continue;

    evaluations.push(evaluation);
    percentErrors.push(evaluation.diffAsPercent);
  }

  percentErrors.sort((a, b) => a - b);

  const p50 = percentErrors[Math.floor((percentErrors.length / 100) * 50)];
  const p90 = percentErrors[Math.floor((percentErrors.length / 100) * 90)];
  const p95 = percentErrors[Math.floor((percentErrors.length / 100) * 95)];
  return {evaluations, p50, p90, p95};
}

/** @type {LanternEvaluation[]} */
const allEvaluations = [];
/** @type {LanternEvaluation[]} */
const baselineEvaluations = [];

/**
 * @param {number} actualValue
 * @param {number} baselineValue
 * @param {{isIncreaseGood?: boolean, format?: any, alwaysGray?: boolean}} [options]
 */
function toBaselineDiffString(actualValue, baselineValue, options) {
  options = {isIncreaseGood: false, format: toPercentString, ...options};
  const diffAsNumber = actualValue - baselineValue;
  const isGoingUp = diffAsNumber > 0;
  const isGood = options.isIncreaseGood === isGoingUp;

  let arrow = isGoingUp ? '↑' : '↓';
  let color = isGood ? chalk.green : chalk.red;
  if (options.alwaysGray) color = chalk.gray;

  if (Math.abs(diffAsNumber) < baselineValue * 0.01) {
    arrow = '↔';
    color = chalk.gray;
  } else if (Math.abs(diffAsNumber) > baselineValue * 0.1) {
    arrow = arrow + arrow;
  }

  const diffAsString = options.format(Math.abs(diffAsNumber));
  const text = `${arrow.padEnd(2)} ${diffAsString}`;
  return color(text);
}

/** @param {number} percentAsDecimal */
function toPercentString(percentAsDecimal) {
  return (percentAsDecimal * 100).toFixed(1) + '%';
}

/**
 * @param {keyof TargetMetrics} metric
 * @param {keyof LanternMetrics} lanternMetric
 */
function evaluateAndPrintAccuracy(metric, lanternMetric) {
  const actualAccuracy = evaluateAccuracy(entries, metric, lanternMetric);
  const baselineAccuracy = evaluateAccuracy(entries, metric, lanternMetric, 'baseline');
  const baselineOptions = {alwaysGray: !lanternMetric.includes('roughEstimate')};

  const strings = [
    lanternMetric.padEnd(25),
    `${toPercentString(actualAccuracy.p50)} ${toBaselineDiffString(
      actualAccuracy.p50,
      baselineAccuracy.p50,
      baselineOptions
    )}`.padEnd(30),
    `${toPercentString(actualAccuracy.p90)} ${toBaselineDiffString(
      actualAccuracy.p90,
      baselineAccuracy.p90,
      baselineOptions
    )}`.padEnd(30),
    `${toPercentString(actualAccuracy.p95)} ${toBaselineDiffString(
      actualAccuracy.p95,
      baselineAccuracy.p95,
      baselineOptions
    )}`.padEnd(30),
  ];

  allEvaluations.push(...actualAccuracy.evaluations);
  baselineEvaluations.push(...baselineAccuracy.evaluations);

  if (lanternMetric.includes('roughEstimate')) {
    console.log(...strings);
  } else {
    console.log(chalk.gray(...strings));
  }
}
/**
 * @param {keyof TargetMetrics} metric
 * @param {string[]} lanternMetrics
 */
function findAndPrintWorst10Sites(metric, lanternMetrics) {
  if (!process.env.PRINT_WORST) return;

  /** @type {Map<string, LanternEvaluation[]>} */
  const groupedByURL = new Map();
  for (const site of allEvaluations) {
    const group = groupedByURL.get(site.url) || [];
    group.push(site);
    groupedByURL.set(site.url, group);
  }

  /** @type {LanternEvaluation[]} */
  const worstEntries = [];
  for (const entries of groupedByURL.values()) {
    const matchingEntries = entries.filter(entry => lanternMetrics.includes(entry.lanternMetric));
    const minDiffAsPercent = Math.min(...matchingEntries.map(entry => entry.diffAsPercent));
    const minEntry = matchingEntries.find(entry => minDiffAsPercent === entry.diffAsPercent);
    if (!minEntry) continue;
    worstEntries.push(minEntry);
  }

  console.log(chalk.bold(`\n ------- Worst 10 ${metric} -------`));
  worstEntries
    .sort((a, b) => b.diffAsPercent - a.diffAsPercent)
    .slice(0, 10)
    .forEach(entry => {
      console.log(
        entry.actual < entry.expected
          ? chalk.cyan('underestimated')
          : chalk.yellow('overestimated'),
        entry.metric,
        chalk.gray('by'),
        Math.round(entry.diff),
        chalk.gray('on'),
        chalk.magenta(entry.url)
      );
    });
}

function findAndPrintFixesRegressions() {
  /** @type {Map<string, LanternEvaluation>} */
  const indexedByMetricURL = new Map();
  baselineEstimates.forEach(e => indexedByMetricURL.set(`${e.lanternMetric}${e.url}`, e));

  const joinedWithBaseline = estimates.map(actual => {
    const baseline = indexedByMetricURL.get(`${actual.lanternMetric}${actual.url}`);
    if (!baseline) return {...actual, regression: 0, regressionAsPercent: 0};
    const regression = actual.diff - baseline.diff;
    const regressionAsPercent = actual.diffAsPercent - baseline.diffAsPercent;
    return {...actual, baseline, regression, regressionAsPercent};
  });

  /** @param {LanternEvaluation} entry */
  const printEvaluation = entry => {
    console.log(
      entry.lanternMetric.replace('roughEstimateOf', ''),
      chalk.gray('on'),
      chalk.magenta(entry.url),
      '-',
      entry.expected,
      chalk.gray('(real)'),
      entry.actual,
      chalk.gray('(cur)'),
      // @ts-ignore - baseline always exists at this point
      entry.baseline.actual,
      chalk.gray('(prev)')
    );
  };

  console.log(chalk.bold('\n ------- Fixes Summary -------'));
  joinedWithBaseline
    .filter(e => e.regression < 0)
    .sort((a, b) => a.regressionAsPercent - b.regressionAsPercent)
    .slice(0, 4)
    .forEach(printEvaluation);
  console.log(chalk.bold('\n ------- Regression Summary -------'));
  joinedWithBaseline
    .filter(e => e.regression > 0)
    .sort((a, b) => b.regressionAsPercent - a.regressionAsPercent)
    .slice(0, 4)
    .forEach(printEvaluation);
}

console.log(
  chalk.bold(
    'Metric'.padEnd(25),
    'p50 (% Error)'.padEnd(20),
    'p90 (% Error)'.padEnd(20),
    'p95 (% Error)'.padEnd(20)
  )
);

evaluateAndPrintAccuracy('firstContentfulPaint', 'optimisticFCP');
evaluateAndPrintAccuracy('firstContentfulPaint', 'pessimisticFCP');
evaluateAndPrintAccuracy('firstContentfulPaint', 'roughEstimateOfFCP');

evaluateAndPrintAccuracy('firstMeaningfulPaint', 'optimisticFMP');
evaluateAndPrintAccuracy('firstMeaningfulPaint', 'pessimisticFMP');
evaluateAndPrintAccuracy('firstMeaningfulPaint', 'roughEstimateOfFMP');

evaluateAndPrintAccuracy('timeToFirstInteractive', 'optimisticTTFCPUI');
evaluateAndPrintAccuracy('timeToFirstInteractive', 'pessimisticTTFCPUI');
evaluateAndPrintAccuracy('timeToFirstInteractive', 'roughEstimateOfTTFCPUI');

evaluateAndPrintAccuracy('timeToConsistentlyInteractive', 'optimisticTTI');
evaluateAndPrintAccuracy('timeToConsistentlyInteractive', 'pessimisticTTI');
evaluateAndPrintAccuracy('timeToConsistentlyInteractive', 'roughEstimateOfTTI');

evaluateAndPrintAccuracy('speedIndex', 'optimisticSI');
evaluateAndPrintAccuracy('speedIndex', 'pessimisticSI');
evaluateAndPrintAccuracy('speedIndex', 'roughEstimateOfSI');

const estimates = allEvaluations.filter(entry => entry.lanternMetric.includes('roughEstimate'));
const baselineEstimates = baselineEvaluations.filter(entry =>
  entry.lanternMetric.includes('roughEstimate')
);

findAndPrintWorst10Sites('firstContentfulPaint', [
  'optimisticFCP',
  'pessimisticFCP',
  'roughEstimateOfFCP',
]);
findAndPrintWorst10Sites('firstMeaningfulPaint', [
  'optimisticFMP',
  'pessimisticFMP',
  'roughEstimateOfFMP',
]);
findAndPrintWorst10Sites('timeToFirstInteractive', [
  'optimisticTTFCPUI',
  'pessimisticTTFCPUI',
  'roughEstimateOfTTFCPUI',
]);
findAndPrintWorst10Sites('timeToConsistentlyInteractive', [
  'optimisticTTI',
  'pessimisticTTI',
  'roughEstimateOfTTI',
]);
findAndPrintWorst10Sites('speedIndex', ['optimisticSI', 'pessimisticSI', 'roughEstimateOfSI']);

findAndPrintFixesRegressions();

/**
 * @param {string} label
 * @param {(e: LanternEvaluation) => boolean} bucketFilterFn
 * @param {any} opts
 */
const printBucket = (label, bucketFilterFn, opts) => {
  const numInBucket = estimates.filter(bucketFilterFn).length;
  const baselineInBucket = baselineEstimates.filter(bucketFilterFn).length;

  const actual = numInBucket;
  const baseline = baselineInBucket;
  console.log(
    `${label}:`.padEnd(10),
    actual.toString().padEnd(5),
    // @ts-ignore - overly aggressive no implicit any
    toBaselineDiffString(actual, baseline, {...opts, format: x => x.toString()})
  );
};

console.log(chalk.bold('\n ------- Bucket Summary -------'));
printBucket('Good', isEvaluationGood, {isIncreaseGood: true});
printBucket('OK', isEvaluationOK, {alwaysGray: true});
printBucket('Bad', isEvaluationBad, {isIncreaseGood: false});

const percentErrors = estimates.map(x => x.diffAsPercent).sort((a, b) => a - b);
const baselinePercentErrors = baselineEstimates.map(x => x.diffAsPercent).sort((a, b) => a - b);

/** @param {number} percentile */
const printPercentile = percentile => {
  const index = Math.floor((percentErrors.length / 100) * percentile);
  const actual = percentErrors[index];
  const baseline = baselinePercentErrors[index];
  console.log(
    `p${percentile}:`.padEnd(10),
    toPercentString(actual),
    toBaselineDiffString(actual, baseline)
  );
};

console.log(chalk.bold('\n ------- % Error Summary -------'));
printPercentile(50);
printPercentile(90);
printPercentile(95);
