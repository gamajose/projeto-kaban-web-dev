-- Seed data for ClickUp Clone (PostgreSQL Compatible)

-- Insert test users
INSERT INTO users (id, email, password_hash, name, avatar_url, role) VALUES 
  (1, 'admin@clickupclone.com', '$2a$10$mock.hash.for.admin', 'Admin User', '/static/avatars/admin.png', 'admin'),
  (2, 'alice@company.com', '$2a$10$mock.hash.for.alice', 'Alice Johnson', '/static/avatars/alice.png', 'member'),
  (3, 'bob@company.com', '$2a$10$mock.hash.for.bob', 'Bob Smith', '/static/avatars/bob.png', 'member'),
  (4, 'charlie@company.com', '$2a$10$mock.hash.for.charlie', 'Charlie Brown', '/static/avatars/charlie.png', 'member'),
  (5, 'diana@company.com', '$2a$10$mock.hash.for.diana', 'Diana Prince', '/static/avatars/diana.png', 'member')
ON CONFLICT (id) DO NOTHING;

-- Insert test workspace
INSERT INTO workspaces (id, name, slug, description, color, owner_id) VALUES 
  (1, 'Acme Corporation', 'acme-corp', 'Main workspace for Acme Corporation projects', '#6B73FF', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert workspace members
INSERT INTO workspace_members (workspace_id, user_id, role) VALUES 
  (1, 1, 'owner'),
  (1, 2, 'admin'),
  (1, 3, 'member'),
  (1, 4, 'member'),
  (1, 5, 'member')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Insert test spaces
INSERT INTO spaces (id, workspace_id, name, description, color, icon) VALUES 
  (1, 1, 'Marketing', 'Marketing campaigns and content creation', '#FF6B6B', 'megaphone'),
  (2, 1, 'Product Development', 'Product features and roadmap', '#4ECDC4', 'rocket'),
  (3, 1, 'Customer Support', 'Support tickets and documentation', '#95E1D3', 'headset')
ON CONFLICT (id) DO NOTHING;

-- Insert test folders
INSERT INTO folders (id, space_id, name, description, color, position) VALUES 
  (1, 1, 'Q1 Campaigns', '2024 Q1 marketing campaigns', '#FFB84D', 0),
  (2, 1, 'Social Media', 'Social media content and scheduling', '#F06292', 1),
  (3, 2, 'Frontend Features', 'UI/UX improvements and new features', '#81C784', 0),
  (4, 2, 'Backend Infrastructure', 'API development and database work', '#64B5F6', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert test lists
INSERT INTO lists (id, folder_id, space_id, name, description, color, view_type, position) VALUES 
  (1, 1, NULL, 'Email Campaign Launch', 'Launch new email marketing campaign', '#FF5722', 'list', 0),
  (2, 2, NULL, 'Content Calendar', 'Schedule social media posts', '#9C27B0', 'calendar', 0),
  (3, 3, NULL, 'User Dashboard', 'Redesign user dashboard interface', '#2196F3', 'board', 0),
  (4, 4, NULL, 'API Endpoints', 'Develop REST API endpoints', '#4CAF50', 'list', 0),
  (5, NULL, 3, 'Support Tickets', 'Customer support queue', '#FF9800', 'list', 0)
ON CONFLICT (id) DO NOTHING;

-- Insert default task statuses for each list
INSERT INTO task_statuses (list_id, name, color, position, is_closed) VALUES 
  (1, 'To Do', '#6C7293', 0, false), (1, 'In Progress', '#FFB84D', 1, false), (1, 'Review', '#F06292', 2, false), (1, 'Done', '#81C784', 3, true),
  (2, 'Ideas', '#6C7293', 0, false), (2, 'Creating', '#FFB84D', 1, false), (2, 'Scheduled', '#64B5F6', 2, false), (2, 'Published', '#81C784', 3, true),
  (3, 'Backlog', '#6C7293', 0, false), (3, 'Design', '#9C27B0', 1, false), (3, 'Development', '#FFB84D', 2, false), (3, 'Testing', '#F06292', 3, false), (3, 'Complete', '#81C784', 4, true),
  (4, 'Planning', '#6C7293', 0, false), (4, 'Development', '#FFB84D', 1, false), (4, 'Testing', '#64B5F6', 2, false), (4, 'Deployed', '#81C784', 3, true),
  (5, 'New', '#FF5722', 0, false), (5, 'In Progress', '#FFB84D', 1, false), (5, 'Waiting', '#9E9E9E', 2, false), (5, 'Resolved', '#81C784', 3, true)
ON CONFLICT DO NOTHING;

-- Insert test tags
INSERT INTO tags (id, workspace_id, name, color) VALUES 
  (1, 1, 'Urgent', '#F44336'), (2, 1, 'Bug', '#E91E63'), (3, 1, 'Feature', '#9C27B0'), (4, 1, 'Enhancement', '#673AB7'),
  (5, 1, 'Documentation', '#3F51B5'), (6, 1, 'Testing', '#2196F3'), (7, 1, 'Marketing', '#FF9800'), (8, 1, 'Design', '#795548')
ON CONFLICT (id) DO NOTHING;

-- Insert test tasks
INSERT INTO tasks (id, list_id, name, description, status_id, priority, assignee_id, creator_id, due_date, estimated_time, progress, position) VALUES 
  (1, 1, 'Design email template', 'Create responsive email template for new product launch', 1, 'high', 2, 1, '2024-03-15 17:00:00', 240, 0, 0),
  (2, 1, 'Write email copy', 'Draft compelling copy for email campaign', 1, 'high', 2, 1, '2024-03-16 17:00:00', 120, 0, 1),
  (3, 1, 'Setup email automation', 'Configure email sequence in marketing platform', 2, 'normal', 3, 1, '2024-03-18 17:00:00', 180, 25, 2),
  (4, 2, 'March social media posts', 'Create content for March social media calendar', 6, 'normal', 4, 2, '2024-03-31 17:00:00', 360, 60, 0),
  (5, 2, 'Instagram story templates', 'Design story templates for product announcements', 5, 'low', 5, 2, '2024-03-20 17:00:00', 180, 0, 1),
  (6, 3, 'User dashboard mockups', 'Create high-fidelity mockups for new dashboard', 10, 'high', 5, 1, '2024-03-25 17:00:00', 480, 75, 0),
  (7, 3, 'Implement dashboard components', 'Build React components for dashboard', 11, 'high', 3, 1, '2024-03-30 17:00:00', 720, 30, 1),
  (8, 3, 'Dashboard responsive design', 'Ensure dashboard works on mobile devices', 9, 'normal', 5, 1, '2024-04-05 17:00:00', 240, 0, 2),
  (9, 4, 'Design API schema', 'Define REST API endpoints and data models', 18, 'high', 4, 1, '2024-03-22 17:00:00', 300, 100, 0),
  (10, 4, 'Implement user endpoints', 'Create CRUD endpoints for user management', 19, 'high', 4, 1, '2024-03-28 17:00:00', 480, 50, 1),
  (11, 4, 'API authentication', 'Implement JWT authentication for API', 18, 'high', 3, 1, '2024-04-01 17:00:00', 360, 0, 2),
  (12, 5, 'Setup support ticket system', 'Configure help desk software', 21, 'normal', 2, 1, '2024-03-20 17:00:00', 180, 80, 0),
  (13, 5, 'Create support documentation', 'Write user guides and FAQs', 21, 'normal', 2, 1, '2024-03-25 17:00:00', 240, 20, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert additional task assignees
INSERT INTO task_assignees (task_id, user_id) VALUES 
  (1, 2), (1, 5), (6, 5), (6, 3), (7, 3), (7, 4), (10, 4), (10, 3)
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Insert task tags
INSERT INTO task_tags (task_id, tag_id) VALUES 
  (1, 7), (1, 8), (2, 7), (3, 7), (4, 7), (4, 8), (5, 8), (6, 3), (6, 8),
  (7, 3), (8, 4), (9, 3), (9, 5), (10, 3), (11, 3), (11, 1), (12, 4), (13, 5)
ON CONFLICT (task_id, tag_id) DO NOTHING;

-- Insert test comments
INSERT INTO comments (task_id, user_id, content) VALUES 
  (1, 2, 'Started working on the email template. Looking at modern design trends.'),
  (1, 1, 'Great! Make sure it''s mobile-responsive and follows our brand guidelines.'),
  (6, 5, 'Completed initial mockups. Ready for review.'),
  (6, 3, 'Mockups look great! I''ll start implementing the components.'),
  (10, 4, 'API endpoints are 50% complete. Authentication integration next.'),
  (12, 2, 'Help desk software is configured. Testing the workflow now.')
ON CONFLICT DO NOTHING;

-- Insert test activities
INSERT INTO activities (workspace_id, user_id, action_type, entity_type, entity_id, details) VALUES 
  (1, 1, 'created', 'task', 1, '{"task_name": "Design email template", "list_name": "Email Campaign Launch"}'),
  (1, 2, 'assigned', 'task', 1, '{"assignee_name": "Alice Johnson", "task_name": "Design email template"}'),
  (1, 3, 'status_changed', 'task', 3, '{"from_status": "To Do", "to_status": "In Progress", "task_name": "Setup email automation"}'),
  (1, 5, 'completed', 'task', 9, '{"task_name": "Design API schema", "list_name": "API Endpoints"}'),
  (1, 2, 'commented', 'task', 12, '{"comment": "Help desk software is configured. Testing the workflow now.", "task_name": "Setup support ticket system"}')
ON CONFLICT DO NOTHING;

-- Insert test time entries
INSERT INTO time_entries (task_id, user_id, description, start_time, end_time, duration) VALUES 
  (1, 2, 'Working on email template design', '2024-03-14 09:00:00', '2024-03-14 12:00:00', 180),
  (6, 5, 'Creating dashboard mockups', '2024-03-13 14:00:00', '2024-03-13 18:00:00', 240),
  (10, 4, 'Implementing user CRUD endpoints', '2024-03-15 10:00:00', '2024-03-15 15:30:00', 330),
  (12, 2, 'Configuring help desk software', '2024-03-16 13:00:00', '2024-03-16 16:00:00', 180)
ON CONFLICT DO NOTHING;

-- Insert test dashboard widgets
INSERT INTO dashboard_widgets (workspace_id, user_id, widget_type, title, config, position_x, position_y, width, height) VALUES 
  (1, 1, 'task_summary', 'My Tasks Overview', '{"show_completed": true, "group_by": "priority"}', 0, 0, 2, 1),
  (1, 1, 'recent_activity', 'Recent Activity', '{"limit": 10, "show_all_users": true}', 2, 0, 2, 2),
  (1, 1, 'time_tracking', 'Time This Week', '{"period": "week", "show_breakdown": true}', 0, 1, 2, 1),
  (1, 1, 'project_progress', 'Project Progress', '{"projects": [1, 2, 3], "show_percentage": true}', 0, 2, 4, 1),
  (1, 2, 'my_assignments', 'My Assignments', '{"status_filter": "active", "due_soon": true}', 0, 0, 2, 2)
ON CONFLICT DO NOTHING;

-- Insert test notifications
INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id) VALUES 
  (2, 'New task assigned', 'You have been assigned to "Design email template"', 'info', 'task', 1),
  (3, 'Task status updated', '"Setup email automation" moved to In Progress', 'info', 'task', 3),
  (5, 'Comment added', 'Alice Johnson commented on "User dashboard mockups"', 'info', 'task', 6),
  (4, 'Due date approaching', '"Implement user endpoints" is due in 2 days', 'warning', 'task', 10),
  (1, 'Task completed', '"Design API schema" has been completed', 'success', 'task', 9)
ON CONFLICT DO NOTHING;

INSERT INTO automations (list_id, name, trigger_type, trigger_config, action_type, action_config) VALUES
(3, 'Atribuir tarefas de teste para a Diana', 'status_changed', '{"to_status_id": 12}', 'assign_user', '{"assignee_id": 5}')
ON CONFLICT DO NOTHING;