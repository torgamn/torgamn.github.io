import { CONSTANTS } from './constants.js';

export async function loadLanguage(lang, state, ui, populateHelpModal) {
    let langToLoad = lang;
    try {
        let response = await fetch(`locales/${langToLoad}.json`);
        if (!response.ok) {
            console.error(`Could not load ${langToLoad}.json, falling back to English.`);
            langToLoad = 'en';
            response = await fetch(`locales/${langToLoad}.json`);
            if (!response.ok) {
                throw new Error(`Fallback to en.json also failed! Status: ${response.status}`);
            }
        }
        state.languageStrings = await response.json();
        state.currentLanguage = langToLoad;
        updateUIWithLanguage(state, ui, populateHelpModal);
    } catch (error) {
        console.error("Fatal: Could not load any language file.", error);
    }
}

export function updateUIWithLanguage(state, ui, populateHelpModal) {
    const strings = state.languageStrings;
    if (Object.keys(strings).length === 0) return;

    ui.fileMenuLabel.textContent = strings.fileMenu;
    ui.viewMenuLabel.textContent = strings.viewMenu;
    ui.runMenuLabel.textContent = strings.runMenu;
    ui.btnModules.textContent = strings.modulesMenu;
    
    ui.btnAbout.textContent = strings.aboutBtn;
    ui.btnHelp.textContent = strings.helpBtn;
    ui.languageSwitch.textContent = strings.langSwitch;
    ui.btnRunProg.textContent = strings.runProgBtn;
    ui.btnStep.textContent = strings.stepBtn;
    ui.btnClear.textContent = strings.clearBtn;
    ui.btnLoad.textContent = strings.loadBtn;
    ui.btnSave.textContent = strings.saveBtn;

    ui.editorTitle.textContent = strings.editorTitle;
    ui.gridTitle.textContent = strings.gridTitle;

    ui.modulesTitle.textContent = strings.modulesTitle;
    ui.modulesDesc.textContent = strings.modulesDesc;
    ui.moduleClassicLabel.textContent = strings.moduleClassic;
    ui.moduleVLabel.textContent = strings.moduleV;
    ui.moduleExpandedLabel.textContent = strings.moduleExpanded;

    populateHelpModal(state, ui);
}

export function populateHelpModal(state, ui) {
    const helpData = state.languageStrings.help;
    if (!helpData || !helpData.instructions) {
        ui.helpContent.innerHTML = 'Error: Help content not available.';
        return;
    }

    ui.helpTitle.textContent = helpData.title;
    
    let tableHTML = '<table><thead><tr>';
    helpData.headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    helpData.instructions.forEach(instr => {
        let instrClass = '';
        if (CONSTANTS.VECTOR_INSTRUCTIONS.includes(instr.name)) {
            instrClass = 'instr-vector';
        } else if (CONSTANTS.SIMPLE_INSTRUCTIONS.includes(instr.name)) {
            instrClass = 'instr-simple';
        } else if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(instr.name)) {
            instrClass = 'instr-operand';
        }
        
        tableHTML += `
            <tr>
                <td><code class="${instrClass}">${instr.name}</code> (${instr.op})</td>
                <td>${instr.desc}</td>
                <td><code>${instr.example}</code></td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    ui.helpContent.innerHTML = tableHTML;
}

export function logMessage(key, state, ui, ...args) {
    const messageTemplate = state.languageStrings?.log?.[key];
    if (!messageTemplate) {
        ui.logContainer.innerHTML += key + '<br>';
        ui.logContainer.scrollTop = ui.logContainer.scrollHeight;
        return;
    }
    let formattedMessage = messageTemplate;
    for (let i = 0; i < args.length; i++) {
        const formattedArg = (typeof args[i] === 'number') ? (state.displayBase === 10 ? String(args[i]) : args[i].toString(16).toUpperCase()) : args[i];
        formattedMessage = formattedMessage.replace(`{${i}}`, formattedArg);
    }
    ui.logContainer.innerHTML += formattedMessage + '<br>';
    ui.logContainer.scrollTop = ui.logContainer.scrollHeight;
}
