# Goal
The goal of this document is to explain how scoring works in Lighthouse and what to do to improve your Lighthouse scores across the four sections of the report. 

Note 1: if you want a **nice spreadsheet** version of this doc to understand weighting and scoring, check out the [scoring spreadsheet](https://docs.google.com/spreadsheets/d/1dXH-bXX3gxqqpD1f7rp6ImSOhobsT1gn_GQ2fGZp8UU/edit?ts=59fb61d2#gid=0)

![alt text](https://user-images.githubusercontent.com/39191/32397461-2d20c87a-c0a7-11e7-99d8-61576113a710.png)
*Screenshot of the [scoring spreadsheet](https://docs.google.com/spreadsheets/d/1dXH-bXX3gxqqpD1f7rp6ImSOhobsT1gn_GQ2fGZp8UU/edit?ts=59fb61d2#gid=0)*

Note 2: if you receive a **score of 0** in any Lighthouse category, that usually indicates an error on our part. Please file an [issue](https://github.com/GoogleChrome/lighthouse/issues) so our team can look into it.

# Performance
 
### What performance metrics does Lighthouse measure?
Lighthouse measures the following performance metrics: 

- [First meaningful paint](https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint): first meaningful paint is defined as when the browser first puts any “meaningful” element/set of “meaningful” elements on the screen. What is meaningful is determined from a series of heuristics. 
- [First interactive](https://developers.google.com/web/tools/lighthouse/audits/first-interactive): first interactive is defined as the first point at which the page could respond quickly to input. It doesn't consider any point in time before first meaningful paint. The way this is implemented is primarily based on heuristics. 
*Note: this metric is currently in beta, which means that the underlying definition of this metric is in progress.*
- [Consistently interactive](https://developers.google.com/web/tools/lighthouse/audits/consistently-interactive): defined as the first point at which everything is loaded such that the page will quickly respond to any user input throughout the page. 
*Note: this metric is currently in beta, which means that the underlying definition of this metric is in progress.*
- [Perceptual Speed Index (pSI)](https://developers.google.com/web/tools/lighthouse/audits/speed-index): pSI measures how many pixels are painted at each given time interval on the viewport. The earlier the pixels are painted, the better you score on metric since we want an experience where most of the content is shown on the screen during the first few moments of initiating the page load. Loading more content earlier makes your end user feel like the website is loading quickly, which contributes to a positive user experience. Therefore, the lower the pSI score, the better. 
- [Estimated Input Latency](https://developers.google.com/web/tools/lighthouse/audits/estimated-input-latency): this audit measures how fast your app is in responding to user input. Our benchmark is that the estimated input latency should be under 50 ms (see documentation [here](https://developers.google.com/web/tools/lighthouse/audits/estimated-input-latency) as to why).

*Some **variability** when running on real-world sites is to be expected as sites load different ads, scripts, and network conditions vary for each visit. Note that Lighthouse can especially experience inconsistent behaviors when it runs in the presence of anti-virus scanners, other extensions or programs that interfere with page load, and inconsistent ad behavior. Please try to run without anti-virus scanners or other extensions/programs to get the cleanest results, or alternatively, run Lighthouse on WebPageTest for the most consistent results [here](https://www.webpagetest.org/easy.php).*

### How are the scores weighted?
Lighthouse returns a performance score from 0-100. A score of 0 usually indicates an error with performance measurement (so file an issue in the Lighthouse repo if further debugging is needed), and 100 is the best possible ideal score (really hard to get). Usually, any score above a 90 gets you in the top ~5% of performant websites. 

The performance score is determined from the **performance metrics only**. The Opportunities/Diagnostics sections do not directly contribute to the performance score.

The metric results are not weighted equally. Currently the weights are:

* 5X - first meaningful paint
* 5X - first interactive
* 5X - consistently interactive
* 1X - perceptual speed index
* 1X - estimated input latency

These weights were determined based on heuristics, and the Lighthouse team is working on formalizing this approach through more field data.  

### How do performance metrics get scored?
Once Lighthouse is done gathering the raw performance metrics for your website (metrics reported in miliseconds), it converts them into a score by mapping the raw performance number to a number between 0-100 by looking where your raw performance metric falls on the Lighthouse scoring distribution. The Lighthouse scoring distribution is a log normal distribution that is derived from the performance metrics of real website performance data (see sample distribution [here](https://www.desmos.com/calculator/zrjq6v1ihi)).

Once we finish computing the percentile equivalent of your raw performance score, we take the weighted average of all the performance metrics (per the weighting above, with 5x weight given to first meaningful weight, first interactive, and consistently interactive). Finally, we apply a coloring to the score (green, orange, and red) depending on what "bucket" your score falls in. Roughly, this maps to: 
- Red (poor score): 0-44. 
- Orange (average): 45-74 
- Green (good): 75-100. 

### What can developers do to improve their performance score?
*Note: we've built [a little calculator](https://docs.google.com/spreadsheets/d/1dXH-bXX3gxqqpD1f7rp6ImSOhobsT1gn_GQ2fGZp8UU/edit?ts=59fb61d2#gid=283330180) that can help you understand what thresholds you should be aiming for achieving a certain Lighthouse performance score. *

Lighthouse has a whole section in the report on improving your performance score under the “Opportunities” section. There are detailed suggestions and documentation that explains the different suggestions and how to implement them. Additionally, the diagnostics section lists additional guidance that developers can explore to further experiment and tweak with their performance. 


# PWA
### How is the PWA score calculated? 
The PWA score is calculated based on the [Baseline PWA checklist](https://developers.google.com/web/progressive-web-apps/checklist#baseline), which lists 14 requirements. Lighthouse tests for 11 out of the 14 requirements automatically, with the other 3 being manual checks. Each of the 11 audits for the PWA section of the report is weighted equally, so implementing any of the audits correctly will increase your overall score by ~9 points. 

# Accessibility
### How is the accessibility score calculated?
The accessibility score is a weighted average of all the different audits (the weights for each audit can be found in [the scoring spreadsheet](https://docs.google.com/spreadsheets/d/1dXH-bXX3gxqqpD1f7rp6ImSOhobsT1gn_GQ2fGZp8UU/edit?ts=59fb61d2#gid=0)). Each audit is a pass/fail (meaning there is no room for partial points for getting an audit half-right). For example, that means if half your buttons have screenreader friendly names, and half don't, you don't get "half" of the weighted average-you get a 0 because it needs to be implemented *throughout* the page. 

# Best Practices
### How is the Best Practices score calculated? 
Each audit in the Best Practices section is equally weighted. Therefore, implementing each audit correctly will increase your overall score by ~6 points. 
