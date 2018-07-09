declare module 'intl-messageformat-parser' {
  interface Element {
    type: 'messageTextElement'|'argumentElement';
    id?: string
    value?: string
    format?: null | {type: string; style?: string};
  }
  function parse(message: string): {elements: Element[]};
  export {parse};
}
