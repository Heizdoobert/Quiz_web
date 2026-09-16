#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function buildHtml(templatePath = 'template.html', outputPath = 'index.html') {
  const rootDir = __dirname;
  const fullTemplatePath = path.resolve(rootDir, templatePath);
  if (!fs.existsSync(fullTemplatePath)) {
    throw new Error(`Template not found: ${fullTemplatePath}`);
  }

  let content = fs.readFileSync(fullTemplatePath, 'utf8');

  // Match include comments like <!-- @include components/header.html -->
  const includeRegex = /<!--\s*@include\s+([^\s]+)\s*-->/g;
  content = content.replace(includeRegex, (match, relPath) => {
    const componentPath = path.resolve(rootDir, relPath);
    if (!fs.existsSync(componentPath)) {
      throw new Error(`Component file not found: ${componentPath} (referenced by ${match})`);
    }
    const compContent = fs.readFileSync(componentPath, 'utf8');
    return compContent;
  });

  const fullOutputPath = path.resolve(rootDir, outputPath);
  fs.writeFileSync(fullOutputPath, content, 'utf8');
  console.log(`[build.js] Successfully built ${outputPath} from ${templatePath} and sub-HTML components.`);
  return content;
}

if (require.main === module) {
  buildHtml();
}

module.exports = { buildHtml };
