import { loadConfig } from './config';
import { createRabbitMQListener } from './rabbitmq';

async function main() {
  try {
    const config = loadConfig();
    const listener = createRabbitMQListener(config);

    // Handle process termination
    let isShuttingDown = false;
    async function handleShutdown(signal: string) {
      if (isShuttingDown) {
        console.log('Shutdown already in progress...');
        return;
      }
      isShuttingDown = true;
      console.log(`Received ${signal}. Closing...`);

      try {
        await Promise.race([
          listener.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 5000)),
        ]);
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    }

    process
      .on('SIGINT', () => handleShutdown('SIGINT'))
      .on('SIGTERM', () => handleShutdown('SIGTERM'));

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
