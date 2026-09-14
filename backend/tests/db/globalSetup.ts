import { execSync } from "node:child_process";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { GlobalSetupContext } from "vitest/node";

// "provide" chỉ nhận key đã khai báo ở đây (an toàn kiểu) — xem docs Vitest về globalSetup + inject().
declare module "vitest" {
  interface ProvidedContext {
    dbUrl: string;
  }
}

// Cùng bản Postgres đang dùng ở docker-compose.yml/CI (services.postgres trong ci.yml) — giữ nhất
// quán giữa các môi trường, tránh lệch hành vi giữa dev/CI/test.
const POSTGRES_IMAGE = "postgres:16-alpine";

let container: StartedPostgreSqlContainer | undefined;

// Chạy 1 LẦN cho toàn bộ file trong tests/db/ (không phải mỗi file) — dựng 1 container Postgres thật,
// áp migration thật lên đó, rồi cấp connection string cho từng test qua inject("dbUrl") (xem
// tests/db/setup.ts). Đây chính là phép thử "migration áp sạch từ đầu" mà Prisma mock (dùng cho
// tests/integration/) không bao giờ làm được — mock không có schema thật để áp.
export default async function setup({ provide }: GlobalSetupContext) {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const dbUrl = container.getConnectionUri();

  // execSync (qua shell) thay vì execFileSync — npx là file .cmd trên Windows, cần shell để chạy được;
  // CI (Linux) cũng chạy đúng qua /bin/sh. stdio "inherit" để lỗi migration hiện thẳng ra log, không bị
  // nuốt mất.
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "inherit",
  });

  provide("dbUrl", dbUrl);

  return async () => {
    await container?.stop();
  };
}
