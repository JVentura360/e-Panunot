<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use App\Services\StudentEnrollmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ClientSyncTest extends TestCase
{
    use RefreshDatabase;

    private function version(User $user): array
    {
        return $this->actingAs($user->fresh())->getJson('/api/sync')->assertOk()->json('data');
    }

    public function test_sync_requires_authentication(): void
    {
        $this->getJson('/api/sync')->assertUnauthorized();
    }

    public function test_profile_name_is_persisted_for_other_devices_without_changing_account_permissions(): void
    {
        Cache::flush();
        $user = User::factory()->create();
        $other = User::factory()->create();
        $before = $this->version($user);
        $unrelated = $this->version($other);
        $this->actingAs($user)->patchJson('/api/me', ['name' => 'Updated Student', 'role' => 'admin', 'email' => 'other@example.com'])
            ->assertOk()->assertJsonPath('data.name', 'Updated Student')->assertJsonPath('data.role', 'student');
        $this->actingAs($user->fresh())->getJson('/api/me')->assertJsonPath('data.name', 'Updated Student');
        $this->assertSame($user->email, $user->fresh()->email);
        $this->assertNotSame($before['access'], $this->version($user)['access']);
        $this->assertSame($unrelated, $this->version($other));
        $this->actingAs($user)->patchJson('/api/me', ['name' => ''])->assertUnprocessable();
    }

    public function test_private_writes_refresh_only_the_owners_devices_and_failed_writes_do_not_signal_changes(): void
    {
        Cache::flush();
        $first = User::factory()->create();
        $second = User::factory()->create();
        $before = $this->version($first);
        $other = $this->version($second);
        $this->assertSame($before, $this->version($first));
        $this->actingAs($first)->postJson('/api/personal-todos', ['title' => 'Private task', 'due_date' => now()->addDay()->toDateString()])->assertCreated();
        $after = $this->version($first);
        $this->assertNotSame($before['personal'], $after['personal']);
        $this->assertSame($before['tasks'], $after['tasks']);
        $this->assertSame($other, $this->version($second));
        $this->actingAs($first)->postJson('/api/personal-todos', ['title' => ''])->assertUnprocessable();
        $this->assertSame($after, $this->version($first));
    }

    public function test_block_task_creation_deletion_and_membership_removal_reach_another_session(): void
    {
        Cache::flush();
        Queue::fake();
        config(['services.google.enabled' => false]);
        $term = Term::factory()->active()->create();
        $block = Block::factory()->create(['term_id' => $term->id]);
        $mayor = User::factory()->student($block)->create(['role' => 'mayor']);
        $block->update(['mayor_id' => $mayor->id]);
        $subject = Subject::create(['code' => 'SYNC301', 'name' => 'Shared Subject']);
        DB::table('block_subjects')->insert(['block_id' => $block->id, 'subject_id' => $subject->id]);
        app(StudentEnrollmentService::class)->enrollBlock($mayor->id, $block->id, 'regular');
        $student = User::factory()->create();
        $this->actingAs($student)->postJson('/api/blocks/'.$block->id.'/join', ['student_type' => 'regular'])->assertOk();
        $unrelated = User::factory()->create();
        $other = $this->version($unrelated);
        $before = $this->version($student);
        $id = $this->actingAs($mayor)->postJson('/api/tasks', ['title' => 'New shared task', 'subject_id' => $subject->id,
            'due_date' => now()->addDay()->toDateTimeString()])->assertCreated()->json('data.id');
        $created = $this->version($student);
        $this->assertNotSame($before['tasks'], $created['tasks']);
        $this->assertSame($other, $this->version($unrelated));
        $this->actingAs($mayor)->postJson('/api/announcements', ['title' => 'Subject notice', 'description' => 'Read this.', 'subject_id' => $subject->id])->assertCreated();
        $notice = $this->version($student);
        $this->assertNotSame($created['announcements'], $notice['announcements']);
        $this->assertSame($created['tasks'], $notice['tasks']);
        $this->actingAs($mayor)->postJson('/api/calendar-events', ['title' => 'Class event', 'scope' => 'block', 'subject_id' => $subject->id,
            'starts_at' => now()->addDay()->toIso8601String(), 'ends_at' => now()->addDay()->addHour()->toIso8601String()])->assertCreated();
        $this->assertNotSame($notice['calendar'], $this->version($student)['calendar']);
        $this->actingAs($student)->getJson('/api/tasks')->assertJsonPath('data.0.id', $id);
        $concernId = $this->postJson('/api/concerns', ['title' => 'Question', 'category' => 'schedule',
            'description' => 'Please clarify.', 'block_id' => $block->id, 'subject_id' => $subject->id])->assertCreated()->json('data.id');
        $this->postJson('/api/tasks/'.$id.'/complete')->assertOk();
        $completed = $this->version($student);
        $this->assertNotSame($created['tasks'], $completed['tasks']);
        $this->actingAs($mayor)->deleteJson('/api/tasks/'.$id)->assertNoContent();
        $deleted = $this->version($student);
        $this->assertNotSame($completed['tasks'], $deleted['tasks']);
        $this->actingAs($mayor)->deleteJson('/api/blocks/'.$block->id.'/members/'.$student->id)->assertOk();
        $this->assertNotSame($deleted['access'], $this->version($student)['access']);
        $this->actingAs($student->fresh())->getJson('/api/me')->assertJsonPath('data.block_id', null);
        $removed = $this->version($student);
        $this->actingAs($mayor)->postJson('/api/concerns/'.$concernId.'/messages', ['message_text' => 'Follow-up reply'])->assertUnprocessable();
        $this->assertSame($removed['concerns'], $this->version($student)['concerns']);
    }
}
