/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 * Define message file to be used for a given locale. A few aliases are defined below.
 *
 * Google locale inheritance rules: https://goto.google.com/ccssm
 * CLDR language aliases: https://www.unicode.org/cldr/charts/latest/supplemental/aliases.html
 */

/** @typedef {Record<string, {message: string}>} LocaleMessages */

// The keys within this const must exactly match the LH.Locale type in externs.d.ts
/** @type {Record<LH.Locale, LocaleMessages>} */
const locales = {
  'en-US': require('./en-US.json'), // The 'source' strings, with descriptions
  // @ts-ignore - tsc bug, something about en/en-US pointing to same file. https://github.com/Microsoft/TypeScript/issues/26307
  'en': require('./en-US.json'), // According to CLDR/ICU, 'en' == 'en-US' dates/numbers (Why?!)

  // TODO: en-GB has just ~10 messages that are different from en-US. We should only ship those.
  'en-AU': require('./locales/en-GB.json'), // Alias of 'en-GB'
  'en-GB': require('./locales/en-GB.json'), // Alias of 'en-GB'
  'en-IE': require('./locales/en-GB.json'), // Alias of 'en-GB'
  'en-SG': require('./locales/en-GB.json'), // Alias of 'en-GB'
  'en-ZA': require('./locales/en-GB.json'), // Alias of 'en-GB'
  'en-IN': require('./locales/en-GB.json'), // Alias of 'en-GB'

  // All locales from here have a messages file, though we allow fallback to the base locale when the files are identical
  'ar-XB': require('./locales/ar-XB.json'), // psuedolocalization
  'ar': require('./locales/ar.json'),
  'bg': require('./locales/bg.json'),
  'bs': require('./locales/hr.json'), // Alias of 'hr'
  'ca': require('./locales/ca.json'),
  'cs': require('./locales/cs.json'),
  'da': require('./locales/da.json'),
  'de': require('./locales/de.json'), // de-AT, de-CH identical, so they fall back into de
  'el': require('./locales/el.json'),
  'en-XA': require('./locales/en-XA.json'), // psuedolocalization
  'es': require('./locales/es.json'),
  'fi': require('./locales/fi.json'),
  'fil': require('./locales/fil.json'),
  'fr': require('./locales/fr.json'), // fr-CH identical, so it falls back into fr
  'he': require('./locales/he.json'),
  'hi': require('./locales/hi.json'),
  'hr': require('./locales/hr.json'),
  'hu': require('./locales/hu.json'),
  'gsw': require('./locales/de.json'), // swiss german. identical (for our purposes) to 'de'
  'id': require('./locales/id.json'),
  'in': require('./locales/id.json'), // Alias of 'id'
  'it': require('./locales/it.json'),
  'iw': require('./locales/he.json'), // Alias of 'he'
  'ja': require('./locales/ja.json'),
  'ko': require('./locales/ko.json'),
  'ln': require('./locales/fr.json'), // Alias of 'fr'
  'lt': require('./locales/lt.json'),
  'lv': require('./locales/lv.json'),
  'mo': require('./locales/ro.json'), // Alias of 'ro'
  'nl': require('./locales/nl.json'),
  'nb': require('./locales/no.json'), // Alias of 'no'
  'no': require('./locales/no.json'),
  'pl': require('./locales/pl.json'),
  'pt': require('./locales/pt.json'), // pt-BR identical, so it falls back into pt
  'pt-PT': require('./locales/pt-PT.json'),
  'ro': require('./locales/ro.json'),
  'ru': require('./locales/ru.json'),
  'sk': require('./locales/sk.json'),
  'sl': require('./locales/sl.json'),
  'sr': require('./locales/sr.json'),
  'sr-Latn': require('./locales/sr-Latn.json'),
  'sv': require('./locales/sv.json'),
  'ta': require('./locales/ta.json'),
  'te': require('./locales/te.json'),
  'th': require('./locales/th.json'),
  'tl': require('./locales/fil.json'), // Alias of 'fil'
  'tr': require('./locales/tr.json'),
  'uk': require('./locales/uk.json'),
  'vi': require('./locales/vi.json'),
  'zh': require('./locales/zh.json'), // zh-CN identical, so it falls back into zh
  'zh-HK': require('./locales/zh-HK.json'),
  'zh-TW': require('./locales/zh-TW.json'),
};

module.exports = locales;
