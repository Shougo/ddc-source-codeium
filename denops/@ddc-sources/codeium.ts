import {
  BaseSource,
  type DdcGatherItems,
} from "jsr:@shougo/ddc-vim@6.0.0/types";
import {
  type GatherArguments,
  type OnCompleteDoneArguments,
} from "jsr:@shougo/ddc-vim@6.0.0/source";

import * as fn from "jsr:@denops/std@7.0.1/function";
import { delay } from "jsr:@std/async@1.0.1/delay";

export type CompletionMetadata = {
  word: string;
};

export type CompletionItem = {
  completion: {
    text: string;
  };
  range: {
    startOffset?: number;
    endOffset?: number;
  };
  suffix?: {
    text?: string;
    deltaCursorOffset?: number;
  };
};

type Params = Record<string, never>;

export class Source extends BaseSource<Params> {
  async gather(
    args: GatherArguments<Params>,
  ): Promise<DdcGatherItems> {
    if (!(await fn.exists(args.denops, "*codeium#Complete"))) {
      return [];
    }

    //const startTime = Date.now();
    await args.denops.call("codeium#Complete");

    while (!(await fn.exists(args.denops, "b:_codeium_completions.items"))) {
      await delay(10);
    }

    const completions = await args.denops.call(
      "eval",
      "get(get(b:, '_codeium_completions', {}), 'items', [])",
    ) as CompletionItem[];
    //console.log(`${Date.now() - startTime} ms`);

    const items: DdcGatherItems = [];
    for (const completion of completions) {
      const text = completion.completion.text;
      const word = text.split("\n")[0].slice(args.completePos);
      const match = /^(\s*\w+)\S*/.exec(word);
      const isMultiLine = text.split("\n").length > 1;

      const wordsSet = new Set<string>();
      if (match !== null) {
        // word
        wordsSet.add(match[0]);
        // WORD
        wordsSet.add(match[1]);
      }
      // One line
      wordsSet.add(word);

      for (const partialWord of [...wordsSet].sort()) {
        items.push({
          word: partialWord,
        });
      }

      if (isMultiLine) {
        // Full
        const indent = /^(?<indent>\s*).+/.exec(text)?.groups?.indent;
        const info = indent != null
          ? text.split("\n").map((line) => line.slice(indent.length)).join(
            "\n",
          )
          : text;
        items.push({
          word,
          abbr: `${word} ...`,
          info,
          user_data: {
            word: text,
          },
        });
      }
    }

    return items;
  }

  params() {
    return {};
  }

  async onCompleteDone(
    args: OnCompleteDoneArguments<Params, CompletionMetadata>,
  ) {
    const firstLine = args.userData?.word.split("\n")[0];
    const currentLine = await fn.getline(args.denops, ".");
    if (currentLine !== firstLine) {
      return;
    }

    const lines = args.userData?.word.split("\n");
    if (lines === undefined || lines[1] === undefined) {
      return;
    }

    const lnum = await fn.line(args.denops, ".");
    const appendLines = lines.slice(1);
    await fn.append(args.denops, lnum, appendLines);
    await fn.setpos(args.denops, ".", [
      0,
      lnum + appendLines.length,
      appendLines.slice(-1)[0].length + 1,
      0,
    ]);
  }
}
