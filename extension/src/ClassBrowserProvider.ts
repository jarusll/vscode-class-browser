import * as vscode from "vscode";
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

    //#region predicates
    const isInterface = (x: any) => x.kind === vscode.SymbolKind.Interface;
    const isStruct = (x: any) => x.kind === vscode.SymbolKind.Struct;
    const isClass = (x: any) => x.kind === vscode.SymbolKind.Class;
    const any = (x: any, ...predicates: any[]) => predicates.some(x);
    //#endregion predicates 

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "search-all":
          let result: Array<any> = [];
          const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
          alphabet.forEach(character => {
            WorkspaceSymbolsFacade.fetch(character.toString())
              .then(
                function (symbols: vscode.SymbolInformation[]) {
                  webviewView.webview.postMessage({
                    type: "partial-class-result",
                    value: symbols.filter(x => isInterface(x) || isStruct(x) || isClass(x))
                  });
                });
          });
          break;
        case "search-class":
          WorkspaceSymbolsFacade.fetch(data.value)
            .then(
              function (symbols: vscode.SymbolInformation[]) {
                webviewView.webview.postMessage({
                  type: "class-result",
                  value: symbols.filter(x => isInterface(x) || isStruct(x) || isClass(x))
                  // value: symbols.filter(item => item.kind === 4)
                });
              });
          break;
        case "open": {
          const openPath = vscode.Uri.file(data.value.path);
          vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
            const myPos = new vscode.Position(data.value.position.line, data.value.position.character);     // I think you know how to get the values, let us know if you don't
            vscode.window.activeTextEditor!.selections = [new vscode.Selection(myPos, myPos)];
            vscode.window.activeTextEditor!.revealRange(new vscode.Range(myPos, myPos));
            setTimeout(() => {
              vscode.commands.executeCommand(
                "outline.focus"
              );
            }, 1000);
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
