// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as http from "http";
import { createWriteStream } from "fs";
import { URL } from "url";
import { createHash } from "crypto";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "texlive-remote-render" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "texlive-remote-render.texlive_render",
    async () => {
      if (!context.storageUri || !vscode.window.activeTextEditor) {
        return;
      }
      const server = vscode.workspace.getConfiguration().get("server");
      const body = vscode.window.activeTextEditor.document.getText();
      const hash = createHash("md5").update(body).digest("hex");
      const path = vscode.Uri.joinPath(context.storageUri, hash);
      const f = createWriteStream(path.fsPath, { start: 0 });
      const url = new URL(`${server}/pdf/${hash}.pdf`);
      url.searchParams.set("body", body);
      let success = true;
      try {
        vscode.window.showInformationMessage("Rendering");
        await new Promise((resolve, reject) => {
          const req = http.get(url, (resp) => {
            if (resp.statusCode != 200) {
              vscode.window.showErrorMessage("Render failure");
              success = false;
            }
            resp.addListener("end", resolve);
            resp.addListener("error", reject);
            resp.pipe(f);
          });
          req.addListener("error", reject);
        });
        const ext = success ? ".pdf" : ".txt";
        const resultPath = vscode.Uri.joinPath(context.storageUri, hash + ext);
        try {
          await vscode.workspace.fs.delete(resultPath);
        } catch {}
        await vscode.workspace.fs.rename(path, resultPath);
        vscode.commands.executeCommand(
          "vscode.open",
          resultPath,
          vscode.ViewColumn.Two
        );
      } catch (err) {
        vscode.window.showErrorMessage(String(err));
      } finally {
        f.close();
      }
      return;
    }
  );
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
