# Rule format

The format a convention document uses so `conventions-check` reads its rules exactly. Any document in a repo may use it; a document that does not is still read, and tagged unstructured.

## One rule per bullet

```markdown
- The `query` package imports nothing from `com.example.domain`. scope: `src/query/**` check: `grep -rn "import com.example.domain" src/query`
- A boolean is named for what it holds (`isActive`), not its type.
- Every type, step and grouping needs a reason.
```

A rule is one bullet and states one thing. Two things are two bullets. A rule is a plain statement of what holds in the code. Every rule counts the same, so nothing in the wording marks one as stronger than another.

| Part | Required | Meaning |
| --- | --- | --- |
| `scope:` | no | A path or glob the rule applies to. Without it, the rule applies to the document's own directory and everything below it. |
| `check:` | no | How to verify the rule mechanically: a literal shell command (run as written), or prose the check turns into a command. A rule with a `check:` is mechanical; a rule without one is judgment. |

## Skill pointers

A line saying the project follows a skill (for example "Writing or reviewing comments in code: this project follows the `comment-guidelines` skill.") is one judgment rule. The check reads the skill and reports violations against its guidance.

## Rules that read badly

A rule that names no observable thing ("write good code") cannot be checked; it is reported as a rule with no violations found and low confidence. Word a rule so a reader could point at a line that breaks it.
