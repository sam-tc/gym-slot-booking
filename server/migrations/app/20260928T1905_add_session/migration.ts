#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/36acb62ad0a4357af8aeb885ea986dbdd03d3eb19668f23c81907425e67d7c99/contract';
import endContract from '../../snapshots/36acb62ad0a4357af8aeb885ea986dbdd03d3eb19668f23c81907425e67d7c99/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7017db5c285d4aacc22d9c5cf5a985644d4595d7f78a5f42e956e8c2e7513c99/contract';
import startContract from '../../snapshots/7017db5c285d4aacc22d9c5cf5a985644d4595d7f78a5f42e956e8c2e7513c99/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('capacity', 'int4', {
            notNull: true,
            default: lit(20),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('startTime', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
