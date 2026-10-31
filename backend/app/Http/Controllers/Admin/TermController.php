<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TermController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => Term::where('is_active', true)->first()]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_year' => ['required', 'regex:/^\d{4}-\d{4}$/'],
            'semester' => ['required', 'integer', 'between:1,3'],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after:starts_on'],
            'previous_term_id' => ['present', 'nullable', 'integer'],
        ]);
        [$startYear, $endYear] = array_map('intval', explode('-', $data['school_year']));
        if ($endYear !== $startYear + 1 || $startYear < 2000 || $endYear > 9999) {
            throw ValidationException::withMessages(['school_year' => 'Use consecutive years, such as 2026-2027.']);
        }
        if ($data['starts_on'] < $startYear.'-01-01' || $data['ends_on'] > $endYear.'-12-31') {
            throw ValidationException::withMessages(['ends_on' => 'Term dates must fall within the selected school year.']);
        }

        $term = DB::transaction(function () use ($data): Term {
            $terms = Term::orderBy('id')->lockForUpdate()->get();
            $current = $terms->firstWhere('is_active', true);
            abort_if($current?->id !== $data['previous_term_id'], 409, 'The active term changed. Reload the settings before saving.');
            $target = $terms->first(fn (Term $term): bool => $term->school_year === $data['school_year']
                && $term->semester === (int) $data['semester']);
            if ($target && $target->id !== $current?->id) {
                throw ValidationException::withMessages(['school_year' => 'This term already exists in history. Choose a new term.']);
            }

            if (! $current || $current->school_year !== $data['school_year'] || $current->semester !== (int) $data['semester']) {
                $oldBlocks = DB::table('blocks')->whereIn('term_id', $terms->pluck('id'))->pluck('id');
                DB::table('users')->whereIn('block_id', $oldBlocks)->where('role', 'mayor')->update(['role' => 'student', 'updated_at' => now()]);
                DB::table('users')->whereIn('block_id', $oldBlocks)->update(['block_id' => null, 'updated_at' => now()]);
                Term::where('is_active', true)->update(['is_active' => false]);
                $target = new Term;
            }

            $target->fill(collect($data)->except('previous_term_id')->all());
            $target->forceFill(['is_active' => true])->save();

            return $target;
        });

        return response()->json(['data' => $term]);
    }
}
