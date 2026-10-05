const ts = require('typescript');
const fs = require('fs');

const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
const { options, fileNames } = ts.parseJsonConfigFileContent(config, ts.sys, './');

const program = ts.createProgram(fileNames, options);
const checker = program.getTypeChecker();

let found = false;

function visit(node, sourceFile) {
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol) {
            const declarations = symbol.getDeclarations();
            if (declarations && declarations.length > 0) {
                const tags = ts.getJSDocTags(declarations[0]);
                const isDeprecated = tags.some(tag => tag.tagName.text === 'deprecated');
                if (isDeprecated) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    console.log(`Deprecated usage found: ${sourceFile.fileName}:${line + 1}:${character + 1} - ${node.getText()}`);
                    found = true;
                }
            }
        }
    }
    ts.forEachChild(node, child => visit(child, sourceFile));
}

for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile && !sourceFile.fileName.includes('node_modules')) {
        visit(sourceFile, sourceFile);
    }
}

if (!found) {
    console.log("No deprecated usages found!");
}
