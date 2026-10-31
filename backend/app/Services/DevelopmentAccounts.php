<?php

namespace App\Services;

class DevelopmentAccounts
{
    public const ACCOUNTS = [
        'admin' => ['name' => 'Development Admin', 'role' => 'admin'],
        'mayor' => ['name' => 'Development Mayor', 'role' => 'mayor'],
        'student-one' => ['name' => 'Student One', 'role' => 'student'],
        'student-two' => ['name' => 'Student Two', 'role' => 'student'],
        'new-student' => ['name' => 'New Student (no block)', 'role' => 'student'],
    ];
}
