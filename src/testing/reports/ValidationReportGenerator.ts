import { ValidationMetricsCollector } from '../ValidationMetricsCollector';
import { ValidationReport } from '../ValidationTypes';
// Assuming react-native-fs is available or just output to console

export class ValidationReportGenerator {
  constructor(private collector: ValidationMetricsCollector) {}

  public getReportPayload(): ValidationReport {
    const summary = this.collector.getSummary();
    return {
      ...summary,
      results: this.collector.getResults(),
    };
  }

  public generateMarkdown(): string {
    const report = this.getReportPayload();
    let md = `# NHAI Biometric Platform Validation Report\n\n`;
    md += `Generated At: ${report.generatedAt}\n\n`;
    md += `## Summary\n`;
    md += `- **Total Tests**: ${report.totalTests}\n`;
    md += `- **Passed**: ✅ ${report.passed}\n`;
    md += `- **Failed**: ❌ ${report.failed}\n`;
    md += `- **Warnings**: ⚠️ ${report.warnings}\n\n`;

    md += `## Phase V1.1 Field Execution Metrics\n\n`;
    
    md += `### Recognition Accuracy (MobileFaceNet)\n`;
    md += `- **FAR (False Acceptance Rate)**: [Awaiting Device Execution]\n`;
    md += `- **FRR (False Rejection Rate)**: [Awaiting Device Execution]\n`;
    md += `- **EER (Equal Error Rate)**: [Awaiting Device Execution]\n`;
    md += `- **Optimal Math Threshold**: [Awaiting Device Execution]\n\n`;

    md += `### Thermal & Memory Constraints\n`;
    md += `- **20-Min Loop Status**: [Awaiting Device Execution]\n`;
    md += `- **Peak RAM Usage**: [Awaiting Device Execution]\n`;
    md += `- **Average Latency (Ms)**: [Awaiting Device Execution]\n\n`;

    md += `### Liveness Accuracy\n`;
    md += `- **Live Acceptance Rate**: [Awaiting Device Execution]\n`;
    md += `- **Spoof Rejection Rate**: [Awaiting Device Execution]\n\n`;

    md += `## Detailed Suite Results\n\n`;
    md += `| Category | Test ID | Status | Latency (ms) | Details |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const r of report.results) {
      const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
      md += `| ${r.category} | ${r.testId} | ${emoji} ${r.status} | ${r.executionMs.toFixed(1)} | ${r.details} |\n`;
    }

    return md;
  }

  /**
   * For the demo, we just print the Markdown to the console, 
   * but it could easily be written to the DocumentDirectory.
   */
  public async exportReports(): Promise<void> {
    const json = JSON.stringify(this.getReportPayload(), null, 2);
    const md = this.generateMarkdown();

    console.log('--- JSON REPORT ---');
    console.log(json);
    console.log('--- MD REPORT ---');
    console.log(md);
    
    // In a full implementation, you would write this to RNFS.DocumentDirectoryPath
    // await RNFS.writeFile(RNFS.DocumentDirectoryPath + '/final_validation_report.json', json, 'utf8');
    // await RNFS.writeFile(RNFS.DocumentDirectoryPath + '/final_validation_report.md', md, 'utf8');
  }
}
