export const CONSTANTS = {
    MEMORY_SIZE: 256,
    VECTOR_REG_COUNT: 2,
    VECTOR_REG_SIZE: 4,
    INFINITE_LOOP_THRESHOLD: 10000,
    I_CACHE_SIZE: 8,
    D_CACHE_SIZE: 16,
    INSTRUCTION_MAP: {
        "NOP": 0, "STA": 16, "LDA": 32, "ADD": 48,
        "OR": 64, "AND": 80, "NOT": 96, "JMP": 128,
        "JN": 144, "JZ": 160, "HLT": 240,
        "VLDA": 241, "VSTA": 242, "VADD": 243, "VEADD": 244,
        "VOR": 245, "VAND": 246, "VNOT": 247,
        "LDIX": 176, "STIX": 177, "LDBP": 192, "STBP": 193,
        "LDX": 208, "STX": 209, "LDBX": 210, "STBX": 211,
        "LDB": 212, "STB": 213, "LDI": 214,
        "LOOP": 224, "TAS": 225, "VLDB": 248, "VSTB": 249, "VADDV": 250
    },
    OPERAND_INSTRUCTIONS: ["STA", "LDA", "ADD", "OR", "AND", "JMP", "JN", "JZ", "VLDA", "VSTA", "VADD", "VOR", "VAND", "LDIX", "STIX", "LDBP", "STBP", "LDX", "STX", "LDB", "STB", "LDI", "LOOP", "TAS", "VLDB", "VSTB"],
    SIMPLE_INSTRUCTIONS: ["NOP", "HLT", "NOT", "VEADD", "VNOT", "LDBX", "STBX", "VADDV"],
    VECTOR_INSTRUCTIONS: ["VLDA", "VSTA", "VADD", "VEADD", "VOR", "VAND", "VNOT", "VLDB", "VSTB", "VADDV"],
    CLASSIC_INSTRUCTIONS: ["NOP", "STA", "LDA", "ADD", "OR", "AND", "NOT", "JMP", "JN", "JZ", "HLT"],
    EXPANDED_ONLY_INSTRUCTIONS: ["LDIX", "STIX", "LDBP", "STBP", "LDX", "STX", "LDBX", "STBX", "LDB", "STB", "LDI", "LOOP", "TAS", "VLDB", "VSTB", "VADDV"]
};

CONSTANTS.REVERSE_INSTRUCTION_MAP = Object.fromEntries(
    Object.entries(CONSTANTS.INSTRUCTION_MAP).map(([k, v]) => [v, k])
);