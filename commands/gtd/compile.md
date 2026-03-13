---
name: gtd:compile
description: Compile thesis LaTeX to PDF using latexmk
allowed-tools:
  - Read
  - Bash
---
<objective>
Compile the thesis LaTeX project to PDF using gtd-tools.js compile (which wraps latexmk).
Display results with actionable error diagnostics when compilation fails.
</objective>

<process>
1. Run compilation from the project root:

   ```bash
   node ~/.claude/get-thesis-done/bin/gtd-tools.js compile
   ```

   If the user requests a clean build (e.g., "clean compile", "fresh build"), run with
   the `--clean` flag first to clear auxiliary files:

   ```bash
   node ~/.claude/get-thesis-done/bin/gtd-tools.js compile --clean
   ```

2. Display results based on the JSON output:

   **On success:**
   ```
   PDF compiled successfully: src/output/main.pdf

   Compilation details:
   - Warnings: [count] (if any)
   ```

   If there are warnings, list them with brief explanations.

   **On failure:** Show extracted error messages with actionable suggestions.
   Common error patterns and recommended fixes:

   - **"Undefined control sequence"**
     Likely cause: Missing LaTeX package or misspelled command.
     Fix: Check the command name and ensure the required package is in the preamble.

   - **"Missing $ inserted"**
     Likely cause: Special character used outside math mode (underscore, caret, etc.).
     Fix: Wrap the expression in `$...$` or escape the character.

   - **"File `chapters/XX-name' not found"**
     Likely cause: A `\include{}` in main.tex references a chapter file that does not exist.
     Fix: Create the missing chapter file or update main.tex to remove the reference.

   - **"I found no \\citation commands"**
     Likely cause: No `\cite{}` commands in the text yet, so biber has nothing to process.
     Fix: This is normal for a new project. Add citations as you write chapters.

   - **"Package babel Error: Unknown option"**
     Likely cause: Language option in main.tex does not match an installed babel language.
     Fix: Verify the language option matches your TeX Live installation.

   - **"Emergency stop"**
     Likely cause: Critical syntax error preventing compilation.
     Fix: Check the last few lines before the error for unclosed braces or environments.

   - **"LaTeX Error: Environment X undefined"**
     Likely cause: Missing package that defines the environment.
     Fix: Identify which package provides the environment and add it to the preamble.

3. If latexmk is not installed (command not found):
   ```
   LaTeX compilation requires latexmk (part of TeX Live).

   Install on Ubuntu/Debian:
     sudo apt install texlive-full

   Install on macOS:
     brew install --cask mactex

   Or download from: https://tug.org/texlive/

   After installing, run /gtd:compile again.
   ```
</process>
