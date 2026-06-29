const fs = require('fs');

const mainIndex = fs.readFileSync('C:\\\\Users\\\\iannc\\\\Documents\\\\iannc.ro\\\\src\\\\index.css', 'utf-8');
const toolStudio = fs.readFileSync('C:\\\\Users\\\\iannc\\\\Documents\\\\iannc.ro\\\\src\\\\pages\\\\ToolStudio.css', 'utf-8');
const caseCreator = fs.readFileSync('C:\\\\Users\\\\iannc\\\\Documents\\\\iannc.ro\\\\src\\\\pages\\\\CaseCreator.css', 'utf-8');

let finalCss = '';
const mainLines = mainIndex.split('\n');
finalCss += mainLines.slice(0, 80).join('\n') + '\n\n';

finalCss += `
::selection {
  background: rgba(204, 255, 0, 0.25);
  color: #fff;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type="color"]::-webkit-color-swatch {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.platform-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
`;

finalCss += '\n/* ToolStudio.css */\n' + toolStudio;
finalCss += '\n/* CaseCreator.css */\n' + caseCreator;

fs.writeFileSync('C:\\\\Users\\\\iannc\\\\Documents\\\\CS2-Case-Creator-Standalone\\\\src\\\\index.css', finalCss);
console.log('CSS merged successfully!');
