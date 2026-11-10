<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_todos', function (Blueprint $table): void {
            $table->timestamp('last_reminded_at')->nullable();
            $table->unsignedTinyInteger('reminders_sent')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('personal_todos', function (Blueprint $table): void {
            $table->dropColumn(['last_reminded_at', 'reminders_sent']);
        });
    }
};
