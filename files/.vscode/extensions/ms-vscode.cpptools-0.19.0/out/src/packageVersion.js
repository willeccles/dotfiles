'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class PackageVersion {
    constructor(version) {
        const tokens = version.split(new RegExp('[-\\.]', 'g'));
        if (tokens.length < 3) {
            throw new Error('Failed to parse version string: ' + version);
        }
        this.major = parseInt(tokens[0]);
        this.minor = parseInt(tokens[1]);
        this.patch = parseInt(tokens[2]);
        if (tokens.length > 3) {
            const firstDigitOffset = tokens[3].search(new RegExp(/(\d)/));
            if (firstDigitOffset !== -1) {
                this.suffix = tokens[3].substring(0, firstDigitOffset);
                this.suffixVersion = parseInt(tokens[3].substring(firstDigitOffset));
            }
        }
        if (this.major === undefined || this.minor === undefined || this.patch === undefined) {
            throw new Error('Failed to parse version string: ' + version);
        }
    }
    isGreaterThan(other) {
        if ((this.suffix && !this.suffix.startsWith('insiders')) || (other.suffix && !other.suffix.startsWith('insiders'))) {
            return false;
        }
        let diff = this.major - other.major;
        if (diff) {
            return diff > 0;
        }
        else if (diff = this.minor - other.minor) {
            return diff > 0;
        }
        else if (diff = this.patch - other.patch) {
            return diff > 0;
        }
        else if (this.suffix) {
            return (other.suffix && this.suffixVersion > other.suffixVersion);
        }
        else {
            return other.suffix ? true : false;
        }
    }
}
exports.PackageVersion = PackageVersion;
//# sourceMappingURL=packageVersion.js.map