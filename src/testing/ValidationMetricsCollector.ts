import { ValidationResult, ValidationStatus } from './ValidationTypes';

export class ValidationMetricsCollector {
  private results: ValidationResult[] = [];

  public addResult(result: ValidationResult) {
    this.results.push(result);
  }

  public addResults(results: ValidationResult[]) {
    this.results.push(...results);
  }

  public getResults(): ValidationResult[] {
    return this.results;
  }

  public getSummary() {
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const r of this.results) {
      if (r.status === 'PASS') passed++;
      else if (r.status === 'FAIL') failed++;
      else if (r.status === 'WARNING') warnings++;
    }

    return {
      totalTests: this.results.length,
      passed,
      failed,
      warnings,
      generatedAt: new Date().toISOString(),
    };
  }

  public getPerformanceMetrics(category?: string) {
    const filtered = category ? this.results.filter(r => r.category === category) : this.results;
    if (filtered.length === 0) return { avgMs: 0, peakMs: 0 };

    let sum = 0;
    let peakMs = 0;

    for (const r of filtered) {
      sum += r.executionMs;
      if (r.executionMs > peakMs) peakMs = r.executionMs;
    }

    return {
      avgMs: sum / filtered.length,
      peakMs
    };
  }
}
