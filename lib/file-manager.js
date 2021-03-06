'use babel';

var fCommon = require('./common/file-common')
var _ = require('lodash');
var parser = require('./parser');
var variables = {};
var tokens = [];
var currentContent = '';
var fManager = require('./function-manager');

function loadCurrentFile(fileContent) {
  currentContent = fileContent;
  variables = {};
  tokens = [];
  var match = fileContent.match(/DECLARE([\s\S]*?)BEGIN/i);
  if (match !== null) {
    var variablesDeclare = match[1];
    var matches = variablesDeclare.split(';');
    matches.forEach(function (value) {
      var match = value.trim();
      var variableArray = match.split(' ');
      var variableName = variableArray[0];
      var rest = match.substring(variableName.length).replace(':=', '=');
      var variableType = rest.split('=')[0];
      variables[variableName] = {"type": variableType, "argmode": "local"};
    });
  }
  var regex = /\w+/g;
  var match = fileContent.match(regex);
  for (var i = 0; i < match.length; i++) {
    var token = match[i];
    if (variables[token] === undefined) {
      tokens.push(token);
    }
  }
  var parsedFunction = parser.parseFunction(fileContent);
  if (parsedFunction !== undefined) {
    _.forEach(parsedFunction.params.in, function (value, key) {
      variables[value.name] = {"type": value.type, "argmode": value.argmode, "isParam": "true"};
    });
    _.forEach(parsedFunction.params.out, function (value, key) {
      variables[value.name] = {"type": value.type, "argmode": value.argmode, "isParam": "true"};
    });
  }
}

function getPositionForDeclareVariables(textBuffer) {
  var ret = {start: null, end: null};
  var lines = textBuffer.getLines();
  var goOn = true;
  var i = 0;
  var checkBegin = false;
  while (i < lines.length && goOn) {
    line = lines[i];
    if (line.match(/DECLARE/i) !== null) {
      ret.start = i;
      checkBegin = true;
    } else if (checkBegin && line.match(/BEGIN/i) !== null) {
      ret.end = i;
      goOn = false;
    }
    i++;
  }
  if (goOn) {
    ret = null;
  }
  return ret;
}

function getVariables() {
  return variables;
}

function getTokens() {
  return tokens;
}

function tokenize(content) {
  var regex = /\w+/g;
  var tokenizes = content.match(regex);
  return tokenizes;
}

function checkUnusedVariable() {
  var functionContent = parser.getFunctionContent(currentContent);
  var tokensFunctionContent = tokenize(functionContent);
  var unusedVariables = [];
  _.forEach(variables, function (value, key) {
    if (key.length > 0) {
      var index = _.indexOf(tokensFunctionContent, key);
      if (index === -1) {
        unusedVariables.push(key);
      }
    }
  });
  return unusedVariables;
}

function normalizeSignature(path, fileContent) {
  var fileContent  = fileContent.replace(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\.([^(]*)([(\s+\w+,)='\[\]]*)\s+RETURNS/ig, 'CREATE $1FUNCTION $2.$3$4RETURNS');
  fileContent  = fileContent.replace(/\s+DEFAULT\s+/ig, ' = ');
  fileContent = fileContent.replace(/\s\s+/g, ' ');
  atom.workspace.getActiveTextEditor().setText(fileContent);
}

function generateSelect(editor, bufferPosition) {
  var currentWord = editor.getWordUnderCursor();
  if (currentWord !== undefined && currentWord.length > 0) {
    functions = fManager.getFunctions();
    if (functions[currentWord] !== undefined && functions[currentWord].length > 0) {
      var fun = functions[currentWord][0];
      var currentCursor = editor.cursors[0];
      var previousWordBp = currentCursor.getPreviousWordBoundaryBufferPosition();
      var insertToEnd = null;
      var moveToTheEnd = false;
      if (fun.returnType === 'void') {
        generateSql = 'PERFORM ';
        editor.getBuffer().insert(previousWordBp, generateSql);
        insertToEnd = ';';
        moveToTheEnd = true;
      } else if (fun.returnType === 'record') {
        outParams = fManager.getOutParams(fun);
        generateSql = 'SELECT ' + outParams + ' FROM ';
        editor.getBuffer().insert(previousWordBp, generateSql);
        insertToEnd = ' INTO ';
        moveToTheEnd = true;
      } else {
        generateSql = ' = ';
        editor.getBuffer().insert(previousWordBp, generateSql);
        insertToEnd = ';';
      }
      if (insertToEnd !== null) {
        currentCursor.moveToEndOfLine();
        var endOfLineBp = currentCursor.getBufferPosition();
        editor.getBuffer().insert(endOfLineBp, insertToEnd);
      }
      if (moveToTheEnd) {
        currentCursor.moveToEndOfLine();
      } else {
        currentCursor.setBufferPosition(previousWordBp);
      }
    }
  }
}

function clean() {
  variables = {};
  tokens = [];
  currentContent = '';
}


export default {
  loadCurrentFile: loadCurrentFile,
  getVariables: getVariables,
  getTokens: getTokens,
  checkUnusedVariable: checkUnusedVariable,
  normalizeSignature: normalizeSignature,
  generateSelect: generateSelect,
  getPositionForDeclareVariables: getPositionForDeclareVariables,
  clean: clean
}
