/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable max-len */
module.exports = {
  didntCollectScreenshots: `Chrome didn't collect any screenshots during the page load. Please make sure there is content visible on the page, and then try re-running Lighthouse.`,
  badTraceRecording: `Something went wrong with recording the trace over your page load. Please run Lighthouse again.`,
  pageLoadTookTooLong: `Your page took too long to load. Please follow the opportunities in the report to reduce your page load time, and then try re-running Lighthouse.`,
  pageLoadFailed: `Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests.`,
  internalChromeError: `An internal Chrome error occurred. Please restart Chrome and try re-running Lighthouse.`,
  requestContentTimeout: 'Fetching resource content has exceeded the allotted time',
  urlInvalid: `The URL you have provided appears to be invalid.`,
};
