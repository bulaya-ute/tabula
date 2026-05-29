# Column Populator — Design Spec

## Overview

A tool for populating or transforming columns using composable, named rules. Rules are defined in a global **Rules Library**, persist across sessions via `localStorage`, and are assigned to columns in the input file.

---

## Core concepts

### Pipeline model

A rule is an ordered list of **steps**. Steps form a pipeline where the output of each step becomes the primary input of the next:

```
[seed value] → step 1 → step 2 → step 3 → [written to target cell]
```

Every step:
- Receives a **primary input** (string)
- Produces a **primary output** (string)

The first step's primary input is the **seed** — configured at rule-assignment time. The last step's output is written to the target column cell.

### Seed input

When assigning a rule to a column, the user specifies what the first step receives:
- The **target cell's own value** (default; useful when the column already has data to transform)
- The **value of any other column** in the same row (required when the target column is blank, e.g. populating a classification ID from an item name column)

---

## Built-in step primitives

| Step | Description | Extra arguments |
|------|-------------|-----------------|
| `trim_leading` | Strip leading whitespace | — |
| `trim_trailing` | Strip trailing whitespace | — |
| `trim_all` | Strip both ends | — |
| `uppercase` | Convert to uppercase | — |
| `lowercase` | Convert to lowercase | — |
| `titlecase` | Capitalise first letter of each word | — |
| `round` | Round to N decimal places | `decimals: number` |
| `read_column` | Ignore primary input; output a named column's value from the current row | `column: string` |
| `read_row_index` | Output the 0-based row index of the current row | — |
| `read_col_index` | Output the 0-based index of the target column | — |
| `lookup_match` | Find the closest match in a lookup file column | see below |
| `fetch_by_index` | Return a value from a lookup file at a given row index | see below |

### `lookup_match` configuration

| Parameter | Type | Description |
|-----------|------|-------------|
| `lookup_ref` | `(file_alias, match_column)` | Which lookup file and which column to search against |
| `algorithm` | `fuzzy` \| `levenshtein` | Matching algorithm; both normalised to 0.0–1.0 similarity score |
| `threshold` | `0.0–1.0` | Minimum similarity for a valid match |
| `output_type` | `value` \| `index` \| `confidence` | What to output: the matched string, the row index, or the similarity score |
| `default_value` | `string` | Written when no match meets the threshold (default: empty string) |

**`output_type` values:**
- `value` — the value of `match_column` in the best matching row (the matched string itself)
- `index` — the 0-based row index of the best matching row in the lookup file
- `confidence` — the similarity score (0.0–1.0) as a string

To retrieve a *different* column from the matched row (e.g. a classification ID), use `output_type: index` and chain a `fetch_by_index` step.

### `fetch_by_index` configuration

| Parameter | Type | Description |
|-----------|------|-------------|
| `lookup_ref` | `(file_alias, column_name)` | Which lookup file and which column to read from |
| `default_value` | `string` | Written when the index is invalid or out of range (default: `#ERROR`) |

Primary input: a row index (integer string), typically from a preceding `lookup_match` step with `output_type: index`.

---

## Example: populate classification_id from item names

**Setup:**
- Input file: `item_name`, `classification_id` *(blank)*
- Lookup file (alias: `classes`): `item_name`, `classification_id`

**Rule: "Classify by name"**

| Step | Configuration |
|------|---------------|
| `read_column` | `column = "item_name"` |
| `lookup_match` | `lookup_ref = ("classes", "item_name")`, `algorithm = fuzzy`, `threshold = 0.75`, `output_type = index`, `default_value = "-1"` |
| `fetch_by_index` | `lookup_ref = ("classes", "classification_id")`, `default_value = "#NO_MATCH"` |

Seed: target cell value (blank — immediately replaced by the `read_column` step).
Applied to: `classification_id` column.

---

## User-defined rules

Users can create named rules composed of built-in steps and/or other user-defined rules. Rules are stored in `localStorage` and available globally via the Rules Library.

### Argument promotion

Every step argument can be either:
- **Bound** — value fixed at rule-definition time (e.g. always search the `classes` lookup file)
- **Unbound** — left open; promoted to the enclosing rule's signature to be filled in at a higher level

When a composite rule includes a user-defined rule step, any unbound arguments of that nested rule are promoted further up to the parent rule's signature. This continues recursively — unbound arguments always bubble up to the outermost rule.

At assignment time, the user fills in the values for all promoted (unbound) arguments.

**Auto-labelling of promoted arguments:** by step position and argument name (e.g. `lookup_ref (step 2)`, `column (step 1)`).

### Example: flexible vs. rigid rules

- **Rigid rule** — `lookup_ref` bound to `("classes", "item_name")`: always searches the same file and column; no argument needed at assignment time.
- **Flexible rule** — `lookup_ref` unbound: the user specifies the file and column when assigning the rule to a column.

A user can create a rule referencing a specific alias (e.g. `classes`) that will fail gracefully if that alias is not present. This is by design — the user is responsible for ensuring referenced files are uploaded.

### Circular reference detection

When adding a user-defined rule step inside a rule definition, the app performs a DFS traversal to detect cycles (both direct: A → A, and indirect: A → B → A). A warning is shown if a cycle would be introduced. The user can proceed at their own risk.

---

## Lookup files

Multiple lookup files can be uploaded per session. Each is assigned a **user-configurable alias** that defaults to its position (`file1`, `file2`, etc.). Rules reference lookup files by alias. If a referenced alias is absent at run time, the affected step uses its configured `default_value` and processing continues.

---

## Rules Library

A global panel accessible from the app header (available from any screen, not just the Column Populator tool). Rules may eventually be usable by other tools.

**Operations:**
- View all saved rules
- Create new rule (name + add/reorder steps)
- Edit existing rule
- Rename rule
- Delete rule

Rules are serialised to JSON and stored in `localStorage` under a single key.

---

## Tool UI flow

1. **Upload input file**
2. **Upload lookup files** — add one or more files; assign/edit aliases
3. **Assign rules to columns** — for each column to populate/transform:
   - Select a rule from the Rules Library (or create one inline)
   - Configure the seed input (cell value or a specific column)
   - Fill in any promoted (unbound) arguments
4. **Preview** — first N rows of the output
5. **Download**

---

## Open questions / deferred decisions

- Should columns without a rule assigned pass through unchanged, or should only assigned columns appear in the output? (Likely: all columns pass through; only assigned ones are modified.)
- Rule versioning or migration if the localStorage schema changes in a future release.
- Conditional rules (if cell value equals X, apply rule Y) — deferred to a future iteration.
