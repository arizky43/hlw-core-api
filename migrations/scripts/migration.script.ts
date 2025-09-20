import { sql } from 'bun';
import { format } from 'date-fns';
import { getListFiles } from '../core/helpers/migration.helper';
import { IMigration } from '../core/interfaces/migration.interface';

export const runMigration = async (): Promise<void> => {
  // Create migration
  try {
    console.log('Start run migration sql');
  
    // Get list file in sql
    const sqlFiles = await getListFiles('sql');
  
    const getMigrations: IMigration[] = await sql`
      SELECT id, created_at
      FROM hlw_migrations
      WHERE id IN ${sql(sqlFiles.map((item) => item.fileName))}
    `;
  
    for (const sqlFile of sqlFiles) {
      const migrationData = getMigrations.find((item) => item.id === sqlFile.fileName);
      console.log(migrationData);
  
      if (migrationData) {
        continue;
      }
  
      await sql.file(sqlFile.fullPath);
  
      const createMigration = {
        id: sqlFile.fileName,
        created_at: format(new Date(), `yyyy-MM-dd'T'HH:mm:ss'Z'`),
      };
  
      await sql`INSERT INTO hlw_migrations ${sql(createMigration, "id", "created_at")}`;
    }
  
  } catch (err) {
    console.log('Failed run migration sql:', err);
  } finally {
    console.log('Finish run migration sql');
  }
};
