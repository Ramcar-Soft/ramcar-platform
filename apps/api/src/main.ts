import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://ramcar-platform-dev.up.railway.app"
    ],
    credentials: true,
  });

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
}
bootstrap();
