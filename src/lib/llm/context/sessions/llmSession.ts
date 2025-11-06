import ollama, { ChatResponse, Message, Options, Tool } from "ollama";

import { Logger } from "@core/logger";
import { ToolBindingRecord } from "../toolBinding";

export type ToolData<T> = {
  fn: (input: T) => Promise<string>;
  tool: Tool;
};

export class LLMSession {
  static model: string = "gpt-oss:20b";

  private readonly _messages: Message[];

  constructor() {
    this._messages = [];
  }

  async message(
    message: Message,
    options: {
      flush: true;
      thinking?: boolean;
      tools?: ToolBindingRecord;
      allowMultipleCalls?: true;
    }
  ): Promise<ChatResponse>;
  async message(
    message: Message,
    options: {
      flush: true;
      thinking?: boolean;
      tools: ToolBindingRecord;
      allowMultipleCalls: false;
      returnValue?: false;
    }
  ): Promise<ChatResponse>;
  async message<T extends ToolBindingRecord>(
    message: Message,
    options: {
      flush: true;
      thinking?: boolean;
      tools: T;
      allowMultipleCalls: false;
      returnValue?: true;
    }
  ): Promise<[keyof T, unknown] | null>;
  async message(
    message: Message,
    options?: { flush?: true; thinking?: boolean }
  ): Promise<ChatResponse>;
  async message(
    message: Message,
    options?: { flush: false }
  ): Promise<undefined>;

  async message<T extends ToolBindingRecord>(
    message: Message,
    options: {
      flush?: boolean;
      thinking?: boolean;
      tools?: T;
      allowMultipleCalls?: boolean;
      returnValue?: boolean;
    } = { flush: true }
  ) {
    const opts = {
      flush: options.flush === true,
      thinking: options.thinking === true,
      tools: options.tools ?? undefined,
      allowMultipleCalls: options.allowMultipleCalls ?? true,
      returnValue: options.returnValue ?? false
    };

    this._messages.push(message);

    if (opts.flush) {
      return this.flush(opts.thinking, opts.tools, opts.allowMultipleCalls, opts.returnValue);
    }
  }

  async flush<T extends ToolBindingRecord>(thinking: boolean, tools?: T, allowMultipleCalls?: boolean, returnValue?: boolean) {
    let c = 0;

    while (c++ < 20) {
      const response = await LLMSession.chat(
        this._messages,
        Object.values(tools ?? {}).map((t) => t.tool),
        thinking
      );

      // const thinking = response.message.thinking;
      // if (thinking) {
      //   this._messages.push({ role: "assistant", content: `Thinking:\n${thinking}` });
      // }

      this._messages.push(response.message);

      const toolCalls = response.message.tool_calls ?? [];

      if (tools && toolCalls.length) {
        for (const call of toolCalls) {
          const tool = tools[call.function.name];
          if (!tool) continue;

          const result = await tool.fn(call.function.arguments);

          this._messages.push({
            role: "tool",
            tool_name: call.function.name,
            content: returnValue ? "Done" : String(result)
          });

          if (!allowMultipleCalls)
            if (returnValue) return [call.function.name, result] as [keyof T, unknown];
            else return response;
        }
      }
      else {
        return returnValue ? null : response;
      }
    }

    throw new Error("Exceeded maximum tool call iterations");
  }

  async forget() {
    this._messages.length = 0;
  }

  static async chat(
    messages: Message[],
    tools?: Tool[],
    thinking?: boolean,
    options?: Partial<Options>
  ) {
    const response = await ollama.chat({
      model: LLMSession.model,
      messages,
      stream: false,
      think: thinking,
      tools,
      options
    });

    return response;
  }

  static async pullModel() {
    Logger.debug(`Pulling LLM Model "${LLMSession.model}"...`);

    const response = await ollama.pull({
      model: this.model,
      stream: false
    });

    if (response.status !== "success") {
      Logger.error("Failed to pull model");
      process.exit(1);
    }

    Logger.debug("LLM Model Pulled");
  }
}
