#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

/**
 * @fileoverview Minifies a trace by removing unnecessary events, throttling screenshots, etc.
 *  See the following files for necessary events:
 *    - lighthouse-core/gather/computed/trace-of-tab.js
 *    - lighthouse-core/gather/computed/page-dependency-graph.js
 *    - lighthouse-core/lib/traces/tracing-processor.js
 */

const fs = require('fs');
const path = require('path');
const TracingProcessor = require('../../lib/traces/tracing-processor');

if (process.argv.length !== 4) {
  console.error('Usage $0: <input file> <output file>');
  process.exit(1);
}

const inputTracePath = path.resolve(process.cwd(), process.argv[2]);
const outputTracePath = path.resolve(process.cwd(), process.argv[3]);
const inputTraceRaw = fs.readFileSync(inputTracePath, 'utf8');
/** @type {LH.Trace} */
const inputTrace = JSON.parse(inputTraceRaw);

const toplevelTaskNames = new Set([
  'TaskQueueManager::ProcessTaskFromWorkQueue',
  'ThreadControllerImpl::DoWork',
  'ThreadControllerImpl::RunTask',
]);

const traceEventsToAlwaysKeep = new Set([
  'Screenshot',
  'TracingStartedInBrowser',
  'TracingStartedInPage',
  'navigationStart',
  'ParseAuthorStyleSheet',
  'ParseHTML',
  'PlatformResourceSendRequest',
  'ResourceSendRequest',
  'ResourceReceiveResponse',
  'ResourceFinish',
  'ResourceReceivedData',
  'EventDispatch',
]);

const traceEventsToKeepInToplevelTask = new Set([
  'TimerInstall',
  'TimerFire',
  'InvalidateLayout',
  'ScheduleStyleRecalculation',
  'EvaluateScript',
  'XHRReadyStateChange',
  'FunctionCall',
  'v8.compile',
]);

const traceEventsToKeepInProcess = new Set([
  ...toplevelTaskNames,
  ...traceEventsToKeepInToplevelTask,
  'firstPaint',
  'firstContentfulPaint',
  'firstMeaningfulPaint',
  'firstMeaningfulPaintCandidate',
  'loadEventEnd',
  'domContentLoadedEventEnd',
]);

/**
 * @param {LH.TraceEvent[]} events
 */
function filterOutUnnecessaryTasksByNameAndDuration(events) {
  const {startedInPageEvt} = TracingProcessor.findTracingStartedEvt(events);

  return events.filter(evt => {
    if (toplevelTaskNames.has(evt.name) && evt.dur < 1000) return false;
    if (evt.pid === startedInPageEvt.pid && traceEventsToKeepInProcess.has(evt.name)) return true;
    return traceEventsToAlwaysKeep.has(evt.name);
  });
}

/**
 * Filters out tasks that are not within a toplevel task.
 * @param {LH.TraceEvent[]} events
 */
function filterOutOrphanedTasks(events) {
  const toplevelRanges = events
    .filter(evt => toplevelTaskNames.has(evt.name))
    .map(evt => [evt.ts, evt.ts + evt.dur]);

  /** @param {LH.TraceEvent} e */
  const isInToplevelTask = e => toplevelRanges.some(([start, end]) => e.ts >= start && e.ts <= end);

  return events.filter((evt, index) => {
    if (!traceEventsToKeepInToplevelTask.has(evt.name)) return true;
    if (!isInToplevelTask(evt)) return false;

    if (evt.ph === 'B') {
      const endEvent = events.slice(index).find(e => e.name === evt.name && e.ph === 'E');
      return endEvent && isInToplevelTask(endEvent);
    } else {
      return true;
    }
  });
}

/**
 * Throttles screenshot events in the trace to 2fps.
 * @param {LH.TraceEvent[]} events
 */
function filterOutExcessiveScreenshots(events) {
  const screenshotTimestamps = events.filter(evt => evt.name === 'Screenshot').map(evt => evt.ts);

  let lastScreenshotTs = -Infinity;
  return events.filter(evt => {
    if (evt.name !== 'Screenshot') return true;
    const timeSinceLastScreenshot = evt.ts - lastScreenshotTs;
    const nextScreenshotTs = screenshotTimestamps.find(ts => ts > evt.ts);
    const timeUntilNextScreenshot = nextScreenshotTs ? nextScreenshotTs - evt.ts : Infinity;
    const threshold = 500 * 1000; // Throttle to ~2fps
    // Keep the frame if it's been more than 500ms since the last frame we kept or the next frame won't happen for at least 500ms
    const shouldKeep = timeUntilNextScreenshot > threshold || timeSinceLastScreenshot > threshold;
    if (shouldKeep) lastScreenshotTs = evt.ts;
    return shouldKeep;
  });
}

/**
 * @param {LH.TraceEvent[]} events
 */
function filterTraceEvents(events) {
  // Filter out event names we don't care about and tasks <1ms
  let filtered = filterOutUnnecessaryTasksByNameAndDuration(events);
  // Filter out events not inside a toplevel task
  filtered = filterOutOrphanedTasks(filtered);
  // Filter down the screenshots to key moments + 2fps animations
  return filterOutExcessiveScreenshots(filtered);
}

const filteredEvents = filterTraceEvents(inputTrace.traceEvents);
const output = `{
  "traceEvents": [
${filteredEvents.map(e => '    ' + JSON.stringify(e)).join(',\n')}
  ]
}`;

/** @param {string} s */
const size = s => Math.round(s.length / 1024) + 'kb';
console.log(`Reduced trace from ${size(inputTraceRaw)} to ${size(output)}`);
console.log(`Filtered out ${inputTrace.traceEvents.length - filteredEvents.length} trace events`);
fs.writeFileSync(outputTracePath, output);
