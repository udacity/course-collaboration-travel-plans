/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {typeof import('./lighthouse-ext-background.js') & {console: typeof console}} BackgroundPage */

/**
 * Error strings that indicate a problem in how Lighthouse was run, not in
 * Lighthouse itself, mapped to more useful strings to report to the user.
 */
const NON_BUG_ERROR_MESSAGES = {
  'Another debugger': 'You probably have DevTools open. Close DevTools to use Lighthouse',
  'multiple tabs': 'You probably have multiple tabs open to the same origin. ' +
      'Close the other tabs to use Lighthouse.',
  // The extension debugger API is forbidden from attaching to the web store.
  // @see https://chromium.googlesource.com/chromium/src/+/5d1f214db0f7996f3c17cd87093d439ce4c7f8f1/chrome/common/extensions/chrome_extensions_client.cc#232
  'The extensions gallery cannot be scripted': 'The Lighthouse extension cannot audit the ' +
      'Chrome Web Store. If necessary, use the Lighthouse CLI to do so.',
  'Cannot access a chrome': 'The Lighthouse extension cannot audit ' +
      'Chrome-specific urls. If necessary, use the Lighthouse CLI to do so.',
  // The user tries to review an error page or has network issues
  'Unable to load the page': 'Unable to load the page. Please verify the url you ' +
      'are trying to review.',
  'Cannot access contents of the page': 'Lighthouse can only audit URLs that start' +
      ' with http:// or https://.',
};

const MAX_ISSUE_ERROR_LENGTH = 60;

const subpageVisibleClass = 'subpage--visible';

/** @type {?URL} */
let siteURL = null;
/** @type {boolean} */
let isRunning = false;

function getLighthouseVersion() {
  return chrome.runtime.getManifest().version;
}

function getLighthouseCommitHash() {
  return '__COMMITHASH__';
}

function getChromeVersion() {
  // @ts-ignore
  return /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
}

function showRunningSubpage() {
  find('.status').classList.add(subpageVisibleClass);
}

function hideRunningSubpage() {
  find('.status').classList.remove(subpageVisibleClass);
}

/**
 * Guaranteed context.querySelector. Always returns an element or throws if
 * nothing matches query.
 * @param {string} query
 * @param {ParentNode=} context
 * @return {HTMLElement}
 */
function find(query, context = document) {
  /** @type {?HTMLElement} */
  const result = context.querySelector(query);
  if (result === null) {
    throw new Error(`query ${query} not found`);
  }
  return result;
}

/**
 * @param {Error} err
 * @return {HTMLAnchorElement}
 */
function buildReportErrorLink(err) {
  const issueBody = `
**Lighthouse Version**: ${getLighthouseVersion()}
**Lighthouse Commit**: ${getLighthouseCommitHash()}
**Chrome Version**: ${getChromeVersion()}
**Initial URL**: ${siteURL}
**Error Message**: ${err.message}
**Stack Trace**:
\`\`\`
${err.stack}
\`\`\`
    `;

  const url = new URL('https://github.com/GoogleChrome/lighthouse/issues/new');

  const errorTitle = err.message.substring(0, MAX_ISSUE_ERROR_LENGTH);
  url.searchParams.append('title', `Extension Error: ${errorTitle}`);
  url.searchParams.append('body', issueBody.trim());

  const reportErrorEl = document.createElement('a');
  reportErrorEl.className = 'button button--report-error';
  reportErrorEl.href = url.href;
  reportErrorEl.textContent = 'Report Error';
  reportErrorEl.target = '_blank';

  return reportErrorEl;
}

/**
 * @param {[string, string, string]} status
 */
function logStatus([, message, details]) {
  if (typeof details === 'string' && details.length > 110) {
    // Grab 100 characters and up to the next comma, ellipsis for the rest
    const hundredPlusChars = details.replace(/(.{100}.*?),.*/, '$1…');
    details = hundredPlusChars;
  }
  find('.status__msg').textContent = message;
  const statusDetailsMessageEl = find('.status__detailsmsg');
  statusDetailsMessageEl.textContent = details;
}

/**
 * @param {string} text
 * @param {string} id
 * @param {boolean} isChecked
 * @return {HTMLLIElement}
 */
function createOptionItem(text, id, isChecked) {
  const input = document.createElement('input');
  input.setAttribute('type', 'checkbox');
  input.setAttribute('value', id);
  if (isChecked) {
    input.setAttribute('checked', 'checked');
  }

  const label = document.createElement('label');
  label.appendChild(input);
  label.appendChild(document.createTextNode(text));
  const listItem = document.createElement('li');
  listItem.appendChild(label);

  return listItem;
}

/**
 * Click event handler for Generate Report button.
 * @param {BackgroundPage} background Reference to the extension's background page.
 * @param {{selectedCategories: Array<string>, useDevTools: boolean}} settings
 */
async function onGenerateReportButtonClick(background, settings) {
  if (isRunning) {
    return;
  }
  isRunning = true;

  // resetting status message
  const statusMsg = find('.status__msg');
  statusMsg.textContent = 'Starting...';

  showRunningSubpage();

  const feedbackEl = find('.feedback');
  feedbackEl.textContent = '';
  const {selectedCategories, useDevTools} = settings;
  /** @type {LH.Flags} */
  const flags = {throttlingMethod: useDevTools ? 'devtools' : 'simulate'};

  try {
    await background.runLighthouseInExtension(flags, selectedCategories);

    // Close popup once report is opened in a new tab
    window.close();
  } catch (err) {
    let message = err.message;
    let includeReportLink = true;

    // Check for errors in how the user ran Lighthouse and replace with a more
    // helpful message (and remove 'Report Error' link).
    for (const [test, replacement] of Object.entries(NON_BUG_ERROR_MESSAGES)) {
      if (message.includes(test)) {
        message = replacement;
        includeReportLink = false;
        break;
      }
    }

    feedbackEl.textContent = message;

    if (includeReportLink) {
      feedbackEl.className = 'feedback feedback-error';
      feedbackEl.appendChild(buildReportErrorLink(err));
    }

    hideRunningSubpage();
    background.console.error(err);
  }

  isRunning = false;
}

/**
 * Generates a document fragment containing a list of checkboxes and labels
 * for the categories.
 * @param {BackgroundPage} background Reference to the extension's background page.
 * @param {Array<string>} selectedCategories
 */
function generateOptionsList(background, selectedCategories) {
  const frag = document.createDocumentFragment();

  background.getDefaultCategories().forEach(category => {
    const isChecked = selectedCategories.includes(category.id);
    frag.appendChild(createOptionItem(category.title, category.id, isChecked));
  });

  const optionsList = find('.options__list');
  optionsList.appendChild(frag);
}

/**
 * Initializes the popup's state and UI elements.
 */
async function initPopup() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      return;
    }

    siteURL = new URL(tabs[0].url || '');

    // Show the user what URL is going to be tested.
    find('header h2').textContent = siteURL.origin;
  });

  /**
   * Really the Window of the background page, but since we only want what's exposed
   * on window in lighthouse-ext-background.js, use its module API as the type.
   * @type {BackgroundPage}
   */
  const background = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));

  // To prevent visual hiccups when opening the popup, we default the subpage
  // to the "running" view and switch to the default view once we're sure
  // Lighthouse is not already auditing the page. This change was necessary
  // now that fetching the background event page is async.
  if (background.isRunning()) {
    showRunningSubpage();
  } else {
    hideRunningSubpage();
  }

  background.listenForStatus(logStatus);

  // generate checkboxes from saved settings
  background.loadSettings().then(settings => {
    generateOptionsList(background, settings.selectedCategories);
    const lanternCheck = /** @type {HTMLInputElement} */ (find('#lantern-checkbox'));
    lanternCheck.checked = !settings.useDevTools;
  });

  // bind throttling control button
  const lanternCheckbox = /** @type {HTMLInputElement} */ (find('#lantern-checkbox'));
  lanternCheckbox.addEventListener('change', async () => {
    const settings = await background.loadSettings();
    settings.useDevTools = !lanternCheckbox.checked;
    background.saveSettings(settings);
  });

  // bind Generate Report button
  const generateReportButton = find('#generate-report');
  generateReportButton.addEventListener('click', () => {
    background.loadSettings().then(settings => {
      onGenerateReportButtonClick(background, settings);
    });
  });

  // bind View Options button
  const generateOptionsEl = find('#configure-options');
  const optionsEl = find('.options');
  generateOptionsEl.addEventListener('click', () => {
    optionsEl.classList.add(subpageVisibleClass);
  });

  // bind Save Options button
  const okButton = find('#ok');
  okButton.addEventListener('click', () => {
    // Save settings when options page is closed.
    const checkboxes = /** @type {NodeListOf<HTMLInputElement>} */
      (optionsEl.querySelectorAll(':checked'));
    const selectedCategories = Array.from(checkboxes).map(input => input.value);

    background.saveSettings({
      useDevTools: !lanternCheckbox.checked,
      selectedCategories,
    });

    optionsEl.classList.remove(subpageVisibleClass);
  });
}

initPopup();
