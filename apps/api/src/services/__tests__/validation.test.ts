import { validateAndSanitize } from "../validation.service";

describe("Validation Service", () => {
  const makeRows = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      name: `Test ${i}`,
      email: `test${i}@example.com`,
    }));

  describe("validateAndSanitize", () => {
    it("should pass through valid records", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            name: "John Doe",
            email: "john@test.com",
            country_code: "+1",
            mobile_without_country_code: "5551234567",
            crm_status: "GOOD_LEAD_FOLLOW_UP",
            data_source: "leads_on_demand",
            created_at: "2024-01-15",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].name).toBe("John Doe");
      expect(result.records[0].crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    });

    it("should blank out invalid crm_status values", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            crm_status: "INVALID_STATUS",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].crm_status).toBe("");
    });

    it("should blank out invalid data_source values", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            data_source: "unknown_source",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].data_source).toBe("");
    });

    it("should accept valid data_source values case-insensitively", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            data_source: "MERIDIAN_TOWER",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].data_source).toBe("meridian_tower");
    });

    it("should skip records missing both email and phone", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            name: "No Contact Info",
            email: "",
            mobile_without_country_code: "",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("email");
    });

    it("should allow records with only email", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "only-email@test.com",
            mobile_without_country_code: "",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records).toHaveLength(1);
    });

    it("should allow records with only phone", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "",
            mobile_without_country_code: "9876543210",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records).toHaveLength(1);
    });

    it("should validate dates", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            created_at: "2024-01-15T10:30:00Z",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].created_at).toBeTruthy();
      expect(() => new Date(result.records[0].created_at)).not.toThrow();
    });

    it("should blank out invalid dates", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            created_at: "not-a-date",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].created_at).toBe("");
    });

    it("should handle DD/MM/YYYY date format", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            created_at: "15/01/2024",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].created_at).toBeTruthy();
    });

    it("should escape raw newlines in text fields", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "test@test.com",
            crm_note: "Line 1\nLine 2\rLine 3",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].crm_note).not.toContain("\n");
      expect(result.records[0].crm_note).toContain("\\n");
    });

    it("should handle invalid JSON gracefully", () => {
      const result = validateAndSanitize(
        "{ invalid json !!",
        makeRows(3),
        0,
      );

      expect(result.records).toHaveLength(0);
      expect(result.skipped).toHaveLength(3);
      expect(result.skipped[0].reason).toContain("invalid JSON");
    });

    it("should handle missing records/skipped arrays", () => {
      const result = validateAndSanitize(
        JSON.stringify({}),
        makeRows(1),
        0,
      );

      expect(result.records).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    it("should lowercase email addresses", () => {
      const json = JSON.stringify({
        records: [
          {
            sourceRowIndex: 0,
            email: "Test@Example.COM",
          },
        ],
        skipped: [],
      });

      const result = validateAndSanitize(json, makeRows(1), 0);
      expect(result.records[0].email).toBe("test@example.com");
    });
  });
});
