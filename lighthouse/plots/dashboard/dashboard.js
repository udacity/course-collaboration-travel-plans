/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global Plotly, dashboardResults */
/* eslint-env browser */

class Dashboard {
  constructor(metrics, charts) {
    this._charts = charts;
    this._currentMetric = metrics[0];
    this._numberOfBatchesToShow = 0;
    this._initializeSelectMetricControl(metrics);
    this._initializeSelectNumberOfBatchesToShow();
  }

  render() {
    this._charts.render(this._currentMetric, this._numberOfBatchesToShow);
  }

  _initializeSelectMetricControl(metrics) {
    const metricsControl = document.getElementById('select-metric');
    for (const metric of metrics) {
      const option = document.createElement('option');
      option.label = metric;
      option.value = metric;
      metricsControl.appendChild(option);
    }
    metricsControl.addEventListener('change', e => this._onSelectMetric(e), false);
  }

  _onSelectMetric(event) {
    this._currentMetric = event.target.value;
    this.render();
  }

  _initializeSelectNumberOfBatchesToShow() {
    const control = document.getElementById('select-number-of-batches');
    control.addEventListener('change', e => this._onSelectNumberOfBatchesToShow(e), false);
  }

  _onSelectNumberOfBatchesToShow(event) {
    if (event.target.value === 'all') {
      this._numberOfBatchesToShow = 0;
    } else {
      this._numberOfBatchesToShow = parseInt(event.target.value, 10);
    }
    this.render();
  }
}

class Charts {
  constructor(renderingScheduler) {
    this._renderingScheduler = renderingScheduler;
    this._elementId = 1;
    this._layout = {
      width: 400,
      height: 300,
      xaxis: {
        showgrid: false,
        zeroline: false,
        tickangle: 60,
        showticklabels: false,
      },
      yaxis: {
        zeroline: true,
        rangemode: 'tozero',
      },
      showlegend: false,
      titlefont: {
        family: `"Roboto", -apple-system, BlinkMacSystemFont, sans-serif`,
        size: 14,
      },
    };
  }

  render(currentMetric, numberOfBatchesToShow) {
    Utils.removeChildren(document.getElementById('charts'));
    for (const [metricName, site] of Object.entries(dashboardResults[currentMetric])) {
      const percentiles = Object.entries(site)
        .map(([batchName, batch]) => {
          return {
            x: batchName,
            higher: Utils.calculatePercentile(batch.map(metric => metric.timing), 0.8),
            median: Utils.calculatePercentile(batch.map(metric => metric.timing), 0.5),
            lower: Utils.calculatePercentile(batch.map(metric => metric.timing), 0.2),
          };
        })
        .slice(-1 * numberOfBatchesToShow);

      const median = {
        x: percentiles.map(r => r.x),
        y: percentiles.map(r => r.median),
        type: 'scatter',
        mode: 'line',
        name: 'median',
      };

      const errorBands = {
        x: percentiles.map(r => r.x).concat(percentiles.map(r => r.x).reverse()),
        y: percentiles.map(r => r.higher).concat(percentiles.map(r => r.lower).reverse()),
        fill: 'toself',
        fillcolor: 'rgba(0,176,246,0.2)',
        line: {color: 'transparent'},
        name: 'error bands',
        showlegend: false,
        type: 'scatter',
      };
      this._renderPreviewChart([median, errorBands], metricName);
    }
  }

  _renderPreviewChart(data, title) {
    this._renderingScheduler.enqueue(_ => {
      Plotly.newPlot(
        this._createPreviewChartElement(data, title),
        data,
        Object.assign({title}, this._layout)
      );
    });
  }

  _createPreviewChartElement(data, title) {
    const chart = document.createElement('div');
    chart.style = 'display: inline-block; position: relative';
    chart.id = 'chart' + this._elementId++;

    const button = document.createElement('button');
    button.className = 'dth-button show-bigger-button';
    button.appendChild(document.createTextNode('Focus'));
    button.addEventListener('click', () => this._onFocusChart(data, title), false);
    chart.appendChild(button);

    const container = document.getElementById('charts');
    container.appendChild(chart);
    return chart.id;
  }

  _onFocusChart(data, title) {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    document.getElementById('charts').style.display = 'none';

    const closeButton = document.createElement('button');
    closeButton.className = 'dth-button close-button';
    closeButton.appendChild(document.createTextNode('Close'));
    closeButton.addEventListener('click', onCloseFocusedChart, false);
    overlay.appendChild(closeButton);

    const chart = document.createElement('div');
    chart.className = 'chart';
    overlay.appendChild(chart);
    this._renderFocusedChart(data, title, chart);

    function onCloseFocusedChart() {
      document.getElementById('charts').style.display = 'block';
      document.body.removeChild(overlay);
    }
  }

  _renderFocusedChart(data, title, element) {
    Plotly.newPlot(
      element,
      data,
      Object.assign({title}, this._layout, {
        width: document.body.clientWidth - 100,
        height: 500,
      })
    );
  }
}

class RenderingScheduler {
  constructor() {
    this._queue = [];
  }

  enqueue(fn) {
    const isFirst = this._queue.length === 0;
    this._queue.push(fn);
    if (isFirst) {
      this._render();
    }
  }

  _render() {
    window.requestAnimationFrame(_ => {
      const plotFn = this._queue.shift();
      if (plotFn) {
        plotFn();
        this._render();
      }
    });
  }
}

const Utils = {
  /**
   * @param {!Element} parent
   */
  removeChildren(parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  },

  /**
   * Calculate the value at a given percentile
   * Based on: https://gist.github.com/IceCreamYou/6ffa1b18c4c8f6aeaad2
   * @param {!Array<number>} array
   * @param {number} percentile should be from 0 to 1
   */
  calculatePercentile(array, percentile) {
    const sorted = array.filter(x => x !== null).sort((a, b) => a - b);

    if (sorted.length === 0) {
      return 0;
    }
    if (sorted.length === 1 || percentile <= 0) {
      return sorted[0];
    }
    if (percentile >= 1) {
      return sorted[sorted.length - 1];
    }

    const index = (sorted.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index % 1;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  },
};

function main() {
  /**
   * Navigation Start is usually not a very informative metric.
   */
  const metrics = Object.keys(dashboardResults).filter(m => m !== 'Navigation Start');

  const renderingScheduler = new RenderingScheduler();
  const charts = new Charts(renderingScheduler);
  const dashboard = new Dashboard(metrics, charts);
  dashboard.render();
}

main();
