# Data Model: App Navigation Shell

**Feature**: 003-app-navigation-shell  
**Date**: 2026-04-08

## Overview

The navigation shell has no database entities — all data structures are client-side TypeScript types. These types define the shape of the sidebar configuration, component props, and state slices.

## Entities

### SidebarItem

The primary navigation module entry. Defined once in `packages/shared` and consumed by both apps.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique identifier; also the i18n key prefix under `sidebar.*` |
| `icon` | `string` | Lucide icon name (e.g., `"LayoutDashboard"`) |
| `route` | `string` | Base route path (e.g., `"/dashboard"`) |
| `subItems` | `SidebarSubItem[]` (optional) | Collapsible child entries |
| `roles` | `Role[]` | Which roles can see this item (`super_admin`, `admin`, `guard`, `resident`) |
| `platforms` | `Platform[]` | Which apps render this item (`web`, `desktop`, `mobile`) |

**Validation rules**:
- `key` must be unique across all items
- `route` must start with `/`
- `icon` must be a valid Lucide icon name
- `roles` must contain at least one role
- `platforms` must contain at least one platform

### SidebarSubItem

A child navigation entry under a parent module.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Sub-key; i18n lookup is `sidebar.[parentKey].[key]` |
| `route` | `string` | Full route path (e.g., `"/logbook/visitors"`) |

**Validation rules**:
- `key` must be unique within its parent's `subItems`
- `route` must start with the parent's `route` as a prefix

### Platform

Platform discriminator for sidebar item visibility.

| Value | Description |
|-------|-------------|
| `"web"` | Next.js web portal (`apps/web`) |
| `"desktop"` | Electron guard booth app (`apps/desktop`) |
| `"mobile"` | React Native mobile app (separate repo, future) |

### Role (existing)

Already defined in `packages/shared/src/types/auth.ts`. Reused as-is.

| Value | Description |
|-------|-------------|
| `"super_admin"` | Platform-wide administrator |
| `"admin"` | Tenant administrator |
| `"guard"` | Guard booth operator |
| `"resident"` | Residential user |

## State Entities (Zustand — Desktop Only)

### SidebarSlice

Client-side state for sidebar behavior in the desktop app.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `collapsed` | `boolean` | `false` | Whether sidebar is in icon-only mode |
| `currentPath` | `string` | `"/dashboard"` | Current active route |
| `toggleCollapsed` | `() => void` | — | Toggles collapsed state and persists to storage |
| `navigate` | `(path: string) => void` | — | Updates currentPath |

**Persistence**: `collapsed` persists to `localStorage` under key `ramcar-sidebar-collapsed`.

### ThemeSlice

Client-side state for theme management in the desktop app.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | Current theme preference |
| `setTheme` | `(theme: string) => void` | — | Updates theme, applies `dark` class to `<html>`, persists to storage |

**Persistence**: `theme` persists to `localStorage` under key `ramcar-theme`.

**Note**: The web app does NOT use these slices — it uses `next-themes` for theme management and Next.js App Router for navigation. These slices are consumed only by `apps/desktop`.

## Relationships

```
SidebarItem (1) ──── (0..*) SidebarSubItem
     │
     ├── roles[]    → Role (existing type)
     └── platforms[] → Platform (new type)

SidebarSlice.currentPath matches SidebarItem.route or SidebarSubItem.route

ThemeSlice.theme drives document.documentElement.classList (dark class)
```

## Data Instances

### Admin Sidebar (web) — 13 items

Dashboard, Catalogs, Logbook (→ Visitors, Providers, Residents), Visits & Residents, Projects, Wi-Fi, Complaints, Patrols, Amenities, Announcements, Lost & Found, History, Blacklist

### Guard Sidebar (desktop) — 3 items

Dashboard, Access Log (→ Visitors, Providers, Residents), Patrols

### Resident Sidebar (web + mobile) — 5 items

Dashboard, My Visits, Logbook, Amenities, Complaints

*(Resident sidebar is defined in config but not actively rendered in this feature — role filtering is deferred)*
