/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to show a breakdown of execution timings on the main thread
 */

'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
// We group all trace events into groups to show a highlevel breakdown of the page
const {taskToGroup} = require('../lib/task-groups');

class PageExecutionTimings extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'mainthread-work-breakdown',
      description: 'Main thread work breakdown',
      informative: true,
      helpText: 'Consider reducing the time spent parsing, compiling and executing JS.' +
        'You may find delivering smaller JS payloads helps with this.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {!DevtoolsTimelineModel} timelineModel
   * @return {!Map<string, number>}
   */
  static getExecutionTimingsByCategory(timelineModel) {
    const bottomUpByName = timelineModel.bottomUpGroupBy('EventName');

    const result = new Map();
    bottomUpByName.children.forEach((event, eventName) =>
      result.set(eventName, event.selfTime));

    return result;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[PageExecutionTimings.DEFAULT_PASS];

    return artifacts.requestDevtoolsTimelineModel(trace)
      .then(devtoolsTimelineModel => {
        const executionTimings = PageExecutionTimings.getExecutionTimingsByCategory(
          devtoolsTimelineModel
        );
        let totalExecutionTime = 0;

        const extendedInfo = {};
        const categoryTotals = {};
        const results = Array.from(executionTimings).map(([eventName, duration]) => {
          totalExecutionTime += duration;
          extendedInfo[eventName] = duration;
          const groupName = taskToGroup[eventName];

          const categoryTotal = categoryTotals[groupName] || 0;
          categoryTotals[groupName] = categoryTotal + duration;

          return {
            category: eventName,
            group: groupName,
            duration: Util.formatMilliseconds(duration, 1),
          };
        });

        const headings = [
          {key: 'group', itemType: 'text', text: 'Category'},
          {key: 'category', itemType: 'text', text: 'Work'},
          {key: 'duration', itemType: 'text', text: 'Time spent'},
        ];
        results.stableSort((a, b) => categoryTotals[b.group] - categoryTotals[a.group]);
        const tableDetails = PageExecutionTimings.makeTableDetails(headings, results);

        return {
          score: totalExecutionTime < 3000,
          rawValue: totalExecutionTime,
          displayValue: Util.formatMilliseconds(totalExecutionTime),
          details: tableDetails,
          extendedInfo: {
            value: extendedInfo,
          },
        };
      });
  }
}

module.exports = PageExecutionTimings;
