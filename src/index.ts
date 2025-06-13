import { loadConfig } from './config';
import { createRabbitMQListener } from './rabbitmq';

async function main() {
  try {
    const config = loadConfig();
    const listener = createRabbitMQListener(config);

    // Handle process termination
    async function handleShutdown() {
      console.log('Closing...');
      await listener.close();
      process.exit(0);
    }

    process.on('SIGINT', handleShutdown).on('SIGTERM', handleShutdown);

    // Connect and setup queues
    await listener.connect();
    await listener.setupQueuesAndBindings();

    console.log('RabbitMQ listener is running. Press Ctrl+C to exit.');
  } catch (error) {
    console.error('Application error:', error);
    process.exit(1);
  }
}

main();
