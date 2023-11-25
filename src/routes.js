import {readFile} from "fs/promises";
import {URL} from "url";

const config = JSON.parse(
    await readFile(new URL('./config.json', import.meta.url))
);

