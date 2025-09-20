import { runCoreMigration } from './scripts/core-migration.script';
import { runMigration } from './scripts/migration.script';

try {
  console.log('Start run migration');

  await runCoreMigration();
  await runMigration();
} catch (err) {
  console.log('Failed run migration:', err);
} finally {
  console.log('Finish run migration');
}