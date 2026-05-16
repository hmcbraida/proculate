import index from "./index.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 5173),
  development: {
    hmr: true,
    console: true,
  },
  routes: {
    "/*": index,
  },
});

console.log(`proculate-web listening on ${server.url}`);
