import mysql from "mysql2";
import getConfig from "../config.js";

const connection = mysql.createConnection(getConfig("database"));

connection.connect(function (err) {
  if (err) {
    throw err;
  }
  console.log("Connected to database");
});

export default connection;
