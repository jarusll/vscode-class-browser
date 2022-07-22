import * as vscode from "vscode";

export class WorkspaceSymbolsFacade {
    WorkspaceSymbols() { }

    static async fetch(query: string): Promise<any> {
        return await vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", query);
    }
}