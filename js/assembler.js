import { CONSTANTS } from './constants.js';
import { formatNumber } from './ui.js';

export function isInstructionVisible(instr, currentModule) {
    if (currentModule === 'classic') {
        return CONSTANTS.CLASSIC_INSTRUCTIONS.includes(instr);
    }
    if (currentModule === 'v') {
        return !CONSTANTS.EXPANDED_ONLY_INSTRUCTIONS.includes(instr);
    }
    return true;
}

export function calculateInstructionSize(line) {
    const code = line.split(';')[0].trim();
    if (!code) return 1;

    const parts = code.split(/[\s,]+/);
    const op = parts[0].toUpperCase();

    if (CONSTANTS.INSTRUCTION_MAP.hasOwnProperty(op)) {
        if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(op) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(op)) {
            return 2;
        }
    }
    return 1;
}

export function highlightSyntax(text, state, ui) {
    const boundChar = '\n';
    let highlightedText = text + boundChar;

    highlightedText = highlightedText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const simpleRegex = new RegExp(`\\b(${CONSTANTS.SIMPLE_INSTRUCTIONS.join('|')})\\b`, 'gi');
    const operandRegex = new RegExp(`\\b(${CONSTANTS.OPERAND_INSTRUCTIONS.join('|')})\\b`, 'gi');

    highlightedText = highlightedText.replace(simpleRegex, (match) => {
        const upperMatch = match.toUpperCase();
        if (isInstructionVisible(upperMatch, state.currentModule)) {
            if (CONSTANTS.VECTOR_INSTRUCTIONS.includes(upperMatch)) {
                return `<span class="instr-vector">${match}</span>`;
            }
            return `<span class="instr-simple">${match}</span>`;
        }
        return match;
    });

    highlightedText = highlightedText.replace(operandRegex, (match) => {
        const upperMatch = match.toUpperCase();
        if (isInstructionVisible(upperMatch, state.currentModule)) {
            if (CONSTANTS.VECTOR_INSTRUCTIONS.includes(upperMatch)) {
                return `<span class="instr-vector">${match}</span>`;
            }
            return `<span class="instr-operand">${match}</span>`;
        }
        return match;
    });
    
    highlightedText = highlightedText.replace(/;.*/g, '<span class="comment">$&</span>');
    
    ui.highlightingCode.innerHTML = highlightedText;
}

export function highlightMemory(state, memorySize, displayBase) {
    for (let i = 0; i < memorySize; i++) {
        const addrCell = document.getElementById(`mem-addr-${i}`);
        const valueCell = document.getElementById(`mem-value-${i}`);

        if (addrCell && valueCell) {
            addrCell.textContent = i.toString(displayBase).toUpperCase();
            valueCell.textContent = formatNumber(state.memory[i], displayBase);

            const opcodeType = state.opcodeMap[i];
            valueCell.className = 'memory-cell-value';
            if (opcodeType === 'simple') {
                valueCell.classList.add('instr-simple');
            } else if (opcodeType === 'operand') {
                valueCell.classList.add('instr-operand');
            } else if (opcodeType === 'vector') {
                valueCell.classList.add('instr-vector');
            }
        }
    }
}

export function updateLeftLineCounter(inputValue, leftInputBase, displayBase, outputLeft, memorySize) {
    const lines = inputValue.split('\n');
    const memPos = [];
    let addr = 0;
    for (const line of lines) {
        if (addr >= memorySize) {
            memPos.push('...');
        } else {
            memPos.push(formatNumber(addr, displayBase));
        }
        addr += calculateInstructionSize(line);
    }
    outputLeft.innerHTML = memPos.join('<br>');
}

export function assembleCode(state, inputValue, memorySize) {
    const lines = inputValue.split('\n');
    state.memory.fill(0);
    state.opcodeMap.fill(null);
    let memPtr = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (memPtr >= memorySize) break;

        const raw = line.split(';')[0].trim();
        if (!raw) {
            state.memory[memPtr++] = 0;
            continue;
        }
        
        const tokens = raw.split(/[\s,]+/);
        const op = tokens[0].toUpperCase();

        if (CONSTANTS.INSTRUCTION_MAP.hasOwnProperty(op)) {
            const isOperand = CONSTANTS.OPERAND_INSTRUCTIONS.includes(op) && !CONSTANTS.SIMPLE_INSTRUCTIONS.includes(op);
            if (isOperand && memPtr + 2 > memorySize) break;

            state.memory[memPtr] = CONSTANTS.INSTRUCTION_MAP[op];
            
            if (isInstructionVisible(op, state.currentModule)) {
                if (CONSTANTS.SIMPLE_INSTRUCTIONS.includes(op)) {
                    state.opcodeMap[memPtr] = 'simple';
                } else if (CONSTANTS.OPERAND_INSTRUCTIONS.includes(op)) {
                    state.opcodeMap[memPtr] = 'operand';
                }
                if (CONSTANTS.VECTOR_INSTRUCTIONS.includes(op)) {
                    state.opcodeMap[memPtr] = 'vector';
                }
            }

            memPtr++;

            if (isOperand) {
                if (tokens.length > 1 && tokens[1]) {
                    const operand = parseInt(tokens[1], state.leftInputBase);
                    state.memory[memPtr++] = isNaN(operand) ? 0 : (operand & 0xFF);
                } else {
                    memPtr++;
                }
            }
        } else {
            const data = parseInt(raw, state.leftInputBase);
            state.memory[memPtr++] = isNaN(data) ? 0 : (data & 0xFF);
        }
    }

    highlightMemory(state, memorySize, state.displayBase);
}
