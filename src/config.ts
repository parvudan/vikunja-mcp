/**
 * Configuration management for Vikunja MCP Server
 * Loads and validates environment variables
 */

import { z } from 'zod';

/**
 * Environment variable schema
 */
const ConfigSchema = z.object({
  apiUrl: z.string().url().describe('Vikunja API URL (must include /api/v1 path)'),
  apiToken: z.string().min(1).describe('Vikunja API token'),
  verifySsl: z.boolean().default(true).describe('Verify SSL certificates'),
  // Safety controls for dangerous operations
  enableProjectDelete: z.boolean().default(false).describe('Enable permanent project deletion'),
  enableLabelDelete: z.boolean().default(false).describe('Enable permanent label deletion'),
  enableTaskDelete: z.boolean().default(false).describe('Enable permanent task deletion'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
function loadConfig(): Config {
  try {
    const config = ConfigSchema.parse({
      apiUrl: process.env.VIKUNJA_URL,
      apiToken: process.env.VIKUNJA_API_TOKEN,
      verifySsl: process.env.VERIFY_SSL !== 'false', // Default to true unless explicitly set to false
      enableProjectDelete: process.env.ENABLE_PROJECT_DELETE === 'true', // Default to false (safe)
      enableLabelDelete: process.env.ENABLE_LABEL_DELETE === 'true', // Default to false (safe)
      enableTaskDelete: process.env.ENABLE_TASK_DELETE === 'true', // Default to false (safe)
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((issue) => issue.path.map(String).join('.'))
        .join(', ');
      throw new Error(
        `Configuration error: Missing or invalid environment variables: ${missingVars}\n` +
        'Please set VIKUNJA_URL and VIKUNJA_API_TOKEN environment variables.\n' +
        'See .env.example for reference.'
      );
    }
    throw error;
  }
}

/**
 * Global configuration instance
 */
export const config = loadConfig();
