/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH {
    /**
     * The lightweight version of Lighthouse results.
     */
    export interface ResultLite {
      /** The URL that was supplied to Lighthouse and initially navigated to. */
      requestedUrl: string;
      /** The post-redirects URL that Lighthouse loaded. */
      finalUrl: string;
      /** The ISO-8601 timestamp of when the results were generated. */
      fetchTime: string;
      /** The version of Lighthouse with which these results were generated. */
      lighthouseVersion: string;
      /** An object containing the results of the audits. */
      audits: Record<string, ResultLite.Audit>;
      /** An object containing the top-level categories, their overall scores, and reference to member audits. */
      categories: Record<string, ResultLite.Category>;
    }

    // ResultLite namespace
    export module ResultLite {
      export interface Category {
        /** The human-friendly name of the category. */
        title: string;
        /** A description of what this category is about (e.g. these help you validate your PWA). */
        description: string;
        /** The overall score of the category, the weighted average of all its audits. */
        score: number;
        /** An array of references to all the audit members of this category. */
        auditRefs: AuditRef[];
        /** An optional description for manual audits within this category. */
        manualDescription?: string;
      }

      /**
       * A reference to an audit result, with weighting and grouping information
       * for its place in this category.
       */
      export interface AuditRef {
        /** Matches a key in the top-level `audits` object. */
        auditId: string;
        /** The weight of the audit's score in the overall category score. */
        weight: number;
      }

      export interface Audit {
        /** The brief description of the audit. The text can change depending on if the audit passed or failed. */
        title: string;
        /** A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported. */
        description: string;
        /** The scored value determined by the audit, in the range `0-1`, or null if `scoreDisplayMode` indicates not scored. */
        score: number | null;
        /**
         * A string identifying how the score should be interpreted:
         * 'binary': pass/fail audit (0 and 1 are only possible scores).
         * 'numeric': scores of 0-1 (map to displayed scores of 0-100).
         * 'informative': the audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored.
         * 'not-applicable': the audit turned out to not apply to the page. Score is null and should be ignored.
         * 'manual': The audit exists only to tell you to review something yourself. Score is null and should be ignored.
         * 'error': There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored.
         */
        scoreDisplayMode: 'binary' | 'numeric' | 'informative' | 'not-applicable' | 'manual' | 'error';
        /** An explanation of audit-related issues encountered on the test page. */
        explanation?: string;
        /** Extra information provided by some types of audits. */
        details?: Audit.MetricDetails | Audit.OpportunityDetails;
        /** Error message from any exception thrown while running this audit. */
        errorMessage?: string;
      }

      export module Audit {
        export interface MetricDetails {
          type: 'metric';
          /** The value of the metric expressed in milliseconds. */
          timespanMs?: number;
        }

        export interface OpportunityDetails {
          type: 'opportunity';
          overallSavingsMs: number
          overallSavingsBytes?: number
          headings: ColumnHeading[];
          items: (WastedBytesDetailsItem | WastedTimeDetailsItem)[];
        }

        export interface ColumnHeading {
          /** The property key name within DetailsItem being described. */
          key: string;
          /** Readable text label of the field. */
          label: string;
          // TODO(bckenny): should be just string and let lhr be more specific?
          valueType: 'url' | 'timespanMs' | 'bytes' | 'thumbnail';
        }

        export interface WastedBytesDetailsItem {
          url: string;
          wastedBytes?: number;
          totalBytes?: number;
          [p: string]: number | boolean | string | undefined;
        }

        export interface WastedTimeDetailsItem {
          url: string;
          wastedMs: number;
          totalBytes?: number;
          [p: string]: number | boolean | string | undefined;
        }
      }
    }
  }
}

// empty export to keep file a module
export {}
