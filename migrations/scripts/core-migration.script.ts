import { sql } from 'bun';
import { getListFiles } from '../core/helpers/migration.helper';

export const runCoreMigration = async (): Promise<void> => {
  // Create migration for core/sql
  try {
    console.log('Start run migration for core/sql');
    // Get list file in core/sql
    const coreSqlFiles = await getListFiles('core/sql');

    for (const coreSqlFile of coreSqlFiles) {
      console.log('-> Run query for ', coreSqlFile);

      // Read and run for migration core/sql
      await sql.file(coreSqlFile.fullPath);
    }
  } catch (err) {
    console.error('Failed run migration core/sql:', err);
  } finally {
    console.log('Finish run migration for core/sql');
  }
}

