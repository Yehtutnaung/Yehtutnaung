#!/usr/bin/env node
/*
  Canva Font Auto Uploader helper

  This script is launched by Canva_Font_Auto_Upload.bat on Windows.
  It opens Canva in your installed Chrome or Microsoft Edge browser, uploads
  fonts in batches of 20, and tries to click common confirmation / Skip buttons.

  Important: Canva does not publish a stable public UI automation contract for
  font uploads. If Canva changes button names or page structure, the script will
  pause and ask you to click the Upload Font button once; it will still select
  the next 20 files automatically.
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_DELAY_SECONDS = 12;
const DEFAULT_START_URL = 'https://www.canva.com/brand/kits/';
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function parseArgs(argv) {
  const options = {
    folder: null,
    batchSize: DEFAULT_BATCH_SIZE,
    delaySeconds: DEFAULT_DELAY_SECONDS,
    startUrl: DEFAULT_START_URL,
    profileDir: path.join(__dirname, '.canva-browser-profile'),
    browser: 'auto',
    dryRun: false,
    resume: false,
    noAutoClick: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h' || arg === '/?') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--no-auto-click') {
      options.noAutoClick = true;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = Number(arg.split('=').slice(1).join('='));
    } else if (arg.startsWith('--delay-seconds=')) {
      options.delaySeconds = Number(arg.split('=').slice(1).join('='));
    } else if (arg.startsWith('--start-url=')) {
      options.startUrl = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--profile-dir=')) {
      options.profileDir = path.resolve(arg.split('=').slice(1).join('='));
    } else if (arg.startsWith('--browser=')) {
      options.browser = arg.split('=').slice(1).join('=').trim().toLowerCase();
      if (options.browser === 'edge') options.browser = 'msedge';
    } else if (!arg.startsWith('--') && !options.folder) {
      options.folder = path.resolve(arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 20) {
    throw new Error('--batch-size must be a whole number from 1 to 20. Canva normally accepts max 20 files each time.');
  }
  if (!Number.isFinite(options.delaySeconds) || options.delaySeconds < 0) {
    throw new Error('--delay-seconds must be 0 or higher.');
  }
  if (!['auto', 'chrome', 'msedge', 'chromium'].includes(options.browser)) {
    throw new Error('--browser must be auto, chrome, msedge, or chromium.');
  }

  return options;
}

function printHelp() {
  console.log(`Canva Font Auto Uploader\n\nUsage:\n  node canva-font-uploader.js "C:\\Path\\To\\Fonts" [options]\n\nOptions:\n  --batch-size=20          Files per upload batch. Max: 20. Default: 20\n  --delay-seconds=12       Seconds to wait after each batch. Default: 12\n  --start-url=URL          Canva page to open. Default: ${DEFAULT_START_URL}\n  --profile-dir=PATH       Browser profile folder so your Canva login is saved\n  --browser=auto           Browser to use: auto, chrome, msedge, chromium. Default: auto\n                           auto uses installed Chrome/Edge, no Chromium download needed\n  --resume                 Skip files already marked as attempted in the log\n  --dry-run                Only show the planned batches; do not open Canva\n  --no-auto-click          Do not try to click Canva Upload buttons automatically;\n                           you click Upload Font when asked, files are filled in\n  --help                   Show this help\n`);
}

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function walkFonts(dir, out = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Avoid walking output/helper folders if the user points the script at a parent folder.
      const lower = entry.name.toLowerCase();
      if (lower === 'node_modules' || lower === '.git' || lower === '.canva-browser-profile') continue;
      await walkFonts(fullPath, out);
    } else if (entry.isFile()) {
      if (FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        out.push(fullPath);
      }
    }
  }
  return out;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function getLogPath(folder) {
  return path.join(folder, '.canva-font-upload-log.json');
}

async function loadLog(folder) {
  const logPath = getLogPath(folder);
  try {
    return JSON.parse(await fs.promises.readFile(logPath, 'utf8'));
  } catch (_) {
    return { attemptedFiles: [], batches: [] };
  }
}

async function saveLog(folder, log) {
  const logPath = getLogPath(folder);
  log.updatedAt = new Date().toISOString();
  await fs.promises.writeFile(logPath, JSON.stringify(log, null, 2), 'utf8');
}

function formatFileList(files) {
  return files.map((file, index) => `  ${String(index + 1).padStart(2, '0')}. ${path.basename(file)}`).join('\n');
}

async function requirePlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    console.error('\nPlaywright is not installed. Please run Canva_Font_Auto_Upload.bat so it can install it automatically.');
    console.error('If you are running this JS file directly, install it with: npm install playwright\n');
    throw error;
  }
}


function browserPaths(browserName) {
  const env = process.env;
  const programFiles = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);

  if (browserName === 'chrome') {
    return programFiles.map((base) => path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  }
  if (browserName === 'msedge') {
    return programFiles.map((base) => path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  return [];
}

function launchCandidates(browser) {
  const candidates = [];
  const addChannel = (channel, label) => candidates.push({ label, launch: { channel } });
  const addPaths = (name, label) => {
    for (const executablePath of browserPaths(name)) {
      if (fs.existsSync(executablePath)) {
        candidates.push({ label: `${label} (${executablePath})`, launch: { executablePath } });
      }
    }
  };

  if (browser === 'auto' || browser === 'chrome') {
    addChannel('chrome', 'Google Chrome');
    addPaths('chrome', 'Google Chrome');
  }
  if (browser === 'auto' || browser === 'msedge') {
    addChannel('msedge', 'Microsoft Edge');
    addPaths('msedge', 'Microsoft Edge');
  }
  if (browser === 'chromium') {
    candidates.push({ label: 'Playwright Chromium', launch: {} });
  }
  return candidates;
}

async function launchBrowser(chromium, options) {
  const candidates = launchCandidates(options.browser);
  const errors = [];

  for (const candidate of candidates) {
    try {
      console.log(`Opening browser: ${candidate.label}`);
      return await chromium.launchPersistentContext(options.profileDir, {
        ...candidate.launch,
        headless: false,
        viewport: null,
        args: ['--start-maximized'],
      });
    } catch (error) {
      errors.push(`${candidate.label}: ${error.message}`);
    }
  }

  throw new Error(
    'Could not open installed Google Chrome or Microsoft Edge. Install Chrome/Edge, or run with --browser=chromium after Playwright Chromium is installed.\n' +
    errors.map((line) => `- ${line}`).join('\n')
  );
}

async function allFrames(page) {
  return [page, ...page.frames()];
}

const CONFIRM_OR_SKIP_BUTTONS = [
  /^Skip$/i,
  /Skip all/i,
  /Skip duplicate/i,
  /Skip duplicates/i,
  /Skip this/i,
  /^Yes,? upload/i,
  /upload away/i,
  /^Upload anyway$/i,
  /Use anyway/i,
  /^Confirm$/i,
  /^Continue$/i,
  /^Done$/i,
  /^OK$/i,
  /^Okay$/i,
  /^Got it$/i,
  /I have (the )?right/i,
  /I confirm.*right/i,
  /I own (this|these) font/i,
  /I agree/i,
  /ကျော်/i,
  /ဆက်/i,
  /အတည်ပြု/i,
  /ပြီး/i,
];

const AFTER_FILE_SELECT_BUTTONS = [
  ...CONFIRM_OR_SKIP_BUTTONS,
  /^Upload$/i,
  /^Upload fonts$/i,
];

const UPLOAD_BUTTONS = [
  /^Upload a font$/i,
  /^Upload font$/i,
  /^Upload fonts$/i,
  /Upload.*font/i,
  /font.*upload/i,
  /^Add font$/i,
  /^Add fonts$/i,
  /^Add new font$/i,
  /^Add new$/i,
  /^Choose files?$/i,
  /^Browse$/i,
  /^Upload$/i,
  /ဖောင့်.*တင်/i,
  /တင်.*ဖောင့်/i,
  /ဖိုင်.*ရွေး/i,
];

async function tryClickAny(locator, timeout = 700) {
  let count = 0;
  try {
    count = await locator.count();
  } catch (_) {
    return false;
  }

  // Canva often keeps hidden old controls in the DOM. Try the last matches first,
  // because visible popups are usually appended near the end of the document.
  const maxToTry = Math.min(count, 12);
  for (let offset = 0; offset < maxToTry; offset++) {
    const index = count - 1 - offset;
    try {
      await locator.nth(index).click({ timeout });
      return true;
    } catch (_) {
      // Try the next matching element.
    }
  }
  return false;
}

async function clickButtonByName(scope, names, timeout = 700) {
  for (const name of names) {
    const candidates = [
      () => scope.locator('[role="dialog"] button').filter({ hasText: name }),
      () => scope.locator('[aria-modal="true"] button').filter({ hasText: name }),
      () => scope.locator('button').filter({ hasText: name }),
      () => scope.getByRole('button', { name }),
      () => scope.getByRole('link', { name }),
      () => scope.getByText(name),
    ];

    for (const makeLocator of candidates) {
      try {
        if (await tryClickAny(makeLocator(), timeout)) return true;
      } catch (_) {
        // Try next label / locator style.
      }
    }
  }
  return false;
}

async function clickCommonPrompts(page, afterFileSelect = false) {
  let clickedAny = false;
  const buttonNames = afterFileSelect ? AFTER_FILE_SELECT_BUTTONS : CONFIRM_OR_SKIP_BUTTONS;
  for (const frame of await allFrames(page)) {
    try {
      const clicked = await clickButtonByName(frame, buttonNames, 450);
      if (clicked) {
        clickedAny = true;
        await sleep(350);
      }
    } catch (_) {
      // Frames can detach while Canva updates. Ignore and keep going.
    }
  }
  return clickedAny;
}

async function sweepPrompts(page, seconds, afterFileSelect = false) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    await clickCommonPrompts(page, afterFileSelect);
    await sleep(900);
  }
}

async function setFilesOnExistingInput(page, files) {
  for (const frame of await allFrames(page)) {
    try {
      const handles = await frame.locator('input[type="file"]').elementHandles({ timeout: 1000 });
      for (const handle of handles) {
        const accept = (await handle.getAttribute('accept')) || '';
        const acceptLower = accept.toLowerCase();
        const looksLikeFontInput = !acceptLower || ['font', '.ttf', '.otf', '.woff'].some((needle) => acceptLower.includes(needle));
        if (!looksLikeFontInput) continue;
        try {
          await handle.setInputFiles(files);
          return true;
        } catch (_) {
          // Try the next input.
        }
      }
    } catch (_) {
      // Try next frame.
    }
  }
  return false;
}

async function clickUploadAndSetFiles(page, files, options) {
  if (options.noAutoClick) return false;

  console.log('Trying to click Canva Add new / Upload Font automatically...');

  for (const frame of await allFrames(page)) {
    try {
      const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 2000 }).catch(() => null);
      const clicked = await clickButtonByName(frame, UPLOAD_BUTTONS, 900);
      if (!clicked) continue;
      const fileChooser = await fileChooserPromise;
      if (fileChooser) {
        await fileChooser.setFiles(files);
        return true;
      }
      // Some pages use a hidden input instead of a file chooser event.
      if (await setFilesOnExistingInput(page, files)) return true;
    } catch (_) {
      // Try next frame / button.
    }
  }
  return false;
}

async function askUserToClickUpload(page, files) {
  console.log('\nCanva Upload Font ခလုတ်ကို browser ထဲမှာ click လုပ်ပေးပါ။ File picker ပွင့်လာရင် script က 20 files ကို auto ထည့်ပေးပါမယ်။');
  console.log('Please click Canva\'s Upload Font / Add new button in the browser within 90 seconds. Do NOT choose files manually.');

  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 90000 });
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(files);
  return true;
}

async function uploadOneBatch(page, files, options) {
  await clickCommonPrompts(page);

  if (await clickUploadAndSetFiles(page, files, options)) return 'clicked-upload-button';
  if (await setFilesOnExistingInput(page, files)) return 'existing-file-input';

  console.log('Auto click did not open the file picker. Manual click fallback is starting now.');
  await askUserToClickUpload(page, files);
  return 'manual-click-filechooser';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.folder) {
    throw new Error('Please provide a font folder path. Example: node canva-font-uploader.js "C:\\Fonts"');
  }
  if (!fs.existsSync(options.folder) || !fs.statSync(options.folder).isDirectory()) {
    throw new Error(`Folder not found: ${options.folder}`);
  }

  const allFiles = await walkFonts(options.folder);
  const log = await loadLog(options.folder);
  const alreadyAttempted = new Set((log.attemptedFiles || []).map((file) => path.resolve(file)));
  const files = options.resume ? allFiles.filter((file) => !alreadyAttempted.has(path.resolve(file))) : allFiles;
  const batches = chunk(files, options.batchSize);

  console.log('\n=== Canva Font Auto Uploader ===');
  console.log(`Folder       : ${options.folder}`);
  console.log(`Fonts found  : ${allFiles.length}`);
  if (options.resume) console.log(`Resume mode  : ${allFiles.length - files.length} already-attempted file(s) skipped`);
  console.log(`To upload    : ${files.length}`);
  console.log(`Batch size   : ${options.batchSize}`);
  console.log(`Browser      : ${options.browser} (installed Chrome/Edge is used when possible)`);
  console.log(`Batches      : ${batches.length}`);
  console.log('Extensions   : .ttf, .otf, .woff, .woff2');
  console.log(`Log file     : ${getLogPath(options.folder)}\n`);

  if (!files.length) {
    console.log('No font files to upload.');
    return;
  }

  batches.forEach((batch, index) => {
    console.log(`Batch ${index + 1}/${batches.length} (${batch.length} file${batch.length === 1 ? '' : 's'}):`);
    console.log(formatFileList(batch));
  });

  if (options.dryRun) {
    console.log('\nDry run only. Nothing uploaded.');
    return;
  }

  console.log('\nImportant: use only fonts you have permission to upload/use in Canva.');
  console.log('The browser profile is saved locally so you normally log in only once.');
  console.log('This version uses installed Google Chrome or Microsoft Edge, so it does NOT download Playwright Chromium.');
  await question('Press ENTER to open Canva and start...');

  const { chromium } = await requirePlaywright();
  await fs.promises.mkdir(options.profileDir, { recursive: true });

  const context = await launchBrowser(chromium, options);
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(7000);

  await page.goto(options.startUrl, { waitUntil: 'domcontentloaded' });

  console.log('\nCanva browser opened. If needed, log in manually.');
  console.log('Then go to Brand Kit > Fonts and open the Uploaded fonts popup.');
  console.log('Make sure the "Add new" button in the Uploaded fonts popup is visible, like your screenshot.');
  await question('When the Add new / Upload Font button is visible, press ENTER here...');

  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    console.log(`\n--- Uploading batch ${index + 1}/${batches.length} (${batch.length} files) ---`);
    console.log(formatFileList(batch));

    let method = 'unknown';
    try {
      method = await uploadOneBatch(page, batch, options);
      console.log(`Batch ${index + 1}: files sent to Canva (${method}).`);
    } catch (error) {
      console.error(`\nBatch ${index + 1} failed before files were selected: ${error.message}`);
      const answer = (await question('Type R then ENTER to retry this batch, or anything else to stop: ')).trim().toLowerCase();
      if (answer === 'r') {
        index -= 1;
        continue;
      }
      break;
    }

    await sweepPrompts(page, Math.max(8, options.delaySeconds), true);

    log.batches = log.batches || [];
    log.attemptedFiles = log.attemptedFiles || [];
    log.batches.push({
      batchNumber: index + 1,
      files: batch,
      method,
      attemptedAt: new Date().toISOString(),
    });
    for (const file of batch) {
      if (!log.attemptedFiles.includes(file)) log.attemptedFiles.push(file);
    }
    await saveLog(options.folder, log);

    if (index < batches.length - 1) {
      console.log(`Waiting ${options.delaySeconds} second(s) before next batch. The script will keep clicking common Skip/Confirm buttons.`);
      await sweepPrompts(page, options.delaySeconds, true);
    }
  }

  console.log('\nFinished sending all planned batches to Canva.');
  console.log(`Check Canva to confirm every font uploaded successfully. Log: ${getLogPath(options.folder)}`);
  await question('Press ENTER to close the automation browser...');
  await context.close();
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
