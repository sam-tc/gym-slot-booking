#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0e7a5e84d22a13cfbed484c85a341ebd03a17be28821c4236e85e5d21e592a0c/contract';
import endContract from '../../snapshots/0e7a5e84d22a13cfbed484c85a341ebd03a17be28821c4236e85e5d21e592a0c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/54ca3c26121d17560543fb41f4f0825127021e0176128d293595c75338f32d35/contract';
import startContract from '../../snapshots/54ca3c26121d17560543fb41f4f0825127021e0176128d293595c75338f32d35/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Waitlist',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('sessionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Waitlist',
        constraint: 'Waitlist_userId_sessionId_key',
        columns: ['userId', 'sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Waitlist',
        index: 'Waitlist_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Waitlist',
        index: 'Waitlist_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Waitlist',
        foreignKey: {
          name: 'Waitlist_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Waitlist',
        foreignKey: {
          name: 'Waitlist_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'Session', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
