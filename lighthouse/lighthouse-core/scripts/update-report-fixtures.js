/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const cli = require('../../lighthouse-cli/run');

const {server} = require('../../lighthouse-cli/test/fixtures/static-server');

/**
 * Update the report artifacts
 */
async function update() {
  // get an available port
  server.listen(0, 'localhost');
  const port = await new Promise(res => server.on('listening', () => res(server.address().port)));

  const url = `http://localhost:${port}/dobetterweb/dbw_tester.html`;
  const flags = {
    gatherMode: 'lighthouse-core/test/results/artifacts',
  };
  // @ts-ignore Remove when we fix Flags typing
  await cli.runLighthouse(url, flags, undefined);
  await new Promise(res => server.close(res));
}

update();
