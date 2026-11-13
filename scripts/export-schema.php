<?php

/** Generate an empty MySQL schema from migrations, then verify its import in an isolated database. */
require __DIR__.'/../backend/vendor/autoload.php';
$app = require __DIR__.'/../backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$connection = config('database.default');
if ($connection !== 'mysql' || config('webpush.database_connection') !== 'mysql') {
    throw new RuntimeException('Schema export requires both application and Web Push connections to use MySQL.');
}
$admin = Illuminate\Support\Facades\DB::connection()->getPdo();
$temporary = 'epanunot_schema_export_'.bin2hex(random_bytes(6));
$created = false;
try {
    $admin->exec('CREATE DATABASE `'.$temporary.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $created = true;
    config(['database.connections.mysql.database' => $temporary]);
    Illuminate\Support\Facades\DB::purge('mysql');
    $result = Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    if ($result !== 0) {
        throw new RuntimeException(Illuminate\Support\Facades\Artisan::output());
    }
    $pdo = Illuminate\Support\Facades\DB::connection()->getPdo();
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    sort($tables);
    $statements = [];
    foreach ($tables as $table) {
        $name = '`'.str_replace('`', '``', $table).'`';
        $row = $pdo->query('SHOW CREATE TABLE '.$name)->fetch(PDO::FETCH_NUM);
        $statements[] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $row[1]).';';
    }
    $migrations = $pdo->query('SELECT migration, batch FROM migrations ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($migrations as $migration) {
        $statements[] = 'INSERT INTO `migrations` (`migration`, `batch`) VALUES ('.$pdo->quote($migration['migration']).', '.(int) $migration['batch'].');';
    }

    // Round-trip only the freshly created scratch schema; never drop application tables.
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach ($tables as $table) {
        $pdo->exec('DROP TABLE `'.str_replace('`', '``', $table).'`');
    }
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    $imported = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    sort($imported);
    if ($tables !== $imported || (int) $pdo->query('SELECT COUNT(*) FROM migrations')->fetchColumn() !== count($migrations)) {
        throw new RuntimeException('Schema round-trip verification failed.');
    }
    $output = __DIR__.'/../docs/database-schema.sql';
    $header = "-- ePanunot MySQL/MariaDB schema generated from Laravel migrations.\n"
        ."-- Import ONLY into an empty, already selected database. No application records or accounts.\n"
        ."-- Migration history rows are included so subsequent artisan migrate runs do not recreate tables.\n"
        ."-- Prefer artisan migrate for deployment; regenerate this reference after schema changes.\n"
        ."-- Generated ".(new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y-m-d').'; '.count($tables)." tables.\n\n"
        ."SET @EPANUNOT_OLD_FK_CHECKS = @@FOREIGN_KEY_CHECKS;\nSET FOREIGN_KEY_CHECKS=0;\n\n";
    if (file_put_contents($output, $header.implode("\n\n", $statements)."\n\nSET FOREIGN_KEY_CHECKS=@EPANUNOT_OLD_FK_CHECKS;\n") === false) {
        throw new RuntimeException('Could not write schema export.');
    }
    echo 'Exported and round-trip verified '.count($tables).' tables to docs/database-schema.sql'.PHP_EOL;
    echo implode(', ', $tables).PHP_EOL;
} finally {
    Illuminate\Support\Facades\DB::disconnect('mysql');
    if ($created) {
        $admin->exec('DROP DATABASE `'.$temporary.'`');
    }
}
