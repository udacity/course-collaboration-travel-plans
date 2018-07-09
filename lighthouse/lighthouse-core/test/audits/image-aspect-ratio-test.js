/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ImageAspectRatioAudit = require('../../audits/image-aspect-ratio.js');
const assert = require('assert');

/* eslint-env jest */
function generateRecord(url = 'https://google.com/logo.png', mimeType = 'image/png') {
  return {
    url,
    mimeType,
  };
}

function generateImage(clientSize, naturalSize, networkRecord, props, src = 'https://google.com/logo.png') {
  Object.assign(networkRecord || {}, {url: src});
  const image = {src, networkRecord};
  Object.assign(image, clientSize, naturalSize, props);
  return image;
}

describe('Images: aspect-ratio audit', () => {
  function testImage(condition, data) {
    const description = `identifies when an image ${condition}`;
    it(description, () => {
      const result = ImageAspectRatioAudit.audit({
        ImageUsage: [
          generateImage(
            {width: data.clientSize[0], height: data.clientSize[1]},
            {naturalWidth: data.naturalSize[0], naturalHeight: data.naturalSize[1]},
            generateRecord(),
            data.props
          ),
        ],
      });

      assert.strictEqual(result.rawValue, data.rawValue, 'rawValue does not match');
      if (data.warning) {
        assert.strictEqual(result.warnings[0], data.warning);
      } else {
        assert.ok(!result.warnings || result.warnings.length === 0, 'should not have warnings');
      }
    });
  }

  testImage('is much larger than natural aspect ratio', {
    rawValue: false,
    clientSize: [800, 500],
    naturalSize: [200, 200],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is a css image and much larger than natural aspect ratio', {
    rawValue: true,
    clientSize: [],
    naturalSize: [200, 200],
    props: {
      isCss: true,
      usesObjectFit: false,
    },
  });

  testImage('is larger than natural aspect ratio', {
    rawValue: false,
    clientSize: [400, 300],
    naturalSize: [200, 200],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('uses object-fit and is much smaller than natural aspect ratio', {
    rawValue: true,
    clientSize: [200, 200],
    naturalSize: [800, 500],
    props: {
      isCss: false,
      usesObjectFit: true,
    },
  });

  testImage('is much smaller than natural aspect ratio', {
    rawValue: false,
    clientSize: [200, 200],
    naturalSize: [800, 500],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is smaller than natural aspect ratio', {
    rawValue: false,
    clientSize: [200, 200],
    naturalSize: [400, 300],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('is almost the right aspect ratio', {
    rawValue: true,
    clientSize: [412, 36],
    naturalSize: [800, 69],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('aspect ratios match', {
    rawValue: true,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('has no display sizing information', {
    rawValue: true,
    clientSize: [0, 0],
    naturalSize: [100, 100],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  testImage('has invalid natural sizing information', {
    rawValue: true,
    warning: 'Invalid image sizing information https://google.com/logo.png',
    clientSize: [100, 100],
    naturalSize: [0, 0],
    props: {
      isCss: false,
      usesObjectFit: false,
    },
  });

  it('skips svg images', () => {
    const result = ImageAspectRatioAudit.audit({
      ImageUsage: [
        generateImage(
          {width: 150, height: 150},
          {},
          {
            url: 'https://google.com/logo.png',
            mimeType: 'image/svg+xml',
          },
          {
            isCss: false,
            usesObjectFit: false,
          }
        ),
      ],
    });

    assert.strictEqual(result.rawValue, true, 'rawValue does not match');
    assert.equal(result.warnings.length, 0, 'should not have warnings');
  });
});
