<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            // block_id NULL = personal event (only its creator sees it)
            // block_id set  = class event for that block (created by the mayor)
            $table->foreignId('block_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->dateTime('starts_at'); // stored in UTC
            $table->dateTime('ends_at');   // stored in UTC
            $table->string('google_event_id')->nullable();
            $table->timestamps();

            $table->index(['block_id', 'starts_at']);
            $table->index(['created_by', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};
