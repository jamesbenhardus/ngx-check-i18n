#! /usr/bin/env node

var colors = require("colors");
var findFiles = require("./find-files");
var fs = require("fs");
var HTMLParser = require("node-html-parser");
var shell = require("shelljs");
var yargs = require("yargs").option("paths", {
  type: "array",
});

var argv = yargs.argv;

var dir = argv.path || ".";
var paths = argv.paths || [];
if (!paths.includes(dir)) {
  paths.push(dir);
}

var matches = [];
paths.forEach((dir) => findFiles(dir, matches));

var tags = {};
var errors = {};
var warnings = {};

matches.forEach((match) => {
  var file = fs.readFileSync(match).toString();
  var root = HTMLParser.parse(file);
  var elements = root.querySelectorAll("[i18n]");
  elements.forEach((el) => {
    var key = el.getAttribute("i18n");
    if (key != "") {
      var value = el.innerHTML.trim().replace(/\s+/g, " ");
      var compare = tags[key];
      if (compare) {
        if (compare != value) {
          if (compare.toLowerCase() == value.toLowerCase()) {
            var exisitingWarning = warnings[key];
            if (exisitingWarning) {
              if (!exisitingWarning.values.includes(value)) {
                exisitingWarning.values.push(value);
              }
            } else {
              warnings[key] = { values: [compare, value] };
            }
          } else {
            var existingError = errors[key];
            if (existingError) {
              if (!existingError.values.includes(value)) {
                existingError.values.push(value);
              }
            } else {
              errors[key] = { values: [compare, value] };
            }
          }
        }
      } else {
        tags[key] = value;
      }
    }
  });
});

const numWarnings = Object.keys(warnings).length;
if (numWarnings > 0) {
  console.warn(
    `${numWarnings} warning${numWarnings == 1 ? "" : "s"} found:`.yellow
  );
  Object.keys(warnings).forEach((key) => {
    shell.echo(("key: " + key).yellow);
    shell.echo("values:".yellow);
    warnings[key].values.forEach((val) => {
      shell.echo((" - " + val).yellow);
    });
  });
}
const numErrors = Object.keys(errors).length;
if (numErrors > 0) {
  console.error(`${numErrors} error${numErrors == 1 ? "" : "s"} found:`.red);
  Object.keys(errors).forEach((key) => {
    shell.echo(("key: " + key).red);
    shell.echo("values:".red);
    errors[key].values.forEach((val) => {
      shell.echo((" - " + val).red);
    });
  });
}
shell.echo("======== Summary ========");
const numTags = Object.keys(tags).length;
shell.echo(numTags + " tags found");
if (numWarnings > 0) {
  shell.echo(`${numWarnings} warning${numWarnings == 1 ? "" : "s"}`.yellow);
} else {
  shell.echo("0 warnings".green);
}
if (numErrors > 0) {
  shell.echo(`${numErrors} error${numErrors == 1 ? "" : "s"}`.red);
  process.exit(1);
} else {
  shell.echo("0 errors".green);
}
