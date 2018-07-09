/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const LHError = require('../lib/lh-error');

class FinalScreenshot extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'final-screenshot',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Final Screenshot',
      description: 'The last screenshot captured of the pageload.',
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const screenshots = await artifacts.requestScreenshots(trace);
    const finalScreenshot = screenshots[screenshots.length - 1];

    if (!finalScreenshot) {
      throw new LHError(LHError.errors.NO_SCREENSHOTS);
    }

    return {
      rawValue: true,
      details: {
        type: 'screenshot',
        timestamp: finalScreenshot.timestamp,
        data: finalScreenshot.datauri,
      },
    };
  }
}

module.exports = FinalScreenshot;
