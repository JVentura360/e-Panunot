<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Skip if you already added this column by running the old SQL patch.
        if (Schema::hasColumn('blocks', 'google_calendar_id')) {
            return;
        }

        Schema::table('blocks', function (Blueprint $table) {
            $table->string('google_calendar_id')->nullable()->after('mayor_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('blocks', 'google_calendar_id')) {
            Schema::table('blocks', function (Blueprint $table) {
                $table->dropColumn('google_calendar_id');
            });
        }
    }
};
