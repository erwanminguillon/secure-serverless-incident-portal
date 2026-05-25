import sql from "mssql";

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getSqlPool(): Promise<sql.ConnectionPool> {
  const connectionString = process.env.SQL_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("SQL_CONNECTION_STRING is not set");
  }

  if (!poolPromise) {
    poolPromise = sql.connect(connectionString);
  }

  return poolPromise;
}

export { sql };