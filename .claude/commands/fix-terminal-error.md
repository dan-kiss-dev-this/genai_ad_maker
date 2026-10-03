The user has a runtime error in their terminal. Diagnose and fix it.

## Instructions

1. The user will provide error output (either pasted or described). If no error text is provided, ask them to paste it.

2. Analyze the error:
   - Identify the error type (compile error, runtime exception, network error, missing dependency, type error, syntax error, permission error, etc.)
   - Find the root file and line number from the stack trace
   - Distinguish between application code errors vs dependency/config errors

3. Read the relevant source file(s) at the indicated line numbers to understand the surrounding context.

4. Propose a fix:
   - Explain the root cause in one sentence
   - Apply the fix directly (prefer minimal, targeted edits)
   - If the fix is ambiguous or risky, ask before applying

5. After fixing, suggest how to verify (e.g., "restart the server", "run the build again", "re-run the test").

## Usage

```
/fix-terminal-error <paste error output here>
```
