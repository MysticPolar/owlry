# Sets

`setA.json` is the fast-evolution set the Optimizer sees.

Set B lives in `../runner-only/setB.json`: no optimizer input builder has a path into that folder, and a Set B text must never be copied here. Give the Optimizer agent a filesystem scope that excludes `runner-only/` (and `<lineage>/validations/`) when it runs as a subagent.
