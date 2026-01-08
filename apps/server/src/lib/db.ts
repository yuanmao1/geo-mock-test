import postgres from "postgres";
import { config } from "./config";

const connectionString =
  config.databaseUrl ||
  "postgres://postgres:postgres@127.0.0.1:5432/geo_mock";

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const connectDb = async () => {
  await sql`select 1`;
};

export const closeDb = async () => {
  await sql.end();
};
