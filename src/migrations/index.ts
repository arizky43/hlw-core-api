import { getConfig } from "@/common/config";
import { SQL } from "bun";

const db = new SQL({
  url: getConfig('DATABASE_URL'),
  max: 20,               // pool size
  // tls: true,             // enable TLS
  onconnect() { console.log("pg connected"); },
});

const [{ version }] = await db`SELECT version()`;
console.log(version);

// const url = getConfig('DATABASE_URL');
// console.log(url);