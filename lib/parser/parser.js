'use babel'
var fs = require('fs');
var _ = require('lodash');

export default class Parser {

  constructor() {
  }

  parseFunctions(basePath, callBack) {
    functions = {};
    var filesPath = Parser.getFiles(basePath);
    _.map(filesPath, (filePath, index) => {
      fs.readFile(filePath, 'utf8', function (err, fileContent){
        functionData = Parser.parseFunction(fileContent);
        if (functionData !== undefined) {
          functionData['path'] = filePath;
          functionData['content'] = fileContent;
          if (functions[functionData.functionName] === undefined) {
            functions[functionData.functionName] = [];
          }
          functions[functionData.functionName].push(functionData);
        }
        if (index === filesPath.length - 1) {
          return callBack(functions);
        }
      });
    });
  }

  static parseFunction(fileContent) {
    parseFunctionRegex = /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\.([^(]*)([(\s+\w+,)='\[\]]*)\s+RETURNS\s+([(\s+\w+,)=\[\]]*)\s+AS/i;
    var matches = fileContent.match(parseFunctionRegex);
    var functionData = undefined;
    if (matches !== null) {
      functionData = {
        schema: matches[2],
        functionName: matches[3],
        params: Parser.parseParameters(matches[4]),
        returnType: matches[5]
      };
    }
    return functionData;
  }

  static parseParameters(paramsIn) {
    var params = {"in":[], "out":[]};
    var re = /\s*(INOUT|IN|OUT)?\s*(\w+)\s*(\w+)\s*([^,]*)/i;
    paramsIn = paramsIn.trim().replace(/\)$/, '').replace(/^\(/, '');
    var parameters = paramsIn.split(',');
    parameters.forEach(function (value) {
      if (value != null && value.length > 0) {
        var matches = value.match(re);
        var argmode = matches[1] == undefined ? 'IN' : matches[1];
        var name = matches[2];
        var type = matches[3];
        var hasDefault = matches[4] != '';
        if (argmode.toUpperCase().indexOf("IN") != -1) {
          params['in'].push({"name": name, "type": type, "argmode": argmode, "default": hasDefault});
        }
        if (argmode.toUpperCase().indexOf("OUT") != -1) {
          params['out'].push({"name": name, "type": type, "argmode": argmode, "default": hasDefault});
        }
      }
    });
    return params;
  }

  static getFiles(dir) {
    var results = [];
    var list = fs.readdirSync(dir)
    list.forEach(function (file) {
      file = dir + '/' + file
      var stat = fs.statSync(file)
      if (stat && stat.isDirectory()) {
        results = results.concat(Parser.getFiles(file))
      } else if (Parser.fileMustBeProcess(file)) {
        results.push(file);
      }
    });
    return results;
  }

  static fileMustBeProcess(filePath) {
    var directories = ['functions'];
    var extensions = ['sql'];
    var pathArray = filePath.split("/");
    var intersectionArray = _.intersection(pathArray, directories);
    var extension = filePath.substr(filePath.lastIndexOf('.') + 1);
    var validExtension = _.indexOf(extensions, extension) !== -1;
    return intersectionArray.length > 0 && validExtension;
  }

}