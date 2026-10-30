<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A block as sent to React. Works with an Eloquent Block (with `term` / `mayor`
 * loaded) and with the joined DB::table() rows from BlockController
 * (school_year, semester, term_is_active, mayor_name, member_count).
 */
class BlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $semester = $this->attr('semester', $this->attr('term.semester'));
        $schoolYear = $this->attr('school_year', $this->attr('term.school_year'));
        $termActive = $this->attr('term_is_active', $this->attr('term.is_active'));
        $mayorId = $this->attr('mayor_id');
        $memberCount = $this->attr('member_count', $this->attr('members_count'));
        $requestStatus = $this->attr('my_request_status');

        return [
            'id' => $this->id,
            'code' => self::makeCode(
                $this->attr('year_level'),
                $semester,
                $this->attr('program'),
                $this->attr('block_number')
            ),
            'program' => $this->attr('program'),
            'year_level' => (int) $this->attr('year_level'),
            'block_number' => (int) $this->attr('block_number'),
            'term' => [
                'id' => $this->attr('term_id'),
                'school_year' => $schoolYear,
                'semester' => $semester !== null ? (int) $semester : null,
                'label' => self::termLabel($semester, $schoolYear),
                'is_active' => $termActive !== null ? (bool) $termActive : null,
            ],
            'mayor' => $mayorId === null ? null : [
                'id' => (int) $mayorId,
                'name' => $this->attr('mayor_name', $this->attr('mayor.name')),
                'picture_url' => $this->attr('mayor_picture', $this->attr('mayor.picture_url')),
            ],
            'member_count' => $this->when($memberCount !== null, fn () => (int) $memberCount),
            // Optional: the current user's latest join request for this block.
            'my_request_status' => $this->when($requestStatus !== null, $requestStatus),
            'created_at' => $this->attr('created_at'),
        ];
    }

    /** year + semester, then program, then number padded to 2 digits: 3 + 1 + ITE + 4 => 31-ITE-04 */
    public static function makeCode(mixed $year, mixed $semester, mixed $program, mixed $number): ?string
    {
        if ($year === null || $semester === null || $program === null || $number === null) {
            return null;
        }

        return ((int) $year).((int) $semester).'-'
            .strtoupper((string) $program).'-'
            .str_pad((string) ((int) $number), 2, '0', STR_PAD_LEFT);
    }

    /** e.g. "1st Semester 2026-2027" */
    public static function termLabel(mixed $semester, mixed $schoolYear): ?string
    {
        if ($semester === null || $schoolYear === null) {
            return null;
        }

        return ((int) $semester === 1 ? '1st' : '2nd').' Semester '.$schoolYear;
    }

    /** Safe read that works for Eloquent models, stdClass rows, and "relation.field" paths. */
    private function attr(string $key, mixed $default = null): mixed
    {
        return data_get($this->resource, $key, $default);
    }
}
