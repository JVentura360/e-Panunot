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
        Schema::create('subject_loads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('term_id')->constrained()->cascadeOnDelete();
            $table->string('program', 20);
            $table->unsignedTinyInteger('year_level');
            $table->unsignedInteger('revision')->default(1);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unique(['term_id', 'program', 'year_level']);
            $table->timestamps();
        });
        Schema::create('subject_load_subject', function (Blueprint $table) {
            $table->foreignId('subject_load_id')->constrained('subject_loads')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->restrictOnDelete();
            $table->primary(['subject_load_id', 'subject_id']);
        });
        Schema::table('mayor_applications', function (Blueprint $table) {
            $table->json('proposed_subjects')->nullable();
            $table->unsignedInteger('subject_load_revision')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mayor_applications', function (Blueprint $table) {
            $table->dropColumn(['proposed_subjects', 'subject_load_revision']);
        });
        Schema::dropIfExists('subject_load_subject');
        Schema::dropIfExists('subject_loads');
    }
};
