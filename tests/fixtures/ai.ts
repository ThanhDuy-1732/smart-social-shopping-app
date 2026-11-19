export function aiResponse(payload: unknown): {
  ok: true;
  json: () => Promise<{ choices: { message: { content: string } }[] }>;
} {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
  };
}
