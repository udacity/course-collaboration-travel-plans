/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

/* global window document */

/**
 * Helper functions that are passed by `toString()` by Driver to be evaluated in target page.
 */

/**
 * The `exceptionDetails` provided by the debugger protocol does not contain the useful
 * information such as name, message, and stack trace of the error when it's wrapped in a
 * promise. Instead, map to a successful object that contains this information.
 * @param {string|Error} err The error to convert
 */
/* istanbul ignore next */
function wrapRuntimeEvalErrorInBrowser(err) {
  err = err || new Error();
  const fallbackMessage = typeof err === 'string' ? err : 'unknown error';

  return {
    __failedInBrowser: true,
    name: err.name || 'Error',
    message: err.message || fallbackMessage,
    stack: err.stack || (new Error()).stack,
  };
}

/**
 * Used by _waitForCPUIdle and executed in the context of the page, updates the ____lastLongTask
 * property on window to the end time of the last long task.
 */
/* istanbul ignore next */
function registerPerformanceObserverInPage() {
  window.____lastLongTask = window.performance.now();
  const observer = new window.PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      if (entry.entryType === 'longtask') {
        const taskEnd = entry.startTime + entry.duration;
        window.____lastLongTask = Math.max(window.____lastLongTask, taskEnd);
      }
    }
  });

  observer.observe({entryTypes: ['longtask']});
  // HACK: A PerformanceObserver will be GC'd if there are no more references to it, so attach it to
  // window to ensure we still receive longtask notifications. See https://crbug.com/742530.
  // For an example test of this behavior see https://gist.github.com/patrickhulce/69d8bed1807e762218994b121d06fea6.
  //   FIXME COMPAT: This hack isn't neccessary as of Chrome 62.0.3176.0
  //   https://bugs.chromium.org/p/chromium/issues/detail?id=742530#c7
  window.____lhPerformanceObserver = observer;
}

/**
 * Used by _waitForCPUIdle and executed in the context of the page, returns time since last long task.
 */
/* istanbul ignore next */
function checkTimeSinceLastLongTask() {
  // Wait for a delta before returning so that we're sure the PerformanceObserver
  // has had time to register the last longtask
  return new Promise(resolve => {
    const timeoutRequested = window.performance.now() + 50;

    setTimeout(() => {
      // Double check that a long task hasn't happened since setTimeout
      const timeoutFired = window.performance.now();
      const timeSinceLongTask = timeoutFired - timeoutRequested < 50 ?
          timeoutFired - window.____lastLongTask : 0;
      resolve(timeSinceLongTask);
    }, 50);
  });
}

/**
 * @param {string=} selector Optional simple CSS selector to filter nodes on.
 *     Combinators are not supported.
 * @return {Array<Element>}
 */
/* istanbul ignore next */
function getElementsInDocument(selector) {
  /** @type {Array<Element>} */
  const results = [];

  /** @param {NodeListOf<Element>} nodes */
  const _findAllElements = nodes => {
    for (let i = 0, el; el = nodes[i]; ++i) {
      if (!selector || el.matches(selector)) {
        results.push(el);
      }
      // If the element has a shadow root, dig deeper.
      if (el.shadowRoot) {
        _findAllElements(el.shadowRoot.querySelectorAll('*'));
      }
    }
  };
  _findAllElements(document.querySelectorAll('*'));

  return results;
}

/**
 * Gets the opening tag text of the given node.
 * @param {Element} element
 * @param {Array<string>=} ignoreAttrs An optional array of attribute tags to not include in the HTML snippet.
 * @return {string}
 */
/* istanbul ignore next */
function getOuterHTMLSnippet(element, ignoreAttrs=[]) {
  const clone = element.cloneNode();

  ignoreAttrs.forEach(attribute =>{
    clone.removeAttribute(attribute);
  });

  const reOpeningTag = /^.*?>/;
  const match = clone.outerHTML.match(reOpeningTag);

  return (match && match[0]) || '';
}

/**
 * Computes a memory/CPU performance benchmark index to determine rough device class.
 * @see https://docs.google.com/spreadsheets/d/1E0gZwKsxegudkjJl8Fki_sOwHKpqgXwt8aBAfuUaB8A/edit?usp=sharing
 *
 * The benchmark creates a string of length 100,000 in a loop.
 * The returned index is the number of times per second the string can be created.
 *
 *  - 750+ is a desktop-class device, Core i3 PC, iPhone X, etc
 *  - 300+ is a high-end Android phone, Galaxy S8, low-end Chromebook, etc
 *  - 75+ is a mid-tier Android phone, Nexus 5X, etc
 *  - <75 is a budget Android phone, Alcatel Ideal, Galaxy J2, etc
 */
/* istanbul ignore next */
function ultradumbBenchmark() {
  const start = Date.now();
  let iterations = 0;

  while (Date.now() - start < 500) {
    let s = ''; // eslint-disable-line no-unused-vars
    for (let j = 0; j < 100000; j++) s += 'a';

    iterations++;
  }

  const durationInSeconds = (Date.now() - start) / 1000;
  return iterations / durationInSeconds;
}

module.exports = {
  wrapRuntimeEvalErrorInBrowserString: wrapRuntimeEvalErrorInBrowser.toString(),
  registerPerformanceObserverInPageString: registerPerformanceObserverInPage.toString(),
  checkTimeSinceLastLongTaskString: checkTimeSinceLastLongTask.toString(),
  getElementsInDocumentString: getElementsInDocument.toString(),
  getOuterHTMLSnippetString: getOuterHTMLSnippet.toString(),
  getOuterHTMLSnippet: getOuterHTMLSnippet,
  ultradumbBenchmark: ultradumbBenchmark,
  ultradumbBenchmarkString: ultradumbBenchmark.toString(),
};
