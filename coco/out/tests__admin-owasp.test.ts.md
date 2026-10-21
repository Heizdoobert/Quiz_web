# tests/admin-owasp.test.ts
lines:161 exports:
---
import { describe, it, expect } from 'vitest';
import { parseAlertsFromHtml } from '@/app/api/owasp/scan/route';

describe('OWASP ZAP Scan Alert Parser', () => {
  it('extracts High and Critical alerts from sample ZAP HTML table', () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>ZAP Scanning Report</title></head>
        <body>
          <h2>Alerts</h2>
          <table class="alerts">
            <tr>
              <th>Alert</th>
              <th>Risk</th>
              <th>Reliability</th>
              <th>Description</th>
            </tr>
            <tr>
              <td>SQL Injection</td>
              <td>High</td>
              <td>Confirmed</td>
              <td>A SQL injection vulnerability exists in user input parameter.</td>
            </tr>
            <tr>
              <td>Remote Code Execution</td>
              <td>Critical</td>
              <td>High</td>
              <td>Arbitrary shell execution possible via unescaped parameter.</td>
            </tr>
            <tr>
              <td>Cross-Site Scripting (Reflected)</td>
              <td>Medium</td>
              <td>Confirmed</td>
              <td>Reflected XSS observed in query parameter 'q'.</td>
            </tr>
            <tr>
              <td>Missing Anti-clickjacking Header</td>
              <td>Low</td>
              <td>High</td>
