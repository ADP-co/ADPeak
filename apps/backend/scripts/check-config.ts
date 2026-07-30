import { getAppConfig, loadLocalEnv, redactConfig } from "../src/config.js";

loadLocalEnv();

const config = getAppConfig();

console.log("Configuracion local valida.");
console.log(JSON.stringify(redactConfig(config), null, 2));
