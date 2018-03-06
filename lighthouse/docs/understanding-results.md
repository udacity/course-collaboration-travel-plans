# Understanding the Results

The results object contains all the audit information Lighthouse determined about the page. In fact, everything you see in the HTML report, even the screenshots, is a rendering of information contained in the results object. You might need to work directly with the results object if you use [Lighthouse programmatically](https://github.com/GoogleChrome/lighthouse/blob/master/docs/readme.md#using-programmatically), consume the JSON output of the [CLI](https://github.com/GoogleChrome/lighthouse#using-the-node-cli), explore [Lighthouse results in HTTPArchive](https://github.com/GoogleChrome/lighthouse#lighthouse-integrations), or work on the report generation code that reads the Lighthouse JSON and outputs HTML.

## Lighthouse Results Object (LHR)

The top-level Lighthouse Results object (LHR) is what the lighthouse node module returns and the entirety of the JSON output of the CLI. It contains some metadata about the run and the results in the various subproperties below.

### Properties

| Name | Description |
| - | - |
| lighthouseVersion | The version of Lighthouse with which these results were generated. |
| generatedTime | The ISO-8601 timestamp of when the results were generated. |
| userAgent | The user agent string of the version of Chrome that was used by Lighthouse. |
| initialUrl | The URL that was supplied to Lighthouse and initially navigated to. |
| url | The URL that Lighthouse ended up auditing after redirects were followed. |
| score | The overall score `0-100`, a weighted average of all category scores. *NOTE: Only the PWA category has a weight by default* |
| [audits](#audits) | An object containing the results of the audits. |
| [runtimeConfig](#runtime-config) | An object containing information about the configuration used by Lighthouse. |
| [timing](#timing) | An object containing information about how long Lighthouse spent auditing. |
| [reportCategories](#report-categories) | An array containing the different categories, their scores, and the results of the audits that comprise them. |
| [reportGroups](#report-groups) | An object containing the display groups of audits for the report. |
| [artifacts](#artifacts) | *(PROGRAMMATIC USE ONLY)* An object containing gatherer results. |

### Example
```json
{
  "lighthouseVersion": "2.4.0",
  "generatedTime": "2017-10-05T20:50:54.185Z",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3233.0 Safari/537.36",
  "initialUrl": "http://example.com",
  "url": "https://www.example.com/",
  "score": 50,
  "audits": {...},
  "runtimeConfig": {...},
  "timing": {...},
  "reportCategories": [{...}],
  "reportGroups": {...},
}
```


<a name="audits"></a>
## `audits`

An object containing the results of the audits, keyed by their name.

### Audit Properties
| Name | Type | Description |
| -- | -- | -- |
| name  | `string` | The string identifier of the audit in kebab case.  |
| description | `string` | The brief description of the audit. The text can change depending on if the audit passed or failed. |
| helpText | `string` | A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit, markdown links supported. |
| debugString | <code>string&#124;undefined</code> | A string indicating some additional information to the user explaining an unusual circumstance or reason for failure. |
| error | `boolean` | Set to true if there was an an exception thrown within the audit. The error message will be in `debugString`.
| rawValue | <code>boolean&#124;number</code> | The unscored value determined by the audit. Typically this will match the score if there's no additional information to impart. For performance audits, this value is typically a number indicating the metric value. |
| displayValue | `string` | The string to display in the report alongside audit results. If empty, nothing additional is shown. This is typically used to explain additional information such as the number and nature of failing items. |
| score | <code>boolean&#124;number</code> | The scored value determined by the audit as either boolean or a number `0-100`. If the audit is a boolean, the implication is `score ? 100 : 0`. |
| scoringMode | <code>"binary"&#124;"numeric"</code> | A string identifying how granular the score is meant to be indicating, i.e. is the audit pass/fail or are there shades of gray 0-100. *NOTE: This does not necessarily mean `typeof audit.score === audit.scoringMode`, an audit can have a score of 40 with a scoringMode of `"binary"` meant to indicate display should be failure.* |
| details | `Object` | Extra information found by the audit necessary for display. The structure of this object varies from audit to audit. The structure of this object is somewhat stable between minor version bumps as this object is used to render the HTML report.
| extendedInfo | `Object` | Extra information found by the audit. The structure of this object varies from audit to audit and is generally for programmatic consumption and debugging, though there is typically overlap with `details`. *WARNING: The structure of this object is not stable and cannot be trusted to follow semver* |
| manual | `boolean` | Indicator used for display that the audit does not have results and is a placeholder for the user to conduct manual testing. |
| informative | `boolean` | Indicator used for display that the audit is intended to be informative only. It cannot be passed or failed. |
| notApplicable | `boolean` | Indicator used for display that the audit doesn't apply to the page. (e.g. A images audit on a page without images). |


### Example
```json
{
  "is-on-https": {
    "name": "is-on-https",
    "category": "Security",
    "description": "Uses HTTPS",
    "failureDescription": "Does not use HTTPS",
    "helpText": "HTTPS is the best. [Learn more](https://learn-more)",
    "score": false,
    "rawValue": false,
    "displayValue": "2 insecure requests found",
    "scoringMode": "binary",
    "details": {
      "type": "list",
      "header": {
        "type": "text",
        "text": "Insecure URLs:"
      },
      "items": [
        {
          "type": "url",
          "text": "http://example.com/"
        },
        {
          "type": "url",
          "text": "http://example.com/favicon.ico"
        }
      ]
    },
    "extendedInfo": {
      "value": [
        {
          "url": "http://example.com/"
        },
        {
          "url": "http://example.com/favicon.ico"
        }
      ]
    },
  },
  "custom-audit": {
    "name": "custom-audit",
    ...
  }
}
```


<a name="runtime-config"></a>
## `runtimeConfig`

An object containing information about the configuration used by Lighthouse.

### Properties
| Name | Type | Description |
| -- | -- | -- |
| blockedUrlPatterns | `string[]` | The network request patterns that Lighthouse blocked while loading the page. |
| environment | `Object[]` | The environment settings used such as CPU and network throttling and device emulation.

### Example
```json
{
  "blockedUrlPatterns": ["bad-script.js"],
  "environment": [
    {
      "name": "Device Emulation",
      "enabled": true,
      "description": "Nexus 5X"
    },
    {
      "name": "Network Throttling",
      "enabled": true,
      "description": "562.5ms RTT, 1.4Mbps down, 0.7Mbps up"
    },
    {
      "name": "CPU Throttling",
      "enabled": true,
      "description": "4x slowdown"
    }
  ]
}
```

<a name="timing"></a>
## `timing`

An object containing information about how long Lighthouse spent auditing.

### Properties
| Name | Type | Description |
| -- | -- | -- |
| total | `number` | The total time spent in milliseconds loading the page and evaluating audits. |

### Example
```json
{
  "total": 32189
}
```

<a name="report-categories"></a>
## `reportCategories`

An array containing the different categories, their scores, and the results of the audits in the categories.

### CategoryEntry Properties
| Name | Type | Description |
| -- | -- | -- |
| id | `string` | The string identifier of the category. |
| name | `string` | The human-friendly name of the category. |
| description | `string` | A brief description of the purpose of the category, supports markdown links. |
| score | `string` | The overall score of the category, the weighted average of all its audits. |
| weight | `string` | The weight of the category in the overall Lighthouse score. |
| audits | `AuditEntry[]` | An array of all the audit results in the category. |

### AuditEntry Properties
| Name | Type | Description |
| -- | -- | -- |
| id | `string` | The string identifier of the category. |
| score | `number` | The numeric score `0-100` of the audit. Audits with a boolean score result are converted with `score ? 100 : 0`. |
| weight | `number` | The weight of the audit's score in the overall category score. |
| result | `Object` | The actual audit result, a copy of the audit object found in [audits](#audits). *NOTE: this property will likely be removed in upcoming releases; use the `id` property to lookup the result in the `audits` property.* |

### Example
```json
[
  {
    "id": "pwa",
    "name": "Progressive Web App",
    "description": "PWAs are awesome. [Learn more](...)",
    "score": 54,
    "weight": 1,
    "audits": [
      {
        "id": "is-on-https",
        "score": 0,
        "weight": 1,
        "result": {
          "name": "is-on-https",
          "score": false,
          ...
        }
      }
    ]
  }
]
```

<a name="report-groups"></a>
## `reportGroups`

An object containing the display groups of audits for the report, keyed by the group ID found in the config.

### GroupEntry Properties
| Name | Type | Description |
| -- | -- | -- |
| title | `string` | The title of the display group. |
| description | `string` | A brief description of the purpose of the display group. |

### Example
```json
{
  "perf-metric": {
    "title": "Metrics",
    "description": "These metrics are super cool."
  },
}
```

<a name="artifacts"></a>
## `artifacts`

An object containing gatherer results keyed by gatherer class name. The structure varies by artifact and is not stable. The values of artifacts are subject to change. This property is only available when consuming Lighthouse results programmatically as the artifacts contain trace data and can be quite large (>50MB).

### Example
```json
{
  "Offline": 200,
  "HTTPRedirect": {"value": true},
  ...
}
```
