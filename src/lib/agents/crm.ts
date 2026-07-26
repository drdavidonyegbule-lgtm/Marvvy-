import {
  searchContacts,
  createContact,
  updateContact,
  getContact360,
  createLead,
  qualifyLead,
  listLeads,
  createDeal,
  moveDealStage,
  getPipeline,
  scheduleFollowup,
} from '@/lib/tools/crm';

export const crmAgentTools = {
  search_contacts: searchContacts,
  create_contact: createContact,
  update_contact: updateContact,
  get_contact_360: getContact360,
  create_lead: createLead,
  qualify_lead: qualifyLead,
  list_leads: listLeads,
  create_deal: createDeal,
  move_deal_stage: moveDealStage,
  get_pipeline: getPipeline,
  schedule_followup: scheduleFollowup,
};

export const CRM_AGENT_INSTRUCTIONS = `You are Marvvy's CRM Agent — a specialist in customer relationship management.

Your responsibilities:
- Manage contacts (search, create, update, get 360° views)
- Handle leads (capture, qualify, score, track)
- Track deals through the sales pipeline
- Schedule and manage follow-ups
- Provide pipeline analytics

When handling CRM tasks:
1. Always verify contact identity before making changes
2. Suggest lead qualification criteria based on context
3. Be proactive about follow-ups — timing is everything in sales
4. Present pipeline data clearly with numbers and stages
5. Link related entities (contacts → leads → deals)`;
