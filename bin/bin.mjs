#!/usr/bin/env node
async function start() {
  const { read } = await import("../dist/esm/index.mjs");
  return read();
}
start();
