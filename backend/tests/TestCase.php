<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Establish an approved membership for tests whose subject is enrollment after joining. */
    protected function joinApprovedBlock(int $blockId, string $studentType): \Illuminate\Testing\TestResponse
    {
        $student = \Illuminate\Support\Facades\Auth::user();
        $requestId = $this->postJson('/api/blocks/'.$blockId.'/join', ['student_type' => $studentType])
            ->assertOk()->json('data.pending_join_request.id');
        $mayorId = \Illuminate\Support\Facades\DB::table('blocks')->where('id', $blockId)->value('mayor_id');
        $response = $this->actingAs(\App\Models\User::findOrFail($mayorId))
            ->postJson('/api/blocks/'.$blockId.'/join-requests/'.$requestId.'/approve')->assertOk();
        $this->actingAs($student->fresh());
        return $response;
    }
}
