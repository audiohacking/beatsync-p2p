import type { ChatMessageType, ClientDataType } from "@beatsync/shared";
import { epochNow } from "@beatsync/shared";

export class ChatManager {
  private chatMessages: ChatMessageType[] = [];
  private nextMessageId = 1;
  private readonly maxMessages = 300;

  addMessage({ client, text }: { client: ClientDataType; text: string }): ChatMessageType {
    if (!text) {
      throw new Error("Chat message cannot be empty");
    }

    const message: ChatMessageType = {
      id: this.nextMessageId++,
      clientId: client.clientId,
      username: client.username,
      text,
      timestamp: epochNow(),
      countryCode: client.location?.countryCode,
      isCreator: client.isCreator,
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > this.maxMessages) {
      this.chatMessages.shift();
    }
    return message;
  }

  getFullHistory(): ChatMessageType[] {
    return this.chatMessages;
  }

  getNewestId(): number {
    if (this.chatMessages.length === 0) return 0;
    return this.chatMessages[this.chatMessages.length - 1].id;
  }

  getNextMessageId(): number {
    return this.nextMessageId;
  }

  restoreFromHistory(messages: ChatMessageType[], nextMessageId: number): void {
    this.chatMessages = messages.slice(-this.maxMessages);
    if (nextMessageId > 0) {
      this.nextMessageId = nextMessageId;
    }
  }
}
