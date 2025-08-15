import {
  Client,
  Events,
  GatewayIntentBits
} from 'discord.js';
import { MessageCreateHandler } from './handlers/event-handlers/message-create';
import { MessageUpdateHandler } from './handlers/event-handlers/message-update';
import { InteractionCreateHandler } from './handlers/event-handlers/interaction-create';
import { WebhookService } from './services/webhook-service';

export class BotClient {
  private client: Client;
  private messageCreateHandler: MessageCreateHandler;
  private messageUpdateHandler: MessageUpdateHandler;
  private interactionCreateHandler: InteractionCreateHandler;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    const webhookService = new WebhookService();
    this.messageCreateHandler = new MessageCreateHandler(webhookService);
    this.messageUpdateHandler = new MessageUpdateHandler(webhookService);
    this.interactionCreateHandler = new InteractionCreateHandler();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, (c) => {
      console.log(`🤖 Logged in as ${c.user.tag}`);
    });

    this.client.on(Events.MessageCreate, async (message) => {
      await this.messageCreateHandler.handle(message);
    });

    this.client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      await this.messageUpdateHandler.handle(oldMessage, newMessage);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.interactionCreateHandler.handle(interaction);
    });
  }

  async login(token: string): Promise<void> {
    await this.client.login(token);
  }
}