import { describe, expect, it } from "vitest";
import { effectToStatus } from "@/lib/ingest/status";

describe("effectToStatus", () => {
  it("mapea cada efecto de política a su estado de acción", () => {
    expect(effectToStatus("allow")).toBe("allowed");
    expect(effectToStatus("block")).toBe("blocked");
    expect(effectToStatus("require_approval")).toBe("needs_approval");
    expect(effectToStatus("escalate")).toBe("needs_approval");
  });
});
