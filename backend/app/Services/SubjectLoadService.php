<?php

namespace App\Services;

use App\Http\Resources\BlockResource;
use App\Models\Subject;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SubjectLoadService
{
    public function normalizeSubjects(array $subjects): array
    {
        Validator::make(['subjects' => $subjects], [
            'subjects' => ['required', 'array', 'min:1', 'max:60'],
            'subjects.*.code' => ['required', 'string', 'max:20'],
            'subjects.*.name' => ['required', 'string', 'max:255'],
        ])->validate();
        $rows = [];
        $codes = [];
        foreach ($subjects as $index => $subject) {
            $code = mb_strtoupper(preg_replace('/\s+/u', ' ', trim($subject['code'])));
            $name = preg_replace('/\s+/u', ' ', trim($subject['name']));
            if ($code === '' || $name === '' || isset($codes[$code])) {
                throw ValidationException::withMessages(["subjects.$index.code" => 'Enter a complete subject with a unique code.']);
            }
            $words = explode(' ', mb_convert_case($name, MB_CASE_TITLE, 'UTF-8'));
            foreach ($words as $position => &$word) {
                if ($position > 0 && in_array(mb_strtolower($word), ['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'], true)) {
                    $word = mb_strtolower($word);
                }
            }
            unset($word);
            $rows[] = ['code' => $code, 'name' => implode(' ', $words)];
            $codes[$code] = true;
        }

        return $rows;
    }

    public function find(int $termId, string $program, int $yearLevel): ?object
    {
        $load = DB::table('subject_loads')->where('term_id', $termId)->where('program', mb_strtoupper(trim($program)))
            ->where('year_level', $yearLevel)->first();
        if ($load) {
            $load->subjects = DB::table('subjects as s')->join('subject_load_subject as ls', 'ls.subject_id', '=', 's.id')
                ->where('ls.subject_load_id', $load->id)->orderBy('s.code')->get(['s.id', 's.code', 's.name'])->all();
        }

        return $load;
    }

    public function snapshot(int $termId, string $program, int $yearLevel): array
    {
        $term = DB::table('terms')->where('id', $termId)->first();
        abort_unless($term, 404, 'School term not found.');
        $blocks = $this->blocks($termId, $program, $yearLevel)->orderBy('block_number')->get();
        $existing = DB::table('subjects as s')->join('block_subjects as bs', 'bs.subject_id', '=', 's.id')
            ->whereIn('bs.block_id', $blocks->pluck('id'))->distinct()->orderBy('s.code')->get(['s.id', 's.code', 's.name']);

        return ['term' => $term, 'load' => $this->find($termId, $program, $yearLevel),
            'blocks' => $blocks->map(fn (object $block): array => ['id' => $block->id,
                'code' => BlockResource::makeCode($block->year_level, $term->semester, $block->program, $block->block_number)])->all(),
            'existing_subjects' => $existing->all()];
    }

    public function publish(int $termId, string $program, int $yearLevel, int $expectedRevision, array $subjects, int $adminId): object
    {
        $rows = $this->normalizeSubjects($subjects);

        return DB::transaction(function () use ($termId, $program, $yearLevel, $expectedRevision, $rows, $adminId): object {
            $term = DB::table('terms')->where('id', $termId)->lockForUpdate()->first();
            abort_unless($term && $term->is_active, 422, 'This term is no longer active. Reload before saving.');
            abort_unless(DB::table('users')->where('id', $adminId)->where('role', 'admin')->exists(), 403, 'Only admins can change subject loads.');
            $program = mb_strtoupper(trim($program));
            $load = $this->find($termId, $program, $yearLevel);
            abort_if(($load?->revision ?? 0) !== $expectedRevision, 409, 'The subject load changed. Reload and review the latest revision before saving.');
            $ids = [];
            foreach ($rows as $index => $row) {
                $subject = Subject::whereRaw('UPPER(code) = ?', [$row['code']])->lockForUpdate()->first()
                    ?? Subject::createOrFirst(['code' => $row['code']], ['name' => $row['name']]);
                if (mb_strtolower($subject->name) !== mb_strtolower($row['name'])) {
                    throw ValidationException::withMessages(["subjects.$index.code" => "{$row['code']} already belongs to {$subject->name}. Use its complete name or check the code."]);
                }
                $ids[] = $subject->id;
            }
            $blocks = $this->blocks($termId, $program, $yearLevel)->lockForUpdate()->pluck('id')->all();
            $previousSubjects = DB::table('block_subjects')->whereIn('block_id', $blocks)->get()->groupBy('block_id')
                ->map(fn ($rows): array => $rows->pluck('subject_id')->all())->all();
            $this->syncBlocks($blocks, $ids);
            if ($load) {
                $id = $load->id;
                DB::table('subject_loads')->where('id', $id)->update(['revision' => $load->revision + 1, 'updated_by' => $adminId, 'updated_at' => now()]);
            } else {
                $id = DB::table('subject_loads')->insertGetId(['term_id' => $termId, 'program' => $program, 'year_level' => $yearLevel,
                    'revision' => 1, 'updated_by' => $adminId, 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('subject_load_subject')->where('subject_load_id', $id)->delete();
            DB::table('subject_load_subject')->insert(array_map(fn (int $subjectId): array => ['subject_load_id' => $id, 'subject_id' => $subjectId], $ids));
            app(StudentEnrollmentService::class)->syncRegularMembers($blocks, $previousSubjects);

            return $this->find($termId, $program, $yearLevel);
        }, 3);
    }

    public function assignToBlock(int $loadId, int $blockId): void
    {
        $load = DB::table('subject_loads')->where('id', $loadId)->first();
        $block = DB::table('blocks')->where('id', $blockId)->first();
        abort_unless($load && $block && (int) $load->term_id === (int) $block->term_id
            && $load->program === mb_strtoupper($block->program) && (int) $load->year_level === (int) $block->year_level,
            422, 'The subject load does not match this block.');
        $ids = DB::table('subject_load_subject')->where('subject_load_id', $loadId)->pluck('subject_id')->all();
        $this->syncBlocks([$blockId], $ids);
    }

    private function blocks(int $termId, string $program, int $yearLevel): Builder
    {
        return DB::table('blocks')->where('term_id', $termId)->whereRaw('UPPER(program) = ?', [mb_strtoupper(trim($program))])->where('year_level', $yearLevel);
    }

    private function syncBlocks(array $blocks, array $subjects): void
    {
        $enrolled = DB::table('subject_enrollments as e')->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->whereIn('e.block_id', $blocks)->whereNotIn('e.subject_id', $subjects)->value('s.code');
        if ($enrolled) {
            throw ValidationException::withMessages(['subjects' => "$enrolled has enrolled students in an affected block and cannot be removed."]);
        }
        DB::table('block_subjects')->whereIn('block_id', $blocks)->whereNotIn('subject_id', $subjects)->delete();
        foreach ($blocks as $blockId) {
            DB::table('block_subjects')->insertOrIgnore(array_map(fn (int $subjectId): array => ['block_id' => $blockId, 'subject_id' => $subjectId], $subjects));
        }
    }
}
