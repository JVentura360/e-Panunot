<?php

use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\ConcernController;
use App\Http\Controllers\ConcernMessageController;
use App\Http\Controllers\TaskCompletionController;
use App\Http\Controllers\TaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Anyone in the block
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks/{task}/complete', [TaskCompletionController::class, 'store']);
    Route::delete('/tasks/{task}/complete', [TaskCompletionController::class, 'destroy']);
    Route::get('/announcements', [AnnouncementController::class, 'index']);

    Route::get('/concerns', [ConcernController::class, 'index']);
    Route::post('/concerns', [ConcernController::class, 'store']);
    Route::get('/concerns/{concern}/messages', [ConcernMessageController::class, 'index']);
    Route::post('/concerns/{concern}/messages', [ConcernMessageController::class, 'store']);

    // Mayor only
    Route::middleware('role:mayor')->group(function () {
        Route::post('/tasks', [TaskController::class, 'store']);
        Route::put('/tasks/{task}', [TaskController::class, 'update']);
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update']);
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        Route::patch('/concerns/{concern}/status', [ConcernController::class, 'updateStatus']);
    });
});
