// src/redis.js
import redis from './redisClient.js';

// Função para testar o Redis
(async () => {
  try {
    // Setar uma chave simples
    await redis.set("chave_exemplo", "valor");

    // Buscar a chave
    const valor = await redis.get("chave_exemplo");
    console.log("Valor da chave:", valor);

    // Setar um objeto como JSON
    const obj = { nome: "João", idade: 30 };
    await redis.set("usuario:1", JSON.stringify(obj));

    // Buscar e converter o JSON
    const json = await redis.get("usuario:1");
    const usuario = JSON.parse(json);
    console.log("Usuário:", usuario);

    // Outro exemplo
    await redis.set("foo", "bar");
    const foo = await redis.get("foo");
    console.log("foo:", foo);

  } catch (err) {
    console.error("❌ Erro ao usar Redis:", err);
  } finally {
    redis.disconnect(); // encerra a conexão
  }
})();
