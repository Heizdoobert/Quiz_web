import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Executes a prompt against Antigravity CLI (agy) without requiring external API keys.
 *
 * @param {Object} options
 * @param {string} options.prompt - Prompt to send to agy
 * @param {object|string} [options.jsonSchema] - Optional JSON schema object or string to enforce structured output
 * @param {'low'|'medium'|'high'} [options.effort='low'] - Reasoning effort
 * @param {string} [options.model] - Model name (e.g., 'gemini-3.8-flash-high')
 * @param {number} [options.timeoutMs=120000] - Process timeout in milliseconds
 * @returns {Promise<{
 *   status: string,
 *   structuredOutput: any,
 *   rawResponse: string,
 *   durationSeconds: number,
 *   usage?: object
 * }>}
 */
export async function askAgy({
  prompt,
  jsonSchema,
  effort = 'low',
  model,
  timeoutMs = 180000
}) {
  const args = [
    '-p',
    prompt,
    '--output-format',
    'json',
    '--effort',
    effort,
    '--disable-slash-commands'
  ];

  if (model) {
    args.push('--model', model);
  }

  if (jsonSchema) {
    const schemaStr = typeof jsonSchema === 'string' ? jsonSchema : JSON.stringify(jsonSchema);
    args.push('--json-schema', schemaStr);
  }

  try {
    const { stdout, stderr } = await execFileAsync('agy', args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env
      }
    });

    if (stderr && stderr.trim().length > 0) {
      // agy prints debug logs to stderr occasionally; we log as debug if needed
    }

    const parsed = JSON.parse(stdout);
    return {
      status: parsed.status,
      structuredOutput: parsed.structured_output,
      rawResponse: parsed.response,
      durationSeconds: parsed.duration_seconds,
      usage: parsed.usage
    };
  } catch (err) {
    const errorDetails = err.stderr || err.stdout || err.message;
    throw new Error(`[agy_client] Execution failed: ${errorDetails}`);
  }
}
