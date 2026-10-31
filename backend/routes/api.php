<?php
use App\Http\Controllers\BlockGoogleCalendarController;
use App\Http\Controllers\Admin\MayorApplicationController as AdminMayorApplicationController;
use App\Http\Controllers\BlockController;
use App\Http\Controllers\BlockMemberController;
use App\Http\Controllers\Mayor\ApplicationController as MayorApplicationController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\ConcernController;
use App\Http\Controllers\ConcernMessageController;
use App\Http\Controllers\TaskCompletionController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\CalendarEventController;
use App\Http\Controllers\PersonalTodoController;
use App\Http\Controllers\MeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::get('/me', [MeController::class, 'show']);
    
    // Mayor applications (student side). 'mine' must come before '{id}'.
    Route::get('/mayor-applications/mine', [MayorApplicationController::class, 'mine']);
    Route::get('/mayor-applications/{id}', [MayorApplicationController::class, 'showMine']);
    Route::post('/mayor-applications', [MayorApplicationController::class, 'store']);

    // Blocks, joining, members, subjects
    Route::get('/blocks', [BlockController::class, 'index']);
    Route::get('/blocks/lookup', [BlockController::class, 'lookup'])->middleware('throttle:30,1'); // must come before '{id}'
    Route::get('/blocks/{id}', [BlockController::class, 'show']);
    Route::get('/blocks/{blockId}/members', [BlockMemberController::class, 'index']);
    Route::post('/blocks/{blockId}/join-requests', [BlockMemberController::class, 'store']);
    Route::get('/blocks/{blockId}/join-requests', [BlockMemberController::class, 'requests']);
    Route::post('/blocks/{blockId}/join-requests/{requestId}/approve', [BlockMemberController::class, 'approve']);
    Route::post('/blocks/{blockId}/join-requests/{requestId}/reject', [BlockMemberController::class, 'reject']);
    Route::get('/join-requests/mine', [BlockMemberController::class, 'mine']);
    Route::delete('/join-requests/{requestId}', [BlockMemberController::class, 'cancel']);
    Route::delete('/blocks/{blockId}/members/{memberId}', [BlockMemberController::class, 'destroyMember']);
    Route::put('/blocks/{blockId}/subjects', [SubjectController::class, 'syncBlockSubjects']);
    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::get('/subjects/{id}', [SubjectController::class, 'show']);
    Route::get('/blocks/{blockId}/google-calendar', [BlockGoogleCalendarController::class, 'show']);

    // Admin only
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/mayor-applications', [AdminMayorApplicationController::class, 'index']);
        Route::get('/mayor-applications/{id}', [AdminMayorApplicationController::class, 'show']);
        Route::post('/mayor-applications/{id}/approve', [AdminMayorApplicationController::class, 'approve']);
        Route::post('/mayor-applications/{id}/reject', [AdminMayorApplicationController::class, 'reject']);
    });

    // Anyone in the block
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks/{task}/complete', [TaskCompletionController::class, 'store']);
    Route::delete('/tasks/{task}/complete', [TaskCompletionController::class, 'destroy']);
    Route::get('/announcements', [AnnouncementController::class, 'index']);

    Route::get('/calendar', [CalendarEventController::class, 'index']);
    Route::post('/calendar-events', [CalendarEventController::class, 'store']);
    Route::put('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'update']);
    Route::delete('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'destroy']);

    Route::get('/personal-todos', [PersonalTodoController::class, 'index']);
    Route::post('/personal-todos', [PersonalTodoController::class, 'store']);
    Route::match(['put', 'patch'], '/personal-todos/{personalTodo}', [PersonalTodoController::class, 'update']);
    Route::delete('/personal-todos/{personalTodo}', [PersonalTodoController::class, 'destroy']);

    Route::get('/concerns', [ConcernController::class, 'index']);
    Route::post('/concerns', [ConcernController::class, 'store']);
    Route::get('/concerns/{concern}/messages', [ConcernMessageController::class, 'index']);
    Route::post('/concerns/{concern}/messages', [ConcernMessageController::class, 'store']);
    Route::get('/attachments/{attachment}', [ConcernController::class, 'download']);

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
