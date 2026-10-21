## Planned Backend Folder Structure

This is the target backend structure based on the project design references. It includes files and features that are not implemented yet; it is not an inventory of the current repository. Existing Laravel scaffold files may be omitted for clarity.

```text
backend/
├── app/
│   ├── Enums/                              # Fixed value lists
│   │   ├── Role.php                        # student | mayor | admin
│   │   ├── ConcernStatus.php               # open | in_progress | resolved | closed
│   │   └── TaskPlatform.php                # StepS | GradeVision | Face-To-Face | NetAcad
│   │
│   ├── Console/Commands/
│   │   └── SendTaskReminders.php            # Find unfinished tasks due for a reminder
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/GoogleAuthController.php       # Google login and logout
│   │   │   ├── MeController.php                   # Get/edit own profile
│   │   │   ├── Admin/MayorApplicationController.php # List, approve, deny
│   │   │   ├── MayorApplicationController.php     # Student applies as mayor
│   │   │   ├── BlockController.php                # Block list, join, block info
│   │   │   ├── BlockMemberController.php          # Members, approve/remove
│   │   │   ├── SubjectController.php              # Subjects of a block
│   │   │   ├── TaskController.php                 # List, create, edit, delete
│   │   │   ├── TaskCompletionController.php       # Mark done / undo
│   │   │   ├── AnnouncementController.php         # List, create, edit, delete
│   │   │   ├── ConcernController.php              # Create, list, change status
│   │   │   ├── ConcernMessageController.php       # Replies
│   │   │   ├── CalendarEventController.php        # Events + tasks for the calendar
│   │   │   ├── PersonalTodoController.php         # Personal to-dos
│   │   │   └── PushSubscriptionController.php     # Save/remove a device
│   │   ├── Middleware/
│   │   │   └── EnsureRole.php               # Restrict routes by role (admin/mayor)
│   │   ├── Requests/                       # One validation class per write action
│   │   │   ├── StoreTaskRequest.php
│   │   │   ├── StoreConcernRequest.php
│   │   │   └── ...
│   │   └── Resources/                      # Shape the JSON sent to React
│   │       ├── UserResource.php
│   │       ├── TaskResource.php
│   │       └── ...
│   │
│   ├── Jobs/
│   │   └── SendTaskReminderJob.php          # Send one push to one member (queued)
│   │
│   ├── Models/                             # Models for application data
│   │   ├── User.php                        # Add the HasPushSubscriptions trait
│   │   ├── Block.php
│   │   ├── BlockMember.php
│   │   ├── MayorApplication.php
│   │   ├── Subject.php
│   │   ├── Task.php
│   │   ├── TaskCompletion.php
│   │   ├── Announcement.php
│   │   ├── Concern.php
│   │   ├── ConcernMessage.php
│   │   ├── ConcernAttachment.php
│   │   ├── CalendarEvent.php
│   │   └── PersonalTodo.php
│   │
│   ├── Notifications/                      # Push notification messages
│   │   ├── TaskReminderNotification.php
│   │   ├── NewAnnouncementNotification.php
│   │   └── ConcernReplyNotification.php
│   │
│   ├── Policies/                           # Rules for who may do what
│   │   ├── BlockPolicy.php
│   │   ├── TaskPolicy.php
│   │   ├── AnnouncementPolicy.php
│   │   └── ConcernPolicy.php
│   │
│   └── Services/                           # Logic outside controllers
│       ├── MayorApprovalService.php        # Create block, set role, auto-reject others
│       └── GoogleCalendarService.php       # Optional Google sync; add later
│
├── bootstrap/
│   └── app.php                             # Register middleware aliases and routes
├── config/
│   ├── cors.php
│   ├── sanctum.php
│   ├── services.php                        # Google configuration
│   └── webpush.php
├── database/
│   ├── migrations/                         # Database tables
│   ├── factories/                          # Fake data for testing
│   └── seeders/
│       ├── AdminSeeder.php                 # Create the admin account
│       └── SubjectSeeder.php               # Sample subjects
├── routes/
│   ├── api.php                             # API endpoints
│   └── console.php                         # Register every-minute reminder schedule
├── storage/                                # Logs and uploaded concern attachments
├── tests/
│   └── Feature/                            # API tests
├── .env                                    # Local secrets; never commit
└── .env.example                            # Commit configuration placeholders
```

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

