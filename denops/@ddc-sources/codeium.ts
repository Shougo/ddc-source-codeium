import {
  BaseSource,
  GatherArguments,
  OnCompleteDoneArguments,
} from "https://deno.land/x/ddc_vim@v3.4.0/base/source.ts";
import { DdcGatherItems } from "https://deno.land/x/ddc_vim@v3.4.0/types.ts";
import { batch, Denops, fn } from "https://deno.land/x/ddc_vim@v3.4.0/deps.ts";
import { delay } from "https://deno.land/std@0.186.0/async/delay.ts";

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

    const f = async () => {
      await args.denops.call("codeium#Complete");

      while (!(await fn.exists(args.denops, "b:_codeium_completions.items"))) {
        await delay(50);
      }

      const completions = await args.denops.call(
        "eval",
        "b:_codeium_completions.items",
      ) as CompletionItem[];

      const items = completions.map((completion) => {
        const text = completion.completion.text;
        const word = text.split("\n")[0].slice(args.completePos);

        return {
          word,
          user_data: {
            word: text,
          },
        };
      });

      await args.denops.call("ddc#update_items", this.name, items);
    };

    f();

    return await Promise.resolve({
      items: [],
      isIncomplete: true,
    });
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
