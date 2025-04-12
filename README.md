# 🧠 Back-End
Back-End Node.js.

# 🛠️ Recomendações para o Desenvolvimento

## ✅ Use WSL com Ubuntu

Para garantir o máximo de compatibilidade, recomenda-se usar o **WSL (Windows Subsystem for Linux)** com **Ubuntu**.

### 📥 Como instalar o WSL

Siga o tutorial oficial da Microsoft para instalar o WSL com Ubuntu:

👉 [Tutorial oficial do WSL (Microsoft)](https://learn.microsoft.com/pt-br/windows/wsl/install)

### 🔧 Como configurar o Git no WSL

Após instalar o WSL, você pode configurar o Git dentro dele com este tutorial:

👉 [Gerar chave SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)  
👉 [Adicionar chave SSH ao GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)  
👉 [Testar conexão](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)

## ✅ Extensões recomendadas do VSCode

Certifique-se de instalar as extensões recomendadas listadas no arquivo: `.vscode/extensions.json`.

Se o VSCode estiver corretamente configurado, ele irá sugerir automaticamente a instalação dessas extensões ao abrir o projeto.

Dessa forma, o VSCode alertará automaticamente os erros de código com o ESLint.

## ▶️ Como começar a desenvolver

Após clonar o projeto, instale todas as dependências de desenvolvimento com:

```bash
$ npm install
```

Para rodar o Nest em desenvolvimento:

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
