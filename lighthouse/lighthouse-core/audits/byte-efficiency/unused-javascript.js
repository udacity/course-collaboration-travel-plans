/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');

const IGNORE_THRESHOLD_IN_BYTES = 2048;

class UnusedJavaScript extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'unused-javascript',
      description: 'Unused JavaScript',
      informative: true,
      helpText: 'Remove unused JavaScript to reduce bytes consumed by network activity.',
      requiredArtifacts: ['JsUsage', 'devtoolsLogs'],
    };
  }

  /**
   * @param {!JsUsageArtifact} script
   * @return {{unusedLength: number, contentLength: number}}
   */
  static computeWaste(script) {
    let maximumEndOffset = 0;
    for (const func of script.functions) {
      for (const range of func.ranges) {
        maximumEndOffset = Math.max(maximumEndOffset, range.endOffset);
      }
    }

    // We only care about unused ranges of the script, so we can ignore all the nesting and safely
    // assume that if a range is unexecuted, all nested ranges within it will also be unexecuted.
    const unusedByIndex = new Uint8Array(maximumEndOffset);
    for (const func of script.functions) {
      for (const range of func.ranges) {
        if (range.count === 0) {
          for (let i = range.startOffset; i < range.endOffset; i++) {
            unusedByIndex[i] = 1;
          }
        }
      }
    }

    let unused = 0;
    for (const x of unusedByIndex) {
      unused += x;
    }

    return {
      unusedLength: unused,
      contentLength: maximumEndOffset,
    };
  }

  /**
   * @param {!Array<{unusedLength: number, contentLength: number}>} wasteData
   * @param {!WebInspector.NetworkRequest} networkRecord
   * @return {{url: string, totalBytes: number, wastedBytes: number, wastedPercent: number}}
   */
  static mergeWaste(wasteData, networkRecord) {
    let unusedLength = 0;
    let contentLength = 0;
    for (const usage of wasteData) {
      unusedLength += usage.unusedLength;
      contentLength += usage.contentLength;
    }

    const totalBytes = ByteEfficiencyAudit.estimateTransferSize(networkRecord, contentLength,
        'script');
    const wastedRatio = (unusedLength / contentLength) || 0;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      url: networkRecord.url,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Audit.HeadingsResult}
   */
  static audit_(artifacts, networkRecords) {
    const scriptsByUrl = new Map();
    for (const script of artifacts.JsUsage) {
      const scripts = scriptsByUrl.get(script.url) || [];
      scripts.push(script);
      scriptsByUrl.set(script.url, scripts);
    }

    const results = [];
    for (const [url, scripts] of scriptsByUrl.entries()) {
      const networkRecord = networkRecords.find(record => record.url === url);
      if (!networkRecord) continue;
      const wasteData = scripts.map(UnusedJavaScript.computeWaste);
      const result = UnusedJavaScript.mergeWaste(wasteData, networkRecord);
      if (result.wastedBytes <= IGNORE_THRESHOLD_IN_BYTES) continue;
      results.push(result);
    }

    return {
      results,
      headings: [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'totalKb', itemType: 'text', text: 'Original'},
        {key: 'wastedKb', itemType: 'text', text: 'Potential Savings'},
      ],
    };
  }
}

module.exports = UnusedJavaScript;
