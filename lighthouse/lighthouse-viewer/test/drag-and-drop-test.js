/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');

const testHelpers = require('./test-helpers');

// Called before other src import so code that relies on `document` and
// `window` have them defined.
testHelpers.setupJsDomGlobals();

const DragAndDrop = require('../app/src/drag-and-drop.js');

function assertUIReset() {
  assert.ok(!document.querySelector('.drop_zone').classList.contains('dropping'));
}

describe('DragAndDrop', () => {
  beforeEach(function() {
    // Reconstruct page on every test so event listeners are clean.
    testHelpers.setupJsDomGlobals();
  });

  afterEach(testHelpers.cleanupJsDomGlobals);

  // TODO: test drop event on document. Callback is not getting called
  // because jsdom doesn't support clipboard API: https://github.com/tmpvar/jsdom/issues/1568/.
  it.skip('document responds to drag and drop events', done => {
    const callback = _ => {
      assert.ok(true, 'file change callback is called after drop event');
      done();
    };

    new DragAndDrop(callback);

    document.dispatchEvent(new window.CustomEvent('drop'));
  });

  it('document responds to drag and drop events', () => {
    // eslint-disable-next-line no-unused-vars
    const dragAndDrop = new DragAndDrop();

    document.dispatchEvent(new window.CustomEvent('mouseleave'));
    assertUIReset();

    document.dispatchEvent(new window.CustomEvent('dragenter'));
    assert.ok(document.querySelector('.drop_zone').classList.contains('dropping'));

    // TODO: see note above about drop event testing.
    // document.dispatchEvent(new window.CustomEvent('drop'));
    // assertUIReset();
  });
});
