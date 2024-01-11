import {
  JsonKeyOutputFunctionsParser,
  JsonOutputFunctionsParser,
} from "langchain/output_parsers";

function sanitizeJSON(input: string): string {
  return input.replace(/,\s*([}\]])/g, "$1");
}

class UnbrittledJsonOutputFunctionParser extends JsonOutputFunctionsParser {
  async parse(text: string): Promise<object> {
    const sanitized = sanitizeJSON(text);
    return super.parse(sanitized);
  }
}

export class UnbrittledKeyOutputFunctionParser<
  T = string,
> extends JsonKeyOutputFunctionsParser<T> {
  constructor({ attrName }: { attrName: string }) {
    super({ attrName });
    this.outputParser = new UnbrittledJsonOutputFunctionParser();
  }
}
