import Redis from 'ioredis';
const redis = new Redis({ host: "127.0.0.1", port: 6000 });

redis.on('connect', () => {
  console.log('✅ Redis conectado!');
});

redis.on('error', (err) => {
  console.error('❌ Erro no Redis:', err);
});

export default redis;
