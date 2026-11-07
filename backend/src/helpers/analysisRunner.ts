import { spawn } from 'child_process';
import path from 'path';
import config from '../config';
import { errorLogger } from '../shared/logger';
import { IAnalysisReport, reportSchema } from './reportSchema';

// Exit codes and output rules are defined in docs/report_schema.md.
const EXPECTED_FAILURE_CODE = 1;
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 300;
export const GENERIC_FAILURE =
  'The analysis failed unexpectedly. Please try again later.';
export const TIMEOUT_FAILURE =
  'The analysis took too long and was stopped. Try a smaller file.';

export type IAnalysisResult =
  { ok: true; report: IAnalysisReport } | { ok: false; message: string };

type IProcessOutput = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

const runProcess = (filePath: string): Promise<IProcessOutput> =>
  new Promise((resolve, reject) => {
    const { python_bin, script_path, timeout_ms } = config.analysis;
    // spawn passes the path as one argument with no shell, so a file name
    // can never be interpreted as a command. The path is made absolute
    // because Python runs from the engine's folder, not from backend/.
    const child = spawn(python_bin, [script_path, path.resolve(filePath)], {
      cwd: path.dirname(script_path),
      windowsHide: true,
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeout_ms);

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_OUTPUT_BYTES) {
        child.kill();
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        timedOut,
      });
    });
  });

const fail = (message: string): IAnalysisResult => ({ ok: false, message });

const parseReport = (stdout: string): IAnalysisResult => {
  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    errorLogger.error('Analysis engine printed output that is not JSON');
    return fail(GENERIC_FAILURE);
  }

  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    errorLogger.error(
      `Analysis report broke the contract: ${parsed.error.message}`,
    );
    return fail(GENERIC_FAILURE);
  }
  return { ok: true, report: parsed.data };
};

// Resolves for every outcome, so callers only need to check `ok`.
export const runAnalysis = async (
  filePath: string,
): Promise<IAnalysisResult> => {
  let output: IProcessOutput;
  try {
    output = await runProcess(filePath);
  } catch (error) {
    errorLogger.error(`Could not start the analysis engine: ${String(error)}`);
    return fail(GENERIC_FAILURE);
  }

  if (output.timedOut) {
    return fail(TIMEOUT_FAILURE);
  }
  if (output.exitCode === EXPECTED_FAILURE_CODE) {
    const message = output.stderr.trim().split('\n')[0];
    return fail(message.slice(0, MAX_MESSAGE_LENGTH) || GENERIC_FAILURE);
  }
  if (output.exitCode !== 0) {
    errorLogger.error(
      `Analysis engine exited with code ${output.exitCode}: ${output.stderr}`,
    );
    return fail(GENERIC_FAILURE);
  }
  return parseReport(output.stdout);
};
