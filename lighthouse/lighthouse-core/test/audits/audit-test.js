/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/audit.js');
const assert = require('assert');

/* eslint-env jest */

// Extend the Audit class but fail to implement meta. It should throw errors.
class A extends Audit {}
class B extends Audit {
  static get meta() {
    return {};
  }

  static audit() {}
}

describe('Audit', () => {
  it('throws if an audit does not override the meta', () => {
    assert.throws(_ => A.meta);
  });

  it('does not throw if an audit overrides the meta', () => {
    assert.doesNotThrow(_ => B.meta);
  });

  it('throws if an audit does not override audit()', () => {
    assert.throws(_ => A.audit());
  });

  it('does not throw if an audit overrides audit()', () => {
    assert.doesNotThrow(_ => B.audit());
  });

  describe('_normalizeAuditScore', () => {
    it('returns a score that is always 0-1', () => {
      const auditResult = Audit._normalizeAuditScore(B, {rawValue: true});
      assert.equal(Number.isFinite(auditResult.score), true);
      assert.equal(auditResult.score, 1);
      assert.equal(auditResult.score <= 1, true);

      const auditResultFail = Audit._normalizeAuditScore(B, {rawValue: false});
      assert.equal(Number.isFinite(auditResultFail.score), true);
      assert.equal(auditResultFail.score, 0);
      assert.equal(auditResultFail.score <= 1, true);
      assert.equal(auditResultFail.score >= 0, true);
    });

    it('throws if an audit returns a score >1', () => {
      assert.throws(_ => Audit._normalizeAuditScore(B, {rawValue: true, score: 100}), /is > 1/);
      assert.throws(_ => Audit._normalizeAuditScore(B, {rawValue: true, score: 2}), /is > 1/);
    });

    it('throws if an audit returns a score that\'s not a number', () => {
      const re = /Invalid score/;
      assert.throws(_ => Audit._normalizeAuditScore(B, {rawValue: true, score: NaN}), re);
      assert.throws(_ => Audit._normalizeAuditScore(B, {rawValue: true, score: 'string'}), re);
      assert.throws(_ => Audit._normalizeAuditScore(B, {rawValue: true, score: 50}), /is > 1/);
    });
  });

  describe('generateAuditResult', () => {
    it('throws if an audit does return a result with a rawValue', () => {
      assert.throws(_ => Audit.generateAuditResult(B, {}), /requires a rawValue/);
    });

    it('chooses the failureTitle if score is failing', () => {
      class FailingAudit extends Audit {
        static get meta() {
          return {
            title: 'Passing',
            failureTitle: 'Failing',
          };
        }
      }

      const auditResult = Audit.generateAuditResult(FailingAudit, {rawValue: false});
      assert.ok(Number.isFinite(auditResult.score));
      assert.equal(auditResult.score, 0);
      assert.equal(auditResult.title, 'Failing');
    });
  });

  it('sets state of non-applicable audits', () => {
    const providedResult = {rawValue: true, notApplicable: true};
    const result = Audit.generateAuditResult(B, providedResult);
    assert.equal(result.score, null);
    assert.equal(result.scoreDisplayMode, 'not-applicable');
  });

  it('sets state of failed audits', () => {
    const providedResult = {rawValue: true, errorMessage: 'It did not work'};
    const result = Audit.generateAuditResult(B, providedResult);
    assert.equal(result.score, null);
    assert.equal(result.scoreDisplayMode, 'error');
  });
});
