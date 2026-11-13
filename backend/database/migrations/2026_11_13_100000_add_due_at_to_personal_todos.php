<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_todos', function (Blueprint $table): void {
            $table->dateTime('due_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('personal_todos', function (Blueprint $table): void {
            $table->dropColumn('due_at');
        });
    }
};
