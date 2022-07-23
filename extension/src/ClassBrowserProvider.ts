import { exec } from "child_process";
import * as vscode from "vscode";
import { alphabets } from "./constants/alphabets";
import ExecutionQueue from "./ExecutionQueue";
import { isAll, isClass, isData, isInterface, isStruct, isContainer, isProcess } from "./functions/symbolPredicates";
import { getNonce } from "./getNonce";
import Thunk from "./Thunk";
import { WorkspaceSymbolsFacade } from "./WorkspaceSymbolsFacade";

const execQueue = new ExecutionQueue();

export class ClassBrowserProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // this is how you send messages to webview
    // webviewView.webview.postMessage({
    //   type: "token",
    //   value: TokenManager.getToken(),
    // });

    const connectedWebview = webviewView.webview;

    //#region theonlythingwhichmatters
    connectedWebview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "reset":
          execQueue.reset();
          break;
        case "show-more":
          const partialResult = await execQueue.lazyExec();
          if (partialResult === false) {
            connectedWebview.postMessage({
              type: "results-exhausted",
              value: ""
            });
          } else {
            connectedWebview.postMessage({
              type: "partial-result",
              value: partialResult
            });
          }
          break;
        case "search-all":
          execQueue.reset();
          const { type, query } = data.value;
          let typePredicate: Function;
          if (type === "data") {
            typePredicate = isData;
          }
          else if (type === "process") {
            typePredicate = isProcess;
          }
          else {
            typePredicate = isContainer;
          }
          // TODO replace this with a SearchPolicy
          alphabets.forEach(async (character) => {
            execQueue.enqueue(new Thunk(async () => {
              const symbols = await WorkspaceSymbolsFacade.fetch(character.toString());
              return symbols.filter((x: vscode.SymbolInformation) => typePredicate(x));
            }));
          });
          break;
        case "search-data":
          execQueue.reset();
          execQueue.enqueue(new Thunk(async () => {
            const symbols = await WorkspaceSymbolsFacade.fetch(data.value);
            return symbols.filter((x: vscode.SymbolInformation) => isData(x));
          }));
          break;
        case "search-process":
          execQueue.reset();
          execQueue.enqueue(new Thunk(async () => {
            const symbols = await WorkspaceSymbolsFacade.fetch(data.value);
            return symbols.filter((x: vscode.SymbolInformation) => isProcess(x));
          }));
          break;
        case "search-container":
          execQueue.reset();
          execQueue.enqueue(new Thunk(async () => {
            const symbols = await WorkspaceSymbolsFacade.fetch(data.value);
            return symbols.filter((x: vscode.SymbolInformation) => isContainer(x));
          }));
          break;
        case "open":
          const openPath = vscode.Uri.file(data.value.path);
          vscode.workspace.openTextDocument(openPath).then(async (doc) => {
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
            const myPos = new vscode.Position(data.value.position.line, data.value.position.character);     // I think you know how to get the values, let us know if you don't
            vscode.window.activeTextEditor!.selections = [new vscode.Selection(myPos, myPos)];
            vscode.window.activeTextEditor!.revealRange(new vscode.Range(myPos, myPos));
            await vscode.commands.executeCommand(
              "outline.focus"
            );
          });
          break;
        case "onInfo":
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        case "onError":
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
    });
    //#endregion theonlythingwhichmatters
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "build", "compiled/classbrowser.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "build", "compiled/classbrowser.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource
      }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode = acquireVsCodeApi();
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
