<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_todos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_done')->default(false);
            $table->string('google_task_id')->nullable(); // only used if you add Google Tasks sync later
            $table->timestamps();

            $table->index(['user_id', 'is_done']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_todos');
    }
};
