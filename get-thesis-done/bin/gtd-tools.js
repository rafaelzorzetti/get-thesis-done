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
 *   framework update --chapter N  Update FRAMEWORK.md frontmatter/changelog after chapter review
 *   import-bib --file path.bib  Import entries from external .bib file (deduplicates by key)
 *   fetch-doi --doi DOI          Fetch BibTeX from Crossref via DOI content negotiation
 *   pdf-meta --file path.pdf    Extract DOI from PDF metadata and fetch BibTeX
 *   validate-refs                Cross-chapter citation validation (missing/orphaned)
 *   pdf-refs                     Cross-reference bib keys with PDFs in src/references/
 *   register-figure              Register a figure in FIGURES.md catalog
 *   validate-figs                Cross-reference figure validation (catalog vs chapters)
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
  if (figureResult.errors.length > 0) {
    process.stderr.write('Figure pre-processing warnings:\n');
    for (const err of figureResult.errors) {
      process.stderr.write('  - ' + err + '\n');
    }
  }

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
    figures_processed: figureResult.processed,
    figure_errors: figureResult.errors,
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

/**
 * Export an Excalidraw file to PDF.
 * Tries excalirender first, falls back to npx excalidraw-to-svg + rsvg-convert.
 * @param {string} srcPath - Path to .excalidraw source file
 * @param {string} exportPath - Path for the exported PDF
 * @returns {{ success: boolean, method?: string, error?: string }}
 */
function exportExcalidraw(srcPath, exportPath) {
  // Ensure export directory exists
  const exportDir = path.dirname(exportPath);
  fs.mkdirSync(exportDir, { recursive: true });

  // Strategy 1: excalirender
  try {
    execSync('which excalirender', { stdio: 'pipe' });
    execSync('excalirender "' + srcPath + '" --output "' + exportPath + '"', {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { success: true, method: 'excalirender' };
  } catch {
    // excalirender not available or failed
  }

  // Strategy 2: npx excalidraw-to-svg + rsvg-convert
  try {
    execSync('which rsvg-convert', { stdio: 'pipe' });
    const svgPath = exportPath.replace(/\.pdf$/i, '.svg');
    execSync('npx excalidraw-to-svg "' + srcPath + '" --output "' + svgPath + '"', {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 60000,
    });
    execSync('rsvg-convert -f pdf -o "' + exportPath + '" "' + svgPath + '"', {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000,
    });
    // Clean up intermediate SVG
    try { fs.unlinkSync(svgPath); } catch { /* ignore */ }
    return { success: true, method: 'excalidraw-to-svg+rsvg-convert' };
  } catch (err) {
    return { success: false, error: err.message || 'Export failed' };
  }
}

/**
 * Pre-process figures before LaTeX compilation.
 * Exports Excalidraw figures to PDF for LaTeX inclusion.
 * @param {string} cwd - Current working directory
 * @returns {{ processed: number, errors: string[] }}
 */
function preProcessFigures(cwd) {
  const figuresPath = path.join(cwd, '.planning', 'FIGURES.md');
  const content = safeReadFile(figuresPath);
  if (!content) {
    return { processed: 0, errors: [] };
  }

  const catalog = parseFiguresCatalog(content);
  const excalidrawFigs = catalog.filter(fig => fig.type === 'excalidraw');
  const errors = [];
  let processed = 0;

  for (const fig of excalidrawFigs) {
    const srcPath = path.join(cwd, 'src', fig.sourceFile);
    const exportPath = path.join(cwd, 'src', 'figures', 'exports', fig.id + '.pdf');

    // Check source exists
    if (!fs.existsSync(srcPath)) {
      errors.push('Source not found: ' + fig.sourceFile + ' (figure: ' + fig.id + ')');
      continue;
    }

    // Skip if export is up-to-date (mtime check)
    if (fs.existsSync(exportPath)) {
      const srcStat = fs.statSync(srcPath);
      const expStat = fs.statSync(exportPath);
      if (expStat.mtimeMs >= srcStat.mtimeMs) {
        continue; // export is up-to-date
      }
    }

    const result = exportExcalidraw(srcPath, exportPath);
    if (result.success) {
      processed++;
    } else {
      errors.push('Export failed for ' + fig.id + ': ' + (result.error || 'unknown error'));
    }
  }

  return { processed, errors };
}

// --- Figure Catalog Helpers (Phase 5) ----------------------------------------

/**
 * Parse the Figures table from FIGURES.md content.
 * @param {string} content - FIGURES.md file content
 * @returns {Array<{id: string, caption: string, chapter: string, type: string, sourceFile: string, status: string}>}
 */
function parseFiguresCatalog(content) {
  // Find the ## Figures section
  const figuresMatch = content.match(/## Figures\b/);
  if (!figuresMatch) return [];

  const startIdx = figuresMatch.index + figuresMatch[0].length;

  // Find ## Tables section (or end of file) to delimit
  const tablesMatch = content.indexOf('## Tables', startIdx);
  const section = tablesMatch !== -1
    ? content.slice(startIdx, tablesMatch)
    : content.slice(startIdx);

  const lines = section.split('\n');
  const results = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comment lines, header row, separator row
    if (!trimmed) continue;
    if (trimmed.startsWith('<!--') || trimmed.startsWith('//')) continue;
    if (/^\| *ID *\|/.test(trimmed)) continue;
    if (/^\|[-| ]+\|$/.test(trimmed)) continue;

    // Must start with | to be a table row
    if (!trimmed.startsWith('|')) continue;

    // Split by |, trim cells, filter empty strings from leading/trailing |
    const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');

    // Require at least 6 cells with non-empty first cell
    if (cells.length < 6 || !cells[0]) continue;

    results.push({
      id: cells[0],
      caption: cells[1],
      chapter: cells[2],
      type: cells[3],
      sourceFile: cells[4],
      status: cells[5],
    });
  }

  return results;
}

/**
 * Append a figure entry row to FIGURES.md content.
 * @param {string} content - FIGURES.md content
 * @param {{ id: string, caption: string, chapter: string, type: string, sourceFile: string, status: string }} entry
 * @returns {string} Modified content
 */
function appendFigureEntry(content, entry) {
  const newRow = '| ' + entry.id + ' | ' + entry.caption + ' | ' + entry.chapter + ' | ' + entry.type + ' | ' + entry.sourceFile + ' | ' + entry.status + ' |';

  // Check for empty placeholder row
  const emptyRowRe = /(\| *\| *\| *\| *\| *\| *\|)/;
  if (emptyRowRe.test(content)) {
    // Replace the FIRST empty row
    return content.replace(emptyRowRe, newRow);
  }

  // Find ## Tables section and insert before it
  const tablesIdx = content.indexOf('## Tables');
  if (tablesIdx !== -1) {
    return content.slice(0, tablesIdx) + newRow + '\n\n' + content.slice(tablesIdx);
  }

  // No ## Tables section: append at end
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  return content + newRow + '\n';
}

/**
 * Extract all figure references (\ref{fig:*}, \autoref{fig:*}, \Autoref{fig:*}) from .tex content.
 * @param {string} texContent - LaTeX source content
 * @returns {Set<string>} Set of bare figure IDs (without fig: prefix)
 */
function extractFigureRefs(texContent) {
  const refs = new Set();
  const patterns = [
    /\\ref\{fig:([^}]+)\}/g,
    /\\autoref\{fig:([^}]+)\}/g,
    /\\Autoref\{fig:([^}]+)\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(texContent)) !== null) {
      refs.add(match[1]);
    }
  }

  return refs;
}

/**
 * Extract all figure labels (\label{fig:*}) from .tex content.
 * @param {string} texContent - LaTeX source content
 * @returns {Set<string>} Set of bare figure IDs (without fig: prefix)
 */
function extractFigureLabels(texContent) {
  const labels = new Set();
  const pattern = /\\label\{fig:([^}]+)\}/g;
  let match;
  while ((match = pattern.exec(texContent)) !== null) {
    labels.add(match[1]);
  }
  return labels;
}

/**
 * Normalize a figure ID to kebab-case.
 * @param {string} input - Raw figure ID
 * @returns {string} Normalized kebab-case ID
 */
function normalizeToKebabCase(input) {
  let result = input;
  // Convert camelCase to kebab-case
  result = result.replace(/([a-z])([A-Z])/g, '$1-$2');
  // Replace underscores with hyphens
  result = result.replace(/_/g, '-');
  // Replace multiple consecutive hyphens with single
  result = result.replace(/-{2,}/g, '-');
  // Trim leading/trailing hyphens
  result = result.replace(/^-+|-+$/g, '');
  // Lowercase entire result
  result = result.toLowerCase();
  return result;
}

/**
 * FIG-01/FIG-04: Register a figure in FIGURES.md.
 * @param {string} cwd - Current working directory
 * @param {string[]} args - CLI arguments
 * @param {boolean} raw - Whether to output raw text
 */
function cmdRegisterFigure(cwd, args, raw) {
  const idIdx = args.indexOf('--id');
  const typeIdx = args.indexOf('--type');
  const chapterIdx = args.indexOf('--chapter');
  const captionIdx = args.indexOf('--caption');

  const id = idIdx !== -1 ? args[idIdx + 1] : null;
  const type = typeIdx !== -1 ? args[typeIdx + 1] : null;
  const chapter = chapterIdx !== -1 ? args[chapterIdx + 1] : null;
  const caption = captionIdx !== -1 ? args[captionIdx + 1] : null;

  if (!id || !type || !chapter || !caption) {
    error('Usage: register-figure --id <id> --type <excalidraw|tikz|static> --chapter <N> --caption "<caption>"');
  }

  // Validate type
  const validTypes = ['excalidraw', 'tikz', 'static'];
  if (!validTypes.includes(type)) {
    error('Invalid figure type: ' + type + '. Must be one of: ' + validTypes.join(', '));
  }

  // Normalize ID
  const normalizedId = normalizeToKebabCase(id);

  // Determine source file based on type
  let sourceFile;
  if (type === 'excalidraw') {
    sourceFile = 'figures/' + normalizedId + '.excalidraw';
  } else if (type === 'tikz') {
    sourceFile = 'figures/' + normalizedId + '.tikz';
  } else {
    sourceFile = 'figures/' + normalizedId + '.png';
  }

  const status = 'planned';

  // Read FIGURES.md
  const figuresPath = path.join(cwd, '.planning', 'FIGURES.md');
  const content = safeReadFile(figuresPath);
  if (content === null) {
    error('FIGURES.md not found at ' + figuresPath + '. Run /gtd:new-thesis first.');
  }

  // Check for duplicate ID
  const existing = parseFiguresCatalog(content);
  if (existing.some(fig => fig.id === normalizedId)) {
    error('Figure ID already exists: ' + normalizedId);
  }

  const entry = {
    id: normalizedId,
    caption,
    chapter,
    type,
    sourceFile,
    status,
  };

  const updated = appendFigureEntry(content, entry);
  fs.writeFileSync(figuresPath, updated, 'utf-8');

  output({
    id: normalizedId,
    caption,
    chapter,
    type,
    sourceFile,
    status: 'planned',
    catalogPath: '.planning/FIGURES.md',
  }, raw, 'Registered figure \'' + normalizedId + '\' (type: ' + type + ') in FIGURES.md for chapter ' + chapter);
}

/**
 * FIG-05: Cross-reference validation for figures.
 * Scans both src/chapters/ and .planning/chapters/ for figure refs/labels,
 * cross-checks against FIGURES.md catalog.
 * @param {string} cwd - Current working directory
 * @param {boolean} raw - Whether to output raw text
 */
function cmdValidateFigs(cwd, raw) {
  const figuresPath = path.join(cwd, '.planning', 'FIGURES.md');
  const content = safeReadFile(figuresPath);
  if (!content) error('FIGURES.md not found at ' + figuresPath);

  const catalog = parseFiguresCatalog(content);
  const catalogIds = new Set(catalog.map(fig => fig.id));
  const allReferencedIds = new Set();
  const allLabeledIds = new Set();
  const perChapter = [];

  // Helper to scan a directory of .tex files (same pattern as cmdValidateRefs)
  function scanTexDir(dirPath, source) {
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    if (source === 'approved') {
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.tex')) continue;
        const texPath = path.join(dirPath, entry.name);
        const texContent = fs.readFileSync(texPath, 'utf-8');
        const refs = extractFigureRefs(texContent);
        const labels = extractFigureLabels(texContent);
        refs.forEach(r => allReferencedIds.add(r));
        labels.forEach(l => allLabeledIds.add(l));
        perChapter.push({
          file: entry.name,
          source,
          refs: [...refs],
          labels: [...labels],
        });
      }
    } else {
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const chapterDirPath = path.join(dirPath, entry.name);
        let chapterFiles;
        try {
          chapterFiles = fs.readdirSync(chapterDirPath);
        } catch {
          continue;
        }

        const draftFiles = chapterFiles
          .filter(f => f.match(/DRAFT.*\.tex$/i))
          .sort((a, b) => {
            const aRev = a.match(/-r(\d+)\.tex$/i);
            const bRev = b.match(/-r(\d+)\.tex$/i);
            const aNum = aRev ? parseInt(aRev[1]) : 0;
            const bNum = bRev ? parseInt(bRev[1]) : 0;
            return bNum - aNum;
          });

        if (draftFiles.length === 0) continue;

        const latestDraft = draftFiles[0];
        const texPath = path.join(chapterDirPath, latestDraft);
        const texContent = fs.readFileSync(texPath, 'utf-8');
        const refs = extractFigureRefs(texContent);
        const labels = extractFigureLabels(texContent);
        refs.forEach(r => allReferencedIds.add(r));
        labels.forEach(l => allLabeledIds.add(l));
        perChapter.push({
          file: entry.name + '/' + latestDraft,
          source,
          refs: [...refs],
          labels: [...labels],
        });
      }
    }
  }

  scanTexDir(path.join(cwd, 'src', 'chapters'), 'approved');
  scanTexDir(path.join(cwd, '.planning', 'chapters'), 'draft');

  // Calculate diagnostics
  const missingFromCatalog = [];
  for (const refId of allReferencedIds) {
    if (!catalogIds.has(refId)) {
      missingFromCatalog.push(refId);
    }
  }

  const unreferencedInCatalog = [];
  for (const fig of catalog) {
    if (!allReferencedIds.has(fig.id)) {
      unreferencedInCatalog.push(fig.id);
    }
  }

  const labeledButNotInCatalog = [];
  for (const labelId of allLabeledIds) {
    if (!catalogIds.has(labelId)) {
      labeledButNotInCatalog.push(labelId);
    }
  }

  const resultData = {
    total_catalog_entries: catalog.length,
    total_referenced: allReferencedIds.size,
    total_labeled: allLabeledIds.size,
    missing_from_catalog: missingFromCatalog,
    unreferenced_in_catalog: unreferencedInCatalog,
    labeled_but_not_in_catalog: labeledButNotInCatalog,
    per_chapter: perChapter,
  };

  // Build raw output
  const lines = [];
  lines.push('Figure Validation Report');
  lines.push('=======================');
  lines.push('');
  lines.push('Catalog entries:  ' + catalog.length);
  lines.push('Referenced (\\ref): ' + allReferencedIds.size);
  lines.push('Labeled (\\label):  ' + allLabeledIds.size);
  lines.push('');

  if (perChapter.length > 0) {
    lines.push('Per-chapter breakdown:');
    for (const ch of perChapter) {
      lines.push('  ' + ch.file + ' (' + ch.source + '): ' + ch.refs.length + ' refs, ' + ch.labels.length + ' labels');
    }
  } else {
    lines.push('No chapters found to scan.');
  }

  lines.push('');

  if (missingFromCatalog.length > 0) {
    lines.push('Referenced but missing from catalog (' + missingFromCatalog.length + '): ' + missingFromCatalog.join(', '));
  } else {
    lines.push('All referenced figures found in catalog.');
  }

  if (unreferencedInCatalog.length > 0) {
    lines.push('In catalog but unreferenced (' + unreferencedInCatalog.length + '): ' + unreferencedInCatalog.join(', '));
  } else {
    lines.push('All catalog figures are referenced.');
  }

  if (labeledButNotInCatalog.length > 0) {
    lines.push('Labeled but not in catalog (' + labeledButNotInCatalog.length + '): ' + labeledButNotInCatalog.join(', '));
  } else {
    lines.push('All labeled figures are in catalog.');
  }

  output(resultData, raw, lines.join('\n'));
}

// --- Framework Update --------------------------------------------------------

/**
 * Update FRAMEWORK.md frontmatter and changelog after chapter completion.
 * Creates a backup, updates updated_after/last_updated fields, and appends
 * a placeholder changelog row.
 * @param {string} cwd - Current working directory
 * @param {string} chapter - Chapter number
 * @param {boolean} raw - Raw output mode
 */
function cmdFrameworkUpdate(cwd, chapter, raw) {
  if (!chapter) {
    error('Usage: framework update --chapter N');
  }

  const chapterNum = parseInt(chapter, 10);
  if (isNaN(chapterNum) || chapterNum < 1) {
    error('Invalid chapter number: ' + chapter);
  }

  const padded = String(chapterNum).padStart(2, '0');
  const frameworkPath = path.join(cwd, '.planning', 'FRAMEWORK.md');
  const bakPath = path.join(cwd, '.planning', 'FRAMEWORK.md.bak');

  // Read FRAMEWORK.md
  const content = safeReadFile(frameworkPath);
  if (!content) {
    error('No FRAMEWORK.md found at ' + frameworkPath + '. Run /gtd:new-thesis first.');
  }

  // Create backup (always overwrite -- latest backup only)
  fs.copyFileSync(frameworkPath, bakPath);

  // Update frontmatter
  const fm = extractFrontmatter(content);
  const dateStr = new Date().toISOString().split('T')[0];
  fm.updated_after = 'Ch ' + padded;
  fm.last_updated = dateStr;
  let updated = spliceFrontmatter(content, fm);

  // Append changelog row
  // Find the ## Changelog section and its table
  const changelogMatch = updated.match(/## Changelog[\s\S]*?\n(\|[^\n]+\|)\n(\|[-| ]+\|)\n/);
  if (changelogMatch) {
    // Determine column count from header row
    const headerRow = changelogMatch[1];
    const colCount = (headerRow.match(/\|/g) || []).length - 1;

    let newRow;
    if (colCount === 3) {
      newRow = `| Ch ${padded} | ${dateStr} | [Updated after chapter ${padded} completion -- review needed] |`;
    } else {
      // Safety: build row matching column count
      const cells = [`Ch ${padded}`, dateStr, `[Updated after chapter ${padded} completion -- review needed]`];
      while (cells.length < colCount) cells.push('');
      newRow = '| ' + cells.join(' | ') + ' |';
    }

    // Find the end of the separator row and append the new row
    const sepEnd = updated.indexOf(changelogMatch[2]) + changelogMatch[2].length;
    // Check if there are existing data rows after the separator
    const afterSep = updated.slice(sepEnd);
    const nextNewline = afterSep.indexOf('\n');
    if (nextNewline === -1) {
      // No content after separator
      updated = updated.slice(0, sepEnd) + '\n' + newRow + '\n';
    } else {
      // Find the last table row (last line starting with |)
      const lines = updated.split('\n');
      let lastTableRowIdx = -1;
      let inChangelog = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^## Changelog/)) {
          inChangelog = true;
        } else if (inChangelog && lines[i].startsWith('|')) {
          lastTableRowIdx = i;
        } else if (inChangelog && !lines[i].startsWith('|') && lastTableRowIdx > 0) {
          break;
        }
      }

      if (lastTableRowIdx >= 0) {
        lines.splice(lastTableRowIdx + 1, 0, newRow);
        updated = lines.join('\n');
      } else {
        // Fallback: append after separator
        updated = updated.slice(0, sepEnd) + '\n' + newRow + updated.slice(sepEnd);
      }
    }
  }

  // Write updated FRAMEWORK.md
  fs.writeFileSync(frameworkPath, updated, 'utf-8');

  output({
    chapter: chapterNum,
    backup: bakPath,
    updated_after: 'Ch ' + padded,
    last_updated: dateStr,
  }, raw, 'Framework updated for chapter ' + chapter + '. Backup at ' + bakPath);
}

// --- Reference Management Commands -------------------------------------------

/**
 * Extract complete BibTeX entries (not just keys) from .bib content.
 * Returns array of { type, key, text } objects.
 * Skips BibTeX special entries (comment, preamble, string).
 * @param {string} bibContent - Raw .bib file content
 * @returns {Array<{type: string, key: string, text: string}>}
 */
function extractBibEntries(bibContent) {
  const entries = [];
  const pattern = /@(\w+)\{([^,\s]+),/g;
  let match;

  while ((match = pattern.exec(bibContent)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();

    // Skip BibTeX special entries
    if (type === 'comment' || type === 'preamble' || type === 'string') continue;

    // Track balanced braces to find entry end
    const startIdx = match.index;
    let braceCount = 0;
    let endIdx = -1;
    let foundOpen = false;

    for (let i = startIdx; i < bibContent.length; i++) {
      if (bibContent[i] === '{') {
        braceCount++;
        foundOpen = true;
      } else if (bibContent[i] === '}') {
        braceCount--;
        if (foundOpen && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    if (endIdx > startIdx) {
      entries.push({
        type: match[1],  // preserve original case
        key,
        text: bibContent.slice(startIdx, endIdx),
      });
    }
  }

  return entries;
}

/**
 * Safely append a BibTeX entry to a .bib file.
 * Creates the file with a header comment if it does not exist.
 * Ensures blank line separator before the new entry.
 * @param {string} bibPath - Path to .bib file
 * @param {string} entryText - Complete BibTeX entry text
 */
function appendBibEntry(bibPath, entryText) {
  let existing = '';

  if (fs.existsSync(bibPath)) {
    existing = fs.readFileSync(bibPath, 'utf-8');
  } else {
    // Ensure parent directory exists
    const parentDir = path.dirname(bibPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    existing = '% References -- managed by get-thesis-done\n';
  }

  // Ensure blank line separator
  if (existing.length > 0 && !existing.endsWith('\n\n')) {
    if (!existing.endsWith('\n')) {
      existing += '\n';
    }
    existing += '\n';
  }

  existing += entryText.trim() + '\n';
  fs.writeFileSync(bibPath, existing, 'utf-8');

  // Validate by re-reading and extracting keys
  const verify = fs.readFileSync(bibPath, 'utf-8');
  const keys = extractBibKeys(verify);
  const entryKeys = extractBibKeys(entryText);
  for (const k of entryKeys) {
    if (!keys.has(k)) {
      throw new Error('Failed to verify appended entry key: ' + k);
    }
  }
}

/**
 * REF-01: Import entries from an external .bib file into src/references.bib.
 * Deduplicates by citation key.
 * @param {string} cwd - Current working directory
 * @param {string} filePath - Path to external .bib file
 * @param {boolean} raw - Whether to output raw text
 */
function cmdImportBib(cwd, filePath, raw) {
  if (!filePath) error('--file required. Usage: import-bib --file path.bib');

  // Resolve path relative to cwd if not absolute
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const sourceContent = safeReadFile(resolvedPath);
  if (sourceContent === null) error('File not found: ' + resolvedPath);

  const bibPath = path.join(cwd, 'src', 'references.bib');

  // Read existing keys
  const existingContent = safeReadFile(bibPath) || '';
  const existingKeys = extractBibKeys(existingContent);

  // Extract entries from source
  const sourceEntries = extractBibEntries(sourceContent);

  const importedKeys = [];
  const skippedKeys = [];

  for (const entry of sourceEntries) {
    if (existingKeys.has(entry.key)) {
      skippedKeys.push(entry.key);
    } else {
      appendBibEntry(bibPath, entry.text);
      existingKeys.add(entry.key);  // prevent duplicates within same import
      importedKeys.push(entry.key);
    }
  }

  output({
    imported: importedKeys.length,
    skipped: skippedKeys.length,
    imported_keys: importedKeys,
    skipped_keys: skippedKeys,
    target: 'src/references.bib',
  }, raw, `Imported ${importedKeys.length} entries, skipped ${skippedKeys.length} duplicates`);
}

/**
 * REF-04: Cross-chapter citation validation.
 * Scans both src/chapters/ and .planning/chapters/ for citations,
 * reports missing and orphaned references.
 * @param {string} cwd - Current working directory
 * @param {boolean} raw - Whether to output raw text
 */
function cmdValidateRefs(cwd, raw) {
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const bibContent = safeReadFile(bibPath);
  if (!bibContent) error('references.bib not found at src/references.bib');

  const validKeys = extractBibKeys(bibContent);
  const allCitedKeys = new Set();
  const perChapter = [];

  // Helper to scan a directory of .tex files
  function scanTexDir(dirPath, source) {
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return; // directory doesn't exist yet
    }

    if (source === 'approved') {
      // Scan direct .tex files in src/chapters/
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.tex')) continue;
        const texPath = path.join(dirPath, entry.name);
        const content = fs.readFileSync(texPath, 'utf-8');
        const result = validateCitations(content, validKeys);
        result.valid.forEach(k => allCitedKeys.add(k));
        result.invalid.forEach(i => allCitedKeys.add(i.key));
        perChapter.push({
          file: entry.name,
          source,
          valid_count: result.valid.length,
          invalid_count: result.invalid.length,
          invalid_keys: result.invalid.map(i => i.key),
        });
      }
    } else {
      // Scan .planning/chapters/*/  -- for each chapter dir, pick latest DRAFT
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const chapterDirPath = path.join(dirPath, entry.name);
        let chapterFiles;
        try {
          chapterFiles = fs.readdirSync(chapterDirPath);
        } catch {
          continue;
        }

        // Find DRAFT .tex files, prefer highest revision number
        const draftFiles = chapterFiles
          .filter(f => f.match(/DRAFT.*\.tex$/i))
          .sort((a, b) => {
            const aRev = a.match(/-r(\d+)\.tex$/i);
            const bRev = b.match(/-r(\d+)\.tex$/i);
            const aNum = aRev ? parseInt(aRev[1]) : 0;
            const bNum = bRev ? parseInt(bRev[1]) : 0;
            return bNum - aNum;  // highest first
          });

        if (draftFiles.length === 0) continue;

        const latestDraft = draftFiles[0];
        const texPath = path.join(chapterDirPath, latestDraft);
        const content = fs.readFileSync(texPath, 'utf-8');
        const result = validateCitations(content, validKeys);
        result.valid.forEach(k => allCitedKeys.add(k));
        result.invalid.forEach(i => allCitedKeys.add(i.key));
        perChapter.push({
          file: entry.name + '/' + latestDraft,
          source,
          valid_count: result.valid.length,
          invalid_count: result.invalid.length,
          invalid_keys: result.invalid.map(i => i.key),
        });
      }
    }
  }

  // Scan both locations
  scanTexDir(path.join(cwd, 'src', 'chapters'), 'approved');
  scanTexDir(path.join(cwd, '.planning', 'chapters'), 'draft');

  // Calculate aggregates
  const missingFromBib = [];
  for (const ch of perChapter) {
    for (const k of ch.invalid_keys) {
      if (!missingFromBib.includes(k)) missingFromBib.push(k);
    }
  }

  const orphanedInBib = [];
  for (const k of validKeys) {
    if (!allCitedKeys.has(k)) {
      orphanedInBib.push(k);
    }
  }

  const resultData = {
    total_bib_entries: validKeys.size,
    total_cited_keys: allCitedKeys.size,
    missing_from_bib: missingFromBib,
    orphaned_in_bib: orphanedInBib,
    per_chapter: perChapter,
  };

  // Build raw output
  const lines = [];
  lines.push('Reference Validation Report');
  lines.push('==========================');
  lines.push('');
  lines.push('Bib entries: ' + validKeys.size);
  lines.push('Cited keys:  ' + allCitedKeys.size);
  lines.push('');

  if (perChapter.length > 0) {
    lines.push('Per-chapter breakdown:');
    for (const ch of perChapter) {
      const status = ch.invalid_count > 0 ? 'ISSUES' : 'OK';
      lines.push('  ' + ch.file + ' (' + ch.source + '): ' + ch.valid_count + ' valid, ' + ch.invalid_count + ' invalid [' + status + ']');
      if (ch.invalid_keys.length > 0) {
        lines.push('    Missing: ' + ch.invalid_keys.join(', '));
      }
    }
  } else {
    lines.push('No chapters found to scan.');
  }

  lines.push('');
  if (missingFromBib.length > 0) {
    lines.push('Missing from bib (' + missingFromBib.length + '): ' + missingFromBib.join(', '));
  } else {
    lines.push('All cited keys found in references.bib.');
  }

  if (orphanedInBib.length > 0) {
    lines.push('Orphaned in bib (' + orphanedInBib.length + '): ' + orphanedInBib.join(', '));
  } else {
    lines.push('No orphaned entries in references.bib.');
  }

  output(resultData, raw, lines.join('\n'));
}

/**
 * REF-05: Cross-reference cited keys with PDFs in src/references/.
 * Matches bib keys against PDF filenames (case-insensitive).
 * @param {string} cwd - Current working directory
 * @param {boolean} raw - Whether to output raw text
 */
function cmdPdfRefs(cwd, raw) {
  const bibPath = path.join(cwd, 'src', 'references.bib');
  const bibContent = safeReadFile(bibPath);
  if (!bibContent) error('references.bib not found at src/references.bib');

  const validKeys = extractBibKeys(bibContent);
  const refsDir = path.join(cwd, 'src', 'references');

  let pdfNames = [];
  let dirNote = null;

  if (fs.existsSync(refsDir)) {
    try {
      const files = fs.readdirSync(refsDir);
      pdfNames = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    } catch {
      pdfNames = [];
    }
  } else {
    dirNote = 'src/references/ directory does not exist';
  }

  // Build lowercase PDF basename set for matching
  const pdfBaseNames = new Set(pdfNames.map(f => f.replace(/\.pdf$/i, '').toLowerCase()));

  const withPdfKeys = [];
  const withoutPdfKeys = [];

  for (const key of validKeys) {
    if (pdfBaseNames.has(key.toLowerCase())) {
      withPdfKeys.push(key);
    } else {
      withoutPdfKeys.push(key);
    }
  }

  withPdfKeys.sort();
  withoutPdfKeys.sort();

  const resultData = {
    total_entries: validKeys.size,
    with_pdf: withPdfKeys.length,
    without_pdf: withoutPdfKeys.length,
    with_pdf_keys: withPdfKeys,
    without_pdf_keys: withoutPdfKeys,
  };
  if (dirNote) resultData.note = dirNote;

  // Build raw output
  const lines = [];
  lines.push('PDF Reference Report');
  lines.push('====================');
  lines.push('');
  lines.push('Total bib entries: ' + validKeys.size);
  lines.push('With PDF:          ' + withPdfKeys.length);
  lines.push('Without PDF:       ' + withoutPdfKeys.length);
  if (dirNote) lines.push('Note: ' + dirNote);
  lines.push('');

  if (withPdfKeys.length > 0) {
    lines.push('Keys with PDF:');
    for (const k of withPdfKeys) {
      lines.push('  [x] ' + k);
    }
  }

  if (withoutPdfKeys.length > 0) {
    lines.push('Keys without PDF:');
    for (const k of withoutPdfKeys) {
      lines.push('  [ ] ' + k);
    }
  }

  output(resultData, raw, lines.join('\n'));
}

// --- Async Reference Commands (fetch-doi, pdf-meta) --------------------------

/**
 * Check if a system command is available on PATH.
 * @param {string} command - Command name (e.g., 'pdfinfo')
 * @returns {boolean}
 */
function checkSystemDep(command) {
  try {
    execSync('which ' + command, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * REF-03 helper: Extract DOI from PDF using graduated strategies.
 * Strategy 1: pdfinfo metadata fields
 * Strategy 2: pdftotext first 2 pages text scan
 * @param {string} pdfPath - Absolute path to PDF file
 * @returns {{ doi: string, source: string }|null}
 */
function extractDOIFromPdf(pdfPath) {
  const doiPattern = /\b(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)\b/;

  // Strategy 1: pdfinfo metadata
  try {
    const info = execSync('pdfinfo "' + pdfPath + '"', { stdio: 'pipe', encoding: 'utf-8' });
    const match = info.match(doiPattern);
    if (match) return { doi: match[1], source: 'metadata' };
  } catch {
    // pdfinfo not available or failed
  }

  // Strategy 2: pdftotext first 2 pages
  try {
    const text = execSync('pdftotext -f 1 -l 2 "' + pdfPath + '" -', { stdio: 'pipe', encoding: 'utf-8' });
    const match = text.match(doiPattern);
    if (match) return { doi: match[1], source: 'text' };
  } catch {
    // pdftotext not available or failed
  }

  return null;
}

/**
 * Construct a minimal BibTeX entry when no DOI is found in PDF.
 * Uses pdfinfo for title/author if available, else uses filename.
 * @param {string} pdfPath - Absolute path to PDF file
 * @returns {string} BibTeX entry text
 */
function constructMinimalBibEntry(pdfPath) {
  const basename = path.basename(pdfPath, path.extname(pdfPath));
  let title = basename;
  let author = '';
  let year = new Date().getFullYear().toString();

  // Try to extract metadata via pdfinfo
  try {
    const info = execSync('pdfinfo "' + pdfPath + '"', { stdio: 'pipe', encoding: 'utf-8' });

    const titleMatch = info.match(/^Title:\s+(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim();

    const authorMatch = info.match(/^Author:\s+(.+)$/m);
    if (authorMatch) author = authorMatch[1].trim();

    const dateMatch = info.match(/^(?:CreationDate|ModDate):\s+.*(\d{4})/m);
    if (dateMatch) year = dateMatch[1];
  } catch {
    // pdfinfo not available -- use filename-based entry
  }

  // Generate citation key from first author lastname + year
  let key;
  if (author) {
    const lastName = author.split(/[,\s]+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    key = lastName + year;
  } else {
    key = 'unknown_' + year;
  }

  // Ensure key uniqueness by appending basename hash if generic
  if (key === 'unknown_' + year) {
    const hash = basename.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '');
    key = 'unknown_' + hash + '_' + year;
  }

  const entry = [
    '@misc{' + key + ',',
    '  author = {' + (author || 'Unknown') + '},',
    '  title = {' + title + '},',
    '  year = {' + year + '},',
    '  note = {PDF imported by get-thesis-done -- verify and complete this entry}',
    '}',
  ].join('\n');

  return entry;
}

/**
 * Core DOI fetch logic: normalize DOI, fetch BibTeX from Crossref.
 * Shared by cmdFetchDoi and cmdPdfMeta.
 * @param {string} doi - DOI string (may include prefix like https://doi.org/)
 * @returns {Promise<string>} BibTeX text
 * @throws {Error} on invalid DOI, network error, or unexpected response
 */
async function fetchBibtexFromDoi(doi) {
  // Normalize DOI
  let normalized = doi.trim();
  normalized = normalized.replace(/^https?:\/\/doi\.org\//i, '');
  normalized = normalized.replace(/^doi:/i, '');
  normalized = normalized.trim();

  // Validate format
  if (!/^10\.\d{4,9}\//.test(normalized)) {
    throw new Error('Invalid DOI format: ' + normalized + '. Expected format: 10.XXXX/...');
  }

  // Fetch BibTeX from Crossref via content negotiation
  const url = 'https://doi.org/' + encodeURIComponent(normalized);
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/x-bibtex',
      'User-Agent': 'get-thesis-done/1.0 (mailto:user@example.com)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error('DOI fetch failed with HTTP ' + response.status + ' for DOI: ' + normalized);
  }

  // Check content-type
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('bibtex') && !contentType.includes('text/plain')) {
    throw new Error('DOI may not support BibTeX content negotiation. Content-Type: ' + contentType);
  }

  const bibtex = await response.text();

  // HTML fallback detection
  if (bibtex.trimStart().startsWith('<!DOCTYPE') || bibtex.trimStart().startsWith('<html')) {
    throw new Error('Received HTML instead of BibTeX. DOI may not support content negotiation.');
  }

  return bibtex;
}

/**
 * REF-02: Fetch BibTeX from DOI via Crossref content negotiation.
 * @param {string} cwd - Current working directory
 * @param {string} doi - DOI string
 * @param {boolean} raw - Whether to output raw text
 */
async function cmdFetchDoi(cwd, doi, raw) {
  if (!doi) error('--doi required. Usage: fetch-doi --doi 10.XXXX/...');

  const bibtex = await fetchBibtexFromDoi(doi);
  const bibPath = path.join(cwd, 'src', 'references.bib');
  appendBibEntry(bibPath, bibtex);

  // Extract the key from fetched BibTeX for reporting
  const keys = extractBibKeys(bibtex);
  const key = keys.size > 0 ? [...keys][0] : 'unknown';

  // Normalize DOI for output
  let normalizedDoi = doi.trim();
  normalizedDoi = normalizedDoi.replace(/^https?:\/\/doi\.org\//i, '');
  normalizedDoi = normalizedDoi.replace(/^doi:/i, '');
  normalizedDoi = normalizedDoi.trim();

  output({
    doi: normalizedDoi,
    key,
    bibtex,
    appended_to: 'src/references.bib',
  }, raw, 'Fetched and added:\n' + bibtex);
}

/**
 * REF-03: Extract DOI from PDF metadata, fetch BibTeX, or create minimal entry.
 * @param {string} cwd - Current working directory
 * @param {string} filePath - Path to PDF file
 * @param {boolean} raw - Whether to output raw text
 */
async function cmdPdfMeta(cwd, filePath, raw) {
  if (!filePath) error('--file required. Usage: pdf-meta --file path.pdf');

  // Resolve path relative to cwd if not absolute
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);

  if (!fs.existsSync(resolvedPath)) {
    error('File not found: ' + resolvedPath);
  }

  if (!resolvedPath.toLowerCase().endsWith('.pdf')) {
    error('File must be a PDF: ' + resolvedPath);
  }

  // Check for poppler-utils availability
  const hasPdfinfo = checkSystemDep('pdfinfo');
  const hasPdftotext = checkSystemDep('pdftotext');

  if (!hasPdfinfo && !hasPdftotext) {
    const platform = process.platform;
    let installHint;
    if (platform === 'darwin') {
      installHint = 'brew install poppler';
    } else {
      installHint = 'sudo apt install poppler-utils';
    }
    error('Neither pdfinfo nor pdftotext found. Install poppler-utils:\n  ' + installHint);
  }

  const bibPath = path.join(cwd, 'src', 'references.bib');

  // Try to extract DOI from PDF
  const doiResult = extractDOIFromPdf(resolvedPath);

  if (doiResult) {
    // DOI found -- fetch BibTeX from Crossref
    try {
      const bibtex = await fetchBibtexFromDoi(doiResult.doi);
      appendBibEntry(bibPath, bibtex);

      output({
        pdf: filePath,
        doi: doiResult.doi,
        doi_source: doiResult.source,
        bibtex,
        appended_to: 'src/references.bib',
      }, raw, 'Found DOI ' + doiResult.doi + ' in PDF ' + doiResult.source + '. Fetched and added:\n' + bibtex);
    } catch (fetchErr) {
      // DOI found but fetch failed -- fall back to minimal entry
      const minEntry = constructMinimalBibEntry(resolvedPath);
      appendBibEntry(bibPath, minEntry);

      output({
        pdf: filePath,
        doi: doiResult.doi,
        doi_source: doiResult.source,
        minimal_entry: true,
        bibtex: minEntry,
        appended_to: 'src/references.bib',
        warning: 'DOI found but Crossref fetch failed (' + fetchErr.message + '). Minimal entry created -- please verify and complete.',
      }, raw, 'Found DOI ' + doiResult.doi + ' but fetch failed. Created minimal entry (please verify):\n' + minEntry);
    }
  } else {
    // No DOI found -- construct minimal entry
    const minEntry = constructMinimalBibEntry(resolvedPath);
    appendBibEntry(bibPath, minEntry);

    output({
      pdf: filePath,
      doi: null,
      minimal_entry: true,
      bibtex: minEntry,
      appended_to: 'src/references.bib',
      warning: 'No DOI found. Minimal entry created -- please verify and complete.',
    }, raw, 'No DOI found in PDF. Created minimal entry (please verify):\n' + minEntry);
  }
}

// --- CLI Router --------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];
  const cwd = process.cwd();

  if (!command) {
    error('Usage: gtd-tools <command> [args] [--raw]\nCommands: init, progress, context, compile, cite-keys, sanitize, validate-citations, summary, framework, import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs, register-figure, validate-figs');
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
      const sub = args[1];
      if (sub === 'update') {
        const chapterIdx = args.indexOf('--chapter');
        cmdFrameworkUpdate(cwd, chapterIdx !== -1 ? args[chapterIdx + 1] : null, raw);
      } else {
        error('Usage: framework update --chapter N');
      }
      break;
    }

    case 'import-bib': {
      const fileIdx = args.indexOf('--file');
      cmdImportBib(cwd, fileIdx !== -1 ? args[fileIdx + 1] : null, raw);
      break;
    }

    case 'fetch-doi': {
      const doiIdx = args.indexOf('--doi');
      await cmdFetchDoi(cwd, doiIdx !== -1 ? args[doiIdx + 1] : null, raw);
      break;
    }

    case 'pdf-meta': {
      const fileIdx = args.indexOf('--file');
      await cmdPdfMeta(cwd, fileIdx !== -1 ? args[fileIdx + 1] : null, raw);
      break;
    }

    case 'validate-refs': {
      cmdValidateRefs(cwd, raw);
      break;
    }

    case 'pdf-refs': {
      cmdPdfRefs(cwd, raw);
      break;
    }

    case 'register-figure': {
      cmdRegisterFigure(cwd, args, raw);
      break;
    }

    case 'validate-figs': {
      cmdValidateFigs(cwd, raw);
      break;
    }

    default: {
      error('Unknown command: ' + command + '\nUsage: gtd-tools <command> [args] [--raw]\nCommands: init, progress, context, compile, cite-keys, sanitize, validate-citations, summary, framework, import-bib, fetch-doi, pdf-meta, validate-refs, pdf-refs, register-figure, validate-figs');
    }
  }
}

main().catch(err => { process.stderr.write('Error: ' + err.message + '\n'); process.exit(1); });
