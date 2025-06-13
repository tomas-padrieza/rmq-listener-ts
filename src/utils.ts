import type { RabbitMQListener } from './rabbitmq';

let isShuttingDown = false;
export async function handleShutdown(listener: RabbitMQListener, signal: string) {
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
