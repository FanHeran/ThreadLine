# ThreadLine Project Implementation Tasks

## 1. 基础环境与 UI 框架搭建 (Completed)

- [x] **Project Scaffolding**
  - [x] Initialize Tauri 2 app (React + TypeScript)
  - [x] Configure path aliases (@/\*)
- [x] **UI Framework Setup**
  - [x] Install & Configure Tailwind CSS
  - [x] Install & Configure Shadcn UI
  - [x] Set up defined color themes (CSS variables)
- [x] **Frontend Architecture**
  - [x] Implement AppLayout (Sidebar, Header)
  - [x] Set up React Router

## 2. 前端核心页面开发 (In Progress)

- [x] **Projects List Page**
  - [x] Project Card component
  - [x] Tabs for Pinned/Active/Archived
  - [x] Integrate `list_projects` command (DB connected)
- [x] **Project Detail Page**
  - [x] Timeline View component (UI)
  - [x] Integrate `get_project` & `get_project_timeline` commands
  - [x] Integrate `get_project_artifacts` command
  - [x] Artifacts Library View (with file type icons)
- [ ] **Global Mailbox (Inbox) Page**
  - [ ] Design Inbox layout (Master-Detail or List)
  - [ ] Implement `get_inbox_emails` command
  - [ ] Add Route & Sidebar Link

## 3. Rust 后端骨架搭建 (Completed)

- [x] **Module Structure**
  - [x] Directories & mod.rs created
- [x] **Dependency Management**
  - [x] Dependencies added to Cargo.toml

## 4. 核心功能开发 (In Progress)

- [x] **Data Persistence**
  - [x] DB Init & Schema
  - [x] Mock Data Seeding (Projects)
  - [x] Mock Data Seeding (Timeline/Emails)
  - [x] Mock Data Seeding (Attachments)
- [ ] **Mail Synchronization**
  - [ ] Implement IMAP connection
- [ ] **Project Intelligence**
  - [ ] Rule-based classification

## 5. UI 集成与进阶

- [x] **Artifacts View Implementation** (Artifacts hub page + route)
- [ ] **Search UI Implementation**
