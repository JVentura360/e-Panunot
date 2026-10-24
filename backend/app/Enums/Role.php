<?php

namespace App\Enums;

enum Role: string
{
    case Student = 'student';
    case Mayor = 'mayor';
    case Admin = 'admin';
}
