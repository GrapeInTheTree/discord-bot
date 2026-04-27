// Ticket-related copy. Phase 1 implements; Phase 0 includes for contract documentation.
// All variables: {channel_name}, {ticket_number}, {type_emoji}, {type_name},
//   {opener_mention}, {opener_emojis}, {closer_mention}, {closer_emojis}, {actor_mention}.

export const tickets = {
  panel: {
    embedTitle: 'Support',
    embedDescription: 'Click a button below to open a ticket.',
    // Type-specific descriptions support a {offerChannel} cross-reference variable
    // resolved at send time from the other panel's channelId. When the other panel
    // is not yet configured the placeholder remains visible — the operator's signal
    // to finish setup. Per-deployment overrides should live in PanelTicketType.welcomeMessage.
    embedDescriptionSupport:
      'Question Channel\n\nEvery community member matters and we pay attention to all your feedback or concerns.\n\nIf you have any questions, post them in this channel and a member of the team will usually get back to you within 24 hours.\n\nIf you have an offer or a proposal, use this link: {offerChannel}\n\nPlease keep in mind that anything that is not a question may get removed without a response — we do this to keep the channel organized so real questions are easy to find.',
    embedDescriptionOffer:
      'Offer Channel\n\nGot a partnership, collaboration, or proposal for the team? Open a ticket here.\n\nTo help us evaluate your offer:\n• Share the context — who you are, what you do, what you propose.\n• Be specific — vague pitches like "are you interested?" are hard to act on.\n• Include any links, decks, or supporting material up front.\n\nWe review every offer and will reply once we have enough context to give you a useful answer.',
  },

  channelHeader: {
    open: 'This is the start of the #{channel_name} **private** channel.\nTicket #{ticket_number} - Type: {type_emoji} **{type_name}** - Created by: {opener_mention} {opener_emojis}',
    closed:
      'This is the start of the #{channel_name} **private** channel.\nTicket #{ticket_number} - Type: {type_emoji} **{type_name}** - Closed by: {closer_mention} - Created by: {opener_mention} {opener_emojis}',
  },

  welcome: {
    default:
      'Your ticket has been successfully created.\n\nTo help us assist you more efficiently:\n1. Please share any details you feel are relevant to your proposal or application.\n2. The more specific information you provide, the better we can understand and respond to your offer.\n\nWhile we love the spicy enthusiasm, we may not be able to respond to very general questions like "Are you interested?" without additional context.\n\nWe\'re looking forward to learning more about your offer.',
  },

  buttons: {
    claim: 'Claim',
    claimedBy: 'Claimed by {user}',
    close: 'Close',
    reopen: 'Reopen',
    delete: 'Delete',
  },

  closeMessage: '{closer_mention} {closer_emojis} closed the ticket.',
  reopenMessage: '{actor_mention} reopened the ticket.',
  claimMessage: '{actor_mention} claimed the ticket.',

  openSuccess: 'Your ticket has been opened: {channel}',

  errors: {
    alreadyOpen: 'You already have an open ticket of this type. Please use that one.',
    alreadyClaimed: 'This ticket is already claimed.',
    alreadyClosed: 'This ticket is already closed.',
    notClosed: 'Only closed tickets can be reopened.',
    creating: 'Another ticket is being created right now. Please try again in a moment.',
    categoryFull: 'The support category is full. Please contact an admin.',
    notSupportStaff: 'Only support staff can perform this action.',
    notAdmin: 'Only administrators can delete tickets.',
    notTicketChannel: 'This command can only be used inside a ticket channel.',
    panelMissing: 'This panel is no longer available. Please contact an admin.',
    notConfigured:
      'The bot is not yet configured for tickets. An administrator must run /setup first.',
  },
} as const;
