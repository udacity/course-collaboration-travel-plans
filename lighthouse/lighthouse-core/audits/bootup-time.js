/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const WebInspector = require('../lib/web-inspector');
const Util = require('../report/v2/renderer/util');
const {groupIdToName, taskToGroup} = require('../lib/task-groups');
const THRESHOLD_IN_MS = 10;

class BootupTime extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'bootup-time',
      description: 'JavaScript boot-up time',
      failureDescription: 'JavaScript boot-up time is too high',
      helpText: 'Consider reducing the time spent parsing, compiling, and executing JS. ' +
        'You may find delivering smaller JS payloads helps with this. [Learn ' +
        'more](https://developers.google.com/web/lighthouse/audits/bootup).',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {DevtoolsTimelineModel} timelineModel
   * @return {!Map<string, Number>}
   */
  static getExecutionTimingsByURL(timelineModel) {
    const bottomUpByURL = timelineModel.bottomUpGroupBy('URL');
    const result = new Map();

    bottomUpByURL.children.forEach((perUrlNode, url) => {
      // when url is "" or about:blank, we skip it
      if (!url || url === 'about:blank') {
        return;
      }

      const taskGroups = {};
      perUrlNode.children.forEach((perTaskPerUrlNode) => {
        // eventStyle() returns a string like 'Evaluate Script'
        const task = WebInspector.TimelineUIUtils.eventStyle(perTaskPerUrlNode.event);
        // Resolve which taskGroup we're using
        const groupName = taskToGroup[task.title] || groupIdToName.other;
        const groupTotal = taskGroups[groupName] || 0;
        taskGroups[groupName] = groupTotal + (perTaskPerUrlNode.selfTime || 0);
      });
      result.set(url, taskGroups);
    });

    return result;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[BootupTime.DEFAULT_PASS];
    return artifacts.requestDevtoolsTimelineModel(trace).then(devtoolsTimelineModel => {
      const executionTimings = BootupTime.getExecutionTimingsByURL(devtoolsTimelineModel);
      let totalBootupTime = 0;
      const extendedInfo = {};

      const headings = [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'scripting', itemType: 'text', text: groupIdToName.scripting},
        {key: 'scriptParseCompile', itemType: 'text', text: groupIdToName.scriptParseCompile},
      ];

      // map data in correct format to create a table
      const results = Array.from(executionTimings)
        .map(([url, groups]) => {
          // Add up the totalBootupTime for all the taskGroups
          totalBootupTime += Object.keys(groups).reduce((sum, name) => sum += groups[name], 0);
          extendedInfo[url] = groups;

          const scriptingTotal = groups[groupIdToName.scripting] || 0;
          const parseCompileTotal = groups[groupIdToName.scriptParseCompile] || 0;
          return {
            url: url,
            sum: scriptingTotal + parseCompileTotal,
            // Only reveal the javascript task costs
            // Later we can account for forced layout costs, etc.
            scripting: Util.formatMilliseconds(scriptingTotal, 1),
            scriptParseCompile: Util.formatMilliseconds(parseCompileTotal, 1),
          };
        })
        .filter(result => result.sum >= THRESHOLD_IN_MS)
        .sort((a, b) => b.sum - a.sum);

      const tableDetails = BootupTime.makeTableDetails(headings, results);

      return {
        score: totalBootupTime < 2000,
        rawValue: totalBootupTime,
        displayValue: Util.formatMilliseconds(totalBootupTime),
        details: tableDetails,
        extendedInfo: {
          value: extendedInfo,
        },
      };
    });
  }
}

module.exports = BootupTime;
