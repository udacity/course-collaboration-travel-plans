/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const isDeepEqual = require('lodash.isequal');
const log = require('lighthouse-logger');
const MessageFormat = require('intl-messageformat').default;
const MessageParser = require('intl-messageformat-parser');
const lookupClosestLocale = require('lookup-closest-locale');
const LOCALES = require('./locales.js');

const LH_ROOT = path.join(__dirname, '../../../');
const MESSAGE_INSTANCE_ID_REGEX = /(.* \| .*) # (\d+)$/;
// Above regex is very slow against large strings. Use QUICK_REGEX as a much quicker discriminator.
const MESSAGE_INSTANCE_ID_QUICK_REGEX = / # \d+$/;

(() => {
  // Node usually doesn't come with the locales we want built-in, so load the polyfill if we can.

  try {
    // @ts-ignore
    const IntlPolyfill = require('intl');
    // In browser environments where we don't need the polyfill, this won't exist
    if (!IntlPolyfill.NumberFormat) return;

    Intl.NumberFormat = IntlPolyfill.NumberFormat;
    Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
  } catch (_) {
    log.warn('i18n', 'Failed to install `intl` polyfill');
  }
})();


const UIStrings = {
  /** Used to show the duration in milliseconds that something lasted. The `{timeInMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 63 ms) */
  ms: '{timeInMs, number, milliseconds}\xa0ms',
  /** Used to show the duration in seconds that something lasted. The {timeInMs} placeholder will be replaced with the time duration, shown in seconds (e.g. 5.2 s) */
  seconds: '{timeInMs, number, seconds}\xa0s',
  /** Label shown per-audit to show how many bytes smaller the page could be if the user implemented the suggestions. The `{wastedBytes}` placeholder will be replaced with the number of bytes, shown in kilobytes (e.g. 148 KB) */
  displayValueByteSavings: 'Potential savings of {wastedBytes, number, bytes}\xa0KB',
  /** Label shown per-audit to show how many milliseconds faster the page load could be if the user implemented the suggestions. The `{wastedMs}` placeholder will be replaced with the time duration, shown in milliseconds (e.g. 140 ms) */
  displayValueMsSavings: 'Potential savings of {wastedMs, number, milliseconds}\xa0ms',
  /** Label for the URL column in data tables, entries will be the URL of a web resource */
  columnURL: 'URL',
  /** Label for the size column in data tables, entries will be the size of a web resource in kilobytes */
  columnSize: 'Size (KB)',
  /** Label for the TTL column in data tables, entries will be the time to live value of the cache header on a web resource */
  columnCacheTTL: 'Cache TTL',
  /** Label for the wasted bytes column in data tables, entries will be the number of kilobytes the user could reduce their page by if they implemented the suggestions */
  columnWastedBytes: 'Potential Savings (KB)',
  /** Label for the wasted bytes column in data tables, entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions */
  columnWastedMs: 'Potential Savings (ms)',
  /** Label for the time spent column in data tables, entries will be the number of milliseconds spent during a particular activity */
  columnTimeSpent: 'Time Spent',
};

const formats = {
  number: {
    bytes: {
      maximumFractionDigits: 0,
    },
    milliseconds: {
      maximumFractionDigits: 0,
    },
    seconds: {
      // Force the seconds to the tenths place for limited output and ease of scanning
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  },
};

/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 * - the default locale ('en') if no match is found
 *
 * If `locale` isn't provided, the default is used.
 * @param {string=} locale
 * @return {LH.Locale}
 */
function lookupLocale(locale) {
  // TODO: could do more work to sniff out default locale
  const canonicalLocale = Intl.getCanonicalLocales(locale)[0];

  const closestLocale = lookupClosestLocale(canonicalLocale, LOCALES);
  return closestLocale || 'en';
}

/**
 * @param {string} icuMessage
 * @param {Record<string, *>} [values]
 */
function _preprocessMessageValues(icuMessage, values) {
  if (!values) return;

  const clonedValues = JSON.parse(JSON.stringify(values));
  const parsed = MessageParser.parse(icuMessage);
  // Throw an error if a message's value isn't provided
  parsed.elements
    .filter(el => el.type === 'argumentElement')
    .forEach(el => {
      if (el.id && (el.id in values) === false) {
        throw new Error('ICU Message contains a value reference that wasn\'t provided');
      }
    });

  // Round all milliseconds to the nearest 10
  parsed.elements
    .filter(el => el.format && el.format.style === 'milliseconds')
    // @ts-ignore - el.id is always defined when el.format is defined
    .forEach(el => (clonedValues[el.id] = Math.round(clonedValues[el.id] / 10) * 10));

  // Convert all seconds to the correct unit
  parsed.elements
    .filter(el => el.format && el.format.style === 'seconds' && el.id === 'timeInMs')
    // @ts-ignore - el.id is always defined when el.format is defined
    .forEach(el => (clonedValues[el.id] = Math.round(clonedValues[el.id] / 100) / 10));

  // Replace all the bytes with KB
  parsed.elements
    .filter(el => el.format && el.format.style === 'bytes')
    // @ts-ignore - el.id is always defined when el.format is defined
    .forEach(el => (clonedValues[el.id] = clonedValues[el.id] / 1024));

  return clonedValues;
}

/**
 * @typedef IcuMessageInstance
 * @prop {string} icuMessageId
 * @prop {string} icuMessage
 * @prop {*} [values]
 */

/** @type {Map<string, IcuMessageInstance[]>} */
const _icuMessageInstanceMap = new Map();

/**
 *
 * @param {LH.Locale} locale
 * @param {string} icuMessageId
 * @param {string} icuMessage
 * @param {*} [values]
 * @return {{formattedString: string, icuMessage: string}}
 */
function _formatIcuMessage(locale, icuMessageId, icuMessage, values) {
  const localeMessages = LOCALES[locale];
  const localeMessage = localeMessages[icuMessageId] && localeMessages[icuMessageId].message;
  // fallback to the original english message if we couldn't find a message in the specified locale
  // better to have an english message than no message at all, in some number cases it won't even matter
  const messageForMessageFormat = localeMessage || icuMessage;
  // when using accented english, force the use of a different locale for number formatting
  const localeForMessageFormat = locale === 'en-XA' ? 'de-DE' : locale;
  // pre-process values for the message format like KB and milliseconds
  const valuesForMessageFormat = _preprocessMessageValues(icuMessage, values);

  const formatter = new MessageFormat(messageForMessageFormat, localeForMessageFormat, formats);
  const formattedString = formatter.format(valuesForMessageFormat);

  return {formattedString, icuMessage: messageForMessageFormat};
}

/** @param {string[]} pathInLHR */
function _formatPathAsString(pathInLHR) {
  let pathAsString = '';
  for (const property of pathInLHR) {
    if (/^[a-z]+$/i.test(property)) {
      if (pathAsString.length) pathAsString += '.';
      pathAsString += property;
    } else {
      if (/]|"|'|\s/.test(property)) throw new Error(`Cannot handle "${property}" in i18n`);
      pathAsString += `[${property}]`;
    }
  }

  return pathAsString;
}

/**
 * @param {LH.Locale} locale
 * @return {LH.I18NRendererStrings}
 */
function getRendererFormattedStrings(locale) {
  const icuMessageIds = Object.keys(LOCALES[locale]).filter(f => f.includes('core/report/html/'));
  /** @type {LH.I18NRendererStrings} */
  const strings = {};
  for (const icuMessageId of icuMessageIds) {
    const [filename, varName] = icuMessageId.split(' | ');
    if (!filename.endsWith('util.js')) throw new Error(`Unexpected message: ${icuMessageId}`);
    strings[varName] = LOCALES[locale][icuMessageId].message;
  }

  return strings;
}

/**
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
function createMessageInstanceIdFn(filename, fileStrings) {
  /** @type {Record<string, string>} */
  const mergedStrings = {...UIStrings, ...fileStrings};

  /** @param {string} icuMessage @param {*} [values] */
  const getMessageInstanceIdFn = (icuMessage, values) => {
    const keyname = Object.keys(mergedStrings).find(key => mergedStrings[key] === icuMessage);
    if (!keyname) throw new Error(`Could not locate: ${icuMessage}`);

    const filenameToLookup = keyname in fileStrings ? filename : __filename;
    const unixStyleFilename = path.relative(LH_ROOT, filenameToLookup).replace(/\\/g, '/');
    const icuMessageId = `${unixStyleFilename} | ${keyname}`;
    const icuMessageInstances = _icuMessageInstanceMap.get(icuMessageId) || [];

    let indexOfInstance = icuMessageInstances.findIndex(inst => isDeepEqual(inst.values, values));
    if (indexOfInstance === -1) {
      icuMessageInstances.push({icuMessageId, icuMessage, values});
      indexOfInstance = icuMessageInstances.length - 1;
    }

    _icuMessageInstanceMap.set(icuMessageId, icuMessageInstances);

    return `${icuMessageId} # ${indexOfInstance}`;
  };

  return getMessageInstanceIdFn;
}

/**
 * @param {string} icuMessageIdOrRawString
 * @param {LH.Locale} locale
 * @return {string}
 */
function getFormatted(icuMessageIdOrRawString, locale) {
  if (MESSAGE_INSTANCE_ID_QUICK_REGEX.test(icuMessageIdOrRawString) &&
      MESSAGE_INSTANCE_ID_REGEX.test(icuMessageIdOrRawString)) {
    return _resolveIcuMessageInstanceId(icuMessageIdOrRawString, locale).formattedString;
  }

  return icuMessageIdOrRawString;
}

/**
 * @param {string} icuMessageInstanceId
 * @param {LH.Locale} locale
 * @return {{icuMessageInstance: IcuMessageInstance, formattedString: string}}
 */
function _resolveIcuMessageInstanceId(icuMessageInstanceId, locale) {
  const matches = icuMessageInstanceId.match(MESSAGE_INSTANCE_ID_REGEX);
  if (!matches) throw new Error(`${icuMessageInstanceId} is not a valid message instance ID`);

  const [_, icuMessageId, icuMessageInstanceIndex] = matches;
  const icuMessageInstances = _icuMessageInstanceMap.get(icuMessageId) || [];
  const icuMessageInstance = icuMessageInstances[Number(icuMessageInstanceIndex)];

  const {formattedString} = _formatIcuMessage(locale, icuMessageId,
    icuMessageInstance.icuMessage, icuMessageInstance.values);

  return {icuMessageInstance, formattedString};
}

/**
 * @param {LH.Result} lhr
 * @param {LH.Locale} locale
 */
function replaceIcuMessageInstanceIds(lhr, locale) {
  /**
   * @param {*} objectInLHR
   * @param {LH.I18NMessages} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(objectInLHR, icuMessagePaths, pathInLHR = []) {
    if (typeof objectInLHR !== 'object' || !objectInLHR) return;

    for (const [property, value] of Object.entries(objectInLHR)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Check to see if the value in the LHR looks like a string reference. If it is, replace it.
      if (typeof value === 'string' && MESSAGE_INSTANCE_ID_QUICK_REGEX.test(value) &&
          MESSAGE_INSTANCE_ID_REGEX.test(value)) {
        const {icuMessageInstance, formattedString} = _resolveIcuMessageInstanceId(value, locale);
        const messageInstancesInLHR = icuMessagePaths[icuMessageInstance.icuMessageId] || [];
        const currentPathAsString = _formatPathAsString(currentPathInLHR);

        messageInstancesInLHR.push(
          icuMessageInstance.values ?
            {values: icuMessageInstance.values, path: currentPathAsString} :
            currentPathAsString
        );

        objectInLHR[property] = formattedString;
        icuMessagePaths[icuMessageInstance.icuMessageId] = messageInstancesInLHR;
      } else {
        replaceInObject(value, icuMessagePaths, currentPathInLHR);
      }
    }
  }

  /** @type {LH.I18NMessages} */
  const icuMessagePaths = {};
  replaceInObject(lhr, icuMessagePaths);
  return icuMessagePaths;
}

module.exports = {
  _formatPathAsString,
  UIStrings,
  lookupLocale,
  getRendererFormattedStrings,
  createMessageInstanceIdFn,
  getFormatted,
  replaceIcuMessageInstanceIds,
};
