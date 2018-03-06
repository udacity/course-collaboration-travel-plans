/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Node = require('./node');
const WebInspector = require('../web-inspector');

class NetworkNode extends Node {
  /**
   * @param {LH.NetworkRequest} networkRecord
   */
  constructor(networkRecord) {
    super(networkRecord.requestId);
    this._record = networkRecord;
  }

  /**
   * @return {string}
   */
  get type() {
    return Node.TYPES.NETWORK;
  }

  /**
   * @return {number}
   */
  get startTime() {
    return this._record.startTime * 1000 * 1000;
  }

  /**
   * @return {number}
   */
  get endTime() {
    return this._record.endTime * 1000 * 1000;
  }

  /**
   * @return {LH.NetworkRequest}
   */
  get record() {
    // Ensure that the record has an origin value
    if (this._record.origin === undefined) {
      this._record.origin = this._record.parsedURL
        ? `${this._record.parsedURL.scheme}://${this._record.parsedURL.host}`
        : null;
    }

    return this._record;
  }

  /**
   * @return {?string}
   */
  get initiatorType() {
    return this._record._initiator && this._record._initiator.type;
  }

  /**
   * @return {boolean}
   */
  hasRenderBlockingPriority() {
    const priority = this._record.priority();
    const isScript = this._record._resourceType === WebInspector.resourceTypes.Script;
    return priority === 'VeryHigh' || (priority === 'High' && isScript);
  }

  /**
   * @return {NetworkNode}
   */
  cloneWithoutRelationships() {
    return new NetworkNode(this._record);
  }
}

module.exports = NetworkNode;
