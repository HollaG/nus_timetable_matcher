import mysql from "mysql2/promise";

require("dotenv").config();

export const pool = mysql.createPool({
    host: "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// https://stackoverflow.com/questions/54583950/using-typescript-how-do-i-strongly-type-mysql-query-results
type Row = import("mysql2").RowDataPacket
type Ok = import("mysql2").OkPacket
type dbDefaults = Row[] | Row[][] | Ok[] | Ok
type dbQuery<T> = T & dbDefaults

export const db = {
  query: async <T>(query: string, params?: Array<any>): Promise<[T, any]> => {
    return pool.query<dbQuery<T>>(query, params)
  },
}