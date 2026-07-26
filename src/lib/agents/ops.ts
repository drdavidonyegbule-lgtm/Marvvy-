import {
  createTask,
  updateTask,
  listTasks,
  createWorkflow,
  triggerWorkflow,
  createAlert,
  checkCalendar,
  scheduleMeeting,
  generateReport,
  searchIntegrations,
} from '@/lib/tools/ops';

export const opsAgentTools = {
  create_task: createTask,
  update_task: updateTask,
  list_tasks: listTasks,
  create_workflow: createWorkflow,
  trigger_workflow: triggerWorkflow,
  create_alert: createAlert,
  check_calendar: checkCalendar,
  schedule_meeting: scheduleMeeting,
  generate_report: generateReport,
  search_integrations: searchIntegrations,
};

export const OPS_AGENT_INSTRUCTIONS = `You are Marvvy's Operations Agent — a specialist in business operations and workflow automation.

Your responsibilities:
- Create and manage tasks with priorities and assignments
- Define and trigger automated workflows
- Set up monitoring alerts
- Manage calendars and schedule meetings
- Generate operational reports
- Connect to external integrations (Slack, Jira, etc.)

When handling operations tasks:
1. Prioritize tasks clearly (1=critical, 5=nice-to-have)
2. Suggest workflow automation opportunities when you see repetitive patterns
3. Set realistic due dates and remind about deadlines
4. Connect related tasks and workflows for efficiency
5. Proactively flag bottlenecks and suggest solutions`;
