import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";
import { emailService } from "@/modules/core/email/email.service";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "msg-1" } as never);
});

describe("POST /api/v1/contact (công khai)", () => {
  it("gửi liên hệ thành công, trả 201, KHÔNG cần đăng nhập", async () => {
    db.contactMessage.create.mockResolvedValue({ id: "c1", name: "An", phone: "0900000000" });
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "An", phone: "0900000000", message: "Cho hỏi giá hoa cưới" });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe("c1");
  });

  it("422 khi thiếu message", async () => {
    const res = await request(app).post("/api/v1/contact").send({ name: "An", phone: "0900000000" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("message");
  });

  it("422 khi email sai định dạng", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "An", phone: "0900000000", email: "khong-hop-le", message: "Hỏi giá" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("email");
  });
});

describe("Admin — /api/v1/admin/contact-messages", () => {
  let adminCookie: string[];

  beforeEach(() => {
    adminCookie = loginAs("admin-1", ["admin"], ["contact.manage"]);
    db.auditLog.create.mockResolvedValue({});
  });

  it("GET liệt kê tin nhắn", async () => {
    db.contactMessage.findMany.mockResolvedValue([{ id: "c1" }]);
    db.contactMessage.count.mockResolvedValue(1);
    const res = await request(app).get("/api/v1/admin/contact-messages").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET ?isHandled=false lọc ĐÚNG tin nhắn CHƯA xử lý — hồi quy cho lỗi z.coerce.boolean() (đã từng bị hiểu nhầm thành true qua query string thật, chỉ integration test với HTTP request thật mới bắt được)", async () => {
    db.contactMessage.findMany.mockResolvedValue([]);
    db.contactMessage.count.mockResolvedValue(0);
    const res = await request(app)
      .get("/api/v1/admin/contact-messages?isHandled=false")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(db.contactMessage.findMany.mock.calls[0]![0].where).toEqual({ isHandled: false });
  });

  it("GET ?isHandled=true lọc đúng tin nhắn đã xử lý", async () => {
    db.contactMessage.findMany.mockResolvedValue([]);
    db.contactMessage.count.mockResolvedValue(0);
    const res = await request(app)
      .get("/api/v1/admin/contact-messages?isHandled=true")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(db.contactMessage.findMany.mock.calls[0]![0].where).toEqual({ isHandled: true });
  });

  it("PATCH đánh dấu đã xử lý", async () => {
    const id = "77777777-7777-7777-7777-777777777777";
    db.contactMessage.findUnique.mockResolvedValue({ id });
    db.contactMessage.update.mockResolvedValue({ id, isHandled: true });
    const res = await request(app)
      .patch(`/api/v1/admin/contact-messages/${id}`)
      .set("Cookie", adminCookie)
      .send({ isHandled: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isHandled).toBe(true);
  });

  it("member KHÔNG có contact.manage → 403", async () => {
    const memberCookie = loginAs("member-1", ["member"], []);
    const res = await request(app).get("/api/v1/admin/contact-messages").set("Cookie", memberCookie);
    expect(res.status).toBe(403);
  });
});
