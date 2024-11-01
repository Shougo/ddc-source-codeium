import { type DdcGatherItems } from "jsr:@shougo/ddc-vim@~7.1.0/types";
import {
  BaseSource,
  type GatherArguments,
  type OnCompleteDoneArguments,
  type OnInitArguments,
} from "jsr:@shougo/ddc-vim@~7.1.0/source";
import {
  Unprintable,
  type UnprintableUserData,
} from "jsr:@milly/ddc-unprintable@~4.0.0";

import * as fn from "jsr:@denops/std@~7.3.0/function";
import { delay } from "jsr:@std/async@~1.0.4/delay";

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
type UserData = Record<string, never> & UnprintableUserData;

export class Source extends BaseSource<Params> {
  #unprintable?: Unprintable<UserData>;

  override onInit(_args: OnInitArguments<Params>) {
    this.#unprintable = new Unprintable<UserData>({
      highlightGroup: "SpecialKey",
      callbackId: `source/${this.name}`,
    });
  }

  override async gather(
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
        });
      }
    }

    return await this.#unprintable!.convertItems(
      args.denops,
      items,
      args.context.nextInput,
    );
  }

  override params() {
    return {};
  }

  override onCompleteDone(
    args: OnCompleteDoneArguments<Params, UserData>,
  ): Promise<void> {
    return this.#unprintable!.onCompleteDone(args);
  }
}
