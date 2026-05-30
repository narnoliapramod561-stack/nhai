export type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING';

export interface ValidationResult {
  testId: string;
  category: string;
  status: ValidationStatus;
  executionMs: number;
  details: string;
}

export interface ValidationReport {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  generatedAt: string;
  results: ValidationResult[];
}

export interface ValidationSuite {
  name: string;
  run(): Promise<ValidationResult[]>;
}
