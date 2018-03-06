/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');

const KB_IN_BYTES = 1024;

const WASTED_MS_FOR_AVERAGE = 300;
const WASTED_MS_FOR_POOR = 750;

/**
 * @overview Used as the base for all byte efficiency audits. Computes total bytes
 *    and estimated time saved. Subclass and override `audit_` to return results.
 */
class UnusedBytes extends Audit {
  /**
   * @param {number} wastedMs
   * @return {number}
   */
  static scoreForWastedMs(wastedMs) {
    if (wastedMs === 0) return 100;
    else if (wastedMs < WASTED_MS_FOR_AVERAGE) return 90;
    else if (wastedMs < WASTED_MS_FOR_POOR) return 65;
    else return 0;
  }

  /**
   * @param {number} bytes
   * @return {string}
   */
  static bytesDetails(bytes) {
    return {
      type: 'bytes',
      value: bytes,
      displayUnit: 'kb',
      granularity: 1,
    };
  }

  /**
   * @param {number} bytes
   * @param {number} networkThroughput measured in bytes/second
   * @return {string}
   */
  static bytesToMsDetails(bytes, networkThroughput) {
    const milliseconds = bytes / networkThroughput * 1000;
    return {
      type: 'ms',
      value: milliseconds,
      granularity: 10,
    };
  }

  /**
   * Estimates the number of bytes this network record would have consumed on the network based on the
   * uncompressed size (totalBytes), uses the actual transfer size from the network record if applicable.
   *
   * @param {?WebInspector.NetworkRequest} networkRecord
   * @param {number} totalBytes Uncompressed size of the resource
   * @param {string=} resourceType
   * @param {number=} compressionRatio
   * @return {number}
   */
  static estimateTransferSize(networkRecord, totalBytes, resourceType, compressionRatio = 0.5) {
    if (!networkRecord) {
      // We don't know how many bytes this asset used on the network, but we can guess it was
      // roughly the size of the content gzipped.
      // See https://discuss.httparchive.org/t/file-size-and-compression-savings/145 for multipliers
      return Math.round(totalBytes * compressionRatio);
    } else if (networkRecord._resourceType && networkRecord._resourceType._name === resourceType) {
      // This was a regular standalone asset, just use the transfer size.
      return networkRecord._transferSize;
    } else {
      // This was an asset that was inlined in a different resource type (e.g. HTML document).
      // Use the compression ratio of the resource to estimate the total transferred bytes.
      const compressionRatio = (networkRecord._transferSize / networkRecord._resourceSize) || 1;
      return Math.round(totalBytes * compressionRatio);
    }
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLog)
      .then(networkRecords => this.audit_(artifacts, networkRecords))
      .then(result => {
        return artifacts.requestNetworkThroughput(devtoolsLog)
          .then(networkThroughput => this.createAuditResult(result, networkThroughput));
      });
  }

  /**
   * @param {!Audit.HeadingsResult} result
   * @param {number} networkThroughput
   * @return {!AuditResult}
   */
  static createAuditResult(result, networkThroughput) {
    if (!Number.isFinite(networkThroughput) && result.results.length) {
      throw new Error('Invalid network timing information');
    }

    const debugString = result.debugString;
    const results = result.results
        .map(item => {
          item.wastedKb = this.bytesDetails(item.wastedBytes);
          item.wastedMs = this.bytesToMsDetails(item.wastedBytes, networkThroughput);
          item.totalKb = this.bytesDetails(item.totalBytes);
          item.totalMs = this.bytesToMsDetails(item.totalBytes, networkThroughput);
          return item;
        })
        .sort((itemA, itemB) => itemB.wastedBytes - itemA.wastedBytes);

    const wastedBytes = results.reduce((sum, item) => sum + item.wastedBytes, 0);
    const wastedKb = Math.round(wastedBytes / KB_IN_BYTES);
    const wastedMs = Math.round(wastedBytes / networkThroughput * 100) * 10;

    let displayValue = result.displayValue || '';
    if (typeof result.displayValue === 'undefined' && wastedBytes) {
      displayValue = `Potential savings of ${wastedBytes} bytes`;
    }

    const tableDetails = Audit.makeTableDetails(result.headings, results);

    return {
      debugString,
      displayValue,
      rawValue: wastedMs,
      score: UnusedBytes.scoreForWastedMs(wastedMs),
      extendedInfo: {
        value: {
          wastedMs,
          wastedKb,
          results,
        },
      },
      details: tableDetails,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Audit.HeadingsResult}
   */
  static audit_() {
    throw new Error('audit_ unimplemented');
  }
}

module.exports = UnusedBytes;
