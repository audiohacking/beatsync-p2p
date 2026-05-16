import { describe, expect, test } from "bun:test";
import { parseRoomCodeFromTrysteroRoomId, toTrysteroRoomId, TRYSTERO_APP_ID } from "../constants";

describe("toTrysteroRoomId", () => {
  test("prefixes room code with app name and version", () => {
    expect(toTrysteroRoomId("482910")).toBe(`${TRYSTERO_APP_ID}-v1-482910`);
  });

  test("rejects invalid room codes", () => {
    expect(() => toTrysteroRoomId("abc")).toThrow();
  });
});

describe("parseRoomCodeFromTrysteroRoomId", () => {
  test("round-trips valid ids", () => {
    const code = "123456";
    expect(parseRoomCodeFromTrysteroRoomId(toTrysteroRoomId(code))).toBe(code);
  });

  test("returns null for foreign room names", () => {
    expect(parseRoomCodeFromTrysteroRoomId("other-app-v1-123456")).toBeNull();
  });
});
