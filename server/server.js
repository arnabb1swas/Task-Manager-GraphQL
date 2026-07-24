import "dotenv/config";
import { createRequire } from "module";

import cors from "cors";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { makeExecutableSchema } from "@graphql-tools/schema";

import typeDefs from "./schema/queryType/index.js";
import createLoaders from "./schema/dataloaders/index.js";
import resolvers from "./schema/resolvers/index.js";
import { verifyUserAuth } from "./service/auth.js";
import { permissions } from "./service/permissions.js";

// graphql-shield builds `permissions` with the CJS copy of graphql-middleware;
// applyMiddleware must come from that same copy or its generator identity check
// fails (the ESM build is a separate module instance). Force CJS via require.
const require = createRequire(import.meta.url);
const { applyMiddleware } = require("graphql-middleware");

// Fail fast: a missing secret must not silently produce unverifiable tokens.
if (!process.env.JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is required");
}

const PORT = process.env.PORT || 4000;

// Prod locks CORS to the deployed frontend; dev stays open for local tooling.
const corsOptions =
  process.env.NODE_ENV === "production"
    ? { origin: process.env.CLIENT_ORIGIN, credentials: true }
    : {};

const startServer = async () => {
  const app = express();

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const schemaWithPermissions = applyMiddleware(schema, permissions);

  const apolloServer = new ApolloServer({ schema: schemaWithPermissions });
  await apolloServer.start();

  app.get("/", (req, res) => {
    res.json({ status: "ok", service: "task-manager-graphql" });
  });

  app.use(
    "/graphql",
    cors(corsOptions),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const jwtUser = await verifyUserAuth(req);
        return { jwtUser, loaders: createLoaders() };
      },
    }),
  );

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🚀 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
