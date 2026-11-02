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
        Schema::create('student_term_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('term_id')->constrained()->cascadeOnDelete();
            $table->enum('student_type', ['regular', 'irregular']);
            $table->foreignId('regular_block_id')->nullable()->constrained('blocks')->nullOnDelete();
            $table->unique(['user_id', 'term_id']);
            $table->timestamps();
        });
        Schema::table('mayor_applications', function (Blueprint $table) {
            $table->boolean('is_regular_student')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mayor_applications', function (Blueprint $table) {
            $table->dropColumn('is_regular_student');
        });
        Schema::dropIfExists('student_term_profiles');
    }
};
