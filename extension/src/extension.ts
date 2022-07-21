// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ClassBrowserProvider } from "./ClassBrowserProvider";

export function activate(context: vscode.ExtensionContext) {

  const sidebarProvider = new ClassBrowserProvider(context.extensionUri);

  // const item = vscode.window.createStatusBarItem(
  //   vscode.StatusBarAlignment.Right
  // );
  // item.text = "$(beaker) Add Todo";
  // item.command = "vstodo.addTodo";
  // item.show();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("vs-class-browser", sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("search-class-browser", async () => {
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand(
        "workbench.view.extension.vs-class-browser-view"
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("open-class-browser", async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.vs-class-browser-view"
      );
    })
  );

}

// this method is called when your extension is deactivated
export function deactivate() { }
