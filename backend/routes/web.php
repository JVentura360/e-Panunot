<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\DevelopmentLoginController;

Route::get('/auth/development/accounts', [DevelopmentLoginController::class, 'index']);
Route::post('/auth/development/login', [DevelopmentLoginController::class, 'login'])->middleware('throttle:20,1');

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
Route::post('/logout', [GoogleAuthController::class, 'logout']);

Route::get('/', function () {
    return view('welcome');
});
