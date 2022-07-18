import * as vscode from "vscode";

export class WorkspaceSymbolsFacade {
    WorkspaceSymbols() { }

    static fetch(query: string): Thenable<any> {
        return vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", query);
    }
}