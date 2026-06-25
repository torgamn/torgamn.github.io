import { CONSTANTS } from './constants.js';
import { state } from './state.js';
import { ui, createMemoryGrid, applySyntaxColors } from './ui.js';
import { loadLanguage, populateHelpModal, logMessage } from './language.js';
import { handleEditorInput, bindEventListeners, setModule } from './events.js';
import { resetState } from './execution.js';
import { calculateInstructionSize } from './assembler.js';
import { themeConfig } from './theme-config.js';

async function main() {
    // Inicializa o tema baseado na preferência do sistema (definido no state.js)
    if (state.currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        ui.themeSwitch.textContent = '☀️';
    }

    // Aplica as configurações de cores do novo arquivo
    state.syntaxColors = themeConfig;
    applySyntaxColors(state.currentTheme, state.syntaxColors);

    createMemoryGrid(ui.memoryGrid, CONSTANTS.MEMORY_SIZE);
    bindEventListeners(state, ui);
    
    // Removida a linha "; Programa" do início
    let initialContent = `VLDA 10 ; Carrega [1, 2, 3, 4] no VA
LDI 10 ; Carrega 10 no AC (A) imediatamente
VEADD ; VA = [11, 12, 13, 14]
VNOT ; Inverte os bits de cada elemento
VSTA 20 ; Salva o resultado em 20-23
HLT
; Vetor de dados
1
2
3
4`;
    
    const lines = initialContent.split('\n');
    let memUsed = 0;
    for (const line of lines) {
        memUsed += calculateInstructionSize(line);
    }

    if (memUsed < CONSTANTS.MEMORY_SIZE) {
        const remainingLines = CONSTANTS.MEMORY_SIZE - memUsed;
        initialContent += '\n'.repeat(remainingLines);
    }
    
    ui.inputLeft.value = initialContent;
    await loadLanguage(state.currentLanguage, state, ui, populateHelpModal);
    setModule(state.currentModule, state, ui);
    handleEditorInput(state, ui);
    resetState(state, ui, CONSTANTS.I_CACHE_SIZE, CONSTANTS.D_CACHE_SIZE, CONSTANTS.VECTOR_REG_SIZE);
    logMessage('init', state, ui);
}

document.addEventListener('DOMContentLoaded', main);
