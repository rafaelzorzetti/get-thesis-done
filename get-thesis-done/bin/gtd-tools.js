#!/usr/bin/env node

/**
 * GTD Tools -- CLI utility for Get Thesis Done workflow operations
 *
 * Standalone CLI for thesis-related commands. No dependency on gsd-tools.js.
 *
 * Usage: gtd-tools <command> [args] [--raw]
 *
 * Commands:
 *   init                          Scaffold a thesis project (FRAMEWORK.md, STYLE_GUIDE.md, STRUCTURE.md, LaTeX src/)
 *   progress                     Report chapter statuses from .planning/chapters/
 *   context --chapter N          Assemble canonical context bundle for a chapter
 *   compile                      Compile LaTeX thesis via latexmk
 *   cite-keys                    Extract and list citation keys from src/references.bib
 *   sanitize --chapter N         Escape LaTeX special characters in chapter DRAFT.tex prose
 *   validate-citations --chapter N  Cross-check \cite{} keys against references.bib
 *   summary extract --chapter N  Create SUMMARY.md template in chapter directory
 *   framework                    (Coming in Phase 3)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Shared Utilities --------------------------------------------------------

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function extractFrontmatter(content) {
  const frontmatter = {};
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return frontmatter;

  const yaml = match[1];
  const lines = yaml.split('\n');

  // Stack to track nested objects: [{obj, key, indent}]
  let stack = [{ obj: frontmatter, key: null, indent: -1 }];

  for (const line of lines) {
    if (line.trim() === '') continue;

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)/);
    if (keyMatch) {
      const key = keyMatch[2];
      const value = keyMatch[3].trim();

      if (value === '' || value === '[') {
        current.obj[key] = value === '[' ? [] : {};
        current.key = null;
        stack.push({ obj: current.obj[key], key: null, indent });
      } else if (value.startsWith('[') && value.endsWith(']')) {
        current.obj[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        current.key = null;
      } else {
        current.obj[key] = value.replace(/^["']|["']$/g, '');
        current.key = null;
      }
    } else if (line.trim().startsWith('- ')) {
      const itemValue = line.trim().slice(2).replace(/^["']|["']$/g, '');

      if (typeof current.obj === 'object' && !Array.isArray(current.obj) && Object.keys(current.obj).length === 0) {
        const parent = stack.length > 1 ? stack[stack.length - 2] : null;
        if (parent) {
          for (const k of Object.keys(parent.obj)) {
            if (parent.obj[k] === current.obj) {
              parent.obj[k] = [itemValue];
              current.obj = parent.obj[k];
              break;
            }
          }
        }
      } else if (Array.isArray(current.obj)) {
        current.obj.push(itemValue);
      }
    }
  }

  return frontmatter;
}

function reconstructFrontmatter(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.every(v => typeof v === 'string') && value.length <= 3 && value.join(', ').length < 60) {
        lines.push(`${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${typeof item === 'string' && (item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [subkey, subval] of Object.entries(value)) {
        if (subval === null || subval === undefined) continue;
        if (Array.isArray(subval)) {
          if (subval.length === 0) {
            lines.push(`  ${subkey}: []`);
          } else if (subval.every(v => typeof v === 'string') && subval.length <= 3 && subval.join(', ').length < 60) {
            lines.push(`  ${subkey}: [${subval.join(', ')}]`);
          } else {
            lines.push(`  ${subkey}:`);
            for (const item of subval) {
              lines.push(`    - ${typeof item === 'string' && (item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
            }
          }
        } else if (typeof subval === 'object') {
          lines.push(`  ${subkey}:`);
          for (const [subsubkey, subsubval] of Object.entries(subval)) {
            if (subsubval === null || subsubval === undefined) continue;
            if (Array.isArray(subsubval)) {
              if (subsubval.length === 0) {
                lines.push(`    ${subsubkey}: []`);
              } else {
                lines.push(`    ${subsubkey}:`);
                for (const item of subsubval) {
                  lines.push(`      - ${item}`);
                }
              }
            } else {
              lines.push(`    ${subsubkey}: ${subsubval}`);
            }
          }
        } else {
          const sv = String(subval);
          lines.push(`  ${subkey}: ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
        }
      }
    } else {
      const sv = String(value);
      if (sv.includes(':') || sv.includes('#') || sv.startsWith('[') || sv.startsWith('{')) {
        lines.push(`${key}: "${sv}"`);
      } else {
        lines.push(`${key}: ${sv}`);
      }
    }
  }
  return lines.join('\n');
}

function spliceFrontmatter(content, newObj) {
  const yamlStr = reconstructFrontmatter(newObj);
  const match = content.match(/^---\n[\s\S]+?\n---/);
  if (match) {
    return `---\n${yamlStr}\n---` + content.slice(match[0].length);
  }
  return `---\n${yamlStr}\n---\n\n` + content;
}

function execGit(cwd, args) {
  try {
    const escaped = args.map(a => {
      if (/^[a-zA-Z0-9._\-/=:@]+$/.test(a)) return a;
      return "'" + a.replace(/'/g, "'\\''") + "'";
    });
    const stdout = execSync('git ' + escaped.join(' '), {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status ?? 1,
      stdout: (err.stdout ?? '').toString().trim(),
      stderr: (err.stderr ?? '').toString().trim(),
    };
  }
}

function generateSlugInternal(text) {
  if (!text) return null;
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function output(result, raw, rawValue) {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }
  process.exit(0);
}

function error(message) {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

// --- Thesis Config -----------------------------------------------------------

/**
 * Read thesis configuration from .planning/thesis.json
 * @param {string} cwd - Current working directory
 * @returns {object|null} Thesis config or null if not found
 */
function readThesisConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'thesis.json');
  const content = safeReadFile(configPath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Resolve the norm based on language
 * @param {string} language - Language code (e.g., 'pt-BR', 'en', 'es')
 * @returns {string} Norm identifier
 */
function resolveNorm(language) {
  const lang = language.toLowerCase();
  if (lang.startsWith('pt')) return 'ABNT';
  if (lang.startsWith('es')) return 'APA';
  return 'APA';
}

// --- Template Engine ---------------------------------------------------------

/**
 * Process {{PLACEHOLDER}} replacements in template content
 * @param {string} content - Template content with {{PLACEHOLDER}} markers
 * @param {object} vars - Key-value pairs for replacement
 * @returns {string} Processed content
 */
function processTemplate(content, vars) {
  return content.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

// --- Thesis Commands ---------------------------------------------------------

function cmdInit(cwd, raw, language, level) {
  // Resolve template source directory
  const primaryTemplateDir = path.join(__dirname, '..', 'templates');
  const fallbackTemplateDir = path.join(cwd, '.claude', 'get-thesis-done', 'templates');
  let templateDir;
  if (fs.existsSync(primaryTemplateDir)) {
    templateDir = primaryTemplateDir;
  } else if (fs.existsSync(fallbackTemplateDir)) {
    templateDir = fallbackTemplateDir;
  } else {
    error('Thesis templates not found');
  }

  const planningDir = path.join(cwd, '.planning');
  const srcDir = path.join(cwd, 'src');

  // Determine thesis configuration
  const lang = language || 'pt-BR';
  const lvl = level || 'master';
  const norm = resolveNorm(lang);

  // Template variables for {{PLACEHOLDER}} engine
  const templateVars = {
    LANGUAGE: lang,
    LEVEL: lvl,
    NORM: norm,
    YEAR: new Date().getFullYear().toString(),
  };

  // Files to scaffold: [destination relative path, template filename]
  const fileMappings = [
    [path.join('.planning', 'FRAMEWORK.md'), 'framework.md'],
    [path.join('.planning', 'STYLE_GUIDE.md'), 'style-guide.md'],
    [path.join('.planning', 'STRUCTURE.md'), 'structure.md'],
    [path.join('.planning', 'FIGURES.md'), 'figures.md'],
    [path.join('src', 'main.tex'), 'main.tex'],
    [path.join('src', 'references.bib'), 'references.bib'],
  ];

  // Directories to create
  const directoryMappings = [
    path.join('.planning', 'chapters'),
    path.join('src', 'chapters'),
    path.join('src', 'references'),
    path.join('src', 'figures'),
  ];

  const files_created = [];
  const files_skipped = [];
  const directories_created = [];

  // Ensure .planning exists
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  // Ensure src exists
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  // Scaffold files
  for (const [relDest, templateName] of fileMappings) {
    const destPath = path.join(cwd, relDest);
    if (fs.existsSync(destPath)) {
      files_skipped.push(relDest);
    } else {
      const templatePath = path.join(templateDir, templateName);
      if (fs.existsSync(templatePath)) {
        let templateContent = fs.readFileSync(templatePath, 'utf-8');
        templateContent = processTemplate(templateContent, templateVars);
        // Ensure parent directory exists
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(destPath, templateContent, 'utf-8');
        files_created.push(relDest);
      } else {
        // Template file doesn't exist, create empty placeholder
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(destPath, '', 'utf-8');
        files_created.push(relDest);
      }
    }
  }

  // Create directories
  for (const relDir of directoryMappings) {
    const dirPath = path.join(cwd, relDir);
    fs.mkdirSync(dirPath, { recursive: true });
    directories_created.push(relDir);
  }

  // Write thesis config
  const thesisConfig = {
    language: lang,
    level: lvl,
    norm: norm,
    created: new Date().toISOString().split('T')[0],
  };
  const thesisConfigPath = path.join(planningDir, 'thesis.json');
  if (!fs.existsSync(thesisConfigPath)) {
    fs.writeFileSync(thesisConfigPath, JSON.stringify(thesisConfig, null, 2) + '\n', 'utf-8');
    files_created.push(path.join('.planning', 'thesis.json'));
  } else {
    files_skipped.push(path.join('.planning', 'thesis.json'));
  }

  output({
    scaffolded: true,
    files_created,
    files_skipped,
    directories_created,
    thesis_config: thesisConfig,
  }, raw, `Thesis project scaffolded: ${files_created.length} files created, ${files_skipped.length} skipped\nLevel: ${lvl}, Language: ${lang}, Norm: ${norm}`);
}

function cmdProgress(cwd, raw) {
  const planningChaptersDir = path.join(cwd, '.planning', 'chapters');
  const srcChaptersDir = path.join(cwd, 'src', 'chapters');

  if (!fs.existsSync(planningChaptersDir)) {
    error('No thesis project found. Run: gtd-tools.js init');
  }

  // Read thesis config for level info
  const thesisConfig = readThesisConfig(cwd);

  const entries = fs.readdirSync(planningChaptersDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => {
    const aNum = parseFloat(a.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
    const bNum = parseFloat(b.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
    return aNum - bNum;
  });

  const chapters = [];

  for (const dirName of dirs) {
    const chapterMatch = dirName.match(/^(\d+(?:\.\d+)?)/);
    const chapterNum = chapterMatch ? chapterMatch[1] : '0';
    const padded = String(parseInt(chapterNum)).padStart(2, '0');
    const dirSlug = dirName.replace(/^\d+(?:\.\d+)?-?/, '');
    const chapterDir = path.join(planningChaptersDir, dirName);

    // Determine status (highest status wins)
    let status = 'scaffolded';

    // Check for PLAN.md
    const chapterFiles = fs.readdirSync(chapterDir);
    const hasPlan = chapterFiles.some(f => f.match(/-PLAN\.md$/i));
    if (hasPlan) status = 'planned';

    // Check for DRAFT.tex (LaTeX draft, not .md)
    const hasDraft = chapterFiles.some(f => f.match(/-DRAFT\.tex$/i));
    if (hasDraft) status = 'drafted';

    // Check for REVIEW.md
    const hasReview = chapterFiles.some(f => f.match(/-REVIEW\.md$/i));
    if (hasReview) status = 'reviewed';

    // Check for final .tex file in src/chapters/
    if (fs.existsSync(srcChaptersDir)) {
      const srcFiles = fs.readdirSync(srcChaptersDir);
      const hasFinal = srcFiles.some(f => f.match(new RegExp(`^${padded}.*\\.tex$`, 'i')));
      if (hasFinal) status = 'final';
    }

    chapters.push({
      number: parseInt(chapterNum),
      name: dirSlug || dirName,
      status,
    });
  }

  const total = chapters.length;
  const planned = chapters.filter(c => c.status === 'planned').length;
  const drafted = chapters.filter(c => c.status === 'drafted').length;
  const reviewed = chapters.filter(c => c.status === 'reviewed').length;
  const final_ = chapters.filter(c => c.status === 'final').length;
  const percent_complete = total > 0 ? Math.round((final_ / total) * 100) : 0;

  // Build formatted table for raw output
  const lines = [];
  const levelLabel = thesisConfig ? ` (${thesisConfig.level})` : '';
  lines.push(`Thesis Progress: ${total} chapters${levelLabel}`);
  lines.push('');
  lines.push('Ch | Name                              | Status');
  lines.push('---|-----------------------------------|----------');
  for (const ch of chapters) {
    const num = String(ch.number).padStart(2, '0');
    const name = (ch.name || '(unnamed)').padEnd(35).slice(0, 35);
    lines.push(`${num} | ${name} | ${ch.status}`);
  }
  lines.push('');
  lines.push(`Summary: ${final_} final, ${drafted} drafted, ${reviewed} reviewed, ${planned} planned`);
  lines.push(`Complete: ${percent_complete}%`);
  const formattedTable = lines.join('\n');

  output({
    chapters,
    total,
    planned,
    drafted,
    reviewed,
    final: final_,
    percent_complete,
    ...(thesisConfig ? { thesis_level: thesisConfig.level, thesis_language: thesisConfig.language } : {}),
  }, raw, formattedTable);
}

function extractChapterStructure(structureContent, chapterNum) {
  const padded = String(chapterNum).padStart(2, '0');
  const pattern = new RegExp(
    '(### Chapter ' + padded + ':[\\s\\S]*?)(?=\\n### Chapter \\d|\\n## |$)'
  );
  const match = structureContent.match(pattern);
  return match ? match[1].trim() : null;
}

function gatherPriorSummaries(cwd, chapterNum) {
  const chaptersDir = path.join(cwd, '.planning', 'chapters');
  if (!fs.existsSync(chaptersDir)) return [];

  let entries;
  try {
    entries = fs.readdirSync(chaptersDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => {
      const numMatch = name.match(/^(\d+(?:\.\d+)?)/);
      if (!numMatch) return false;
      return parseFloat(numMatch[1]) < parseInt(chapterNum);
    })
    .sort((a, b) => {
      const aNum = parseFloat(a.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      const bNum = parseFloat(b.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      return aNum - bNum;
    });

  const summaries = [];
  for (const dirName of dirs) {
    const dirPath = path.join(chaptersDir, dirName);
    const files = fs.readdirSync(dirPath);
    const summaryFiles = files.filter(f => f.match(/-SUMMARY\.md$/i));
    for (const sf of summaryFiles) {
      const content = safeReadFile(path.join(dirPath, sf));
      if (content) summaries.push(content);
    }
  }
  return summaries;
}

function cmdContext(cwd, chapter, raw) {
  if (!chapter) error('--chapter required. Usage: context --chapter N');
  if (isNaN(parseInt(chapter))) error('Chapter must be a number');

  const planningDir = path.join(cwd, '.planning');

  // Read thesis config for header
  const thesisConfig = readThesisConfig(cwd);

  const framework = safeReadFile(path.join(planningDir, 'FRAMEWORK.md'));
  if (!framework) error('FRAMEWORK.md not found in .planning/. Run: gtd-tools.js init');

  const style = safeReadFile(path.join(planningDir, 'STYLE_GUIDE.md'));
  if (!style) error('STYLE_GUIDE.md not found in .planning/. Run: gtd-tools.js init');

  const structure = safeReadFile(path.join(planningDir, 'STRUCTURE.md'));
  if (!structure) error('STRUCTURE.md not found in .planning/. Run: gtd-tools.js init');

  const chapterStructure = extractChapterStructure(structure, chapter);
  const summaries = gatherPriorSummaries(cwd, chapter);

  // Build header with thesis config
  const headerLines = ['# Canonical Context Bundle'];
  if (thesisConfig) {
    headerLines.push(`**Thesis Level:** ${thesisConfig.level} | **Language:** ${thesisConfig.language} | **Norm:** ${thesisConfig.norm}`);
  }
  headerLines.push('## Chapter ' + chapter + ' Context');

  const bundle = [
    headerLines.join('\n'),
    '',
    '---',
    '## FRAMEWORK',
    framework,
    '---',
    '## STYLE GUIDE',
    style,
    '---',
    '## CHAPTER CONTRACT',
    chapterStructure || '(No chapter entry found in STRUCTURE.md)',
    '---',
    '## PRIOR CHAPTER SUMMARIES',
    summaries.length > 0
      ? summaries.join('\n\n---\n\n')
      : '(No prior summaries -- this is chapter 1 or no summaries exist yet)',
  ].join('\n\n');

  const tokenEstimate = Math.round(bundle.split(/\s+/).length * 1.3);

  output({
    chapter: parseInt(chapter),
    has_framework: true,
    has_style: true,
    has_structure: !!chapterStructure,
    summary_count: summaries.length,
    token_estimate: tokenEstimate,
    ...(thesisConfig ? { thesis_level: thesisConfig.level, thesis_language: thesisConfig.language } : {}),
    ...(tokenEstimate > 15000 ? { warning: 'Context bundle exceeds 15K token estimate. Consider archiving resolved FRAMEWORK.md entries.' } : {}),
    bundle,
  }, raw, bundle);
}

function cmdCompile(cwd, raw, clean) {
  const mainTexPath = path.join(cwd, 'src', 'main.tex');

  // Check main.tex exists
  if (!fs.existsSync(mainTexPath)) {
    error('src/main.tex not found. Run: gtd-tools.js init');
  }

  // Check latexmk is installed
  try {
    execSync('which latexmk', { stdio: 'pipe', encoding: 'utf-8' });
  } catch {
    error('latexmk not found. Install it with:\n  Ubuntu/Debian: sudo apt install latexmk texlive-full\n  macOS: brew install --cask mactex\n  Windows: Install MiKTeX or TeX Live');
  }

  const outputDir = path.join(cwd, 'src', 'output');

  // Clean if requested
  if (clean) {
    try {
      execSync(`latexmk -C -outdir="${outputDir}" "${mainTexPath}"`, {
        cwd: path.join(cwd, 'src'),
        stdio: 'pipe',
        encoding: 'utf-8',
      });
    } catch {
      // Ignore clean errors
    }
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // --- Figure Pre-Processing Hook (Phase 5) ---
  const figureResult = preProcessFigures(cwd);
  // When Phase 5 implements this, check figureResult.errors

  // Run latexmk
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    const result = execSync(
      `latexmk -pdf -pdflatex="pdflatex -interaction=nonstopmode -halt-on-error" -bibtex-cond1 -outdir="${outputDir}" "${mainTexPath}"`,
      {
        cwd: path.join(cwd, 'src'),
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 120000,
      }
    );
    stdout = result;
  } catch (err) {
    exitCode = err.status ?? 1;
    stdout = (err.stdout ?? '').toString();
    stderr = (err.stderr ?? '').toString();
  }

  const success = exitCode === 0;
  const pdfPath = path.join('src', 'output', 'main.pdf');

  // Extract errors and warnings from output
  const allOutput = stdout + '\n' + stderr;
  const errors = [];
  const warnings = [];

  for (const line of allOutput.split('\n')) {
    if (line.startsWith('!') || line.includes('Error')) {
      errors.push(line.trim());
    } else if (line.includes('Warning') || line.includes('warning')) {
      warnings.push(line.trim());
    }
  }

  // Check if PDF was actually created
  const pdfExists = fs.existsSync(path.join(cwd, pdfPath));

  output({
    success: success && pdfExists,
    pdf_path: success && pdfExists ? pdfPath : null,
    errors: errors.slice(0, 20),
    warnings: warnings.slice(0, 20),
  }, raw, success && pdfExists
    ? `Compilation successful: ${pdfPath}`
    : `Compilation failed. ${errors.length} error(s):\n${errors.slice(0, 5).join('\n')}`
  );
}

// --- Citation & Sanitization Commands ----------------------------------------

/**
 * Extract citation keys from .bib file content.
 * Matches @type{key, patterns (e.g., @article{smith2020,).
 * @param {string} bibContent - Raw .bib file content
 * @returns {Set<string>} Set of citation keys
 */
function extractBibKeys(bibContent) {
  const keys = new Set();
  const pattern = /@\w+\{([^,\s]+)/g;
  let match;
  while ((match = pattern.exec(bibContent)) !== null) {
    keys.add(match[1].trim());
  }
  return keys;
}

/**
 * List all citation keys from src/references.bib, sorted alphabetically.
 * @param {string} cwd - Current working directory
 * @param {boolean} raw - Whether to output raw text
 */
function cmdCiteKeys(cwd, raw) {
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const content = safeReadFile(bibPath);
  if (!content) error('references.bib not found at src/references.bib');

  const keys = extractBibKeys(content);
  const sortedKeys = [...keys].sort();

  output({
    count: sortedKeys.length,
    keys: sortedKeys,
    bib_path: 'src/references.bib',
  }, raw, sortedKeys.join('\n'));
}

/**
 * Context-aware LaTeX sanitization.
 * Escapes &, %, $, #, _ in prose text while preserving them inside
 * LaTeX commands, math mode, and comments.
 *
 * Approach:
 * 1. Identify protected zones (commands, math, comments)
 * 2. Replace protected zones with null-byte placeholders
 * 3. Escape special characters in remaining prose
 * 4. Restore protected zones
 *
 * @param {string} content - Raw LaTeX content
 * @returns {string} Sanitized content
 */
function sanitizeLatex(content) {
  const protectedZones = [];
  let placeholder = '\0';

  // Collect protected zones in order of specificity
  const patterns = [
    /^%.*$/gm,                                         // % comment lines
    /\$\$[\s\S]*?\$\$/g,                               // Display math $$...$$
    /\$[^$\n]+\$/g,                                    // Inline math $...$
    /\\\[[\s\S]*?\\\]/g,                               // Display math \[...\]
    /\\[a-zA-Z]+\*?(?:\[[^\]]*\])*\{[^}]*\}/g,        // LaTeX commands with arguments
    /\\[a-zA-Z]+\*?/g,                                 // Bare LaTeX commands
  ];

  let working = content;

  for (const pat of patterns) {
    working = working.replace(pat, (match) => {
      const idx = protectedZones.length;
      protectedZones.push(match);
      return placeholder + idx + placeholder;
    });
  }

  // Escape special characters in prose (only if not already escaped)
  const escapes = [
    [/(?<!\\)&/g, '\\&'],
    [/(?<!\\)%/g, '\\%'],
    [/(?<!\\)\$/g, '\\$'],
    [/(?<!\\)#/g, '\\#'],
    [/(?<!\\)_/g, '\\_'],
  ];

  for (const [pattern, replacement] of escapes) {
    working = working.replace(pattern, replacement);
  }

  // Restore protected zones
  for (let i = protectedZones.length - 1; i >= 0; i--) {
    working = working.split(placeholder + i + placeholder).join(protectedZones[i]);
  }

  return working;
}

/**
 * Count character-level differences between two strings.
 * @param {string} a - Original string
 * @param {string} b - Modified string
 * @returns {number} Number of differing characters
 */
function countDifferences(a, b) {
  let count = 0;
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}

/**
 * Sanitize LaTeX special characters in a chapter's DRAFT.tex file.
 * @param {string} cwd - Current working directory
 * @param {string} chapter - Chapter number
 * @param {boolean} raw - Whether to output raw text
 */
function cmdSanitize(cwd, chapter, raw) {
  if (!chapter) error('--chapter required. Usage: sanitize --chapter N');

  // Find the chapter directory
  const chaptersDir = path.join(cwd, '.planning', 'chapters');
  const padded = String(parseInt(chapter)).padStart(2, '0');

  let entries;
  try {
    entries = fs.readdirSync(chaptersDir, { withFileTypes: true });
  } catch {
    error('No .planning/chapters/ directory found');
  }

  const chapterDir = entries.find(e => e.isDirectory() && e.name.startsWith(padded + '-'));
  if (!chapterDir) error('No chapter directory found for chapter ' + chapter);

  const dirPath = path.join(chaptersDir, chapterDir.name);
  const files = fs.readdirSync(dirPath);
  const draftFile = files.find(f => f.match(new RegExp(padded + '-01-DRAFT\\.tex$', 'i')));
  if (!draftFile) error('No DRAFT.tex found in ' + dirPath);

  const draftPath = path.join(dirPath, draftFile);
  const original = fs.readFileSync(draftPath, 'utf-8');
  const sanitized = sanitizeLatex(original);

  const changesMade = original !== sanitized ? countDifferences(original, sanitized) : 0;

  if (changesMade > 0) {
    fs.writeFileSync(draftPath, sanitized, 'utf-8');
  }

  output({
    chapter: parseInt(chapter),
    file: draftPath,
    changes_made: changesMade,
    sanitized: changesMade > 0,
  }, raw, changesMade > 0
    ? 'Sanitized ' + draftFile + ': ' + changesMade + ' character(s) escaped'
    : 'No changes needed in ' + draftFile
  );
}

// --- Citation Validation & Summary Commands ----------------------------------

/**
 * Validate citation keys in LaTeX content against known .bib keys.
 * Supports all biblatex citation commands: \cite, \textcite, \autocite,
 * \parencite, \footcite, \cites, \Cite, \Textcite, plus starred variants
 * and optional arguments.
 *
 * @param {string} texContent - LaTeX file content
 * @param {Set<string>} validKeys - Set of valid .bib keys
 * @returns {{ valid: string[], invalid: Array<{key: string, command: string, position: number}> }}
 */
function validateCitations(texContent, validKeys) {
  const issues = [];
  const valid = [];
  // Match biblatex citation commands with optional args and key groups
  const citePattern = /\\(?:[Tt]ext|[Aa]uto|[Pp]aren|[Ff]oot)?[Cc]ite[sp]?\*?(?:\[[^\]]*\])*\{([^}]+)\}/g;
  let match;
  while ((match = citePattern.exec(texContent)) !== null) {
    const keysStr = match[1];
    const citedKeys = keysStr.split(',').map(k => k.trim());
    for (const key of citedKeys) {
      if (validKeys.has(key)) {
        valid.push(key);
      } else {
        issues.push({
          key,
          command: match[0],
          position: match.index,
        });
      }
    }
  }
  return { valid: [...new Set(valid)], invalid: issues };
}

/**
 * Cross-check citations in a chapter DRAFT.tex against references.bib.
 * @param {string} cwd - Current working directory
 * @param {string} chapter - Chapter number
 * @param {boolean} raw - Whether to output raw text
 */
function cmdValidateCitations(cwd, chapter, raw) {
  if (!chapter) error('--chapter required. Usage: validate-citations --chapter N');

  // Read .bib keys
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const bibContent = safeReadFile(bibPath);
  if (!bibContent) error('references.bib not found at src/references.bib');
  const validKeys = extractBibKeys(bibContent);

  // Find chapter DRAFT.tex
  const chaptersDir = path.join(cwd, '.planning', 'chapters');
  const padded = String(parseInt(chapter)).padStart(2, '0');

  let entries;
  try {
    entries = fs.readdirSync(chaptersDir, { withFileTypes: true });
  } catch {
    error('No .planning/chapters/ directory found');
  }

  const chapterDir = entries.find(e => e.isDirectory() && e.name.startsWith(padded + '-'));
  if (!chapterDir) error('No chapter directory found for chapter ' + chapter);

  const dirPath = path.join(chaptersDir, chapterDir.name);
  const files = fs.readdirSync(dirPath);
  const draftFile = files.find(f => f.match(new RegExp(padded + '-01-DRAFT\\.tex$', 'i')));
  if (!draftFile) error('No DRAFT.tex found. Write the chapter first: /gtd:write-chapter ' + chapter);

  const texContent = fs.readFileSync(path.join(dirPath, draftFile), 'utf-8');
  const result = validateCitations(texContent, validKeys);

  output({
    chapter: parseInt(chapter),
    valid_count: result.valid.length,
    invalid_count: result.invalid.length,
    valid_keys: result.valid,
    invalid_keys: result.invalid,
    bib_keys_available: validKeys.size,
  }, raw, result.invalid.length === 0
    ? 'All ' + result.valid.length + ' citations valid against references.bib (' + validKeys.size + ' keys available)'
    : result.invalid.length + ' invalid citation(s) found:\n' + result.invalid.map(i => '  - \\cite{' + i.key + '} not in references.bib').join('\n')
  );
}

/**
 * Create a SUMMARY.md template in the chapter directory.
 * Does NOT overwrite existing SUMMARY.md files.
 * @param {string} cwd - Current working directory
 * @param {string} chapter - Chapter number
 * @param {boolean} raw - Whether to output raw text
 */
function cmdSummaryExtract(cwd, chapter, raw) {
  if (!chapter) error('--chapter required. Usage: summary extract --chapter N');

  const chaptersDir = path.join(cwd, '.planning', 'chapters');
  const padded = String(parseInt(chapter)).padStart(2, '0');

  let entries;
  try {
    entries = fs.readdirSync(chaptersDir, { withFileTypes: true });
  } catch {
    error('No .planning/chapters/ directory found');
  }

  const chapterDir = entries.find(e => e.isDirectory() && e.name.startsWith(padded + '-'));
  if (!chapterDir) error('No chapter directory found for chapter ' + chapter);

  const dirPath = path.join(chaptersDir, chapterDir.name);
  const summaryPath = path.join(dirPath, padded + '-01-SUMMARY.md');

  // Do not overwrite existing summary
  if (fs.existsSync(summaryPath)) {
    output({
      chapter: parseInt(chapter),
      created: false,
      reason: 'SUMMARY.md already exists',
      path: summaryPath,
    }, raw, 'SUMMARY.md already exists at ' + summaryPath);
    return;
  }

  const template = [
    '---',
    'type: chapter-summary',
    'chapter: ' + padded,
    'status: template',
    'created: ' + new Date().toISOString().split('T')[0],
    '---',
    '',
    '# Chapter ' + padded + ' Summary',
    '',
    '## Key Arguments Made',
    '',
    '[To be filled by summary-writer agent after review approval]',
    '',
    '## Terms Introduced or Developed',
    '',
    '[Canonical terms from FRAMEWORK.md that were advanced in this chapter]',
    '',
    '## Threads Advanced',
    '',
    '[Continuity map threads that were pushed forward]',
    '',
    '## Methodological Contributions',
    '',
    '[Methods applied and their outputs]',
    '',
    '## Citations Used',
    '',
    '[Key citations referenced in this chapter]',
    '',
    '## Connections',
    '',
    '- **Built on:** [What was used from prior chapters]',
    '- **Sets up:** [What future chapters can reference from this one]',
    '',
    '## Open Threads',
    '',
    '[Arguments or themes opened but not resolved -- for future chapters to address]',
    '',
  ].join('\n');

  fs.writeFileSync(summaryPath, template, 'utf-8');

  output({
    chapter: parseInt(chapter),
    created: true,
    path: summaryPath,
  }, raw, 'Created SUMMARY.md template at ' + summaryPath);
}

// --- Figure Pre-Processing Hook (Phase 5) ------------------------------------
// Phase 5 will insert figure export pipeline here:
// - Excalidraw -> PDF export
// - Python scripts -> PNG/PDF generation
// - Mermaid -> PNG/PDF conversion
// TikZ figures compile inline (no pre-processing needed)

/**
 * Pre-process figures before LaTeX compilation.
 * Currently a no-op hook -- Phase 5 implements this.
 * @param {string} cwd - Current working directory
 * @returns {{ processed: number, errors: string[] }}
 */
function preProcessFigures(cwd) {
  // No-op: Phase 5 implements this
  return { processed: 0, errors: [] };
}

// --- CLI Router --------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];
  const cwd = process.cwd();

  if (!command) {
    error('Usage: gtd-tools <command> [args] [--raw]\nCommands: init, progress, context, compile, cite-keys, sanitize, validate-citations, summary');
  }

  switch (command) {
    case 'init': {
      const langIdx = args.indexOf('--language');
      const language = langIdx !== -1 ? args[langIdx + 1] : null;
      const levelIdx = args.indexOf('--level');
      const level = levelIdx !== -1 ? args[levelIdx + 1] : null;
      cmdInit(cwd, raw, language, level);
      break;
    }

    case 'progress': {
      cmdProgress(cwd, raw);
      break;
    }

    case 'context': {
      const chapterIdx = args.indexOf('--chapter');
      cmdContext(cwd, chapterIdx !== -1 ? args[chapterIdx + 1] : null, raw);
      break;
    }

    case 'compile': {
      const clean = args.includes('--clean');
      cmdCompile(cwd, raw, clean);
      break;
    }

    case 'cite-keys': {
      cmdCiteKeys(cwd, raw);
      break;
    }

    case 'sanitize': {
      const chapterIdx = args.indexOf('--chapter');
      cmdSanitize(cwd, chapterIdx !== -1 ? args[chapterIdx + 1] : null, raw);
      break;
    }

    case 'validate-citations': {
      const chapterIdx = args.indexOf('--chapter');
      cmdValidateCitations(cwd, chapterIdx !== -1 ? args[chapterIdx + 1] : null, raw);
      break;
    }

    case 'summary': {
      const subcommand = args[1];
      if (subcommand === 'extract') {
        const chapterIdx = args.indexOf('--chapter');
        cmdSummaryExtract(cwd, chapterIdx !== -1 ? args[chapterIdx + 1] : null, raw);
      } else {
        error('Usage: summary extract --chapter N');
      }
      break;
    }

    case 'framework': {
      error('Framework update command coming in Phase 3. Use context --chapter N for now.');
      break;
    }

    default: {
      error('Unknown command: ' + command + '\nUsage: gtd-tools <command> [args] [--raw]\nCommands: init, progress, context, compile, cite-keys, sanitize, validate-citations, summary');
    }
  }
}

main();
