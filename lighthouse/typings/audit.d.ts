/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import ArbitraryEqualityMap = require('../lighthouse-core/lib/arbitrary-equality-map.js');

declare global {
  module LH.Audit {
    export interface Context {
      /** audit options */
      options: Record<string, any>;
      settings: Config.Settings;
      /** Push to this array to add top-level warnings to the LHR. */
      LighthouseRunWarnings: Array<string>;
      /**
       * Nested cache for already-computed computed artifacts. Keyed first on
       * the computed artifact's `name` property, then on input artifact(s).
       * Values are Promises resolving to the computedArtifact result.
       */
      computedCache: Map<string, ArbitraryEqualityMap>;
    }

    export interface ScoreOptions {
      scorePODR: number;
      scoreMedian: number;
    }

    export interface ScoreDisplayModes {
      NUMERIC: 'numeric';
      BINARY: 'binary';
      MANUAL: 'manual';
      INFORMATIVE: 'informative';
      NOT_APPLICABLE: 'not-applicable';
      ERROR: 'error';
    }

    export type ScoreDisplayMode = Audit.ScoreDisplayModes[keyof Audit.ScoreDisplayModes];

    interface DisplayValueArray extends Array<string|number> {
      0: string;
    }

    export type DisplayValue = string | DisplayValueArray;

    export interface Meta {
      /** The string identifier of the audit, in kebab case. */
      id: string;
      /** Short, user-visible title for the audit when successful. */
      title: string;
      /** Short, user-visible title for the audit when failing. */
      failureTitle?: string;
      /** Explanation of why the user should care about the audit. */
      description: string;
      /** A list of the members of LH.Artifacts that must be present for the audit to execute. */
      requiredArtifacts: Array<keyof Artifacts>;
      /** A string identifying how the score should be interpreted for display. */
      scoreDisplayMode?: Audit.ScoreDisplayMode;
    }

    export interface Heading {
      key: string;
      itemType: string;
      text: string;
      displayUnit?: string;
      granularity?: number;
    }

    export interface ByteEfficiencyItem extends Result.Audit.OpportunityDetailsItem {
      url: string;
      wastedBytes: number;
      totalBytes: number;
      wastedPercent?: number;
    }

    // TODO: placeholder typedefs until Details are typed
    export interface DetailsRendererDetailsSummary {
      wastedMs?: number;
      wastedBytes?: number;
    }

    // TODO: placeholder typedefs until Details are typed
    export interface DetailsRendererDetailsJSON {
      type: 'table';
      headings: Array<Audit.Heading>;
      items: Array<{[x: string]: DetailsItem}>;
      summary?: DetailsRendererDetailsSummary;
    }

    export interface DetailsRendererCodeDetailJSON {
      type: 'code',
      value: string;
    }

    export type DetailsItem = string | number | DetailsRendererNodeDetailsJSON |
      DetailsRendererLinkDetailsJSON | DetailsRendererCodeDetailJSON | undefined |
      boolean | DetailsRendererUrlDetailsJSON | null;

    export interface DetailsRendererNodeDetailsJSON {
      type: 'node';
      path?: string;
      selector?: string;
      snippet?: string;
    }

    export interface DetailsRendererLinkDetailsJSON {
      type: 'link';
      text: string;
      url: string;
    }

    export interface DetailsRendererUrlDetailsJSON {
      type: 'url';
      value: string;
    }

    // Type returned by Audit.audit(). Only rawValue is required.
    export interface Product {
      rawValue: boolean | number | null;
      displayValue?: DisplayValue;
      explanation?: string;
      errorMessage?: string;
      warnings?: string[];
      score?: number;
      extendedInfo?: {[p: string]: any};
      /** Overrides scoreDisplayMode with not-applicable if set to true */
      notApplicable?: boolean;
      // TODO(bckenny): define details
      details?: object;
    }

    /* Audit result returned in Lighthouse report. All audits offer a description and score of 0-1 */
    export interface Result {
      rawValue: boolean | number | null;
      displayValue?: DisplayValue;
      explanation?: string;
      errorMessage?: string;
      warnings?: string[];
      score: number|null;
      /**
       * A string identifying how the score should be interpreted:
       * 'binary': pass/fail audit (0 and 1 are only possible scores).
       * 'numeric': scores of 0-1 (map to displayed scores of 0-100).
       * 'informative': the audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored.
       * 'not-applicable': the audit turned out to not apply to the page. Score is null and should be ignored.
       * 'manual': The audit exists only to tell you to review something yourself. Score is null and should be ignored.
       * 'error': There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored.
       */
      scoreDisplayMode: ScoreDisplayMode;
      /** Short, user-visible title for the audit. The text can change depending on if the audit passed or failed. */
      title: string;
      /** The string identifier of the audit, in kebab case. */
      id: string;
      /** A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported. */
      description: string;
      // TODO(bckenny): define details
      details?: any;
    }

    export interface Results {
      [metric: string]: Result;
    }

    export type SimpleCriticalRequestNode = {
      [id: string]: {
        request: {
          url: string;
          startTime: number;
          endTime: number;
          responseReceivedTime: number;
          transferSize: number;
        };
        children: SimpleCriticalRequestNode;
      }
    }

    type MultiCheckAuditP1 = Partial<Record<Artifacts.ManifestValueCheckID, boolean>>;
    type MultiCheckAuditP2 = Partial<Artifacts.ManifestValues>;
    interface MultiCheckAuditP3 {
      failures: Array<string>;
      warnings?: undefined;
      manifestValues?: undefined;
      allChecks?: undefined;
    }

    export type MultiCheckAuditDetails = MultiCheckAuditP1 & MultiCheckAuditP2 & MultiCheckAuditP3;
  }
}

// empty export to keep file a module
export {}
