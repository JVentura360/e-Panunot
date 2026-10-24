<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('term_id')->constrained()->cascadeOnDelete();
            $table->string('program', 20);
            $table->unsignedTinyInteger('year_level');
            $table->unsignedTinyInteger('block_number');
            $table->unsignedBigInteger('mayor_id')->nullable();
            $table->timestamps();

            $table->unique(['term_id', 'program', 'year_level', block_number]);
            $table->unique(['term_id', 'mayor_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blocks');
    }
};
