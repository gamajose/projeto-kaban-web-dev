// ClickUp Clone Types

export interface CloudflareBindings {
  DB: D1Database;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'member' | 'guest';
  status: 'active' | 'inactive' | 'invited';
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  avatar_url?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
}

export interface Space {
  id: number;
  workspace_id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  space_id: number;
  name: string;
  description?: string;
  color: string;
  is_collapsed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: number;
  folder_id?: number;
  space_id?: number;
  name: string;
  description?: string;
  color: string;
  view_type: 'list' | 'board' | 'calendar' | 'gantt' | 'timeline';
  is_archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  id: number;
  list_id: number;
  name: string;
  color: string;
  position: number;
  is_closed: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  list_id: number;
  parent_task_id?: number;
  name: string;
  description?: string;
  status_id?: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  assignee_id?: number;
  creator_id: number;
  due_date?: string;
  start_date?: string;
  estimated_time?: number;
  actual_time?: number;
  progress: number;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: number;
  task_id: number;
  user_id: number;
  assigned_at: string;
}

export interface Tag {
  id: number;
  workspace_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskTag {
  id: number;
  task_id: number;
  tag_id: number;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  workspace_id: number;
  user_id: number;
  action_type: string;
  entity_type: string;
  entity_id: number;
  details?: string;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  task_id: number;
  user_id: number;
  description?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  created_at: string;
}

export interface DashboardWidget {
  id: number;
  workspace_id: number;
  user_id: number;
  widget_type: string;
  title: string;
  config?: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  entity_type?: string;
  entity_id?: number;
  is_read: boolean;
  created_at: string;
}

// Extended interfaces with joined data
export interface TaskWithDetails extends Task {
  status_name?: string;
  status_color?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  creator_name?: string;
  tags?: Tag[];
  assignees?: User[];
  comments_count?: number;
  time_tracked?: number;
}

export interface ListWithTasks extends List {
  tasks?: TaskWithDetails[];
  statuses?: TaskStatus[];
  task_count?: number;
}

export interface FolderWithLists extends Folder {
  lists?: ListWithTasks[];
}

export interface SpaceWithContent extends Space {
  folders?: FolderWithLists[];
  lists?: ListWithTasks[];
}

export interface WorkspaceWithContent extends Workspace {
  spaces?: SpaceWithContent[];
  members?: (WorkspaceMember & { user_name: string; user_avatar?: string })[];
}