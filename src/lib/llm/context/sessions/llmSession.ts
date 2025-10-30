import ollama, { ChatResponse, Message, Options, Tool } from "ollama";

import { Logger } from "@core/logger";

export class LLMSession {
  static model: string = "gpt-oss:120b-cloud";

  private readonly _messages: Message[];

  constructor() {
    this._messages = [];
  }

  async message(
    message: Message,
    options: { flush: true; tools?: Tool[] }
  ): Promise<ChatResponse>;
  async message(
    message: Message,
    options?: { flush?: true }
  ): Promise<ChatResponse>;
  async message(
    message: Message,
    options?: { flush: false }
  ): Promise<undefined>;

  async message(
    message: Message,
    options: { flush?: boolean; tools?: Tool[] } = { flush: true }
  ) {
    const opts = {
      flush: options.flush === true,
      tools: options.tools ?? undefined
    };

    this._messages.push(message);

    if (opts.flush) {
      return this.flush(opts.tools);
    }
  }

  async flush(tools?: Tool[]) {
    const response = await LLMSession.chat(this._messages, tools);

    const thinking = response.message.thinking;
    if (thinking) {
      this._messages.push({ role: "assistant", content: `Thinking:\n${thinking}` });
    }

    this._messages.push(response.message);

    return response;
  }

  async forget() {
    this._messages.length = 0;
  }

  static async chat(
    messages: Message[],
    tools?: Tool[],
    options?: Partial<Options>
  ) {
    const response = await ollama.chat({
      model: LLMSession.model,
      messages,
      stream: false,
      think: true,
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
