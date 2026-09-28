#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0e7a5e84d22a13cfbed484c85a341ebd03a17be28821c4236e85e5d21e592a0c/contract';
import startContract from '../../snapshots/0e7a5e84d22a13cfbed484c85a341ebd03a17be28821c4236e85e5d21e592a0c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/3e3cdb3dee67ebc197329b38552e59bfc1d17e808c5a67c5b97e4452d98b3494/contract';
import endContract from '../../snapshots/3e3cdb3dee67ebc197329b38552e59bfc1d17e808c5a67c5b97e4452d98b3494/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('checkInCodeHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Booking',
        column: col('checkedInAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_startTime_key',
        columns: ['startTime'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
