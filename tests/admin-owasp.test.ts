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
              <td>X-Frame-Options header not set on responses.</td>
            </tr>
            <tr>
              <td>Information Disclosure - Sensitive Comments</td>
              <td>Informational</td>
              <td>Medium</td>
              <td>HTML comments include developer debugging notes.</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const alerts = parseAlertsFromHtml(mockHtml);

    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toEqual({
      name: 'SQL Injection',
      risk: 'High',
      description: 'A SQL injection vulnerability exists in user input parameter.',
    });
    expect(alerts[1]).toEqual({
      name: 'Remote Code Execution',
      risk: 'Critical',
      description: 'Arbitrary shell execution possible via unescaped parameter.',
    });
  });

  it('strips HTML tags and excessive whitespace inside table cells', () => {
    const mockHtml = `
      <table>
        <tr>
          <td><strong>Path Traversal</strong> <span>(CVE-2024-XXXX)</span></td>
          <td><span class="badge danger">High</span></td>
          <td>Reliable</td>
          <td><p>Arbitrary <em>file read</em> via ../../ traversal.</p></td>
        </tr>
      </table>
    `;

    const alerts = parseAlertsFromHtml(mockHtml);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].name).toBe('Path Traversal (CVE-2024-XXXX)');
    expect(alerts[0].risk).toBe('High');
    expect(alerts[0].description).toBe('Arbitrary file read via ../../ traversal.');
  });

  it('returns empty array when HTML contains no High or Critical alerts', () => {
    const mockHtml = `
      <table>
        <tr>
          <td>Cookie No HttpOnly Flag</td>
          <td>Medium</td>
          <td>High</td>
          <td>Session cookie lacks HttpOnly attribute.</td>
        </tr>
        <tr>
          <td>Strict-Transport-Security Header Not Set</td>
          <td>Low</td>
          <td>Medium</td>
          <td>HSTS not enforced.</td>
        </tr>
      </table>
    `;

    const alerts = parseAlertsFromHtml(mockHtml);
    expect(alerts).toEqual([]);
  });

  it('returns empty array on malformed or empty HTML', () => {
    expect(parseAlertsFromHtml('')).toEqual([]);
    expect(parseAlertsFromHtml('<div>No tables here</div>')).toEqual([]);
    expect(parseAlertsFromHtml('<table><tr><td>Incomplete row</td></tr></table>')).toEqual([]);
  });
});

describe('Admin Email Authorization Logic', () => {
  function isAuthorizedAdmin(email: string | null | undefined, adminEmailsEnv: string | undefined): boolean {
    if (!email) return false;
    const adminEmails = (adminEmailsEnv ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = email.trim().toLowerCase();
    return adminEmails.includes(userEmail);
  }

  it('authorizes emails matching the whitelist exact match', () => {
    const env = 'admin@example.com, security@company.org';
    expect(isAuthorizedAdmin('admin@example.com', env)).toBe(true);
    expect(isAuthorizedAdmin('security@company.org', env)).toBe(true);
  });

  it('authorizes emails case-insensitively with leading/trailing spaces', () => {
    const env = '  ADMIN@example.com , Security@Company.org ';
    expect(isAuthorizedAdmin('admin@example.com', env)).toBe(true);
    expect(isAuthorizedAdmin('Admin@Example.com', env)).toBe(true);
    expect(isAuthorizedAdmin('  security@company.org  ', env)).toBe(true);
  });

  it('rejects emails not on the whitelist', () => {
    const env = 'admin@example.com';
    expect(isAuthorizedAdmin('attacker@evil.com', env)).toBe(false);
    expect(isAuthorizedAdmin('user@example.com', env)).toBe(false);
  });

  it('rejects empty or missing user emails', () => {
    const env = 'admin@example.com';
    expect(isAuthorizedAdmin('', env)).toBe(false);
    expect(isAuthorizedAdmin(null, env)).toBe(false);
    expect(isAuthorizedAdmin(undefined, env)).toBe(false);
  });

  it('rejects all users when ADMIN_EMAILS is unset or empty', () => {
    expect(isAuthorizedAdmin('admin@example.com', undefined)).toBe(false);
    expect(isAuthorizedAdmin('admin@example.com', '')).toBe(false);
    expect(isAuthorizedAdmin('admin@example.com', '   ')).toBe(false);
  });
});
