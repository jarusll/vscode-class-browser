import * as vscode from "vscode";
import { alphabets } from "./constants/alphabets";
import { isAll, isClass, isData, isInterface, isStruct } from "./functions/symbolPredicates";
import { getNonce } from "./getNonce";
import { WorkspaceSymbolsFacade } from "./WorkspaceSymbolsFacade";

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

    connectedWebview.onDidReceiveMessage(async (data) => {
      console.log(data);
      switch (data.type) {
        case "search-all":
          alphabets.forEach(character => {
            WorkspaceSymbolsFacade.fetch(character.toString())
              .then(function (symbols: vscode.SymbolInformation[]) {
                connectedWebview.postMessage({
                  type: "partial-class-result",
                  value: symbols.filter((x: vscode.SymbolInformation) => isAll(x))
                });
              });
          });
          break;
        case "search-class":
          WorkspaceSymbolsFacade.fetch(data.value)
            .then(
              function (symbols: vscode.SymbolInformation[]) {
                connectedWebview.postMessage({
                  type: "class-result",
                  value: symbols.filter(x => isInterface(x) || isStruct(x) || isClass(x))
                });
              });
          break;
        case "open": {
          const openPath = vscode.Uri.file(data.value.path);
          vscode.workspace.openTextDocument(openPath).then(async (doc) => {
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
            const myPos = new vscode.Position(data.value.position.line, data.value.position.character);     // I think you know how to get the values, let us know if you don't
            vscode.window.activeTextEditor!.selections = [new vscode.Selection(myPos, myPos)];
            await vscode.window.activeTextEditor!.revealRange(new vscode.Range(myPos, myPos));
            await vscode.commands.executeCommand(
              "outline.focus"
            );
            // setTimeout(() => {
            //   vscode.commands.executeCommand(
            //     "outline.focus"
            //   );
            // }, 1000);
          });
        }
          break;
        case "search-method": {
          // TODO implement
          break;
        }
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
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
