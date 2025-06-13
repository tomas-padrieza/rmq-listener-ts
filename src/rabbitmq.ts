import amqp from 'amqplib';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import type { Config } from './config';

type RabbitMQContext = {
  connection: ChannelModel | null;
  channel: Channel | null;
};

export type RabbitMQListener = {
  connect: () => Promise<void>;
  setupQueuesAndBindings: () => Promise<void>;
  close: () => Promise<void>;
};

function createConnectionUrl(config: Config['rabbitmq']): string {
  const { host, port, username, password, vhost } = config;
  return `amqp://${username}:${password}@${host}:${port}/${vhost}`;
}

async function setupQueueAndBinding(
  channel: Channel,
  exchange: string,
  topic: string
): Promise<void> {
  const queueName = topic.split('.')[0];

  // Assert queue
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-message-ttl': 1000 * 60 * 60 * 24, // 24 hours
      'x-queue-type': 'quorum',
    },
  });

  // Bind queue to exchange
  await channel.bindQueue(queueName, exchange, topic);

  // Setup consumer
  await channel.consume(queueName, (msg: ConsumeMessage | null) => {
    if (!msg) return;

    console.log(`[${queueName}] Received message:`, {
      routingKey: msg.fields.routingKey,
      content: msg.content.toString(),
    });

    // Acknowledge the message
    channel.ack(msg);
  });

  console.log(`Queue ${queueName} bound to exchange ${exchange} with routing key ${topic}`);
}

export function createRabbitMQListener(config: Config): RabbitMQListener {
  const context: RabbitMQContext = {
    connection: null,
    channel: null,
  };

  async function connect(): Promise<void> {
    const url = createConnectionUrl(config.rabbitmq);

    try {
      const conn = await amqp.connect(url);
      context.connection = conn;
      context.channel = await conn.createChannel();

      // Handle connection closure
      conn.on('close', () => {
        console.error('Connection to RabbitMQ closed');
        reconnect();
      });

      // Handle errors
      conn.on('error', (error: Error) => {
        console.error('RabbitMQ connection error:', error);
      });

      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  const reconnect = async (): Promise<void> => {
    console.log('Attempting to reconnect...');
    try {
      await connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      // Try again in 5 seconds
      setTimeout(() => reconnect(), 5000);
    }
  };

  const setupQueuesAndBindings = async (): Promise<void> => {
    if (!context.channel) {
      throw new Error('Channel not initialized');
    }

    const { exchange, topics } = config.rabbitmq;

    // Assert exchange
    await context.channel.assertExchange(exchange, 'topic', { durable: true });

    // Setup queues and bindings in parallel
    await Promise.all(
      topics.map((topic) => setupQueueAndBinding(context.channel!, exchange, topic))
    );
  };

  const close = async (): Promise<void> => {
    try {
      if (context.channel) {
        await context.channel.close();
        context.channel = null;
      }
      if (context.connection) {
        await context.connection.close();
        context.connection = null;
      }
      console.log('Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  };

  return {
    connect,
    setupQueuesAndBindings,
    close,
  };
}
