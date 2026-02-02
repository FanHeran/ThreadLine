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

## 2. 前端核心页面开发 (Completed)

- [x] **Projects List Page**
  - [x] Project Card component
  - [x] Tabs for Pinned/Active/Archived
- [x] **Project Detail Page**
  - [x] Timeline View component (Milestone -> Thread -> Email)
  - [x] Artifacts Tab placeholder
  - [x] Scrolling & Layout fixes

## 3. Rust 后端骨架搭建 (Completed)

- [x] **Module Structure**
  - [x] Create directories: `mail`, `project`, `search`, `artifacts`, `index_scheduler`, `storage`, `utils`
  - [x] Create `mod.rs` for all modules
  - [x] Implement basic command placeholders (`greet_user`, etc.)
- [x] **Dependency Management**
  - [x] Add crates: `tantivy`, `rusqlite`, `lettre`, `async-imap`, `tokio`, etc.
  - [x] Update `lib.rs` to register modules

## 4. 核心功能开发 (In Progress)

- [ ] **Data Persistence (Next Step)**
  - [ ] Initialize SQLite database (`storage/database.rs`)
  - [ ] Define schemas for `projects`, `emails`, `threads`, `artifacts`
- [ ] **Mail Synchronization**
  - [ ] Implement IMAP connection (`mail/imap_client.rs`)
  - [ ] Implement email fetching logic
- [ ] **Project Intelligence**
  - [ ] Implement rule-based classification
- [ ] **Search Engine**
  - [ ] Initialize Tantivy index

## 5. UI 集成与进阶

- [ ] **Connect Frontend to Backend**
  - [ ] Call Rust commands from React
- [ ] **Artifacts View Implementation**
- [ ] **Search UI Implementation**
