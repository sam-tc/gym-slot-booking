#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/36acb62ad0a4357af8aeb885ea986dbdd03d3eb19668f23c81907425e67d7c99/contract';
import startContract from '../../snapshots/36acb62ad0a4357af8aeb885ea986dbdd03d3eb19668f23c81907425e67d7c99/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/54ca3c26121d17560543fb41f4f0825127021e0176128d293595c75338f32d35/contract';
import endContract from '../../snapshots/54ca3c26121d17560543fb41f4f0825127021e0176128d293595c75338f32d35/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Booking',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('sessionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('BOOKED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Booking_status_check_7e9348de', "\"status\" IN ('BOOKED', 'CANCELLED')"),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Booking',
        index: 'Booking_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Booking',
        foreignKey: {
          name: 'Booking_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'Session', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
