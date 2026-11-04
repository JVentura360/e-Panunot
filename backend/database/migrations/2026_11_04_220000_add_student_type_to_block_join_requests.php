<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('block_join_requests', function (Blueprint $table): void {
            $table->string('student_type', 16)->nullable();
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('block_join_requests', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'status']);
            $table->dropColumn('student_type');
        });
    }
};
