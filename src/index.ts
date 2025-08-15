import 'dotenv/config';
import { BotClient } from './bot-client';
import { ERROR_MESSAGES } from './constants';

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error(ERROR_MESSAGES.NO_TOKEN);
  process.exit(1);
}

async function main() {
  const bot = new BotClient();
  await bot.login(DISCORD_TOKEN!);
}

main().catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});