import * as vscode from "vscode";

export class WorkspaceSymbols {
    WorkspaceSymbols() { }

    static fetch(query: string): Thenable<any> {
        console.log("query", query);
        vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", query)
            .then(function (symbols: vscode.SymbolInformation[]) {
                console.log("symbols from workspace", symbols);
            });
        return vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", query);
    }
}