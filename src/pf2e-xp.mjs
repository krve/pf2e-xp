// only required for dev
// in prod, foundry loads MODULE.js, which is compiled by vite/rollup
// in dev, foundry loads this file, which then loads main.ts

import "/@vite/client";
import "./main.ts";
