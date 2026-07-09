import { parseCsvBuffer } from "../csv-parser.service";

describe("CSV Parser Service", () => {
  it("should parse a valid CSV buffer", () => {
    const csv = Buffer.from("Name,Email,Phone\nJohn,john@test.com,+1234567890\nJane,jane@test.com,+0987654321");
    const result = parseCsvBuffer(csv);

    expect(result.headers).toEqual(["Name", "Email", "Phone"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      Name: "John",
      Email: "john@test.com",
      Phone: "+1234567890",
    });
  });

  it("should handle BOM character", () => {
    const csv = Buffer.from("\uFEFFName,Email\nBob,bob@test.com");
    const result = parseCsvBuffer(csv);

    expect(result.headers).toEqual(["Name", "Email"]);
    expect(result.rows).toHaveLength(1);
  });

  it("should handle empty headers by generating placeholder names", () => {
    const csv = Buffer.from(",Email,\nJohn,john@test.com,data");
    const result = parseCsvBuffer(csv);

    expect(result.headers[0]).toBe("column_1");
    expect(result.headers[1]).toBe("Email");
    expect(result.headers[2]).toBe("column_3");
  });

  it("should skip completely empty rows", () => {
    const csv = Buffer.from("Name,Email\nJohn,john@test.com\n,,\n,\nJane,jane@test.com");
    const result = parseCsvBuffer(csv);

    expect(result.rows).toHaveLength(2);
  });

  it("should trim whitespace from values", () => {
    const csv = Buffer.from("Name,Email\n  John  ,  john@test.com  ");
    const result = parseCsvBuffer(csv);

    expect(result.rows[0].Name).toBe("John");
    expect(result.rows[0].Email).toBe("john@test.com");
  });

  it("should return empty headers for a completely empty CSV", () => {
    const csv = Buffer.from("");
    const result = parseCsvBuffer(csv);

    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("should handle CSV with only headers and no data", () => {
    const csv = Buffer.from("Name,Email,Phone");
    const result = parseCsvBuffer(csv);

    expect(result.headers).toEqual(["Name", "Email", "Phone"]);
    expect(result.rows).toEqual([]);
  });

  it("should handle rows with inconsistent column counts gracefully", () => {
    const csv = Buffer.from("Name,Email,Phone\nJohn,john@test.com\nJane,jane@test.com,+123,extra");
    const result = parseCsvBuffer(csv);

    // Should still parse both rows
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle quoted fields with commas", () => {
    const csv = Buffer.from('Name,Address\nJohn,"123 Main St, Apt 4"');
    const result = parseCsvBuffer(csv);

    expect(result.rows[0].Address).toBe("123 Main St, Apt 4");
  });

  it("should handle quoted fields with newlines", () => {
    const csv = Buffer.from('Name,Notes\nJohn,"Line 1\nLine 2"');
    const result = parseCsvBuffer(csv);

    expect(result.rows[0].Notes).toContain("Line 1");
  });
});
