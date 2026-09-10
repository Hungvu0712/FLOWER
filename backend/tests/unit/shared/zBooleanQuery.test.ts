import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zBooleanQuery } from "@/shared/utils/zBooleanQuery";

const schema = z.object({ flag: zBooleanQuery() });

describe("zBooleanQuery", () => {
  it('parse "false" thành false — khác lỗi z.coerce.boolean() (Boolean("false") === true trong JS)', () => {
    expect(schema.parse({ flag: "false" })).toEqual({ flag: false });
  });

  it('parse "true" thành true', () => {
    expect(schema.parse({ flag: "true" })).toEqual({ flag: true });
  });

  it("không truyền field → undefined (không lọc)", () => {
    expect(schema.parse({})).toEqual({ flag: undefined });
  });

  it("giá trị khác 'true'/'false' bị từ chối (422), không âm thầm coi là true", () => {
    expect(() => schema.parse({ flag: "1" })).toThrow();
    expect(() => schema.parse({ flag: "" })).toThrow();
  });
});
