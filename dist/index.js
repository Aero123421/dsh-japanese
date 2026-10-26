var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module.exports = coerce;
  }
});

// node_modules/semver/functions/truncate.js
var require_truncate = __commonJS({
  "node_modules/semver/functions/truncate.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var constants = require_constants();
    var SemVer = require_semver();
    var truncate = (version, truncation, options) => {
      if (!constants.RELEASE_TYPES.includes(truncation)) {
        return null;
      }
      const clonedVersion = cloneInputVersion(version, options);
      return clonedVersion && doTruncation(clonedVersion, truncation);
    };
    var cloneInputVersion = (version, options) => {
      const versionStringToParse = version instanceof SemVer ? version.version : version;
      return parse(versionStringToParse, options);
    };
    var doTruncation = (version, truncation) => {
      if (isPrerelease(truncation)) {
        return version.version;
      }
      version.prerelease = [];
      switch (truncation) {
        case "major":
          version.minor = 0;
          version.patch = 0;
          break;
        case "minor":
          version.patch = 0;
          break;
      }
      return version.format();
    };
    var isPrerelease = (type) => {
      return type.startsWith("pre");
    };
    module.exports = truncate;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      src,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        if (invalidXRangeOrder(M, m, p)) {
          return comp;
        }
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !c.test(gt.semver)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !c.test(lt.semver)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports, module) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var truncate = require_truncate();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      truncate,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/index.mjs
import { readFile as readFile2 } from "node:fs/promises";
import { join as join2 } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePluginCompatibility, getDshRuntimeVersion } from "@deepseek-ai/dsh-app-boot";

// src/updates.ts
import { randomUUID, createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, writeFile, lstat } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";

// src/update-download.ts
function allowedUrl(value) {
  const url = new URL(String(value));
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) throw new Error("redirect");
  if (url.hostname === "api.github.com" && url.pathname.startsWith(`/repos/${REPOSITORY}/`)) return url;
  if (url.hostname === "github.com" && url.pathname.startsWith(`/${REPOSITORY}/releases/download/`)) return url;
  if (url.hostname === "raw.githubusercontent.com" && url.pathname.startsWith(`/${REPOSITORY}/`)) return url;
  if (["release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(url.hostname)) return url;
  throw new Error("redirect");
}
async function boundedFetch(url, limit, { fetcher = fetch, signal } = {}) {
  const timeout = AbortSignal.timeout(2e4);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetcher(allowedUrl(url), { redirect: "manual", signal: combined, headers: { accept: "application/vnd.github+json" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get("location");
      await response.body?.cancel();
      if (!next) throw new Error("redirect");
      url = new URL(next, url).href;
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(response.status === 404 ? "release-unavailable" : "network");
    }
    if (Number(response.headers.get("content-length")) > limit) {
      await response.body?.cancel();
      throw new Error("size");
    }
    const chunks = [];
    let bytes = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("network");
    try {
      for (; ; ) {
        combined.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) return Buffer.concat(chunks, bytes);
        bytes += value.byteLength;
        if (bytes > limit) throw new Error("size");
        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel().catch(() => {
      });
      reader.releaseLock();
    }
  }
  throw new Error("redirect");
}

// src/updates.ts
var import_semver = __toESM(require_semver2(), 1);
import { gunzipSync } from "node:zlib";
import { brandString } from "@deepseek-ai/dsh-brand";
var PACKAGE = "@local/dsh-japanese";
var REPOSITORY = "Aero123421/dsh-japanese";
var RELEASES = `https://github.com/${REPOSITORY}/releases`;
function inside(directory, file) {
  const path = relative(resolve(directory), resolve(file));
  return !!path && path !== ".." && !path.startsWith(".." + (process.platform === "win32" ? "\\" : "/")) && !isAbsolute(path);
}
function supportsSource(source, directory, installedVersion) {
  return typeof source === "string" && (/^(?:github:)?Aero123421\/dsh-japanese(?:#[A-Za-z0-9._/-]+)?$/i.test(source) || /^(?:git\+)?https:\/\/github\.com\/Aero123421\/dsh-japanese(?:\.git)?(?:#[A-Za-z0-9._/-]+)?$/.test(source) || /^https:\/\/github\.com\/Aero123421\/dsh-japanese\/releases\/download\/v[^/]+\/local-dsh-japanese-[^/]+\.tgz$/.test(source) || !!(directory && source.startsWith("file:") && inside(directory, source.slice(5))) || !!(installedVersion && import_semver.default.valid(installedVersion) && source.startsWith("file:") && source.replaceAll("\\", "/").endsWith(`/local-dsh-japanese-${installedVersion}.tgz`)));
}
function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("metadata");
  return value;
}
var storedCodes = ["management-required", "unaddressable", "unknown-plugin", "invalid-spec", "ambiguous-install", "not-bundle", "not-removable", "stop-profile", "bundle-in-use", "stale-approval", "incompatible-version", "operation-error", "already-installed", "settings-changed", "restore-failed"];
function errorCode(value) {
  return storedCodes.find((code) => code === value) ?? "operation-error";
}
function changeCode(result) {
  const code = result.error?.code;
  return typeof code === "string" ? code : void 0;
}
function refusal(application, code, target = PACKAGE) {
  return { changed: false, application, stage: "install", target, ...application === "failed" ? { error: { code } } : {} };
}
function packageManifest(bytes) {
  const tar = gunzipSync(bytes, { maxOutputLength: 128 * 1024 * 1024 });
  let manifest;
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString().replace(/\0.*$/, "");
    const sizeText = header.subarray(124, 136).toString().replace(/\0.*$/, "").trim();
    if (!/^[0-7]+$/.test(sizeText)) throw new Error("metadata");
    const size = Number.parseInt(sizeText, 8);
    if (!Number.isSafeInteger(size) || offset + 512 + size > tar.length) throw new Error("metadata");
    const path = prefix ? `${prefix}/${name}` : name;
    if (path === "package/package.json") {
      if (manifest || ![0, 48].includes(header[156]) || size > 65536) throw new Error("metadata");
      manifest = record(JSON.parse(tar.subarray(offset + 512, offset + 512 + size).toString()));
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (!manifest) throw new Error("metadata");
  return manifest;
}
async function json(url, fetcher) {
  const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(15e3), headers: { accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`fetch-${response.status}`);
  if (!response.body) throw new Error("metadata");
  const reader = response.body.getReader();
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 512e3) throw new Error("metadata-size");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
var WORKSPACE_PEER = /* @__PURE__ */ new Set(["workspace:^", "workspace:~", "workspace:*"]);
function dshSatisfies(runtime, range) {
  return range.trim() !== "" && import_semver.default.satisfies(runtime, range, { includePrerelease: true });
}
function unmetDshRequirements(manifest, runtime) {
  const engines = Object.hasOwn(manifest, "engines") ? record(manifest.engines) : {};
  if (Object.hasOwn(engines, "dsh")) {
    if (typeof engines.dsh !== "string") throw new Error("metadata");
    return dshSatisfies(runtime, engines.dsh) ? {} : { "engines.dsh": engines.dsh };
  }
  if (!Object.hasOwn(manifest, "peerDependencies")) return {};
  const unmet = {};
  for (const [name, range] of Object.entries(record(manifest.peerDependencies))) {
    if (typeof range !== "string") throw new Error("metadata");
    if (name !== "@deepseek-ai/dsh" && !name.startsWith("@deepseek-ai/dsh-")) continue;
    if (!dshSatisfies(runtime, WORKSPACE_PEER.has(range) ? runtime : range)) unmet[name] = range;
  }
  return unmet;
}
async function getCandidate(runtime, fetcher = fetch, evaluate = unmetDshRequirements) {
  const release = record(await json(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, fetcher));
  const tag = release.tag_name, version = typeof tag === "string" && tag.startsWith("v") ? tag.slice(1) : "";
  if (!Number.isSafeInteger(release.id) || release.draft !== false || release.prerelease !== false || !import_semver.default.valid(version) || import_semver.default.prerelease(version) || release.html_url !== `${RELEASES}/tag/${tag}`) throw new Error("metadata");
  const manifest = record(await json(`https://raw.githubusercontent.com/${REPOSITORY}/${tag}/package.json`, fetcher));
  if (manifest.name !== PACKAGE || manifest.version !== version || record(record(manifest.dsh).bundle).patch !== "./cordis.patch.yml") throw new Error("metadata");
  if (!import_semver.default.valid(runtime)) throw new Error("incompatible");
  const unmet = evaluate(manifest, runtime);
  if (Object.keys(unmet).length > 0) throw Object.assign(new Error("incompatible"), { requirements: unmet });
  const filename = `local-dsh-japanese-${version}.tgz`;
  if (!Array.isArray(release.assets)) throw new Error("asset");
  const assets = release.assets;
  const asset = (name) => {
    const matches = assets.filter((value2) => record(value2).name === name);
    if (matches.length !== 1) throw new Error("asset");
    const value = record(matches[0]), url = `https://github.com/${REPOSITORY}/releases/download/${tag}/${name}`;
    if (!Number.isSafeInteger(value.id) || Number(value.id) <= 0 || !Number.isSafeInteger(value.size) || Number(value.size) <= 0 || value.browser_download_url !== url) throw new Error("asset");
    return url;
  };
  return { filename, tarball: asset(filename), checksum: asset("SHA256SUMS"), id: `${release.id}:${tag}`, version, tag: String(tag), notes: typeof release.body === "string" ? release.body.slice(0, 4e3) : "", url: String(release.html_url), runtime };
}
var Updates = class {
  view;
  candidate;
  operation;
  pendingOperation;
  pending;
  getManager;
  dir;
  profileKey;
  running;
  runtime;
  fetcher;
  schedule;
  evaluate;
  closed = false;
  abort = new AbortController();
  constructor(getManager, dir, running, runtime, fetcher = fetch, schedule, evaluate = unmetDshRequirements) {
    this.getManager = getManager;
    this.dir = dir;
    this.running = running;
    this.runtime = runtime;
    this.evaluate = evaluate;
    this.schedule = schedule ?? ((task) => {
      queueMicrotask(() => {
        void task();
      });
    });
    this.fetcher = (input, options) => fetcher(input, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, this.abort.signal]) : this.abort.signal });
    this.profileKey = dir ? createHash("sha256").update(`${PACKAGE}:${dir}`).digest("hex") : null;
    this.view = { status: "idle", running, profileKey: this.profileKey };
  }
  dispose() {
    this.closed = true;
    this.abort.abort();
  }
  get manager() {
    return this.getManager();
  }
  path() {
    if (!this.dir) throw new Error("management-required");
    return join(this.dir, ".dsh-japanese-update", "operation.json");
  }
  async save() {
    const path = this.path();
    await mkdir(join(this.dir, ".dsh-japanese-update"), { recursive: true, mode: 448 });
    if ((await lstat(join(this.dir, ".dsh-japanese-update"))).isSymbolicLink()) throw new Error("storage");
    const temp = `${path}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify({ id: this.operation.id, version: this.operation.version, ...this.operation.result ? { result: { bundle: this.operation.result.bundle, application: this.operation.result.application, version: this.operation.result.version, stage: this.operation.result.stage, error: this.operation.result.error ? { code: this.operation.result.error.code } : void 0 } } : {} }), { mode: 384, flag: "wx" });
    await rename(temp, path);
  }
  async bundle() {
    if (this.closed) throw new Error("cancelled");
    if (!this.manager || !this.dir || typeof this.manager.listBundles !== "function" || typeof this.manager.installBundle !== "function" || typeof this.manager.waitForInstall !== "function") throw new Error("management-required");
    const bundle = (await this.manager.listBundles()).find((row) => row.name === PACKAGE);
    if (!bundle?.installed || bundle.readOnlyReason || bundle.error) throw new Error(bundle?.readOnlyReason ?? "not-installed");
    if (!supportsSource(bundle.source, this.dir && join(this.dir, ".dsh-japanese-update"), bundle.version)) throw new Error("source-unsupported");
    if (bundle.source?.startsWith("file:")) {
      const file = await lstat(bundle.source.slice(5)).catch(() => void 0);
      if (!file?.isFile() || file.isSymbolicLink()) throw new Error("source-unsupported");
    }
    return bundle;
  }
  fail(error, status = "failed", requirements) {
    const reason = error instanceof Error ? error.message : "operation-error";
    const known = ["management-required", "unaddressable", "not-installed", "source-unsupported", "metadata", "metadata-size", "incompatible", "asset", "checksum", "redirect", "size", "storage", "cancelled", "candidate-changed", "settings-changed", "already-installed", "restore-failed", "result-unknown", "invalid-request", "journal", "release-unavailable", "network"];
    const { requirements: stale, ...previous } = this.view;
    this.view = { ...previous, status, reason: known.includes(reason) ? reason : "operation-error", ...requirements ? { requirements } : {} };
    return this.view;
  }
  async status(expectedId) {
    try {
      if (expectedId !== void 0 && (typeof expectedId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(expectedId))) throw new Error("invalid-request");
      const bundle = await this.bundle();
      this.view = { ...this.view, installed: bundle.version ?? "unknown" };
      if (!this.operation) {
        try {
          await this.loadJournal();
        } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) return this.fail(error, "unknown");
        }
      }
      if (expectedId && expectedId !== this.operation?.id) return { ...this.view, status: "unknown", operation: typeof expectedId === "string" ? expectedId : "invalid" };
      if (this.operation) {
        const result = this.operation.result ?? await this.manager.waitForInstall(brandString(this.operation.id)) ?? await this.journalResult();
        if (!result) {
          this.view = { ...this.view, status: "unknown", operation: this.operation.id };
          return this.view;
        }
        this.operation.result = result;
        await this.save();
        return this.result(result, bundle.version);
      }
      return this.view;
    } catch (error) {
      return this.failOrRestore(error, "unavailable");
    }
  }
  async loadJournal() {
    if (this.operation) return;
    const value = record(JSON.parse(await readFile(this.path(), "utf8")));
    if (typeof value.id !== "string" || !/^[0-9a-f-]{36}$/.test(value.id) || typeof value.version !== "string" || !import_semver.default.valid(value.version)) throw new Error("journal");
    const operation = { id: value.id, version: value.version };
    if (value.result) {
      const result = record(value.result);
      if (!["applied", "restart-required", "overridden", "failed", "cancelled"].includes(String(result.application)) || !["install", "enable", "remove"].includes(String(result.stage))) throw new Error("journal");
      operation.result = { changed: false, target: PACKAGE, ...result.bundle === PACKAGE ? { bundle: PACKAGE } : {}, application: result.application, stage: result.stage, ...typeof result.version === "string" ? { version: result.version } : {}, ...result.error ? { error: { code: errorCode(record(result.error).code) } } : {} };
    }
    this.operation = operation;
  }
  async failOrRestore(error, status, requirements) {
    if (error instanceof Error && (error.message === "not-installed" || error.message === "cancelled")) {
      try {
        await this.loadJournal();
      } catch {
      }
      if (this.operation?.result && changeCode(this.operation.result) === "restore-failed") {
        const { installed: _installed, reason: _reason, ...previous } = this.view;
        this.view = { ...previous, status: "failed", reason: "restore-failed", operation: this.operation.id, stage: this.operation.result.stage };
        return this.view;
      }
    }
    return this.fail(error, status, requirements);
  }
  result(result, installed) {
    const operation = this.operation;
    let status = result.application;
    if (result.application === "failed" || ["applied", "restart-required"].includes(result.application) && (result.error || result.packageResult && (result.packageResult.exitCode !== 0 || result.packageResult.timedOut))) status = "failed";
    else if (result.application === "applied" || result.application === "restart-required") {
      if (result.bundle !== PACKAGE || result.version !== operation.version || installed !== operation.version) status = "unknown";
      else status = this.running === operation.version ? "applied" : "restart-required";
    }
    const { reason: _reason, ...previous } = this.view;
    this.view = { ...previous, status, operation: this.operation.id, stage: result.stage, ...result.error ? { reason: result.error.code } : {} };
    return this.view;
  }
  check() {
    if (this.pending) return this.pending;
    if (this.view.status === "installing" || this.view.status === "unknown") return this.status();
    this.pending = (async () => {
      try {
        const bundle = await this.bundle();
        this.candidate = void 0;
        this.view = { status: "checking", running: this.running, profileKey: this.profileKey };
        const candidate = await getCandidate(this.runtime, this.fetcher, this.evaluate);
        if (!import_semver.default.valid(this.running)) throw new Error("metadata");
        this.candidate = candidate;
        this.view = { status: import_semver.default.gt(candidate.version, bundle.version ?? this.running) ? "available" : "current", running: this.running, profileKey: this.profileKey, candidate, checkedAt: (/* @__PURE__ */ new Date()).toISOString() };
        return this.view;
      } catch (error) {
        return this.failOrRestore(error, error instanceof Error && error.message === "incompatible" ? "incompatible" : "failed", error instanceof Error && "requirements" in error ? error.requirements : void 0);
      }
    })().finally(() => {
      this.pending = void 0;
    });
    return this.pending;
  }
  install(candidateId, operationId, expectedProfileKey) {
    if (!this.profileKey || expectedProfileKey !== this.profileKey) return Promise.reject(new Error("profile-changed"));
    if (this.pending) return this.pendingOperation !== void 0 && this.pendingOperation === operationId ? this.pending : Promise.reject(new Error("busy"));
    this.pendingOperation = typeof operationId === "string" ? operationId : void 0;
    this.pending = (async () => {
      let started = false, admitted = false;
      try {
        await this.status();
        if (this.operation?.id === operationId) return this.status();
        if (this.operation && !this.operation.result) throw new Error("result-unknown");
        if (typeof operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationId)) throw new Error("invalid-request");
        const before = await this.bundle(), candidate = await getCandidate(this.runtime, this.fetcher, this.evaluate);
        if (!this.candidate || candidate.id !== candidateId || candidate.id !== this.candidate.id || !import_semver.default.gt(candidate.version, before.version ?? this.running)) throw new Error("candidate-changed");
        this.operation = { id: operationId, version: candidate.version };
        admitted = true;
        await this.save();
        this.view = { ...this.view, status: "installing", operation: operationId };
        let spec = `github:${REPOSITORY}#${candidate.tag}`;
        if (before.source?.startsWith("file:") || before.source?.includes("/releases/download/")) {
          const checksum = (await boundedFetch(candidate.checksum, 8192, { fetcher: this.fetcher })).toString().trim();
          const match = /^([a-fA-F0-9]{64})  (\S+)$/.exec(checksum);
          if (!match || match[2] !== candidate.filename) throw new Error("checksum");
          const bytes = await boundedFetch(candidate.tarball, 32 * 1024 * 1024, { fetcher: this.fetcher });
          if (createHash("sha256").update(bytes).digest("hex") !== match[1].toLowerCase()) throw new Error("checksum");
          const manifest = packageManifest(bytes);
          if (manifest.name !== PACKAGE || manifest.version !== candidate.version || record(record(manifest.dsh).bundle).patch !== "./cordis.patch.yml") throw new Error("metadata");
          const unmet = this.evaluate(manifest, this.runtime);
          if (Object.keys(unmet).length > 0) throw Object.assign(new Error("incompatible"), { requirements: unmet });
          const directory = await mkdtemp(join(this.dir, ".dsh-japanese-update", "verified-"));
          spec = join(directory, candidate.filename);
          await writeFile(spec, bytes, { flag: "wx", mode: 384 });
        }
        const latest = await this.bundle();
        if (latest.source !== before.source || latest.enabled !== before.enabled) throw new Error("settings-changed");
        if (this.closed) throw new Error("cancelled");
        started = true;
        const manager = this.manager;
        let result = await manager.installBundle(spec, { enabled: before.enabled, requestId: brandString(operationId) });
        if (changeCode(result) === "already-installed") result = await this.replaceInstalled(manager, spec, before, operationId);
        this.operation.result = result;
        await this.save();
        let installed = result.version;
        try {
          installed = (await this.bundle()).version;
        } catch {
        }
        return this.result(result, installed);
      } catch (error) {
        if (admitted && this.operation && this.operation.id === operationId && !this.operation.result && !started) {
          this.operation.result = { changed: false, application: "failed", target: PACKAGE, stage: "install", error: { code: "operation-error" } };
          await this.save().catch(() => {
          });
        }
        const incompatible = !started && error instanceof Error && error.message === "incompatible";
        const requirements = incompatible && "requirements" in error ? error.requirements : void 0;
        return this.failOrRestore(error, incompatible ? "incompatible" : this.operation && !this.operation.result ? "unknown" : "failed", requirements);
      }
    })().finally(() => {
      this.pending = void 0;
      this.pendingOperation = void 0;
    });
    return this.pending;
  }
  async journalResult() {
    if (!this.operation) return void 0;
    try {
      const value = record(JSON.parse(await readFile(this.path(), "utf8")));
      if (value.id !== this.operation.id || !value.result) return void 0;
      const parsed = record(value.result);
      if (!["applied", "restart-required", "overridden", "failed", "cancelled"].includes(String(parsed.application)) || !["install", "enable", "remove"].includes(String(parsed.stage))) return void 0;
      return { changed: false, target: PACKAGE, ...parsed.bundle === PACKAGE ? { bundle: PACKAGE } : {}, application: parsed.application, stage: parsed.stage, ...typeof parsed.version === "string" ? { version: parsed.version } : {}, ...parsed.error ? { error: { code: errorCode(record(parsed.error).code) } } : {} };
    } catch {
      return void 0;
    }
  }
  replaceInstalled(manager, spec, before, operationId) {
    const remove = manager.removeBundle;
    if (remove === void 0) return Promise.resolve(refusal("failed", "already-installed", spec));
    const enabled = before.enabled;
    const previous = before.source;
    return new Promise((resolve2, reject) => {
      try {
        this.schedule(() => this.runReplacement(manager, remove, spec, enabled, previous, operationId).then(resolve2, reject));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("operation-error"));
      }
    }).catch(() => refusal("failed", "operation-error", spec));
  }
  async runReplacement(manager, remove, spec, enabled, previous, operationId) {
    if (this.closed) return refusal("cancelled", "operation-error");
    let removed;
    try {
      const current = (await manager.listBundles()).find((row) => row.name === PACKAGE);
      if (!current?.installed || current.enabled !== enabled || current.source !== previous) return refusal("failed", "settings-changed");
      removed = await remove(PACKAGE);
      if (removed.application !== "applied" && removed.application !== "restart-required") return removed;
      const installed = await manager.installBundle(spec, { enabled, requestId: brandString(operationId) });
      return this.restoreIfMissing(manager, installed, enabled, previous);
    } catch {
      if (removed && previous !== void 0) return this.restoreIfMissing(manager, refusal("failed", "operation-error"), enabled, previous);
      return refusal("failed", "operation-error");
    }
  }
  restoreCommitted(result) {
    if (result.application !== "applied" && result.application !== "restart-required") return false;
    if (result.error) return false;
    const outcome = result.packageResult;
    return !outcome || outcome.exitCode === 0 && !outcome.timedOut;
  }
  async restoreIfMissing(manager, installed, enabled, previous) {
    if (previous === void 0 || installed.application !== "failed" && installed.application !== "cancelled" || changeCode(installed) === "already-installed") return installed;
    let present;
    try {
      present = (await manager.listBundles()).some((row) => row.name === PACKAGE && row.installed);
    } catch {
      return installed;
    }
    if (present || !this.operation) return installed;
    this.operation.result = installed;
    try {
      await this.save();
    } catch {
    }
    let restored;
    try {
      restored = await manager.installBundle(previous, { enabled, requestId: brandString(randomUUID()) });
    } catch {
      restored = void 0;
    }
    let listed;
    try {
      listed = (await manager.listBundles()).some((row) => row.name === PACKAGE && row.installed);
    } catch {
      listed = void 0;
    }
    const committed = restored !== void 0 && (changeCode(restored) === "already-installed" || this.restoreCommitted(restored));
    if (listed === true || committed && listed === void 0) return installed;
    const failed = refusal("failed", "restore-failed");
    this.operation.result = failed;
    try {
      await this.save();
    } catch {
    }
    return failed;
  }
};

// src/version.ts
var VERSION = "0.2.3";

// src/font-files.mjs
var fontFileNames = [
  "noto-sans-jp-0-wght-normal.woff2",
  "noto-sans-jp-1-wght-normal.woff2",
  "noto-sans-jp-10-wght-normal.woff2",
  "noto-sans-jp-100-wght-normal.woff2",
  "noto-sans-jp-101-wght-normal.woff2",
  "noto-sans-jp-102-wght-normal.woff2",
  "noto-sans-jp-103-wght-normal.woff2",
  "noto-sans-jp-104-wght-normal.woff2",
  "noto-sans-jp-105-wght-normal.woff2",
  "noto-sans-jp-106-wght-normal.woff2",
  "noto-sans-jp-107-wght-normal.woff2",
  "noto-sans-jp-108-wght-normal.woff2",
  "noto-sans-jp-109-wght-normal.woff2",
  "noto-sans-jp-11-wght-normal.woff2",
  "noto-sans-jp-110-wght-normal.woff2",
  "noto-sans-jp-111-wght-normal.woff2",
  "noto-sans-jp-112-wght-normal.woff2",
  "noto-sans-jp-113-wght-normal.woff2",
  "noto-sans-jp-114-wght-normal.woff2",
  "noto-sans-jp-115-wght-normal.woff2",
  "noto-sans-jp-116-wght-normal.woff2",
  "noto-sans-jp-117-wght-normal.woff2",
  "noto-sans-jp-118-wght-normal.woff2",
  "noto-sans-jp-119-wght-normal.woff2",
  "noto-sans-jp-12-wght-normal.woff2",
  "noto-sans-jp-13-wght-normal.woff2",
  "noto-sans-jp-14-wght-normal.woff2",
  "noto-sans-jp-15-wght-normal.woff2",
  "noto-sans-jp-16-wght-normal.woff2",
  "noto-sans-jp-17-wght-normal.woff2",
  "noto-sans-jp-18-wght-normal.woff2",
  "noto-sans-jp-19-wght-normal.woff2",
  "noto-sans-jp-2-wght-normal.woff2",
  "noto-sans-jp-20-wght-normal.woff2",
  "noto-sans-jp-21-wght-normal.woff2",
  "noto-sans-jp-22-wght-normal.woff2",
  "noto-sans-jp-23-wght-normal.woff2",
  "noto-sans-jp-24-wght-normal.woff2",
  "noto-sans-jp-25-wght-normal.woff2",
  "noto-sans-jp-26-wght-normal.woff2",
  "noto-sans-jp-27-wght-normal.woff2",
  "noto-sans-jp-28-wght-normal.woff2",
  "noto-sans-jp-29-wght-normal.woff2",
  "noto-sans-jp-3-wght-normal.woff2",
  "noto-sans-jp-30-wght-normal.woff2",
  "noto-sans-jp-31-wght-normal.woff2",
  "noto-sans-jp-32-wght-normal.woff2",
  "noto-sans-jp-33-wght-normal.woff2",
  "noto-sans-jp-34-wght-normal.woff2",
  "noto-sans-jp-35-wght-normal.woff2",
  "noto-sans-jp-36-wght-normal.woff2",
  "noto-sans-jp-37-wght-normal.woff2",
  "noto-sans-jp-38-wght-normal.woff2",
  "noto-sans-jp-39-wght-normal.woff2",
  "noto-sans-jp-4-wght-normal.woff2",
  "noto-sans-jp-40-wght-normal.woff2",
  "noto-sans-jp-41-wght-normal.woff2",
  "noto-sans-jp-42-wght-normal.woff2",
  "noto-sans-jp-43-wght-normal.woff2",
  "noto-sans-jp-44-wght-normal.woff2",
  "noto-sans-jp-45-wght-normal.woff2",
  "noto-sans-jp-46-wght-normal.woff2",
  "noto-sans-jp-47-wght-normal.woff2",
  "noto-sans-jp-48-wght-normal.woff2",
  "noto-sans-jp-49-wght-normal.woff2",
  "noto-sans-jp-5-wght-normal.woff2",
  "noto-sans-jp-50-wght-normal.woff2",
  "noto-sans-jp-51-wght-normal.woff2",
  "noto-sans-jp-52-wght-normal.woff2",
  "noto-sans-jp-53-wght-normal.woff2",
  "noto-sans-jp-54-wght-normal.woff2",
  "noto-sans-jp-55-wght-normal.woff2",
  "noto-sans-jp-56-wght-normal.woff2",
  "noto-sans-jp-57-wght-normal.woff2",
  "noto-sans-jp-58-wght-normal.woff2",
  "noto-sans-jp-59-wght-normal.woff2",
  "noto-sans-jp-6-wght-normal.woff2",
  "noto-sans-jp-60-wght-normal.woff2",
  "noto-sans-jp-61-wght-normal.woff2",
  "noto-sans-jp-62-wght-normal.woff2",
  "noto-sans-jp-63-wght-normal.woff2",
  "noto-sans-jp-64-wght-normal.woff2",
  "noto-sans-jp-65-wght-normal.woff2",
  "noto-sans-jp-66-wght-normal.woff2",
  "noto-sans-jp-67-wght-normal.woff2",
  "noto-sans-jp-68-wght-normal.woff2",
  "noto-sans-jp-69-wght-normal.woff2",
  "noto-sans-jp-7-wght-normal.woff2",
  "noto-sans-jp-70-wght-normal.woff2",
  "noto-sans-jp-71-wght-normal.woff2",
  "noto-sans-jp-72-wght-normal.woff2",
  "noto-sans-jp-73-wght-normal.woff2",
  "noto-sans-jp-74-wght-normal.woff2",
  "noto-sans-jp-75-wght-normal.woff2",
  "noto-sans-jp-76-wght-normal.woff2",
  "noto-sans-jp-77-wght-normal.woff2",
  "noto-sans-jp-78-wght-normal.woff2",
  "noto-sans-jp-79-wght-normal.woff2",
  "noto-sans-jp-8-wght-normal.woff2",
  "noto-sans-jp-80-wght-normal.woff2",
  "noto-sans-jp-81-wght-normal.woff2",
  "noto-sans-jp-82-wght-normal.woff2",
  "noto-sans-jp-83-wght-normal.woff2",
  "noto-sans-jp-84-wght-normal.woff2",
  "noto-sans-jp-85-wght-normal.woff2",
  "noto-sans-jp-86-wght-normal.woff2",
  "noto-sans-jp-87-wght-normal.woff2",
  "noto-sans-jp-88-wght-normal.woff2",
  "noto-sans-jp-89-wght-normal.woff2",
  "noto-sans-jp-9-wght-normal.woff2",
  "noto-sans-jp-90-wght-normal.woff2",
  "noto-sans-jp-91-wght-normal.woff2",
  "noto-sans-jp-92-wght-normal.woff2",
  "noto-sans-jp-93-wght-normal.woff2",
  "noto-sans-jp-94-wght-normal.woff2",
  "noto-sans-jp-95-wght-normal.woff2",
  "noto-sans-jp-96-wght-normal.woff2",
  "noto-sans-jp-97-wght-normal.woff2",
  "noto-sans-jp-98-wght-normal.woff2",
  "noto-sans-jp-99-wght-normal.woff2",
  "noto-sans-jp-cyrillic-wght-normal.woff2",
  "noto-sans-jp-latin-ext-wght-normal.woff2",
  "noto-sans-jp-latin-wght-normal.woff2",
  "noto-sans-jp-vietnamese-wght-normal.woff2"
];

// src/fonts.mjs
var FONT_ROUTE = "/dsh-japanese/fonts";
var shipped = new Set(fontFileNames);
function fontFileName(pathname) {
  const prefix = `${FONT_ROUTE}/`;
  if (!pathname.startsWith(prefix)) return void 0;
  const name = pathname.slice(prefix.length);
  return shipped.has(name) ? name : void 0;
}

// src/index.mjs
function publishedDshRequirements(issue) {
  if (!issue || issue.exempted === true) return {};
  return issue.requirements ?? issue.peers ?? {};
}
function apply(ctx) {
  const updates = new Updates(() => ctx.get("pluginManager"), ctx.get("profileContext")?.dir, VERSION, getDshRuntimeVersion(), fetch, void 0, (manifest, runtime) => {
    try {
      return publishedDshRequirements(evaluatePluginCompatibility(manifest, {}, runtime));
    } catch {
      throw new Error("metadata");
    }
  });
  ctx.effect(() => () => updates.dispose());
  ctx.inject(["webServer"], (child) => {
    const directory = fileURLToPath(new URL("./fonts/", import.meta.url));
    child.effect(() => child.webServer.register({
      kind: "prefix",
      path: FONT_ROUTE,
      async handler(request, response) {
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.writeHead(405);
          response.end();
          return;
        }
        let pathname = "/";
        try {
          pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        } catch {
        }
        const name = fontFileName(pathname);
        if (name === void 0) {
          response.writeHead(404);
          response.end();
          return;
        }
        try {
          const body = await readFile2(join2(directory, name));
          response.writeHead(200, {
            "content-type": "font/woff2",
            "content-length": String(body.length),
            "cache-control": "public, max-age=31536000, immutable"
          });
          if (request.method === "HEAD") response.end();
          else response.end(body);
        } catch {
          if (!response.headersSent) {
            response.writeHead(404);
            response.end();
          }
        }
      }
    }), "dsh-japanese: fonts");
  });
  ctx.inject(["connection"], (child) => {
    for (const method of ["status", "check", "install"]) {
      const endpoint = `dsh-japanese-updates/update-${method}`;
      child.connection.fetch.register({ path: `/api/${endpoint}`, methods: ["POST"], requestBody: "buffered", async fetch(request) {
        let rpcId;
        try {
          if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return new Response("unsupported media type", { status: 415 });
          const envelope = await request.json();
          if (!envelope || envelope.type !== "client-request" || typeof envelope.rpcId !== "string" || envelope.rpcId.length > 100 || envelope.method !== endpoint || !envelope.payload || typeof envelope.payload !== "object" || Array.isArray(envelope.payload)) return new Response("invalid request", { status: 400 });
          rpcId = envelope.rpcId;
          request.signal.throwIfAborted();
          const value = method === "status" ? await updates.status(envelope.payload.operationId) : method === "check" ? await updates.check() : await updates.install(envelope.payload.candidateId, envelope.payload.operationId, envelope.payload.profileKey);
          return Response.json({ type: "server-response", rpcId, result: { ok: true, value } }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          if (rpcId === void 0) return new Response("invalid request", { status: 400 });
          return Response.json({ type: "server-response", rpcId, result: { ok: false, error: { code: `dsh-japanese-updates/${error instanceof Error && ["busy", "profile-changed"].includes(error.message) ? error.message : "unavailable"}`, message: "unavailable", details: {} } } }, { headers: { "cache-control": "no-store" } });
        }
      } });
    }
  });
}
export {
  apply
};
