import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Hardening (OWASP) ──
  // Headers de segurança (CSP, X-Frame-Options, noSniff etc.).
  app.use(helmet());
  // CORS restrito: em produção só a origem do front; em dev, o Vite local.
  const origins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? [
    "http://localhost:5173",
  ];
  app.enableCors({ origin: origins, credentials: true });
  // Validação estrita: campos fora do DTO são rejeitados (whitelist + forbid).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.setGlobalPrefix("api");

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  Logger.log(`API no ar em http://localhost:${port}/api`, "Bootstrap");
}

bootstrap();
