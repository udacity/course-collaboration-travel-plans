/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const Runner = require('../../../runner.js');
const taskGroups = require('../../../lib/task-groups.js').taskGroups;
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const TracingProcessor = require('../../../lib/traces/tracing-processor.js');
const assert = require('assert');

describe('MainResource computed artifact', () => {
  const args = {data: {}};
  const baseTs = 1241250325;
  let boilerplateTrace;
  let computedArtifacts;

  beforeEach(() => {
    boilerplateTrace = [
      {ph: 'I', name: 'TracingStartedInPage', ts: baseTs, args},
      {ph: 'I', name: 'navigationStart', ts: baseTs, args},
      {ph: 'R', name: 'firstContentfulPaint', ts: baseTs + 1, args},
    ];
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('should get all main thread tasks from a trace', async () => {
    const tasks = await computedArtifacts.requestMainThreadTasks({traceEvents: pwaTrace});
    const toplevelTasks = tasks.filter(task => !task.parent);
    assert.equal(tasks.length, 2305);
    assert.equal(toplevelTasks.length, 296);

    // Sanity check the reachability of tasks and summation of selfTime
    const allTasks = [];
    const queue = toplevelTasks;
    let totalTime = 0;
    let totalTopLevelTime = 0;
    while (queue.length) {
      const task = queue.shift();
      totalTime += task.selfTime;
      totalTopLevelTime += TracingProcessor.isScheduleableTask(task.event) ? task.duration : 0;
      allTasks.push(task);
      queue.push(...task.children);
    }

    assert.equal(allTasks.length, 2305);
    assert.equal(Math.round(totalTopLevelTime), 386);
    assert.equal(Math.round(totalTime), 396);
  });

  it('should compute parent/child correctly', async () => {
    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████████████████████████████████
          ████████████████TaskB███████████████████
               ████TaskC██████
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', ts: baseTs, dur: 100e3},
      {ph: 'B', name: 'TaskB', ts: baseTs + 5e3},
      {ph: 'X', name: 'TaskC', ts: baseTs + 10e3, dur: 30e3},
      {ph: 'E', name: 'TaskB', ts: baseTs + 55e3},
    ];

    traceEvents.forEach(evt => Object.assign(evt, {cat: 'devtools.timeline', args}));

    const tasks = await computedArtifacts.requestMainThreadTasks({traceEvents});
    assert.equal(tasks.length, 3);

    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'TaskC');
    assert.deepStrictEqual(taskA, {
      parent: undefined,
      attributableURLs: [],

      children: [taskB],
      event: traceEvents[3],
      startTime: 0,
      endTime: 100,
      duration: 100,
      selfTime: 50,
      group: taskGroups.other,
    });

    assert.deepStrictEqual(taskB, {
      parent: taskA,
      attributableURLs: [],

      children: [taskC],
      event: traceEvents[4],
      startTime: 5,
      endTime: 55,
      duration: 50,
      selfTime: 20,
      group: taskGroups.other,
    });
  });

  it('should compute attributableURLs correctly', async () => {
    const baseTs = 1241250325;
    const url = s => ({args: {data: {url: s}}});
    const stackFrames = f => ({args: {data: {stackTrace: f.map(url => ({url}))}}});

    /*
    An artistic rendering of the below trace:
    █████████████████████████████TaskA██████████████████████████████████████████████
          ████████████████TaskB███████████████████
               ████EvaluateScript██████
                   █D█
    */
    const traceEvents = [
      ...boilerplateTrace,
      {ph: 'X', name: 'TaskA', ts: baseTs, dur: 100e3, ...url('about:blank')},
      {ph: 'B', name: 'TaskB', ts: baseTs + 5e3, ...stackFrames(['urlB.1', 'urlB.2'])},
      {ph: 'X', name: 'EvaluateScript', ts: baseTs + 10e3, dur: 30e3, ...url('urlC')},
      {ph: 'X', name: 'TaskD', ts: baseTs + 15e3, dur: 5e3, ...stackFrames(['urlD'])},
      {ph: 'E', name: 'TaskB', ts: baseTs + 55e3},
    ];

    traceEvents.forEach(evt => {
      evt.cat = 'devtools.timeline';
      evt.args = evt.args || args;
    });

    const tasks = await computedArtifacts.requestMainThreadTasks({traceEvents});
    const taskA = tasks.find(task => task.event.name === 'TaskA');
    const taskB = tasks.find(task => task.event.name === 'TaskB');
    const taskC = tasks.find(task => task.event.name === 'EvaluateScript');
    const taskD = tasks.find(task => task.event.name === 'TaskD');

    assert.deepStrictEqual(taskA.attributableURLs, []);
    assert.deepStrictEqual(taskB.attributableURLs, ['urlB.1', 'urlB.2']);
    assert.deepStrictEqual(taskC.attributableURLs, ['urlB.1', 'urlB.2', 'urlC']);
    assert.deepStrictEqual(taskD.attributableURLs, ['urlB.1', 'urlB.2', 'urlC', 'urlD']);
  });
});
