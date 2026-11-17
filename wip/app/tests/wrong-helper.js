// v4.3 rev b helper: a capy on a non-solution cell is rejected and costs an orange, so tests that need "a mistake"
// pick an empty non-solution cell of the pond that is open now.
import { solutionCells } from "../core.js";
export async function openPondData(page, data) { const lv = await page.locator(".pond-wrap").getAttribute("data-level"); return data.levels[+lv - 1]; }
export async function wrongCells(page, data) {
  const q = await openPondData(page, data), sol = solutionCells(q);
  const vals = await page.locator(".cell").evaluateAll((es) => es.map((e) => e.dataset.value));
  return [...Array(q.n * q.n).keys()].filter((i) => !sol.includes(i) && !q.rocks.includes(i) && vals[i] === "0");
}
