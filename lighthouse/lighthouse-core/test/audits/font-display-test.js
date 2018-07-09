/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequest = require('../../lib/network-request');
const Audit = require('../../audits/font-display.js');
const assert = require('assert');

/* eslint-env jest */
const openSansFont = {
  display: 'auto',
  family: 'open Sans',
  stretch: 'normal',
  style: 'normal',
  weight: '400',
  src: [
    'https://fonts.gstatic.com/s/opensans/v15/u-WUoqrET9fUeobQW7jkRYX0hVgzZQUfRDuZrPvH3D8.ttf',
    'https://fonts.gstatic.com/s/opensans/v15/u-WUoqrET9fUeobQW7jkRYX0hVgzZQUfRDuZrPvH3D8.woff2',
  ],
};
const openSansFontBold = {
  display: 'auto',
  family: 'open Sans',
  stretch: 'normal',
  style: 'normal',
  weight: '600',
  src: [
    'https://fonts.gstatic.com/s/opensans/v15/k3k702ZOKiLJc3WVjuplzA7aC6SjiAOpAWOKfJDfVRY.woff2',
  ],
};

describe('Performance: Font Display audit', () => {
  function getArtifacts(networkRecords, fonts) {
    return {
      devtoolsLogs: {[Audit.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      Fonts: fonts,
    };
  }

  it('fails when not all fonts have a correct font-display rule', () => {
    const webFonts = [
      Object.assign({}, openSansFont, {display: 'block'}),
      openSansFontBold,
    ];

    return Audit.audit(getArtifacts([
      {
        url: openSansFont.src[0],
        endTime: 3, startTime: 1,
        resourceType: NetworkRequest.TYPES.Font,
      },
      {
        url: openSansFontBold.src[0],
        endTime: 3, startTime: 1,
        resourceType: NetworkRequest.TYPES.Font,
      },
    ], webFonts)).then(result => {
      const items = [{
        url: openSansFontBold.src[0],
        wastedMs: 2000,
      }];
      assert.strictEqual(result.rawValue, false);
      assert.deepEqual(result.details.items, items);
    });
  });

  it('passes when all fonts have a correct font-display rule', () => {
    const webFonts = [
      Object.assign({}, openSansFont, {display: 'block'}),
      Object.assign({}, openSansFontBold, {display: 'fallback'}),
    ];

    return Audit.audit(getArtifacts([
      {
        url: openSansFont.src[0],
        endTime: 3, startTime: 1,
        resourceType: NetworkRequest.TYPES.Font,
      },
      {
        url: openSansFontBold.src[0],
        endTime: 3, startTime: 1,
        resourceType: NetworkRequest.TYPES.Font,
      },
    ], webFonts)).then(result => {
      assert.strictEqual(result.rawValue, true);
    });
  });
});
