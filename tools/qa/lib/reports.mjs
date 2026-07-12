import { atomicWrite } from "./common.mjs";

export function addCheck(matrix, { id, area, test, pass, severity = "high", detail }) {
  matrix.push({
    id,
    area,
    test,
    status: pass ? "PASS" : "FAIL",
    severity: pass ? "none" : severity,
    detail: sanitizeDetail(detail)
  });
}

export async function writeCertificationArtifacts({ matrix, manifest, generatedAt }) {
  const summary = summarizeMatrix(matrix);
  await atomicWrite(manifest.artifacts.matrix, matrixCsv(matrix));
  await atomicWrite(manifest.artifacts.report, reportMarkdown(matrix, manifest, generatedAt, summary));
  await atomicWrite(manifest.artifacts.findings, findingsMarkdown(matrix, generatedAt));
  return summary;
}

export function summarizeMatrix(matrix) {
  const failed = matrix.filter((check) => check.status === "FAIL");
  return {
    total: matrix.length,
    passed: matrix.length - failed.length,
    failed: failed.length,
    critical: failed.filter((check) => check.severity === "critical").length,
    high: failed.filter((check) => check.severity === "high").length,
    medium: failed.filter((check) => check.severity === "medium").length,
    low: failed.filter((check) => check.severity === "low").length
  };
}

function matrixCsv(matrix) {
  const rows = [
    ["id", "area", "test", "status", "severity", "detail"],
    ...matrix.map((check) => [check.id, check.area, check.test, check.status, check.severity, check.detail])
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function reportMarkdown(matrix, manifest, generatedAt, summary) {
  const areas = [...new Set(matrix.map((check) => check.area))];
  const areaRows = areas.map((area) => {
    const checks = matrix.filter((check) => check.area === area);
    const passed = checks.filter((check) => check.status === "PASS").length;
    return `| ${area} | ${passed} | ${checks.length - passed} |`;
  });
  const verdict = summary.failed === 0 ? "CERTIFIED" : "NOT CERTIFIED";

  return [
    "# ADPeak QA Certification Report",
    "",
    `- Verdict: **${verdict}**`,
    `- Generated: ${generatedAt}`,
    `- Database: ${manifest.target.host}:${manifest.target.port}/${manifest.target.database}`,
    `- Checks: ${summary.passed}/${summary.total} passed`,
    "- Database inventory was read in a PostgreSQL read-only transaction.",
    "- HTTP probes ran against the real backend process connected only to the isolated PostgreSQL clone.",
    "",
    "## Coverage",
    "",
    "| Area | Passed | Failed |",
    "| --- | ---: | ---: |",
    ...areaRows,
    "",
    "## Result",
    "",
    summary.failed === 0
      ? "The isolated clone meets the official-account, indicator, role, report, and security certification gates."
      : "Certification failed. Resolve the findings before treating this clone as a valid QA baseline.",
    ""
  ].join("\n");
}

function findingsMarkdown(matrix, generatedAt) {
  const findings = matrix.filter((check) => check.status === "FAIL");

  if (findings.length === 0) {
    return [
      "# ADPeak QA Findings",
      "",
      `Generated: ${generatedAt}`,
      "",
      "No findings.",
      ""
    ].join("\n");
  }

  return [
    "# ADPeak QA Findings",
    "",
    `Generated: ${generatedAt}`,
    "",
    ...findings.flatMap((finding) => [
      `## ${finding.id}: ${finding.test}`,
      "",
      `- Area: ${finding.area}`,
      `- Severity: ${finding.severity}`,
      `- Detail: ${finding.detail}`,
      ""
    ])
  ].join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function sanitizeDetail(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}
