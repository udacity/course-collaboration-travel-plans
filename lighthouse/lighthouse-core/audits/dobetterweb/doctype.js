/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');

class Doctype extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'doctype',
      title: 'Page has the HTML doctype',
      failureTitle: 'Page is missing the HTML doctype',
      description: 'Specifying a doctype prevents the browser from switching to quirks-mode.' +
                'Read more on the ' +
                '[MDN Web Docs page](https://developer.mozilla.org/en-US/docs/Glossary/Doctype)',
      requiredArtifacts: ['Doctype'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    if (!artifacts.Doctype) {
      return {
        rawValue: false,
        explanation: 'Document must contain a doctype',
      };
    }

    // only set constants once we know there is a doctype
    const doctypeName = artifacts.Doctype.name.trim();
    const doctypePublicId = artifacts.Doctype.publicId;
    const doctypeSystemId = artifacts.Doctype.systemId;

    if (doctypePublicId !== '') {
      return {
        rawValue: false,
        explanation: 'Expected publicId to be an empty string',
      };
    }

    if (doctypeSystemId !== '') {
      return {
        rawValue: false,
        explanation: 'Expected systemId to be an empty string',
      };
    }

    /* Note that the value for name is case sensitive,
       and must be the string `html`. For details see:
       https://html.spec.whatwg.org/multipage/parsing.html#the-initial-insertion-mode */
    if (doctypeName === 'html') {
      return {
        rawValue: true,
      };
    } else {
      return {
        rawValue: false,
        explanation: 'Doctype name must be the lowercase string `html`',
      };
    }
  }
}

module.exports = Doctype;
