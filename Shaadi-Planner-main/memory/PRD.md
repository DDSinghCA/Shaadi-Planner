# Shaadi Planner - Wedding Planning App PRD

## Overview
Multi-user, role-based Indian wedding planning mobile application built with React Native Expo frontend and FastAPI + MongoDB backend.

## Architecture
- **Frontend:** React Native Expo (SDK 54) with expo-router file-based navigation
- **Backend:** FastAPI with MongoDB (Motor async driver)
- **Auth:** JWT-based (access + refresh tokens), bcrypt password hashing
- **Database:** MongoDB with collections: users, tasks, guests, budget_items, events, login_attempts

## Roles
- **Admin (👑):** Full access - CRUD on all modules, user management, full budget view
- **Contributor (👥):** Manage tasks & guests, view budget summary only
- **Viewer (👁️):** View itinerary only

## Modules
1. **Authentication:** Login, force password change on first login, brute force protection
2. **User Management (Admin):** Create users with roles, assign roles, delete users
3. **Task Management:** Create/assign tasks, deadlines, status tracking (pending/completed)
4. **Guest Management:** Add guests with side (Bride/Groom), group (Family/Friends/VIP), filters
5. **Budget Management:** Categories, planned vs actual amounts, role-based access
6. **Itinerary:** Event timeline with date, time, location, transport notes
7. **Dashboard:** Pending tasks, upcoming events, budget summary, guest count

## Design
- Ivory background (#FAF9F6), deep maroon accent (#7A1A2A), muted gold (#C19B5E)
- Modern minimal with subtle Indian touch
- Large touch targets (56px buttons), generous spacing
- Bottom tab navigation: Home, Tasks, Guests, Budget, Events

## Default Admin
- Username: superadmin
- Password: Temp@123 (force change on first login)

## API Endpoints
All prefixed with `/api`:
- Auth: `/auth/login`, `/auth/me`, `/auth/change-password`, `/auth/refresh`
- Users: `/users` (CRUD, admin only)
- Tasks: `/tasks`, `/tasks/my`, `/tasks/all`
- Guests: `/guests` (with side/group filters)
- Budget: `/budget`
- Events: `/events`
- Dashboard: `/dashboard`
- Health: `/health`

## Security
- Bcrypt password hashing
- JWT with 2-hour access token, 7-day refresh token
- Brute force protection (5 attempts → 15 min lockout)
- Role-based middleware on all endpoints
- Auto-logout after 30 minutes inactivity
- No plain text password storage

## Future Ready
Architecture supports adding: Notifications, Vendor integration, Advanced analytics
