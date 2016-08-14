import amqplib from 'amqplib';
import debug from 'debug';

import { amqp } from './ssl';

import {
  AMQP_URL,
  EXCHANGE_NAME,
  EXCHANGE_DURABLE
} from './environment';

const log = debug('hacron:amqp');

const opts = amqp ? {
  ca: amqp
} : {};

function handleConnectionError (e) {
  log('amqp connection error');
  console.trace(e);
  process.exit(1);
}

function objectToBuffer (obj) {
  return new Buffer(JSON.stringify(obj), 'utf8');
}

export default async function connect () {
  try {
    log('creating amqp connection');
    const connection = await amqplib.connect(AMQP_URL, opts);
    log('amqp connection established');

    connection.on('close', () => handleConnectionError(new Error('amqp connection closed')));
    connection.on('error', (e) => handleConnectionError(e));

    log('creating amqp channel');
    const channel = await connection.createChannel();
    log('amqp channel created');

    log(`asserting amqp exchange ${EXCHANGE_NAME}${EXCHANGE_DURABLE ? ' as durable exchange' : ''}`);
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', {
      durable: EXCHANGE_DURABLE
    });
    log(`amqp exchange ${EXCHANGE_NAME} asserted`);

    return (data) => channel.publish(EXCHANGE_NAME, '', objectToBuffer(data));
  } catch (e) {
    handleConnectionError(e);
  }
}
