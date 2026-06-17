import type { RequestEventBase } from "@builder.io/qwik-city";
import { tursoClient } from "./turso";
import fs from 'fs';
import path from 'path';

/**
 * Runs the authentication schema SQL script to initialize the database tables
 * @param requestEvent The Qwik City request event
 */
export async function initAuthDatabase(requestEvent: RequestEventBase): Promise<{ success: boolean, message: string }> {
  console.log('[DB-INIT] Starting database initialization');
  const client = tursoClient(requestEvent);

  try {    // Use a hardcoded schema to avoid file system issues
    console.log('[DB-INIT] Using hardcoded auth schema');

    // Define the auth schema directly in the code
    const schemaSql = `
      -- Users Table for Authentication
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          type TEXT DEFAULT 'normal' CHECK (type IN ('admin', 'coordinator', 'normal')),
          name TEXT,
          session_expires TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Password reset tokens
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
      CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);

      -- Chat History Table
      CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), -- Who sent the message
          content TEXT NOT NULL, -- The message text
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Link to users table
      );

      -- Index for faster history retrieval per user
      CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
      
      -- Text Chat Messages Table (for chat without avatar)
      CREATE TABLE IF NOT EXISTS text_chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')), -- Who sent the message
          content TEXT NOT NULL, -- The message text
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Link to users table
      );

      -- Index for faster text chat history retrieval per user
      CREATE INDEX IF NOT EXISTS idx_text_chat_messages_user_id ON text_chat_messages(user_id);

      -- Placement test attempts
      CREATE TABLE IF NOT EXISTS placement_test_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          full_name TEXT,
          email TEXT,
          phone TEXT,
          country TEXT,
          date_of_birth TEXT,
          address TEXT,
          answers_json TEXT NOT NULL,
          auto_score INTEGER NOT NULL DEFAULT 0,
          max_auto_score INTEGER NOT NULL DEFAULT 0,
          level TEXT,
          status TEXT NOT NULL DEFAULT 'submitted',
          feedback_summary TEXT,
          source TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_placement_attempts_user ON placement_test_attempts(user_id);
    `;

    // Split the SQL into separate statements and execute them
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`[DB-INIT] Executing ${statements.length} SQL statements`);

    for (const stmt of statements) {
      await client.execute(stmt);
    }

    // Verify the tables were created
    // Verify both tables were created
    const tablesResult = await client.batch([
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
      "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_history'"
    ], 'read');

    // Check if both results have rows indicating the tables exist
    if (tablesResult[0].rows.length === 0 || tablesResult[1].rows.length === 0) {
      console.error('[DB-INIT] Verification failed: users or chat_history table not found.');
      return {
        success: false,
        message: 'Required tables (users, chat_history) were not created successfully'
      };
    }

    console.log('[DB-INIT] Database initialized successfully');
    return {
      success: true,
      message: 'Authentication database initialized successfully'
    };
  } catch (error) {
    console.error('[DB-INIT] Error initializing database:', error);
    return {
      success: false,
      message: `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check if the database connection is working properly
 * @param requestEvent The Qwik City request event
 */
export async function checkDatabaseConnection(requestEvent: RequestEventBase): Promise<{ connected: boolean, message: string }> {
  console.log('[DB-CHECK] Checking database connection');
  const client = tursoClient(requestEvent);

  try {
    // Simple query to test the connection
    const result = await client.execute('SELECT 1 as test');

    if (result.rows && result.rows.length > 0) {
      console.log('[DB-CHECK] Database connection successful');
      return {
        connected: true,
        message: 'Database connection successful'
      };
    } else {
      console.error('[DB-CHECK] Database connection failed: No rows returned');
      return {
        connected: false,
        message: 'Database connection test failed: No rows returned'
      };
    }
  } catch (error) {
    console.error('[DB-CHECK] Database connection error:', error);
    return {
      connected: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Helper function to create a test user for development purposes
 * @param requestEvent The Qwik City request event
 */
export async function createTestUser(requestEvent: RequestEventBase): Promise<{ success: boolean, message: string }> {
  console.log('[DB-TEST] Creating test user for development');
  const client = tursoClient(requestEvent);

  try {
    // Check if test user already exists
    const checkResult = await client.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['test@example.com']
    });

    if (checkResult.rows.length > 0) {
      console.log('[DB-TEST] Test user already exists');
      return { success: true, message: 'Test user already exists' };
    }

    // Import hashPassword function
    const { hashPassword } = await import('./auth');

    // Hash a simple password
    const passwordHash = await hashPassword('password123');

    // Create the test user
    await client.execute({
      sql: 'INSERT INTO users (email, password_hash, type, name) VALUES (?, ?, ?, ?)',
      args: ['test@example.com', passwordHash, 'admin', 'Test User']
    });

    console.log('[DB-TEST] Test user created successfully');
    return { success: true, message: 'Test user created successfully' };
  } catch (error) {
    console.error('[DB-TEST] Error creating test user:', error);
    return {
      success: false,
      message: `Failed to create test user: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
