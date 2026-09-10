import { vi } from "vitest";

// Prisma client giả lập cho test unit/integration — mọi `prisma.<model>.<method>()` tự sinh ra một
// `vi.fn()` khi được truy cập lần đầu, nên không phải liệt kê tay từng model/method và không phải
// cập nhật file này mỗi lần schema đổi. Test chỉ cần `mockResolvedValue(...)` cho đúng lời gọi nó quan tâm.
//
// vitest.config.ts alias mọi đường dẫn `config/prisma` sang file này (xem docs/08-kiem-thu.md).

type AnyFn = ReturnType<typeof vi.fn>;

function createModelMock(): Record<string, AnyFn> {
  const methods: Record<string, AnyFn> = {};
  return new Proxy(methods, {
    get(target, prop: string) {
      if (typeof prop !== "string") return undefined;
      target[prop] ??= vi.fn();
      return target[prop];
    },
  });
}

const models: Record<string, Record<string, AnyFn>> = {};

// $transaction nhận mảng promise (batch) hoặc callback (interactive) — mô phỏng cả hai.
// Phải là MỘT spy cố định (không tạo mới mỗi lần truy cập) để test assert được `toHaveBeenCalled()`.
const clientMethods: Record<string, AnyFn> = {
  $transaction: vi.fn(async (arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
  ),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

export const prisma: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
  get(_target, prop) {
    if (typeof prop !== "string") return undefined;
    if (prop === "then") return undefined; // tránh bị await nhầm như một promise
    if (prop in clientMethods) return clientMethods[prop];

    models[prop] ??= createModelMock();
    return models[prop];
  },
});

// Xoá sạch mock giữa các test — gọi trong beforeEach.
export function resetPrismaMock(): void {
  for (const model of Object.values(models)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  for (const [name, fn] of Object.entries(clientMethods)) {
    fn.mockClear();
    if (name === "$transaction") {
      fn.mockImplementation(async (arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
      );
    }
  }
}

// ---- Kiểu tiện dụng cho test ----------------------------------------------------------------
// Dùng union tường minh thay vì index signature: `noUncheckedIndexedAccess` (bật ở tsconfig) sẽ
// khiến index signature trả về `T | undefined`, làm mọi dòng `db.user.findMany.mock...` phải thêm `!`.

const MODEL_METHODS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

export type ModelMock = { [K in (typeof MODEL_METHODS)[number]]: AnyFn };

export interface PrismaMockClient {
  user: ModelMock;
  role: ModelMock;
  permission: ModelMock;
  rolePermission: ModelMock;
  userRole: ModelMock;
  authAccount: ModelMock;
  session: ModelMock;
  magicLinkToken: ModelMock;
  passwordResetToken: ModelMock;
  loginMethodSetting: ModelMock;
  folder: ModelMock;
  file: ModelMock;
  fileUsage: ModelMock;
  auditLog: ModelMock;
  emailLog: ModelMock;
  category: ModelMock;
  product: ModelMock;
  productImage: ModelMock;
  $transaction: AnyFn;
}

/** Cùng một đối tượng với `prisma`, nhưng đã gắn kiểu để test gọi `.mock.calls` không cần cast. */
export const db = prisma as unknown as PrismaMockClient;
