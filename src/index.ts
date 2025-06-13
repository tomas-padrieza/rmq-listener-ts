import { loadConfig } from './config';
import { createRabbitMQListener } from './rabbitmq';
import { handleShutdown } from './utils';

async function main() {
  try {
    const config = loadConfig();
    const listener = createRabbitMQListener(config);

    process
      .on('SIGINT', () => handleShutdown(listener, 'SIGINT'))
      .on('SIGTERM', () => handleShutdown(listener, 'SIGTERM'));

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
