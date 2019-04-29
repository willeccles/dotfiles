"use strict";
/**
 * Wrappers and utilities around the NodeJS `child_process` module.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const proc = require("child_process");
const iconv = require("iconv-lite");
const logging_1 = require("./logging");
const rollbar_1 = require("./rollbar");
const util = require("./util");
const log = logging_1.createLogger('proc');
/**
 * Execute a command and return the result
 * @param command The binary to execute
 * @param args The arguments to pass to the binary
 * @param outputConsumer An output consumer for the command execution
 * @param options Additional execution options
 *
 * @note Output from the command is accumulated into a single buffer: Commands
 * which produce a lot of output should be careful about memory constraints.
 */
function execute(command, args, outputConsumer, options) {
    if (options && options.silent !== true) {
        log.info('Executing command: '
            // We do simple quoting of arguments with spaces.
            // This is only shown to the user,
            // and doesn't have to be 100% correct.
            + [command]
                .concat(args)
                .map(a => a.replace('"', '\"'))
                .map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a)
                .join(' '));
    }
    if (!options) {
        options = {};
    }
    const final_env = util.mergeEnvironment(process.env, options.environment || {});
    const spawn_opts = {
        env: final_env,
        shell: !!options.shell,
    };
    if (options && options.cwd) {
        spawn_opts.cwd = options.cwd;
    }
    const child = proc.spawn(command, args, spawn_opts);
    if (options.encoding)
        child.stdout.setEncoding(options.encoding);
    const encoding = options.outputEncoding ? options.outputEncoding : 'utf8';
    const result = new Promise((resolve, reject) => {
        child.on('error', err => { reject(err); });
        let stdout_acc = '';
        let line_acc = '';
        let stderr_acc = '';
        let stderr_line_acc = '';
        child.stdout.on('data', (data) => {
            rollbar_1.default.invoke('Processing "data" event from proc stdout', { data, command, args }, () => {
                const str = iconv.decode(new Buffer(data), encoding);
                const lines = str.split('\n').map(l => l.endsWith('\r') ? l.substr(0, l.length - 1) : l);
                while (lines.length > 1) {
                    line_acc += lines[0];
                    if (outputConsumer) {
                        outputConsumer.output(line_acc);
                    }
                    line_acc = '';
                    // Erase the first line from the list
                    lines.splice(0, 1);
                }
                console.assert(lines.length, 'Invalid lines', JSON.stringify(lines));
                line_acc += lines[0];
                stdout_acc += str;
            });
        });
        child.stderr.on('data', (data) => {
            rollbar_1.default.invoke('Processing "data" event from proc stderr', { data, command, args }, () => {
                const str = data.toString();
                const lines = str.split('\n').map(l => l.endsWith('\r') ? l.substr(0, l.length - 1) : l);
                while (lines.length > 1) {
                    stderr_line_acc += lines[0];
                    if (outputConsumer) {
                        outputConsumer.error(stderr_line_acc);
                    }
                    stderr_line_acc = '';
                    // Erase the first line from the list
                    lines.splice(0, 1);
                }
                console.assert(lines.length, 'Invalid lines', JSON.stringify(lines));
                stderr_line_acc += lines[0];
                stderr_acc += str;
            });
        });
        // Don't stop until the child stream is closed, otherwise we might not read
        // the whole output of the command.
        child.on('close', retc => {
            try {
                rollbar_1.default.invoke('Resolving process on "close" event', { line_acc, stderr_line_acc, command, retc }, () => {
                    if (line_acc && outputConsumer) {
                        outputConsumer.output(line_acc);
                    }
                    if (stderr_line_acc && outputConsumer) {
                        outputConsumer.error(stderr_line_acc);
                    }
                    resolve({ retc, stdout: stdout_acc, stderr: stderr_acc });
                });
            }
            catch (_) {
                // No error handling since Rollbar has taken the error.
                resolve({ retc, stdout: stdout_acc, stderr: stderr_acc });
            }
        });
    });
    return { child, result };
}
exports.execute = execute;
//# sourceMappingURL=proc.js.map