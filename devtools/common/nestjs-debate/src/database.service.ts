import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Database = require('better-sqlite3');
import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEFAULT_DB_DIR = join(homedir(), '.aweave', 'db');
const DEFAULT_DB_NAME = 'debate.db';

/** Format JS Date to SQLite datetime string (UTC, matches datetime('now')) */
function formatDatetime(): string {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '');
}

// ---------------------------------------------------------------------------
// Raw DB row types (snake_case — as returned by better-sqlite3)
// ---------------------------------------------------------------------------

interface DbDebateRow {
  id: string;
  title: string;
  debate_type: string;
  state: string;
  created_at: string;
  updated_at: string;
}

interface DbArgumentRow {
  id: string;
  debate_id: string;
  parent_id: string | null;
  type: string;
  role: string;
  content: string;
  client_request_id: string | null;
  seq: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Domain types (camelCase — used by services and serializers)
// ---------------------------------------------------------------------------

export interface Debate {
  id: string;
  title: string;
  debateType: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface Argument {
  id: string;
  debateId: string;
  parentId: string | null;
  type: string;
  role: string;
  content: string;
  clientRequestId: string | null;
  seq: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Row → Domain mappers
// ---------------------------------------------------------------------------

function mapDebateRow(row: DbDebateRow): Debate {
  return {
    id: row.id,
    title: row.title,
    debateType: row.debate_type,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArgumentRow(row: DbArgumentRow): Argument {
  return {
    id: row.id,
    debateId: row.debate_id,
    parentId: row.parent_id,
    type: row.type,
    role: row.role,
    content: row.content,
    clientRequestId: row.client_request_id,
    seq: row.seq,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// DatabaseService
// ---------------------------------------------------------------------------

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly db: Database.Database;
  private stmts!: ReturnType<typeof this.prepareStatements>;

  constructor() {
    const dbDir = process.env.DEBATE_DB_DIR || DEFAULT_DB_DIR;
    const dbName = process.env.DEBATE_DB_NAME || DEFAULT_DB_NAME;
    mkdirSync(dbDir, { recursive: true });
    const dbPath = join(dbDir, dbName);

    this.db = new Database(dbPath);
    this.logger.log(`Database path: ${dbPath}`);
  }

  onModuleInit() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
    this.runMigrations();
    this.stmts = this.prepareStatements();
    this.logger.log('Connected to debate database');
  }

  onModuleDestroy() {
    this.db.close();
  }

  // -------------------------------------------------------------------------
  // Schema & Migrations
  // -------------------------------------------------------------------------

  /**
   * Create tables and indexes if they don't exist.
   * Schema matches prisma/migrations/20260207053250_init/migration.sql exactly —
   * including FK constraint names, ON DELETE/UPDATE actions, and all indexes.
   * Existing DB files remain fully compatible.
   */
  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "debates" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "debate_type" TEXT NOT NULL,
        "state" TEXT NOT NULL DEFAULT 'AWAITING_OPPONENT',
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS "arguments" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "debate_id" TEXT NOT NULL,
        "parent_id" TEXT,
        "type" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "client_request_id" TEXT,
        "seq" INTEGER NOT NULL,
        "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "arguments_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "arguments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "arguments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "arguments_debate_id_idx" ON "arguments"("debate_id");
      CREATE INDEX IF NOT EXISTS "arguments_parent_id_idx" ON "arguments"("parent_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "arguments_debate_id_client_request_id_key"
        ON "arguments"("debate_id", "client_request_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "arguments_debate_id_seq_key"
        ON "arguments"("debate_id", "seq");
    `);
  }

  /**
   * Startup migration runner using user_version pragma.
   * initSchema() handles fresh DBs; runMigrations() handles ALTER TABLE
   * for existing DBs at a lower version.
   */
  private runMigrations() {
    const currentVersion = this.db.pragma('user_version', {
      simple: true,
    }) as number;

    const migrations: Array<{ version: number; sql: string }> = [
      // Future migrations go here, e.g.:
      // { version: 1, sql: 'ALTER TABLE debates ADD COLUMN "closed_at" TEXT;' },
    ];

    for (const m of migrations) {
      if (currentVersion < m.version) {
        this.db.exec(m.sql);
        this.db.pragma(`user_version = ${m.version}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Prepared Statements
  // -------------------------------------------------------------------------

  private prepareStatements() {
    return {
      // --- Debates ---
      findDebateById: this.db.prepare<[string], DbDebateRow>(
        'SELECT * FROM debates WHERE id = ?',
      ),
      findDebatesAll: this.db.prepare<[number, number], DbDebateRow>(
        'SELECT * FROM debates ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      ),
      findDebatesByState: this.db.prepare<
        [string, number, number],
        DbDebateRow
      >(
        'SELECT * FROM debates WHERE state = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      ),
      countDebatesAll: this.db.prepare<[], { count: number }>(
        'SELECT COUNT(*) as count FROM debates',
      ),
      countDebatesByState: this.db.prepare<[string], { count: number }>(
        'SELECT COUNT(*) as count FROM debates WHERE state = ?',
      ),
      insertDebate: this.db.prepare(
        'INSERT INTO debates (id, title, debate_type, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ),
      updateDebateState: this.db.prepare(
        'UPDATE debates SET state = ?, updated_at = ? WHERE id = ?',
      ),
      deleteDebateById: this.db.prepare('DELETE FROM debates WHERE id = ?'),

      // --- Arguments ---
      findArgumentById: this.db.prepare<[string], DbArgumentRow>(
        'SELECT * FROM arguments WHERE id = ?',
      ),
      findMotionByDebateId: this.db.prepare<[string], DbArgumentRow>(
        "SELECT * FROM arguments WHERE debate_id = ? AND type = 'MOTION' LIMIT 1",
      ),
      findArgumentByDebateAndRequestId: this.db.prepare<
        [string, string],
        DbArgumentRow
      >(
        'SELECT * FROM arguments WHERE debate_id = ? AND client_request_id = ? LIMIT 1',
      ),
      findArgumentsExcludeMotionAsc: this.db.prepare<
        [string, number],
        DbArgumentRow
      >(
        "SELECT * FROM arguments WHERE debate_id = ? AND type != 'MOTION' ORDER BY seq ASC LIMIT ?",
      ),
      findArgumentsExcludeMotionDesc: this.db.prepare<
        [string, number],
        DbArgumentRow
      >(
        "SELECT * FROM arguments WHERE debate_id = ? AND type != 'MOTION' ORDER BY seq DESC LIMIT ?",
      ),
      findLatestArgumentAfterSeq: this.db.prepare<
        [string, number],
        DbArgumentRow
      >(
        'SELECT * FROM arguments WHERE debate_id = ? AND seq > ? ORDER BY seq DESC LIMIT 1',
      ),
      getMaxSeq: this.db.prepare<[string], { max_seq: number | null }>(
        'SELECT MAX(seq) as max_seq FROM arguments WHERE debate_id = ?',
      ),
      insertArgument: this.db.prepare(
        'INSERT INTO arguments (id, debate_id, parent_id, type, role, content, client_request_id, seq, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ),
      deleteArgumentsByDebateId: this.db.prepare(
        'DELETE FROM arguments WHERE debate_id = ?',
      ),
    };
  }

  // -------------------------------------------------------------------------
  // Public: Debates
  // -------------------------------------------------------------------------

  findDebateById(id: string): Debate | undefined {
    const row = this.stmts.findDebateById.get(id);
    return row ? mapDebateRow(row) : undefined;
  }

  findDebates(
    state: string | undefined,
    limit: number,
    offset: number,
  ): Debate[] {
    const rows = state
      ? this.stmts.findDebatesByState.all(state, limit, offset)
      : this.stmts.findDebatesAll.all(limit, offset);
    return rows.map(mapDebateRow);
  }

  countDebates(state?: string): number {
    const result = state
      ? this.stmts.countDebatesByState.get(state)
      : this.stmts.countDebatesAll.get();
    return result?.count ?? 0;
  }

  insertDebate(data: {
    id: string;
    title: string;
    debateType: string;
    state: string;
  }): Debate {
    const now = formatDatetime();
    this.stmts.insertDebate.run(
      data.id,
      data.title,
      data.debateType,
      data.state,
      now,
      now,
    );
    return {
      id: data.id,
      title: data.title,
      debateType: data.debateType,
      state: data.state,
      createdAt: now,
      updatedAt: now,
    };
  }

  updateDebateState(id: string, state: string): Debate {
    const updatedAt = formatDatetime();
    this.stmts.updateDebateState.run(state, updatedAt, id);
    const row = this.stmts.findDebateById.get(id);
    if (!row) throw new Error(`Debate ${id} not found after update`);
    return mapDebateRow(row);
  }

  deleteDebateById(id: string): void {
    this.stmts.deleteDebateById.run(id);
  }

  // -------------------------------------------------------------------------
  // Public: Arguments
  // -------------------------------------------------------------------------

  findArgumentById(id: string): Argument | undefined {
    const row = this.stmts.findArgumentById.get(id);
    return row ? mapArgumentRow(row) : undefined;
  }

  findMotionByDebateId(debateId: string): Argument | undefined {
    const row = this.stmts.findMotionByDebateId.get(debateId);
    return row ? mapArgumentRow(row) : undefined;
  }

  findArgumentByDebateAndRequestId(
    debateId: string,
    clientRequestId: string,
  ): Argument | undefined {
    const row = this.stmts.findArgumentByDebateAndRequestId.get(
      debateId,
      clientRequestId,
    );
    return row ? mapArgumentRow(row) : undefined;
  }

  findArgumentsExcludeMotionAsc(
    debateId: string,
    limit: number,
  ): Argument[] {
    return this.stmts.findArgumentsExcludeMotionAsc
      .all(debateId, limit)
      .map(mapArgumentRow);
  }

  findArgumentsExcludeMotionDesc(
    debateId: string,
    limit: number,
  ): Argument[] {
    return this.stmts.findArgumentsExcludeMotionDesc
      .all(debateId, limit)
      .map(mapArgumentRow);
  }

  findLatestArgumentAfterSeq(
    debateId: string,
    seq: number,
  ): Argument | undefined {
    const row = this.stmts.findLatestArgumentAfterSeq.get(debateId, seq);
    return row ? mapArgumentRow(row) : undefined;
  }

  getMaxSeq(debateId: string): number {
    const result = this.stmts.getMaxSeq.get(debateId);
    return result?.max_seq ?? 0;
  }

  insertArgument(data: {
    id: string;
    debateId: string;
    parentId: string | null;
    type: string;
    role: string;
    content: string;
    clientRequestId: string | null;
    seq: number;
  }): Argument {
    const now = formatDatetime();
    this.stmts.insertArgument.run(
      data.id,
      data.debateId,
      data.parentId,
      data.type,
      data.role,
      data.content,
      data.clientRequestId,
      data.seq,
      now,
    );
    return { ...data, createdAt: now };
  }

  deleteArgumentsByDebateId(debateId: string): void {
    this.stmts.deleteArgumentsByDebateId.run(debateId);
  }

  // -------------------------------------------------------------------------
  // Public: Transaction
  // -------------------------------------------------------------------------

  /**
   * Run `fn` inside a SQLite transaction (BEGIN/COMMIT/ROLLBACK).
   * All DatabaseService calls within `fn` are part of the same transaction.
   * The function is synchronous — better-sqlite3 transactions are sync.
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
