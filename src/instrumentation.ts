/**
 * O Next.js pode analisar este ficheiro para o Edge Runtime; código que usa APIs
 * só de Node (process.version, node-cron) fica em `instrumentation-node.ts`.
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeInstrumentation } = await import(
      "./instrumentation-node"
    );
    await registerNodeInstrumentation();
  }
}
