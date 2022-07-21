import { SymbolInformation ,SymbolKind} from "vscode";

//#region predicates
export const isInterface = (x: SymbolInformation) => x.kind === SymbolKind.Interface;
export const isStruct = (x: SymbolInformation) => x.kind === SymbolKind.Struct;
export const isClass = (x: SymbolInformation) => x.kind === SymbolKind.Class;
export const isEnum = (x: SymbolInformation) => x.kind === SymbolKind.Enum;

// combined
export const isData = (x: SymbolInformation) => isStruct(x) || isClass(x) || isEnum(x) || isInterface(x);

export const isFunction = (x: SymbolInformation) => x.kind === SymbolKind.Function;

export const isProcess = (x: SymbolInformation) => isFunction(x);

export const isModule = (x: SymbolInformation) => x.kind === SymbolKind.Module;
export const isNamespace = (x: SymbolInformation) => x.kind === SymbolKind.Namespace;
export const isPackage = (x: SymbolInformation) => x.kind === SymbolKind.Package;

// combined
export const isContainer = (x: SymbolInformation) => isModule(x) || isNamespace(x) || isPackage(x);

export const isAll = (x: SymbolInformation) => isData(x) || isContainer(x) || isProcess(x);
//#endregion predicates