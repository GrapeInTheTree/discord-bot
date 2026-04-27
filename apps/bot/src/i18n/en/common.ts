export const common = {
  ping: {
    label: 'Pong!',
    detail: 'Latency: {latency}ms · WebSocket: {ws}ms',
  },
  errors: {
    generic: 'Something went wrong. Please try again or contact an admin.',
    serverOnly: 'This command can only be used in a server.',
    permission: 'You do not have permission to perform this action.',
    notFound: 'The requested resource was not found.',
  },
} as const;
