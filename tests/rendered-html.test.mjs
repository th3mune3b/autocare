import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("uses AutoCare Pro production metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8")
  assert.match(layout, /AutoCare Pro \| Workshop Management System/)
  assert.match(layout, /appointments, job cards, mechanics, inventory, invoices/i)
  assert.doesNotMatch(layout, /Starter Project|codex-preview/)
})

test("landing page exposes authentication and product sections", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  assert.match(page, /href="\/sign-in"/)
  assert.match(page, /href="\/sign-up"/)
  assert.match(page, /id="platform"/)
  assert.match(page, /id="workflow"/)
  assert.match(page, /id="roles"/)
})
