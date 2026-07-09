import { getExtractionSystemPrompt, buildBatchUserPrompt } from "../extraction-prompt";

describe("Extraction Prompt", () => {
  describe("getExtractionSystemPrompt", () => {
    it("should return a non-empty string", () => {
      const prompt = getExtractionSystemPrompt();
      expect(prompt.length).toBeGreaterThan(100);
    });

    it("should mention all CRM fields", () => {
      const prompt = getExtractionSystemPrompt();
      const requiredFields = [
        "created_at",
        "name",
        "email",
        "country_code",
        "mobile_without_country_code",
        "company",
        "city",
        "state",
        "country",
        "lead_owner",
        "crm_status",
        "crm_note",
        "data_source",
        "possession_time",
        "description",
      ];

      for (const field of requiredFields) {
        expect(prompt).toContain(field);
      }
    });

    it("should mention all valid crm_status values", () => {
      const prompt = getExtractionSystemPrompt();
      expect(prompt).toContain("GOOD_LEAD_FOLLOW_UP");
      expect(prompt).toContain("DID_NOT_CONNECT");
      expect(prompt).toContain("BAD_LEAD");
      expect(prompt).toContain("SALE_DONE");
    });

    it("should mention all valid data_source values", () => {
      const prompt = getExtractionSystemPrompt();
      expect(prompt).toContain("leads_on_demand");
      expect(prompt).toContain("meridian_tower");
      expect(prompt).toContain("eden_park");
      expect(prompt).toContain("varah_swamy");
      expect(prompt).toContain("sarjapur_plots");
    });

    it("should specify JSON output format", () => {
      const prompt = getExtractionSystemPrompt();
      expect(prompt).toContain("records");
      expect(prompt).toContain("skipped");
      expect(prompt).toContain("sourceRowIndex");
    });
  });

  describe("buildBatchUserPrompt", () => {
    it("should include importedAt timestamp", () => {
      const rows = [{ Name: "John", Email: "john@test.com" }];
      const prompt = buildBatchUserPrompt(rows, 0, "2024-01-15T10:00:00Z");

      expect(prompt).toContain("2024-01-15T10:00:00Z");
    });

    it("should tag rows with __sourceRowIndex", () => {
      const rows = [
        { Name: "John" },
        { Name: "Jane" },
      ];

      const prompt = buildBatchUserPrompt(rows, 5, "2024-01-15T10:00:00Z");
      expect(prompt).toContain("__sourceRowIndex");
      expect(prompt).toContain('"__sourceRowIndex": 5');
      expect(prompt).toContain('"__sourceRowIndex": 6');
    });

    it("should include all row data as JSON", () => {
      const rows = [{ Name: "John", Email: "john@test.com" }];
      const prompt = buildBatchUserPrompt(rows, 0, "2024-01-15T10:00:00Z");

      expect(prompt).toContain("John");
      expect(prompt).toContain("john@test.com");
    });
  });
});
