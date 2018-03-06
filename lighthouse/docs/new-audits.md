So, you want to create a new audit? Great! We're excited that you want to add to the Lighthouse project :) The goal of this 
document is to help you understand what constitutes as a "good" audit for Lighthouse, and steps you can follow if you want
to propose a new audit. 

## New audit principles
Lighthouse audits that surface in the report should be: 
- Applicable to a significant portion of web developers (based on scale and severity of impact) 
- Contribute significantly towards making the mobile web experience better for end users. 
- Not have a significant impact on our runtime performance or bundle size. 
- Something that is new, and not something that is already measured by existing audits. 
- Important for our strategic goals as a product.
- Measurable (especially for performance audits) or have clear pass/fail states. 
- Not use 3rd party APIs for completing the audit check. 

*Note: it's possible to submit a new audit proposal for something that you as a contributor feel very passionate about, but the Lighthouse team feels that it wouldn't add value to a significant portion of the Lighthouse users. In this case, we'd be open to having your audit be a part of the report when run with the full config on the Command Line.* 

## Process for creating a new audit
1. Briefly scan the criteria we’ve laid out above. If you think the principles match with your proposed new audit, then proceed! 
2. Next step is to create an issue on GitHub with answers to the following questions: 
   - Description of audit and audit category (please include pass/fail states, and how it might be measured)
   - Explanation of how it’s different from other audits
   - What % of developers/pages will this impact (estimates OK, data points preferred) 
   - How is the new audit making a better web for end users? (data points preferred)
   - What is the resourcing situation (who will create the audits, maintain the audits, and write/maintain the documentation)
   - Do you envision this audit in the Lighthouse report or the full config in the CLI? If in the report, which section? 
   - How much support is needed from the Lighthouse team?
   - Any other links or documentation that we should check out?
3. Once the proposal is submitted, then Lighthouse team will take a look and followup. We will discuss possible implementation approaches, and associated runtime overhead.
With this new information we can better understand the impl cost and effort required and prioritize the audit into our sprint/roadmap. 
4. Depending on the prioritization, we'll then work with you to figure out the necessary engineering/UX/product details. 
