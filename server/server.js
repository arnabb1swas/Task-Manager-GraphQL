require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { applyMiddleware } = require("graphql-middleware");

const typeDefs = require("./schema/queryType");
const createLoaders = require("./schema/dataloaders");
const resolvers = require("./schema/resolvers");
const { verifyUserAuth } = require("./service/auth");
const { permissions } = require("./service/permissions");

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
