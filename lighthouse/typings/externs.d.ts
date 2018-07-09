/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _Crdp from 'devtools-protocol/types/protocol';
import _CrdpMappings from 'devtools-protocol/types/protocol-mapping'

declare global {
  // Augment global Error type to include node's optional `code` property
  // see https://nodejs.org/api/errors.html#errors_error_code
  interface Error {
    code?: string;
  }

  // Augment Intl to include
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/getCanonicalLocales
  namespace Intl {
    var getCanonicalLocales: (locales?: string | Array<string>) => Array<string>;
  }

  /** Make properties K in T optional. */
  type MakeOptional<T, K extends keyof T> = {
    [P in Exclude<keyof T, K>]: T[P]
  } & {
    [P in K]+?: T[P]
  }

  /** An object with the keys in the union K mapped to themselves as values. */
  type SelfMap<K extends string> = {
    [P in K]: P;
  };

  /** Make optional all properties on T and any properties on object properties of T. */
  type RecursivePartial<T> = {
    [P in keyof T]+?: T[P] extends object ?
      RecursivePartial<T[P]> :
      T[P];
  };

  /**
   * Exclude void from T
   */
  type NonVoid<T> = T extends void ? never : T;

  /** Remove properties K from T. */
  type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  /** Obtain the type of the first parameter of a function. */
  type FirstParamType<T extends (arg1: any, ...args: any[]) => any> =
    T extends (arg1: infer P, ...args: any[]) => any ? P : never;

  module LH {
    // re-export useful type modules under global LH module.
    export import Crdp = _Crdp;
    export import CrdpEvents = _CrdpMappings.Events;
    export import CrdpCommands = _CrdpMappings.Commands;

    interface ThrottlingSettings {
      // simulation settings
      rttMs?: number;
      throughputKbps?: number;
      // devtools settings
      requestLatencyMs?: number;
      downloadThroughputKbps?: number;
      uploadThroughputKbps?: number;
      // used by both
      cpuSlowdownMultiplier?: number
    }

    export type Locale = 'en-US'|'en'|'en-AU'|'en-GB'|'en-IE'|'en-SG'|'en-ZA'|'en-IN'|'ar-XB'|'ar'|'bg'|'bs'|'ca'|'cs'|'da'|'de'|'el'|'en-XA'|'es'|'fi'|'fil'|'fr'|'he'|'hi'|'hr'|'hu'|'gsw'|'id'|'in'|'it'|'iw'|'ja'|'ko'|'lt'|'lv'|'mo'|'nl'|'nb'|'no'|'pl'|'pt'|'pt-PT'|'ro'|'ru'|'sk'|'sl'|'sr'|'sr-Latn'|'sv'|'ta'|'te'|'th'|'tl'|'tr'|'uk'|'vi'|'zh'|'zh-HK'|'zh-TW';

    export type OutputMode = 'json' | 'html' | 'csv';

    interface SharedFlagsSettings {
      output?: OutputMode|OutputMode[];
      locale?: Locale;
      maxWaitForLoad?: number;
      blockedUrlPatterns?: string[] | null;
      additionalTraceCategories?: string | null;
      auditMode?: boolean | string;
      gatherMode?: boolean | string;
      disableStorageReset?: boolean;
      disableDeviceEmulation?: boolean;
      throttlingMethod?: 'devtools'|'simulate'|'provided';
      throttling?: ThrottlingSettings;
      onlyAudits?: string[] | null;
      onlyCategories?: string[] | null;
      skipAudits?: string[] | null;
      extraHeaders?: Crdp.Network.Headers | null; // See extraHeaders TODO in bin.js
    }

    export interface Flags extends SharedFlagsSettings {
      port?: number;
      hostname?: string;
      logLevel?: 'silent'|'error'|'info'|'verbose';
      configPath?: string;
    }

    /**
     * Flags accepted by Lighthouse, plus additional flags just
     * for controlling the CLI.
     */
    export interface CliFlags extends Flags {
      _: string[];
      chromeFlags: string;
      outputPath: string;
      saveAssets: boolean;
      view: boolean;
      enableErrorReporting?: boolean;
      listAllAudits: boolean;
      listTraceCategories: boolean;
      preset?: 'full'|'mixed-content'|'perf';
      verbose: boolean;
      quiet: boolean;
      // following are given defaults in cli-flags, so not optional like in Flags or SharedFlagsSettings
      output: OutputMode[];
      port: number;
      hostname: string;
    }

    export interface RunnerResult {
      lhr: Result;
      report: string|string[];
      artifacts: Artifacts;
    }

    export interface ReportCategory {
      name: string;
      description: string;
      audits: ReportAudit[];
    }

    export interface ReportAudit {
      id: string;
      weight: number;
      group: string;
    }

    export interface LighthouseError extends Error {
      friendlyMessage?: string;
    }

    /**
     * A record of DevTools Debugging Protocol events.
     */
    export type DevtoolsLog = Array<Protocol.RawEventMessage>;

    export interface Trace {
      traceEvents: TraceEvent[];
      metadata?: {
        'cpu-family'?: number;
      };
      [futureProps: string]: any;
    }

    /**
     * @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview
     */
    export interface TraceEvent {
      name: string;
      cat: string;
      args: {
        fileName?: string;
        snapshot?: string;
        data?: {
          documentLoaderURL?: string;
          frames?: {
            frame: string;
            parent?: string;
            processId?: number;
          }[];
          page?: string;
          readyState?: number;
          requestId?: string;
          stackTrace?: {
            url: string
          }[];
          styleSheetUrl?: string;
          timerId?: string;
          url?: string;
        };
        frame?: string;
        name?: string;
      };
      pid: number;
      tid: number;
      ts: number;
      dur: number;
      ph: 'B'|'b'|'D'|'E'|'e'|'F'|'I'|'M'|'N'|'n'|'O'|'R'|'S'|'T'|'X';
      s?: 't';
    }

    export interface DevToolsJsonTarget {
      description: string;
      devtoolsFrontendUrl: string;
      id: string;
      title: string;
      type: string;
      url: string;
      webSocketDebuggerUrl: string;
    }
  }
}
