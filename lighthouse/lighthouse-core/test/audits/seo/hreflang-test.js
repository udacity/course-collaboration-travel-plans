/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const HreflangAudit = require('../../../audits/seo/hreflang.js');
const assert = require('assert');

/* eslint-env jest */

describe('SEO: Document has valid hreflang code', () => {
  it('fails when language code provided in hreflang via link element is invalid', () => {
    const hreflangValues = [
      'xx',
      'XX-be',
      'XX-be-Hans',
      '',
      '  es',
    ];

    const allRuns = hreflangValues.map(hreflangValue => {
      const mainResource = {
        responseHeaders: [],
      };
      const artifacts = {
        devtoolsLogs: {[HreflangAudit.DEFAULT_PASS]: []},
        requestMainResource: () => Promise.resolve(mainResource),
        Hreflang: [{
          hreflang: hreflangValue,
          href: 'https://example.com',
        }],
      };

      return HreflangAudit.audit(artifacts).then(auditResult => {
        assert.equal(auditResult.rawValue, false);
        assert.equal(auditResult.details.items.length, 1);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when language code provided via link element is valid', () => {
    const mainResource = {
      responseHeaders: [],
    };
    const artifacts = {
      devtoolsLogs: {[HreflangAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      Hreflang: [
        {hreflang: 'pl'},
        {hreflang: 'nl-be'},
        {hreflang: 'zh-Hans'},
        {hreflang: 'x-default'},
        {hreflang: 'FR-BE'},
      ],
    };

    return HreflangAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });

  it('succeeds when there are no rel=alternate link elements nor headers', () => {
    const mainResource = {
      responseHeaders: [],
    };
    const artifacts = {
      devtoolsLogs: {[HreflangAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      Hreflang: [],
    };

    return HreflangAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });

  it('fails when language code provided in hreflang via header is invalid', () => {
    const linkHeaders = [
      [
        {name: 'Link', value: '<http://es.example.com/>; rel="alternate"; hreflang="xx"'},
      ],
      [
        {name: 'link', value: '<http://es.example.com/>; rel="alternate"; hreflang=""'},
      ],
      [
        {name: 'LINK', value: '<http://es.example.com/>; rel="alternate"'},
      ],
      [
        {name: 'Link', value: '<http://es.example.com/>; rel="alternate"; hreflang="es",<http://xx.example.com/>; rel="alternate"; Hreflang="xx"'},
      ],
      [
        {name: 'link', value: '<http://es.example.com/>; rel="alternate"; hreflang="es"'},
        {name: 'Link', value: '<http://xx.example.com/>; rel="alternate"; hreflang="x"'},
      ],
    ];

    const allRuns = linkHeaders.map(headers => {
      const mainResource = {
        responseHeaders: headers,
      };
      const artifacts = {
        devtoolsLogs: {[HreflangAudit.DEFAULT_PASS]: []},
        requestMainResource: () => Promise.resolve(mainResource),
        Hreflang: null,
      };

      return HreflangAudit.audit(artifacts).then(auditResult => {
        assert.equal(auditResult.rawValue, false);
        assert.equal(auditResult.details.items.length, 1);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when language codes provided via Link header are valid', () => {
    const mainResource = {
      responseHeaders: [
        {name: 'link', value: ''},
        {name: 'link', value: 'garbage'},
        {name: 'link', value: '<http://es.example.com/>; rel="example"; hreflang="xx"'},
        {name: 'link', value: '<http://es.example.com/>; rel="alternate"; hreflang="es"'},
        {name: 'Link', value: '<http://fr.example.com/>; rel="alternate"; hreflang="fr-be"'},
        {name: 'LINK', value: '<http://es.example.com/>; rel="alternate"; hreflang="es",<http://fr.example.com/>; rel="alternate"; Hreflang="fr-be"'},
      ],
    };
    const artifacts = {
      devtoolsLogs: {[HreflangAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      Hreflang: null,
    };

    return HreflangAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });

  it('returns all failing items', () => {
    const mainResource = {
      responseHeaders: [
        {name: 'link', value: '<http://xx1.example.com/>; rel="alternate"; hreflang="xx1"'},
        {name: 'Link', value: '<http://xx2.example.com/>; rel="alternate"; hreflang="xx2"'},
      ],
    };
    const artifacts = {
      devtoolsLogs: {[HreflangAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      Hreflang: [{
        hreflang: 'xx3',
      }, {
        hreflang: 'xx4',
      }],
    };

    return HreflangAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, false);
      assert.equal(auditResult.details.items.length, 4);
    });
  });
});
