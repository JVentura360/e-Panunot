<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A mayor application as sent to React. Works with the joined DB::table() rows
 * from your controllers (applicant_name, applicant_email, applicant_picture,
 * school_year, semester) and with an Eloquent MayorApplication (`user` and
 * `term` loaded).
 */
class MayorApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $semester = $this->attr('semester', $this->attr('term.semester'));
        $schoolYear = $this->attr('school_year', $this->attr('term.school_year'));
        $applicantName = $this->attr('applicant_name', $this->attr('user.name'));

        return [
            'id' => $this->id,
            'status' => $this->attr('status'),
            'motivation' => $this->attr('motivation'),
            // The block the applicant is asking for (the row only exists after approval).
            'block' => [
                'code' => BlockResource::makeCode(
                    $this->attr('year_level'),
                    $semester,
                    $this->attr('program'),
                    $this->attr('block_number')
                ),
                'program' => $this->attr('program'),
                'year_level' => (int) $this->attr('year_level'),
                'block_number' => (int) $this->attr('block_number'),
            ],
            'block_id' => $this->attr('block_id'), // filled once approved
            'term' => [
                'id' => $this->attr('term_id'),
                'school_year' => $schoolYear,
                'semester' => $semester !== null ? (int) $semester : null,
                'label' => BlockResource::termLabel($semester, $schoolYear),
            ],
            'applicant' => $this->when($applicantName !== null, fn () => [
                'id' => $this->attr('user_id'),
                'name' => $applicantName,
                'email' => $this->attr('applicant_email', $this->attr('user.email')),
                'picture_url' => $this->attr('applicant_picture', $this->attr('user.picture_url')),
            ]),
            'reviewed_by' => $this->attr('reviewed_by'),
            'reviewed_at' => $this->attr('reviewed_at'),
            'created_at' => $this->attr('created_at'),
        ];
    }

    /** Safe read that works for Eloquent models, stdClass rows, and "relation.field" paths. */
    private function attr(string $key, mixed $default = null): mixed
    {
        return data_get($this->resource, $key, $default);
    }
}
