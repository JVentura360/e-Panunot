<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_assignments', function (Blueprint $table): void {
            $table->unsignedInteger('completion_revision')->default(0);
        });
        Schema::table('personal_todos', function (Blueprint $table): void {
            $table->unsignedInteger('revision')->default(0);
            $table->uuid('client_id')->nullable();
            $table->unique(['user_id', 'client_id']);
        });
        Schema::create('offline_operations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('operation_id');
            $table->string('payload_hash', 64);
            $table->uuid('client_id')->nullable();
            $table->json('result');
            $table->timestamps();
            $table->unique(['user_id', 'operation_id']);
            $table->index(['user_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offline_operations');
        Schema::table('personal_todos', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'client_id']);
            $table->dropColumn(['revision', 'client_id']);
        });
        Schema::table('task_assignments', function (Blueprint $table): void {
            $table->dropColumn('completion_revision');
        });
    }
};
