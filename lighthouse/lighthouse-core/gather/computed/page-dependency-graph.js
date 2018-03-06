/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const NetworkNode = require('../../lib/dependency-graph/network-node');
const CPUNode = require('../../lib/dependency-graph/cpu-node');
const TracingProcessor = require('../../lib/traces/tracing-processor');
const WebInspector = require('../../lib/web-inspector');

// Tasks smaller than 10 ms have minimal impact on simulation
const MINIMUM_TASK_DURATION_OF_INTEREST = 10;
// TODO: video files tend to be enormous and throw off all graph traversals, move this ignore
//    into estimation logic when we use the dependency graph for other purposes.
const IGNORED_MIME_TYPES_REGEX = /^video/;

class PageDependencyGraphArtifact extends ComputedArtifact {
  get name() {
    return 'PageDependencyGraph';
  }

  get requiredNumberOfArtifacts() {
    return 2;
  }

  /**
   * @param {!WebInspector.NetworkRequest} record
   * @return {!Array<string>}
   */
  static getNetworkInitiators(record) {
    if (!record._initiator) return [];
    if (record._initiator.url) return [record._initiator.url];
    if (record._initiator.type === 'script') {
      const frames = record._initiator.stack.callFrames;
      return Array.from(new Set(frames.map(frame => frame.url))).filter(Boolean);
    }

    return [];
  }

  /**
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @return {!NetworkNodeOutput}
   */
  static getNetworkNodeOutput(networkRecords) {
    const nodes = [];
    const idToNodeMap = new Map();
    const urlToNodeMap = new Map();

    networkRecords.forEach(record => {
      if (IGNORED_MIME_TYPES_REGEX.test(record.mimeType)) return;

      // Network record requestIds can be duplicated for an unknown reason
      // Suffix all subsequent records with `:duplicate` until it's unique
      while (idToNodeMap.has(record.requestId)) {
        record._requestId += ':duplicate';
      }

      const node = new NetworkNode(record);
      nodes.push(node);

      const list = urlToNodeMap.get(record.url) || [];
      list.push(node);

      idToNodeMap.set(record.requestId, node);
      urlToNodeMap.set(record.url, list);
    });

    return {nodes, idToNodeMap, urlToNodeMap};
  }

  /**
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Array<!CPUNode>}
   */
  static getCPUNodes(traceOfTab) {
    const nodes = [];
    let i = 0;

    const minimumEvtDur = MINIMUM_TASK_DURATION_OF_INTEREST * 1000;
    while (i < traceOfTab.mainThreadEvents.length) {
      const evt = traceOfTab.mainThreadEvents[i];

      // Skip all trace events that aren't schedulable tasks with sizable duration
      if (
        !TracingProcessor.isScheduleableTask(evt)||
        !evt.dur ||
        evt.dur < minimumEvtDur
      ) {
        i++;
        continue;
      }

      // Capture all events that occurred within the task
      const children = [];
      i++; // Start examining events after this one
      for (
        const endTime = evt.ts + evt.dur;
        i < traceOfTab.mainThreadEvents.length && traceOfTab.mainThreadEvents[i].ts < endTime;
        i++
      ) {
        children.push(traceOfTab.mainThreadEvents[i]);
      }

      nodes.push(new CPUNode(evt, children));
    }

    return nodes;
  }

  /**
   * @param {!Node} rootNode
   * @param {!NetworkNodeOutput} networkNodeOutput
   */
  static linkNetworkNodes(rootNode, networkNodeOutput) {
    networkNodeOutput.nodes.forEach(node => {
      const initiators = PageDependencyGraphArtifact.getNetworkInitiators(node.record);
      if (initiators.length) {
        initiators.forEach(initiator => {
          const parentCandidates = networkNodeOutput.urlToNodeMap.get(initiator) || [rootNode];
          // Only add the initiator relationship if the initiator is unambiguous
          const parent = parentCandidates.length === 1 ? parentCandidates[0] : rootNode;
          node.addDependency(parent);
        });
      } else if (node !== rootNode) {
        rootNode.addDependent(node);
      }

      const redirects = Array.from(node.record.redirects || []);
      redirects.push(node.record);

      for (let i = 1; i < redirects.length; i++) {
        const redirectNode = networkNodeOutput.idToNodeMap.get(redirects[i - 1].requestId);
        const actualNode = networkNodeOutput.idToNodeMap.get(redirects[i].requestId);
        actualNode.addDependency(redirectNode);
      }
    });
  }

  /**
   * @param {!Node} rootNode
   * @param {!NetworkNodeOutput} networkNodeOutput
   * @param {!Array<!CPUNode>} cpuNodes
   */
  static linkCPUNodes(rootNode, networkNodeOutput, cpuNodes) {
    function addDependentNetworkRequest(cpuNode, reqId) {
      const networkNode = networkNodeOutput.idToNodeMap.get(reqId);
      if (!networkNode ||
          networkNode.record._resourceType !== WebInspector.resourceTypes.XHR) return;
      cpuNode.addDependent(networkNode);
    }

    function addDependencyOnUrl(cpuNode, url) {
      if (!url) return;
      const candidates = networkNodeOutput.urlToNodeMap.get(url) || [];

      let minCandidate = null;
      let minDistance = Infinity;
      // Find the closest request that finished before this CPU task started
      candidates.forEach(candidate => {
        const distance = cpuNode.startTime - candidate.endTime;
        if (distance > 0 && distance < minDistance) {
          minCandidate = candidate;
          minDistance = distance;
        }
      });

      if (!minCandidate) return;
      cpuNode.addDependency(minCandidate);
    }

    const timers = new Map();
    for (const node of cpuNodes) {
      for (const evt of node.childEvents) {
        if (!evt.args.data) continue;

        const url = evt.args.data.url;
        const stackTraceUrls = (evt.args.data.stackTrace || []).map(l => l.url).filter(Boolean);

        switch (evt.name) {
          case 'TimerInstall':
            timers.set(evt.args.data.timerId, node);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;
          case 'TimerFire': {
            const installer = timers.get(evt.args.data.timerId);
            if (!installer) break;
            installer.addDependent(node);
            break;
          }

          case 'InvalidateLayout':
          case 'ScheduleStyleRecalculation':
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;

          case 'EvaluateScript':
            addDependencyOnUrl(node, url);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;

          case 'XHRReadyStateChange':
            // Only create the dependency if the request was completed
            if (evt.args.data.readyState !== 4) break;

            addDependencyOnUrl(node, url);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;

          case 'FunctionCall':
          case 'v8.compile':
            addDependencyOnUrl(node, url);
            break;

          case 'ParseAuthorStyleSheet':
            addDependencyOnUrl(node, evt.args.data.styleSheetUrl);
            break;

          case 'ResourceSendRequest':
            addDependentNetworkRequest(node, evt.args.data.requestId, evt);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;
        }
      }

      if (node.getNumberOfDependencies() === 0) {
        node.addDependency(rootNode);
      }
    }
  }

  /**
   * @param {!TraceOfTabArtifact} traceOfTab
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @return {!Node}
   */
  static createGraph(traceOfTab, networkRecords) {
    const networkNodeOutput = PageDependencyGraphArtifact.getNetworkNodeOutput(networkRecords);
    const cpuNodes = PageDependencyGraphArtifact.getCPUNodes(traceOfTab);

    const rootRequest = networkRecords.reduce((min, r) => (min.startTime < r.startTime ? min : r));
    const rootNode = networkNodeOutput.idToNodeMap.get(rootRequest.requestId);

    PageDependencyGraphArtifact.linkNetworkNodes(rootNode, networkNodeOutput, networkRecords);
    PageDependencyGraphArtifact.linkCPUNodes(rootNode, networkNodeOutput, cpuNodes);

    if (NetworkNode.hasCycle(rootNode)) {
      throw new Error('Invalid dependency graph created, cycle detected');
    }

    return rootNode;
  }

  /**
   *
   * @param {!Node} rootNode
   */
  static printGraph(rootNode, widthInCharacters = 100) {
    function padRight(str, target, padChar = ' ') {
      return str + padChar.repeat(Math.max(target - str.length, 0));
    }

    const nodes = [];
    rootNode.traverse(node => nodes.push(node));
    nodes.sort((a, b) => a.startTime - b.startTime);

    const min = nodes[0].startTime;
    const max = nodes.reduce((max, node) => Math.max(max, node.endTime), 0);

    const totalTime = max - min;
    const timePerCharacter = totalTime / widthInCharacters;
    nodes.forEach(node => {
      const offset = Math.round((node.startTime - min) / timePerCharacter);
      const length = Math.ceil((node.endTime - node.startTime) / timePerCharacter);
      const bar = padRight('', offset) + padRight('', length, '=');

      const displayName = node.record ? node.record._url : node.type;
      // eslint-disable-next-line
      console.log(padRight(bar, widthInCharacters), `| ${displayName.slice(0, 30)}`);
    });
  }

  /**
   * @param {!Trace} trace
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!Promise<!Node>}
   */
  compute_(trace, devtoolsLog, artifacts) {
    const promises = [
      artifacts.requestTraceOfTab(trace),
      artifacts.requestNetworkRecords(devtoolsLog),
    ];

    return Promise.all(promises).then(([traceOfTab, networkRecords]) => {
      return PageDependencyGraphArtifact.createGraph(traceOfTab, networkRecords);
    });
  }
}

module.exports = PageDependencyGraphArtifact;

/**
 * @typedef {{
 *    nodes: !Array<!NetworkNode>,
 *    idToNodeMap: !Map<string, !NetworkNode>,
 *    urlToNodeMap: !Map<string, !Array<!NetworkNode>
 * }}
 */
PageDependencyGraphArtifact.NetworkNodeOutput; // eslint-disable-line no-unused-expressions
