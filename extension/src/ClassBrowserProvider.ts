import * as vscode from "vscode";
import { getNonce } from "./getNonce";

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

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "search-class": {
          console.log("data value", data.value);
          if (data.value === "*") {
            console.log("everything");
            let result: any[] = []
            const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
            alphabet.forEach(x => {
              console.log(x.toString());
              vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", x.toString())
                .then(
                  function (symbols: vscode.SymbolInformation[]) {
                    webviewView.webview.postMessage({
                      type: "partial-class-result",
                      value: symbols.filter(item => item.kind === 4)
                    });
                  }
                );
            });
            // console.log("result", result)
            // webviewView.webview.postMessage({
            //   type: "class-result",
            //   value: result
            // });
          } else {
            console.log("searched");
            vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", data.value)
              .then(
                function (symbols: vscode.SymbolInformation[]) {
                  webviewView.webview.postMessage({
                    type: "class-result",
                    value: symbols.filter(x => x.kind === 4)
                  });
                }
              );
          }
          break;
        }
        case "search-method": {
          vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", vscode.Uri.file(data.value))
            .then(
              function (symbols: any[]) {
                // console.log(symbols.filter(x => x.kind == 4));
                console.log(symbols)
                // webviewView.webview.postMessage({
                //   type: "method-result",
                //   value: symbols
                // });
              }
            );
          break;
        }
        case "hello": {
          vscode.window.showInformationMessage(data.value);
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
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/classbrowser.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/classbrowser.css")
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
