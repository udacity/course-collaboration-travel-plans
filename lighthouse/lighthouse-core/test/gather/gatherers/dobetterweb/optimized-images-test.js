/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const OptimizedImages =
    require('../../../../gather/gatherers/dobetterweb/optimized-images');
const assert = require('assert');

let options;
let optimizedImages;
const fakeImageStats = {
  jpeg: {base64: 100, binary: 80},
  webp: {base64: 80, binary: 60},
};
const traceData = {
  networkRecords: [
    {
      requestId: '1',
      url: 'http://google.com/image.jpg',
      mimeType: 'image/jpeg',
      resourceSize: 10000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/transparent.png',
      mimeType: 'image/png',
      resourceSize: 11000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/image.bmp',
      mimeType: 'image/bmp',
      resourceSize: 12000,
      transferSize: 9000, // bitmap was compressed another way
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/image.bmp',
      mimeType: 'image/bmp',
      resourceSize: 12000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/vector.svg',
      mimeType: 'image/svg+xml',
      resourceSize: 13000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://gmail.com/image.jpg',
      mimeType: 'image/jpeg',
      resourceSize: 15000,
      transferSize: 20000,
      resourceType: 'Image',
      finished: true,
    },
    {
      requestId: '1',
      url: 'data: image/jpeg ; base64 ,SgVcAT32587935321...',
      mimeType: 'image/jpeg',
      resourceType: 'Image',
      resourceSize: 14000,
      transferSize: 20000,
      finished: true,
    },
    {
      requestId: '1',
      url: 'http://google.com/big-image.bmp',
      mimeType: 'image/bmp',
      resourceType: 'Image',
      resourceSize: 12000,
      transferSize: 20000,
      finished: false, // ignore for not finishing
    },
    {
      requestId: '1',
      url: 'http://google.com/not-an-image.bmp',
      mimeType: 'image/bmp',
      resourceType: 'Document', // ignore for not really being an image
      resourceSize: 12000,
      transferSize: 20000,
      finished: true,
    },
  ],
};

describe('Optimized images', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    optimizedImages = new OptimizedImages();
    options = {
      url: 'http://google.com/',
      driver: {
        evaluateAsync: function() {
          return Promise.resolve(fakeImageStats);
        },
        sendCommand: function() {
          return Promise.reject(new Error('wasn\'t found'));
        },
      },
    };
  });

  it('returns all images', () => {
    return optimizedImages.afterPass(options, traceData).then(artifact => {
      assert.equal(artifact.length, 4);
      assert.ok(/image.jpg/.test(artifact[0].url));
      assert.ok(/transparent.png/.test(artifact[1].url));
      assert.ok(/image.bmp/.test(artifact[2].url));
      // skip cross-origin for now
      // assert.ok(/gmail.*image.jpg/.test(artifact[3].url));
      assert.ok(/data: image/.test(artifact[3].url));
    });
  });

  it('computes sizes', () => {
    const checkSizes = (stat, original, webp, jpeg) => {
      assert.equal(stat.originalSize, original);
      assert.equal(stat.webpSize, webp);
      assert.equal(stat.jpegSize, jpeg);
    };

    return optimizedImages.afterPass(options, traceData).then(artifact => {
      assert.equal(artifact.length, 4);
      checkSizes(artifact[0], 10000, 60, 80);
      checkSizes(artifact[1], 11000, 60, 80);
      checkSizes(artifact[2], 9000, 60, 80);
      // skip cross-origin for now
      // checkSizes(artifact[3], 15000, 60, 80);
      checkSizes(artifact[3], 20, 80, 100); // uses base64 data
    });
  });

  it('handles partial driver failure', () => {
    let calls = 0;
    options.driver.evaluateAsync = () => {
      calls++;
      if (calls > 2) {
        return Promise.reject(new Error('whoops driver failed'));
      } else {
        return Promise.resolve(fakeImageStats);
      }
    };

    return optimizedImages.afterPass(options, traceData).then(artifact => {
      const failed = artifact.find(record => record.failed);

      assert.equal(artifact.length, 4);
      assert.ok(failed, 'passed along failure');
      assert.ok(/whoops/.test(failed.errMsg), 'passed along error message');
    });
  });

  it('supports Audits.getEncodedResponse', () => {
    options.driver.sendCommand = (method, params) => {
      const encodedSize = params.encoding === 'webp' ? 60 : 80;
      return Promise.resolve({encodedSize});
    };

    return optimizedImages.afterPass(options, traceData).then(artifact => {
      assert.equal(artifact.length, 5);
      assert.equal(artifact[0].originalSize, 10000);
      assert.equal(artifact[0].webpSize, 60);
      assert.equal(artifact[0].jpegSize, 80);
      // supports cross-origin
      assert.ok(/gmail.*image.jpg/.test(artifact[3].url));
    });
  });

  it('handles non-standard mime types too', async () => {
    const traceData = {
      networkRecords: [
        {
          requestId: '1',
          url: 'http://google.com/image.bmp?x-ms',
          mimeType: 'image/x-ms-bmp',
          resourceSize: 12000,
          transferSize: 20000,
          resourceType: 'Image',
          finished: true,
        },
      ],
    };

    const artifact = await optimizedImages.afterPass(options, traceData);
    expect(artifact).toHaveLength(1);
  });
});
