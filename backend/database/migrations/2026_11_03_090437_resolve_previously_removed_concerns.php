<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('concerns')->whereNotNull('student_removed_at')->where('status', 'closed')
            ->update(['status' => 'resolved', 'updated_at' => now()]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Preserve corrected statuses; reverting them could overwrite later resolutions.
    }
};
